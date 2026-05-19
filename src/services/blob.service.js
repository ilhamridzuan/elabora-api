import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import crypto from "crypto";

const SAS_DEFAULT_MIN = 10;
const SAS_MIN_MIN = 1;
const SAS_MAX_MIN = 15;

class BlobService {
  constructor() {
    this.client = null;
    this.accountName = null;
    this.credentialMode = null; // "mi" | "conn"
    this.containerReferrals = null;
    this.containerExams = null;
    this.delegationKey = null;
    this.delegationKeyExpiresAt = 0;
    this.sasExpiryMinutes = SAS_DEFAULT_MIN;
  }

  /**
   * Initialize BlobService. Must be called once at server startup before app.listen.
   * - MI mode: AZURE_STORAGE_ACCOUNT_NAME set + AZURE_STORAGE_CONNECTION_STRING empty
   * - Conn-string mode: AZURE_STORAGE_CONNECTION_STRING set
   * - Both empty: throws fatal error (caller must process.exit(1))
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.4a, 1.5, 11.5, 11.6
   */
  async init() {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim();
    const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();

    this.containerReferrals =
      process.env.AZURE_BLOB_CONTAINER_REFERRALS?.trim() || "surat-rujukan";
    this.containerExams =
      process.env.AZURE_BLOB_CONTAINER_EXAMS?.trim() || "exam-results";
    this.sasExpiryMinutes = this._parseSasExpiry(
      process.env.AZURE_BLOB_SAS_EXPIRY_MINUTES
    );

    if (accountName && !connStr) {
      // Production: Managed Identity via DefaultAzureCredential
      const url = `https://${accountName}.blob.core.windows.net`;
      this.client = new BlobServiceClient(url, new DefaultAzureCredential());
      this.accountName = accountName;
      this.credentialMode = "mi";
      console.log("[BlobService] init: Managed Identity mode");
    } else if (connStr) {
      // Development: connection string fallback
      this.client = BlobServiceClient.fromConnectionString(connStr);
      this.accountName = this.client.accountName;
      this.credentialMode = "conn";
      console.log("[BlobService] init: connection string mode");
    } else {
      throw new Error(
        "FATAL: AZURE_STORAGE_ACCOUNT_NAME or AZURE_STORAGE_CONNECTION_STRING required"
      );
    }

    await this._ensureContainer(this.containerReferrals);
    await this._ensureContainer(this.containerExams);

    console.log(
      `[BlobService] ready. containers: ${this.containerReferrals}, ${this.containerExams}`
    );
  }

  /**
   * Parse and validate AZURE_BLOB_SAS_EXPIRY_MINUTES.
   * Clamp >15 → 15 (warn). Non-int or <1 → fallback 10 (warn).
   * Requirements: 11.5, 11.6
   */
  _parseSasExpiry(raw) {
    const n = parseInt(raw, 10);
    if (!Number.isInteger(n) || n < SAS_MIN_MIN) {
      console.warn(
        `[BlobService] AZURE_BLOB_SAS_EXPIRY_MINUTES invalid (${raw}), fallback to ${SAS_DEFAULT_MIN}`
      );
      return SAS_DEFAULT_MIN;
    }
    if (n > SAS_MAX_MIN) {
      console.warn(
        `[BlobService] AZURE_BLOB_SAS_EXPIRY_MINUTES=${n} exceeds max ${SAS_MAX_MIN}, clamped to ${SAS_MAX_MIN}`
      );
      return SAS_MAX_MIN;
    }
    return n;
  }

  /**
   * Ensure container exists (private). On error: log errorCode+requestId, rethrow.
   * Caller (init) must catch and process.exit(1).
   * Requirements: 1.4, 1.4a
   */
  async _ensureContainer(name) {
    try {
      const cc = this.client.getContainerClient(name);
      await cc.createIfNotExists(); // no access option = private by default
      console.log(`[BlobService] container ready: ${name}`);
    } catch (e) {
      console.error(`[BlobService] FATAL: container "${name}" init failed`, {
        errorCode: e.code || e.errorCode,
        requestId: e.requestId || e.details?.requestId,
      });
      throw e;
    }
  }

