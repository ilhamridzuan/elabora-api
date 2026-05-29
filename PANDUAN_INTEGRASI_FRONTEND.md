# 📘 Panduan Integrasi Frontend - eLabora API

> **Base URL**: `https://elabora-api-production.up.railway.app`
> **Format**: JSON (kecuali upload file: `multipart/form-data`)
> **Autentikasi**: JWT Bearer Token
> **Zona Waktu**: Asia/Jakarta (WIB)

---

## 📋 Daftar Lengkap Endpoint

| # | Method | Endpoint | Akses | Deskripsi |
|---|--------|----------|-------|-----------|
| 1 | `POST` | `/auth/register` | Public | Register pasien |
| 2 | `POST` | `/auth/register-dokter` | Public | Register dokter |
| 3 | `POST` | `/auth/register-petugas` | Public | Register petugas |
| 4 | `POST` | `/auth/login` | Public | Login semua role |
| 5 | `GET` | `/auth/me` | Auth | Profil user |
| 6 | `POST` | `/registrations/` | PASIEN | Pendaftaran pemeriksaan |
| 7 | `GET` | `/registrations/me` | PASIEN | List pendaftaran saya |
| 8 | `GET` | `/registrations/queue/today` | PASIEN | Antrian saya hari ini |
| 9 | `GET` | `/registrations/:id/surat-rujukan/download` | Auth | Download surat rujukan |
| 10 | `GET` | `/patients/` | DOKTER, PETUGAS | List semua pasien |
| 11 | `GET` | `/patients/:id` | DOKTER, PETUGAS | Detail pasien |
| 12 | `POST` | `/patients/search` | DOKTER, PETUGAS | Pencarian lanjutan |
| 13 | `GET` | `/queue/today` | Auth | Antrian hari ini |
| 14 | `GET` | `/queue/stats` | Auth | Statistik antrian |
| 15 | `POST` | `/queue/:id/call` | PETUGAS | Panggil antrian |
| 16 | `POST` | `/queue/:id/next` | PETUGAS | Selesaikan & panggil berikutnya |
| 17 | `POST` | `/queue/:id/cancel` | PETUGAS | Batalkan antrian |
| 18 | `GET` | `/exams/all` | PETUGAS, DOKTER | List semua pemeriksaan |
| 19 | `GET` | `/exams/patients/:pasienId` | Auth | List pemeriksaan per pasien |
| 20 | `GET` | `/exams/:id` | Auth | Detail pemeriksaan |
| 21 | `POST` | `/exams/` | PETUGAS | Buat pemeriksaan |
| 22 | `PATCH` | `/exams/:id` | PETUGAS | Update pemeriksaan |
| 23 | `POST` | `/exams/:id/files` | PETUGAS | Upload file hasil |
| 24 | `PATCH` | `/exams/:id/files/:fileId` | PETUGAS | Replace file hasil |
| 25 | `GET` | `/exams/:id/files/:fileId/download` | Auth | Download file hasil |
| 26 | `DELETE` | `/exams/:id` | PETUGAS | Hapus pemeriksaan |
| 27 | `GET` | `/audit-logs` | PETUGAS | List audit log |
| 28 | `POST` | `/devices/token` | Auth | Simpan FCM token |

---

## 🔐 Autentikasi & Otorisasi

