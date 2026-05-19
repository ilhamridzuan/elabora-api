import "dotenv/config";
import app from "./app.js";
import { blobService } from "./services/blob.service.js";

// Validate JWT_SECRET before starting server
if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
  console.error("Please set JWT_SECRET to a secure random string of at least 32 characters.");
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error("FATAL ERROR: JWT_SECRET must be at least 32 characters long.");
  console.error(`Current length: ${process.env.JWT_SECRET.length} characters.`);
  console.error("Please use a longer, more secure secret.");
  process.exit(1);
}

console.log("✓ JWT_SECRET validation passed");

const port = process.env.PORT || 3000;

(async () => {
  try {
    await blobService.init();
  } catch (err) {
    console.error("FATAL: Blob_Service init failed", err);
    process.exit(1);
  }
  app.listen(port, "0.0.0.0", () => {
    console.log(`API running on port ${port}`);
  });
})();