  /**
   * Compute SHA-256 hex digest of a Buffer.
   * Requirements: 8.3
   */
  static sha256(buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  /**
   * Upload buffer to blob storage.
   * Sets Content-Type and Content-Disposition: attachment; filename="<sanitized>".
   * Requirements: 8.1, 8.2, 8.4, 8.5
   */
  async upload({ container, blobName, buffer, contentType, originalFilename }) {
    const cc = this.client.getContainerClient(container);
    const block = cc.getBlockBlobClient(blobName);
    const safeName = (originalFilename || "file").replace(/[^\w.\-]/g, "_");
    const headers = {
      blobContentType: contentType,
      blobContentDisposition: `attachment; filename="${safeName}"`,
    };
    await this._withRetry(() =>
      block.uploadData(buffer, { blobHTTPHeaders: headers })
    );
    return { blobName, container };
  }

  /**
   * Delete blob. Swallow 404 (already gone) with warn. Rethrow other errors.
   * Retries on transient errors via _withRetry.
   * Requirements: 5.3, 10.1, 10.2, 10.4
   */
  async deleteBlob({ container, blobName }) {
    const cc = this.client.getContainerClient(container);
    try {
      await this._withRetry(() => cc.deleteBlob(blobName));
    } catch (e) {
      if (e.statusCode === 404) {
        console.warn(
          `[BlobService] blob already gone (404): ${container}/${blobName}`
        );
        return;
      }
      throw e;
    }
  }

  /**
   * Check if blob exists. Returns boolean.
   * Retries on transient errors via _withRetry.
   * Requirements: 10.1, 10.2, 10.4
   */
  async exists({ container, blobName }) {
    const cc = this.client.getContainerClient(container);
    return await this._withRetry(() => cc.getBlobClient(blobName).exists());
  }

  /**
   * Generate read-only SAS URL for a blob.
   * MI mode: User Delegation Key (cached ~50min). Conn mode: StorageSharedKeyCredential.
   * Wraps in 5s timeout. Returns { url, expiresAt: ISO8601, expiryMinutes }.
   * Requirements: 4.6, 4.7, 4.8, 4.11, 11.4, 11.5, 11.6
   */
  async generateReadSas({ container, blobName, expiryMinutes }) {
    const sasPromise = this._generateReadSasInternal({
      container,
      blobName,
      expiryMinutes,
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("SAS generation timeout (5s)")),
        5000
      )
    );
    return Promise.race([sasPromise, timeoutPromise]);
  }

  async _generateReadSasInternal({ container, blobName, expiryMinutes }) {
    const minutes = this._clampExpiry(expiryMinutes);
    const start = new Date();
    const expiresAt = new Date(start.getTime() + minutes * 60 * 1000);

    let sas;
    if (this.credentialMode === "mi") {
      const key = await this._getDelegationKey(start, expiresAt);
      sas = generateBlobSASQueryParameters(
        {
          containerName: container,
          blobName,
          permissions: BlobSASPermissions.parse("r"),
          startsOn: start,
          expiresOn: expiresAt,
          protocol: SASProtocol.Https,
        },
        key,
        this.accountName
      ).toString();
    } else {
      const cred = this.client.credential;
      if (!(cred instanceof StorageSharedKeyCredential)) {
        throw new Error(
          "SAS generation requires StorageSharedKeyCredential in conn-string mode"
        );
      }
      sas = generateBlobSASQueryParameters(
        {
          containerName: container,
          blobName,
          permissions: BlobSASPermissions.parse("r"),
          startsOn: start,
          expiresOn: expiresAt,
          protocol: SASProtocol.Https,
        },
        cred
      ).toString();
    }

    const url = `https://${this.accountName}.blob.core.windows.net/${container}/${encodeURI(blobName)}?${sas}`;
    return { url, expiresAt: expiresAt.toISOString(), expiryMinutes: minutes };
  }

  /**
   * Clamp expiry to [SAS_MIN_MIN, SAS_MAX_MIN]. Fallback to this.sasExpiryMinutes if not integer.
   */
  _clampExpiry(min) {
    const n = Number.isInteger(min) ? min : this.sasExpiryMinutes;
    if (n < SAS_MIN_MIN) return SAS_MIN_MIN;
    if (n > SAS_MAX_MIN) return SAS_MAX_MIN;
    return n;
  }

  /**
   * Get (or refresh) User Delegation Key. Cached ~50min, refresh when <5min to expiry.
   */
  async _getDelegationKey(start, expiresAt) {
    const now = Date.now();
    if (
      this.delegationKey &&
      this.delegationKeyExpiresAt - now > 5 * 60 * 1000
    ) {
      return this.delegationKey;
    }
    const keyStart = new Date(now - 60 * 1000); // 1min in past for clock skew
    const keyExpiresOn = new Date(now + 50 * 60 * 1000); // 50min
    const key = await this._withRetry(() =>
      this.client.getUserDelegationKey(keyStart, keyExpiresOn)
    );
    this.delegationKey = key;
    this.delegationKeyExpiresAt = keyExpiresOn.getTime();
    return key;
  }

  /**
   * Retry wrapper with exponential backoff.
   * Retries on: statusCode 503, code REQUEST_SEND_ERROR, name AbortError.
   * Max 2 retries (3 total attempts). Backoffs: 1000ms, 2000ms.
   * Requirements: 10.1, 10.2
   */
  async _withRetry(fn) {
    const delays = [1000, 2000];
    let lastErr;
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        const retriable =
          e.statusCode === 503 ||
          e.code === "REQUEST_SEND_ERROR" ||
          e.name === "AbortError";
        if (!retriable || attempt === delays.length) throw e;
        await new Promise((r) => setTimeout(r, delays[attempt]));
      }
    }
    throw lastErr;
  }
}

export const blobService = new BlobService();