### Header yang Diperlukan

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
```

### Role Pengguna

| Role | Keterangan |
|------|-----------|
| `PASIEN` | Pengguna layanan pemeriksaan |
| `DOKTER` | Dokter pemeriksa |
| `PETUGAS` | Petugas laboratorium / administrasi |

### JWT Token Payload

```json
{
  "akun_id": 1,
  "role": "PASIEN",
  "iat": 1700000000,
  "exp": 1700086400
}
```

Token berlaku selama **1 hari** (24 jam).

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 request | 15 menit per IP |
| Register | 3 request | 1 jam per IP |

Response `429 Too Many Requests`:
```json
{ "message": "Too many requests, please try again later" }
```

### Error Autentikasi

**401 Unauthorized** (token tidak ada/invalid):
```json
{ "message": "Unauthorized" }
```

**403 Forbidden** (role tidak sesuai):
```json
{ "message": "Forbidden" }
```

---

## 1️⃣ Modul Auth

### POST `/auth/register` — Register Pasien

**Akses**: Public | **Rate Limit**: 3/jam

**Request Body**:
```json
{
  "username": "ilhamridzuan",
  "email": "ilham@mail.com",
  "password": "Password1!",
  "nik": "1234567890123456",
  "nama": "Ilham Ridzuan",
  "jenis_kelamin": "L",
  "tgl_lahir": "2005-07-26",
  "alamat": "Tanjungpinang",
  "no_telepon": "089673217735"
}
```

**Validasi**:
| Field | Rules |
|-------|-------|
| `username` | Wajib, maks 50 karakter |
| `email` | Wajib, format email valid, maks 120 karakter |
| `password` | Wajib, min 8 karakter, harus mengandung huruf besar, huruf kecil, angka, karakter khusus (`@$!%*?&#`) |
| `nik` | Wajib, tepat 16 karakter |
| `nama` | Wajib, maks 100 karakter |
| `jenis_kelamin` | Wajib, `"L"` atau `"P"` |
| `tgl_lahir` | Opsional, format `YYYY-MM-DD` |
| `alamat` | Opsional, maks 255 karakter |
| `no_telepon` | Opsional, maks 20 karakter |

**Response `201 Created`**:
```json
{
  "akun_id": 1,
  "role": "PASIEN",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response `409 Conflict`**:
```json
{ "message": "Username atau email sudah digunakan" }
```

---

### POST `/auth/register-dokter` — Register Dokter

**Akses**: Public | **Rate Limit**: 3/jam

**Request Body**:
```json
{
  "username": "alfianrizky",
  "email": "alfian@mail.com",
  "password": "Password1!",
  "nip": "12345678901234567890",
  "nama": "Dr. Alfian Rizky"
}
```

**Validasi**:
| Field | Rules |
|-------|-------|
| `username` | Wajib, maks 50 karakter |
| `email` | Wajib, format email valid, maks 120 karakter |
| `password` | Wajib, sama seperti register pasien |
| `nip` | Wajib, maks 50 karakter |
| `nama` | Wajib, maks 100 karakter |

**Response `201 Created`**:
```json
{
  "akun_id": 2,
  "role": "DOKTER",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### POST `/auth/register-petugas` — Register Petugas

**Akses**: Public | **Rate Limit**: 3/jam

**Request Body**:
```json
{
  "username": "pieterimmanuel",
  "email": "pieter@mail.com",
  "password": "Password1!",
  "nip": "12345678900987654321",
  "nama": "Pieter Immanuel"
}
```

**Validasi**: Sama dengan register dokter.

**Response `201 Created`**:
```json
{
  "akun_id": 3,
  "role": "PETUGAS",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### POST `/auth/login` — Login

**Akses**: Public | **Rate Limit**: 5/15 menit

**Request Body**:
```json
{
  "username": "ilhamridzuan",
  "password": "Password1!"
}
```

**Validasi**:
| Field | Rules |
|-------|-------|
| `username` | Wajib, maks 50 karakter |
| `password` | Wajib, min 6 karakter |

**Response `200 OK`**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "role": "PASIEN"
}
```

**Response `401 Unauthorized`**:
```json
{ "message": "Username atau password salah" }
```

---

### GET `/auth/me` — Get Profil

**Akses**: Semua role (perlu token)

**Response `200 OK`**:
```json
{
  "akun": {
    "id": 1,
    "username": "ilhamridzuan",
    "email": "ilham@mail.com",
    "role": "PASIEN"
  },
  "profil": {
    "id": 1,
    "nik": "1234567890123456",
    "nama": "Ilham Ridzuan",
    "jenis_kelamin": "L",
    "tgl_lahir": "2005-07-26",
    "alamat": "Tanjungpinang",
    "no_telepon": "089673217735"
  }
}
```

> **Catatan**: Isi `profil` berbeda tergantung role. Untuk DOKTER/PETUGAS akan berisi `nip` dan `nama`.

---

## 2️⃣ Modul Pendaftaran (Registrations)

### POST `/registrations/` — Buat Pendaftaran

**Akses**: PASIEN | **Content-Type**: `multipart/form-data`

**Request Body (form-data)**:
| Field | Tipe | Wajib | Deskripsi |
|-------|------|-------|-----------|
| `jadwal_pemeriksaan_at` | text | ✅ | Jadwal pemeriksaan, format: `"2025-12-31 10:00:00"` (ISO) |
| `tanggal_antrian` | text | ✅ | Tanggal antrian, format: `"2025-12-31"` (YYYY-MM-DD) |
| `surat_rujukan` | file | ✅ | File surat rujukan (PDF/JPEG/PNG, maks 5MB) |

**Response `201 Created`**:
```json
{
  "id": 15,
  "no_antrian": "005",
  "no_lab": "LAB-20251231-0015",
  "status": "MENUNGGU",
  "tanggal_antrian": "2025-12-31",
  "jadwal_pemeriksaan_at": "2025-12-31 10:00:00"
}
```

**Response `400 Bad Request`**:
```json
{ "message": "Surat rujukan wajib diupload" }
```

**Response `422 Unprocessable Entity`**:
```json
{ "message": "Format file tidak diizinkan" }
```

---

### GET `/registrations/me` — List Pendaftaran Saya

**Akses**: PASIEN

**Query Parameters**:
| Parameter | Tipe | Wajib | Deskripsi |
|-----------|------|-------|-----------|
| `tanggal` | string | ❌ | Filter berdasarkan tanggal (`YYYY-MM-DD`) |

**Contoh**: `GET /registrations/me?tanggal=2025-12-31`

**Response `200 OK`**:
```json
[
  {
    "id": 15,
    "no_antrian": 5,
    "no_lab": "LAB-20251231-0015",
    "status": "MENUNGGU",
    "tanggal_antrian": "2025-12-31",
    "jadwal_pemeriksaan_at": "2025-12-31T10:00:00.000Z"
  }
]
```

---

### GET `/registrations/queue/today` — Antrian Saya Hari Ini

**Akses**: PASIEN

**Response `200 OK`**:
```json
{
  "my": {
    "id": 15,
    "no_antrian": 5,
    "status": "MENUNGGU"
  },
  "stats": {
    "total": 10,
    "menunggu": 5,
    "dilayani": 2,
    "selesai": 3,
    "dibatalkan": 0
  },
  "tanggal": "2025-12-31"
}
```

> Jika pasien belum mendaftar hari ini: `{ "my": null, "stats": null }`

---

### GET `/registrations/:id/surat-rujukan/download` — Download Surat Rujukan

**Akses**: Auth (PASIEN hanya bisa download milik sendiri, DOKTER/PETUGAS bisa semua)

**Response `200 OK`**:
```json
{
  "url": "https://storage.blob.core.windows.net/referrals/2025/12/uuid.pdf?sv=...",
  "expires_at": "2025-12-31T11:00:00.000Z",
  "content_type": "application/pdf",
  "filename": "uuid.pdf"
}
```

> **Catatan**: `url` adalah SAS URL (Azure Blob Storage) yang berlaku sementara. Frontend harus langsung membuka/download URL tersebut sebelum expired.

**Response `404 Not Found`**:
```json
{ "message": "File tidak ditemukan" }
```

**Response `403 Forbidden`**:
```json
{ "message": "Akses ditolak" }
```

---

## 3️⃣ Modul Pasien (Patients)

### GET `/patients/` — List Semua Pasien

**Akses**: DOKTER, PETUGAS

**Query Parameters**:
| Parameter | Tipe | Default | Deskripsi |
|-----------|------|---------|-----------|
| `search` | string | - | Cari berdasarkan nama/NIK (OR logic) |
| `page` | number | 1 | Halaman |
| `pageSize` | number | 20 | Jumlah per halaman (maks 100) |

**Contoh**: `GET /patients/?search=budi&page=1&pageSize=20`

**Response `200 OK`**:
```json
{
  "items": [
    {
      "id": 7,
      "nik": "3201123456789012",
      "nama": "Budi Santoso",
      "tgl_lahir": "1990-05-15",
      "no_telepon": "081234567890",
      "username": "budi123",
      "email": "budi@mail.com"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 150
}
```

---

### GET `/patients/:id` — Detail Pasien

**Akses**: DOKTER, PETUGAS

**Response `200 OK`**:
```json
{
  "id": 7,
  "nik": "3201123456789012",
  "nama": "Budi Santoso",
  "jenis_kelamin": "L",
  "tgl_lahir": "1990-05-15",
  "alamat": "Jakarta",
  "no_telepon": "081234567890",
  "username": "budi123",
  "email": "budi@mail.com"
}
```

**Response `404 Not Found`**:
```json
{ "message": "Patient not found" }
```

---

### POST `/patients/search` — Pencarian Lanjutan

**Akses**: DOKTER, PETUGAS

**Request Body** (semua field opsional):
```json
{
  "name": "budi",
  "nik": "3201",
  "phone": "0812",
  "dobStart": "1990-01-01",
  "dobEnd": "2000-12-31",
  "regStart": "2024-01-01",
  "regEnd": "2024-12-31",
  "page": 1,
  "pageSize": 20,
  "sortBy": "nama",
  "sortOrder": "ASC"
}
```

**Validasi**:
| Field | Rules |
|-------|-------|
| `name` | Opsional, partial match (case-insensitive) |
| `nik` | Opsional, prefix match |
| `phone` | Opsional, prefix match |
| `dobStart`, `dobEnd` | Opsional, format `YYYY-MM-DD` |
| `regStart`, `regEnd` | Opsional, format `YYYY-MM-DD` |
| `page` | Opsional, min 1 |
| `pageSize` | Opsional, 1-20 |
| `sortBy` | Opsional, enum: `nama`, `nik`, `tgl_lahir`, `created_at` |
| `sortOrder` | Opsional, enum: `ASC`, `DESC` |

> Semua filter digabung dengan **AND** logic.

**Response `200 OK`**:
```json
{
  "items": [
    {
      "id": 7,
      "nik": "3201123456789012",
      "nama": "Budi Santoso",
      "tgl_lahir": "1990-05-15",
      "no_telepon": "081234567890"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 5
}
```

**Response `400 Bad Request`**:
```json
{ "message": "Date of birth end date must be after start date" }
```

---

## 4️⃣ Modul Antrian (Queue)

### GET `/queue/today` — Antrian Hari Ini

**Akses**: Auth (semua role)

**Query Parameters**:
| Parameter | Tipe | Default | Deskripsi |
|-----------|------|---------|-----------|
| `date` | string | Hari ini (WIB) | Tanggal antrian (`YYYY-MM-DD`) |

**Response `200 OK`**:
```json
{
  "tanggal": "2025-12-31",
  "data": [
    {
      "id": 15,
      "pasien_id": 7,
      "nama": "Budi Santoso",
      "no_antrian": 1,
      "status": "MENUNGGU",
      "jadwal_pemeriksaan_at": "2025-12-31T10:00:00.000Z"
    }
  ]
}
```

**Status antrian yang mungkin**: `MENUNGGU`, `DILAYANI`, `SELESAI`, `DIBATALKAN`

---

### GET `/queue/stats` — Statistik Antrian

**Akses**: Auth (semua role)

**Response `200 OK`**:
```json
{
  "stats": {
    "total": 10,
    "menunggu": 5,
    "dilayani": 2,
    "selesai": 3,
    "dibatalkan": 0
  },
  "tanggal": "2025-12-31"
}
```

---

### POST `/queue/:id/call` — Panggil Antrian

**Akses**: PETUGAS

Mengubah status pendaftaran menjadi `DILAYANI`. Otomatis mengirim **push notification** (FCM) ke device pasien.

**Response `200 OK`**:
```json
{
  "id": 15,
  "status": "DILAYANI"
}
```

**Response `404 Not Found`**:
```json
{ "message": "Pendaftaran tidak ditemukan" }
```

**Push Notification yang Dikirim**:
```json
{
  "title": "Antrian Dipanggil",
  "body": "Nomor antrian Anda 005 sedang dipanggil",
  "data": {
    "type": "QUEUE_CALLED",
    "pendaftaran_id": "15",
    "no_antrian": "5",
    "tanggal_antrian": "2025-12-31"
  }
}
```

---

### POST `/queue/:id/next` — Selesaikan & Panggil Berikutnya

**Akses**: PETUGAS

Menandai antrian saat ini sebagai `SELESAI`, lalu otomatis memanggil antrian `MENUNGGU` berikutnya (menjadi `DILAYANI`).

**Response `200 OK`** (ada antrian berikutnya):
```json
{
  "finished": 15,
  "next": {
    "id": 16,
    "status": "DILAYANI"
  }
}
```

**Response `200 OK`** (tidak ada antrian berikutnya):
```json
{
  "finished": 15,
  "next": null
}
```

---

### POST `/queue/:id/cancel` — Batalkan Antrian

**Akses**: PETUGAS

**Request Body** (opsional):
```json
{
  "reason": "Pasien tidak hadir"
}
```

**Response `200 OK`**:
```json
{
  "id": 15,
  "status": "DIBATALKAN"
}
```

---

## 5️⃣ Modul Pemeriksaan (Exams)

### GET `/exams/all` — List Semua Pemeriksaan

**Akses**: PETUGAS, DOKTER

**Query Parameters**:
| Parameter | Tipe | Default | Deskripsi |
|-----------|------|---------|-----------|
| `q` | string | - | Keyword pencarian |
| `status_hasil` | string | - | Filter status: `MENUNGGU_HASIL`, `HASIL_TERSEDIA` |
| `page` | number | 1 | Halaman |
| `limit` | number | 20 | Jumlah per halaman (maks 100) |

**Response `200 OK`**:
```json
{
  "data": [
    {
      "id": 10,
      "pendaftaran_id": 15,
      "pasien_nama": "Budi Santoso",
      "kategori_id": 2,
      "status_validasi": "DRAFT",
      "status_hasil": "MENUNGGU_HASIL",
      "tgl_pemeriksaan": "2025-12-31",
      "catatan": "Pemeriksaan darah lengkap"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

### GET `/exams/patients/:pasienId` — List Pemeriksaan Per Pasien

**Akses**: Auth (semua role)

**Response `200 OK`**:
```json
{
  "data": [
    {
      "id": 10,
      "pendaftaran_id": 15,
      "kategori_id": 2,
      "status_validasi": "DRAFT",
      "status_hasil": "MENUNGGU_HASIL",
      "tgl_pemeriksaan": "2025-12-31"
    }
  ]
}
```

---

### GET `/exams/:id` — Detail Pemeriksaan

**Akses**: Auth (semua role)

**Response `200 OK`**:
```json
{
  "id": 10,
  "pendaftaran_id": 15,
  "pasien_id": 7,
  "kategori_id": 2,
  "dokter_id": null,
  "petugas_lab_id": 3,
  "status_validasi": "DRAFT",
  "status_hasil": "MENUNGGU_HASIL",
  "catatan": "Pemeriksaan darah lengkap",
  "tgl_pemeriksaan": "2025-12-31",
  "files": [
    {
      "id": 1,
      "pemeriksaan_id": 10,
      "blob_name": "10/uuid.pdf",
      "container": "exam-results",
      "content_type": "application/pdf",
      "size_bytes": 102400,
      "sha256": "abc123...",
      "file_type": "PDF"
    }
  ]
}
```

**Response `404 Not Found`**:
```json
{ "message": "Pemeriksaan not found" }
```

---

### POST `/exams/` — Buat Pemeriksaan

**Akses**: PETUGAS

**Request Body**:
```json
{
  "pendaftaran_id": 15,
  "kategori_id": 2,
  "dokter_id": null,
  "catatan": "Pemeriksaan awal",
  "status_validasi": "DRAFT",
  "status_hasil": "MENUNGGU_HASIL"
}
```

**Response `201 Created`**: Mengembalikan objek detail pemeriksaan (sama seperti GET `/exams/:id` tanpa `files`).

---

### PATCH `/exams/:id` — Update Pemeriksaan

**Akses**: PETUGAS

**Request Body** (hanya field yang ingin diubah):
```json
{
  "dokter_id": 2,
  "status_validasi": "TERVALIDASI",
  "status_hasil": "HASIL_TERSEDIA",
  "catatan": "Hasil sudah keluar",
  "tgl_pemeriksaan": "2025-12-31"
}
```

> **Field yang diizinkan**: `dokter_id`, `status_validasi`, `status_hasil`, `catatan`, `tgl_pemeriksaan`

**Response `200 OK`**: Mengembalikan objek detail pemeriksaan yang sudah diupdate.

---

### POST `/exams/:id/files` — Upload File Hasil

**Akses**: PETUGAS | **Content-Type**: `multipart/form-data`

**Request Body (form-data)**:
| Field | Tipe | Wajib | Deskripsi |
|-------|------|-------|-----------|
| `file` | file | ✅ | File hasil (PDF/JPEG/PNG, maks 5MB) |

**Response `200 OK`**:
```json
{
  "files": [
    {
      "id": 1,
      "pemeriksaan_id": 10,
      "blob_name": "10/uuid.pdf",
      "container": "exam-results",
      "content_type": "application/pdf",
      "size_bytes": 102400,
      "sha256": "abc123...",
      "file_type": "PDF"
    }
  ]
}
```

**Response `422 Unprocessable Entity`**:
```json
{ "message": "File required" }
```
```json
{ "message": "Only PDF, JPEG, PNG allowed" }
```
```json
{ "message": "File size exceeds 5MB limit" }
```

---

### PATCH `/exams/:id/files/:fileId` — Replace File Hasil

**Akses**: PETUGAS | **Content-Type**: `multipart/form-data`

Mengganti file yang sudah ada dengan file baru. Blob lama akan dihapus otomatis.

**Request Body (form-data)**:
| Field | Tipe | Wajib | Deskripsi |
|-------|------|-------|-----------|
| `file` | file | ✅ | File pengganti (PDF/JPEG/PNG, maks 5MB) |

**Response `200 OK`**:
```json
{
  "file": {
    "id": 1,
    "pemeriksaan_id": 10,
    "blob_name": "10/new-uuid.pdf",
    "container": "exam-results",
    "content_type": "application/pdf",
    "size_bytes": 115200,
    "sha256": "def456...",
    "file_type": "PDF"
  }
}
```

**Response `404 Not Found`**:
```json
{ "message": "File tidak ditemukan" }
```

---

### GET `/exams/:id/files/:fileId/download` — Download File Hasil

**Akses**: Auth (PASIEN hanya bisa download milik sendiri, DOKTER/PETUGAS bisa semua)

**Response `200 OK`**:
```json
{
  "url": "https://storage.blob.core.windows.net/exam-results/10/uuid.pdf?sv=...",
  "expires_at": "2025-12-31T11:00:00.000Z",
  "content_type": "application/pdf",
  "filename": "uuid.pdf"
}
```

> **Catatan**: Sama seperti download surat rujukan, `url` adalah SAS URL sementara.

**Response `403 Forbidden`**:
```json
{ "message": "Akses ditolak" }
```

---

### DELETE `/exams/:id` — Hapus Pemeriksaan

**Akses**: PETUGAS

Menghapus pemeriksaan beserta semua file terkait.

**Response `200 OK`**:
```json
{
  "success": true,
  "deletedFiles": 2
}
```

---

## 6️⃣ Modul Audit Log

### GET `/audit-logs` — List Audit Log

**Akses**: PETUGAS

**Query Parameters**:
| Parameter | Tipe | Default | Deskripsi |
|-----------|------|---------|-----------|
| `entity` | string | - | Filter entity: `registrasi`, `pendaftaran`, `pemeriksaan` |
| `page` | number | 1 | Halaman |
| `limit` | number | 20 | Jumlah per halaman (maks 100) |

**Response `200 OK`**:
```json
{
  "data": [
    {
      "id": 1,
      "entity": "pemeriksaan",
      "entity_id": 10,
      "aksi": "CREATE",
      "changed_by_akun_id": 3,
      "detail": "Pemeriksaan created",
      "created_at": "2025-12-31T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 7️⃣ Modul Devices (FCM)

### POST `/devices/token` — Simpan/Update FCM Token

**Akses**: Auth (semua role)

Digunakan untuk menyimpan Firebase Cloud Messaging token agar backend bisa mengirim push notification.

**Request Body**:
```json
{
  "fcm_token": "dGhpcyBpcyBhIHRva2VuIGV4YW1wbGU...",
  "platform": "ANDROID"
}
```

| Field | Tipe | Wajib | Deskripsi |
|-------|------|-------|-----------|
| `fcm_token` | string | ✅ | Firebase Cloud Messaging token |
| `platform` | string | ❌ | Platform device, default: `"ANDROID"` |

**Response `200 OK`**:
```json
{ "ok": true }
```

**Response `400 Bad Request`**:
```json
{ "message": "fcm_token wajib" }
```

---

## 🔧 Panduan Integrasi Frontend

### Setup Axios Instance

```javascript
import axios from 'axios';

const BASE_URL = 'https://elabora-api-production.up.railway.app';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor: tambahkan token otomatis
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: handle error global
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    if (error.response?.status === 429) {
      alert('Terlalu banyak percobaan. Silakan coba lagi nanti.');
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Contoh Penggunaan Per Modul

**Login & Simpan Token**:
```javascript
const login = async (username, password) => {
  const { data } = await api.post('/auth/login', { username, password });
  localStorage.setItem('token', data.token);
  localStorage.setItem('role', data.role);
  return data;
};
```

**Upload File (multipart/form-data)**:
```javascript
const createRegistration = async (jadwal, tanggal, file) => {
  const formData = new FormData();
  formData.append('jadwal_pemeriksaan_at', jadwal);
  formData.append('tanggal_antrian', tanggal);
  formData.append('surat_rujukan', file);

  const { data } = await api.post('/registrations/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};
```

**Download File via SAS URL**:
```javascript
const downloadFile = async (examId, fileId) => {
  const { data } = await api.get(`/exams/${examId}/files/${fileId}/download`);
  // Buka SAS URL di tab baru
  window.open(data.url, '_blank');
};
```

### CORS Configuration

Frontend origin harus terdaftar di backend. Default allowed origins:
- `http://localhost:3000`
- `http://localhost:5173`
- `http://localhost:8080`

Jika mendapat CORS error, minta backend untuk menambahkan origin frontend ke env `CORS_ALLOWED_ORIGINS`.

---

## ⚠️ Standard Error Responses

Semua endpoint bisa mengembalikan error berikut:

| Status | Deskripsi | Contoh Response |
|--------|-----------|-----------------|
| `400` | Bad Request / Validasi gagal | `{ "message": "..." }` atau `{ "errors": [...] }` |
| `401` | Token tidak ada / expired | `{ "message": "Unauthorized" }` |
| `403` | Role tidak diizinkan | `{ "message": "Forbidden" }` |
| `404` | Data tidak ditemukan | `{ "message": "..." }` |
| `409` | Duplikasi data | `{ "message": "Username atau email sudah digunakan" }` |
| `422` | File tidak valid | `{ "message": "..." }` |
| `429` | Rate limit exceeded | `{ "message": "Too many requests, please try again later" }` |
| `502` | Storage service error | `{ "message": "Gagal mengunggah..., silakan coba lagi" }` |
| `500` | Internal server error | `{ "message": "Internal Server Error" }` |

### Format Validation Error (Joi):
```json
{
  "errors": [
    {
      "msg": "Password harus minimal 8 karakter dan mengandung huruf besar, huruf kecil, angka, dan karakter khusus",
      "param": "password",
      "location": "body"
    }
  ]
}
```

---

## 📊 Enum & Konstanta

### Status Pendaftaran/Antrian
| Status | Deskripsi |
|--------|-----------|
| `MENUNGGU` | Menunggu dipanggil |
| `DILAYANI` | Sedang dilayani |
| `SELESAI` | Selesai dilayani |
| `DIBATALKAN` | Dibatalkan oleh petugas |

### Status Validasi Pemeriksaan
| Status | Deskripsi |
|--------|-----------|
| `DRAFT` | Belum divalidasi |
| `TERVALIDASI` | Sudah divalidasi dokter |

### Status Hasil Pemeriksaan
| Status | Deskripsi |
|--------|-----------|
| `MENUNGGU_HASIL` | Hasil belum tersedia |
| `HASIL_TERSEDIA` | Hasil sudah tersedia |

### Jenis Kelamin
| Value | Deskripsi |
|-------|-----------|
| `L` | Laki-laki |
| `P` | Perempuan |

### Role Pengguna
| Role | Deskripsi |
|------|-----------|
| `PASIEN` | Pasien |
| `DOKTER` | Dokter |
| `PETUGAS` | Petugas Lab |

### Tipe File yang Diizinkan
| MIME Type | Ekstensi | Kode |
|-----------|----------|------|
| `application/pdf` | `.pdf` | `PDF` |
| `image/jpeg` | `.jpg`, `.jpeg` | `JPG` |
| `image/png` | `.png` | `PNG` |

> Ukuran maksimum file: **5 MB**
