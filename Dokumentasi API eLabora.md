# 📚 Dokumentasi API Elabora

---

## 📖 Pendahuluan
Dokumentasi ini menjelaskan spesifikasi Application Programming Interface (API) Elabora, yang digunakan untuk mendukung proses autentikasi pengguna, pendaftaran pemeriksaan, pengelolaan antrian, pemeriksaan laboratorium, serta audit aktivitas sistem.

Dokumen ini ditujukan bagi:
- Tim pengembang (backend & frontend)
- Tim integrasi aplikasi mobile / web
- Pihak penguji sistem
- Dokumentasi resmi proyek

## ℹ️ Informasi Umum

### 🌐 Base URL
```plaintext
{{baseURL}} = https://elabora-api-production.up.railway.app
```
API di-deploy via Railway.

### 📊 Format Data
- Seluruh request dan response menggunakan format **JSON**.
- Upload berkas menggunakan **multipart/form-data**.

### ⏰ Zona Waktu
Seluruh informasi waktu menggunakan format **ISO 8601 (UTC)** kecuali dinyatakan lain.

## 🔒 Keamanan dan Autentikasi
API Elabora menerapkan mekanisme **JSON Web Token (JWT)** untuk mengamankan endpoint yang bersifat terbatas.

### Header Autentikasi
```plaintext
Authorization: Bearer <token>
Accept: application/json
```

### Peran Pengguna
| Role    | Keterangan                          |
|---------|-------------------------------------|
| PASIEN  | Pengguna layanan pemeriksaan        |
| DOKTER  | Dokter pemeriksa                   |
| PETUGAS | Petugas laboratorium / administrasi |

## 📋 Ringkasan Endpoint
| Modul                                   | Nama Request                      | Method | Path                                   |
|-----------------------------------------|-----------------------------------|--------|----------------------------------------|
| Auth                                    | Login Pasien                      | `POST` | `{{baseURL}}/auth/login`              |
| Auth                                    | Login Dokter                      | `POST` | `{{baseURL}}/auth/login`              |
| Auth                                    | Login Petugas                     | `POST` | `{{baseURL}}/auth/login`              |
| Auth                                    | Register Pasien                   | `POST` | `{{baseURL}}/auth/register`           |
| Auth                                    | Register Dokter                   | `POST` | `{{baseURL}}/auth/register-dokter`    |
| Auth                                    | Register Petugas                  | `POST` | `{{baseURL}}/auth/register-petugas`   |
| Auth                                    | Get Profile                       | `GET`  | `{{baseURL}}/auth/me`                 |
| Pemeriksaan dan Hasil (Petugas Only)   | Create Pemeriksaan                | `POST` | `{{baseURL}}/exams/`                  |
| Pemeriksaan dan Hasil (Petugas Only)   | Upload Hasil Pemeriksaan          | `POST` | `{{baseURL}}/exams/10/files`          |
| Pemeriksaan dan Hasil (Petugas Only)   | Update Status Hasil               | `PATCH`| `{{baseURL}}/exams/10`                |
| Antrian                                 | Memanggil Antrian                 | `POST` | `{{baseURL}}/queue/11/call`           |
| Antrian                                 | Next Antrian                      | `POST` | `{{baseURL}}/queue/9/next`            |
| Antrian                                 | Cancel Antrian                    | `POST` | `{{baseURL}}/queue/9/cancel`          |
| Antrian                                 | Get Antrian Today                 | `GET`  | `{{baseURL}}/queue/today`             |
| Antrian                                 | Get Statistik Antrian             | `GET`  | `{{baseURL}}/queue/stats`             |
| Pendaftaran (Registrations)             | Pendaftaran Pemeriksaan            | `POST` | `{{baseURL}}/registrations/`          |
| Patients (Dokter & Petugas only)       | Get All Pasien                    | `GET`  | `{{baseURL}}/patients/`                |
| Patients (Dokter & Petugas only)       | Get Detail Pasien                 | `GET`  | `{{baseURL}}/patients/7`               |
| Audit Log (Petugas Only)                | Get All Audit Log                 | `GET`  | `{{baseURL}}/audit-logs`               |


## Auth

### Login Pasien

- **Method**: `POST`
- **Path**: `/auth/login`
- **Akses**: Semua role (public), kecuali `/auth/me` membutuhkan token

**Request Body (JSON)**
```json
{
  "username": "ilhamridzuan",
  "password": "password123"
}
```

**Contoh Response**
- **200 OK**
```json
{
  "message": "Login berhasil",
  "data": {
    "token": "jwt_token",
    "role": "PASIEN"
  }
}
```
- **401 Unauthorized**
```json
{
  "message": "Username atau password tidak valid"
}
```

---

### Login Dokter

- **Method**: `POST`
- **Path**: `/auth/login`
- **Akses**: Semua role (public), kecuali `/auth/me` membutuhkan token

**Request Body (JSON)**
```json
{
  "username": "alfianrizky",
  "password": "password123"
}
```

**Contoh Response**
- **200 OK**
```json
{
  "message": "Login berhasil",
  "data": {
    "token": "jwt_token",
    "role": "PASIEN"
  }
}
```
- **401 Unauthorized**
```json
{
  "message": "Username atau password tidak valid"
}
```

---

### Login Petugas

- **Method**: `POST`
- **Path**: `/auth/login`
- **Akses**: Semua role (public), kecuali `/auth/me` membutuhkan token

**Request Body (JSON)**
```json
{
  "username": "pieterimmanuel",
  "password": "password123"
}
```

**Contoh Response**
- **200 OK**
```json
{
  "message": "Login berhasil",
  "data": {
    "token": "jwt_token",
    "role": "PASIEN"
  }
}
```
- **401 Unauthorized**
```json
{
  "message": "Username atau password tidak valid"
}
```

---

### Register Pasien

- **Method**: `POST`
- **Path**: `/auth/register`
- **Akses**: Semua role (public), kecuali `/auth/me` membutuhkan token

**Request Body (JSON)**
```json
{
  "username": "ilhamridzuan",
  "email": "ilhamridzuan@mail.com",
  "password": "password123",
  "nik": "1234567890123456",
  "nama": "Ilham Ridzuan",
  "jenis_kelamin": "L",
  "tgl_lahir": "2005-07-26",
  "alamat": "Tanjungpinang",
  "no_telepon": "089673217735"
}
```

**Contoh Response**
- **201 Created**
```json
{
  "message": "Registrasi pasien berhasil",
  "data": {
    "id": 1,
    "username": "string",
    "nama": "string"
  }
}
```
- **400 Bad Request**
```json
{
  "message": "Data registrasi tidak valid"
}
```

---

### Register Dokter

- **Method**: `POST`
- **Path**: `/auth/register-dokter`
- **Akses**: Semua role (public), kecuali `/auth/me` membutuhkan token

**Request Body (JSON)**
```json
{
  "username": "alfianrizky",
  "email": "alfianrizky@mail.com",
  "password": "password123",
  "nip": "12345678901234567890",
  "nama": "Dr. Alfian Rizky"
}
```

**Contoh Response**
- **201 Created**
```json
{
  "message": "Registrasi dokter berhasil",
  "data": {
    "id": 1,
    "username": "string",
    "nama": "string"
  }
}
```
- **400 Bad Request**
```json
{
  "message": "Data registrasi tidak valid"
}
```

---

### Register Petugas

- **Method**: `POST`
- **Path**: `/auth/register-petugas`
- **Akses**: Semua role (public), kecuali `/auth/me` membutuhkan token

**Request Body (JSON)**
```json
{
  "username": "pieterimmanuel",
  "email": "pieter@mail.com",
  "password": "password123",
  "nip": "12345678900987654321",
  "nama": "Pieter Immanuel"
}
```

**Contoh Response**
- **201 Created**
```json
{
  "message": "Registrasi petugas berhasil",
  "data": {
    "id": 1,
    "username": "string",
    "nama": "string"
  }
}
```
- **400 Bad Request**
```json
{
  "message": "Data registrasi tidak valid"
}
```

---

### Get Profile

- **Method**: `GET`
- **Path**: `/auth/me`
- **Akses**: Semua role (public), kecuali `/auth/me` membutuhkan token

**Contoh Response**
- **200 OK**
```json
{
  "data": {
    "id": 1,
    "username": "string",
    "nama": "string",
    "role": "PASIEN",
    "email": "string"
  }
}
```
- **401 Unauthorized**
```json
{
  "message": "Token tidak valid atau kedaluwarsa"
}
```

---

## POST Create Pemeriksaan

- **Method**: `POST`
- **Path**: `/exams/`
- **Akses**: PETUGAS

### Header
```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer {{token}}
```

### Request Body (JSON)
```json
{
  "pendaftaran_id": 10,
  "kategori_id": 2,
  "dokter_id": null,
  "catatan": "Pemeriksaan awal",
  "status_validasi": "DRAFT",
  "status_hasil": "MENUNGGU_HASIL"
}
```

### Contoh Response
- **201 Created**
```json
{
  "message": "Pemeriksaan berhasil dibuat",
  "data": {
    "id": 10,
    "pendaftaran_id": 10,
    "kategori_id": 2,
    "status_validasi": "DRAFT",
    "status_hasil": "MENUNGGU_HASIL"
  }
}
```
- **403 Forbidden**
```json
{
  "message": "Akses ditolak. Khusus petugas."
}
```

---

## POST Upload Hasil Pemeriksaan

- **Method**: `POST`
- **Path**: `/exams/10/files`
- **Akses**: PETUGAS

### Header
```http
Accept: application/json
Authorization: Bearer {{token}}
```

### Request Body (multipart/form-data)

| Field | Tipe | Contoh/Deskripsi |
|---|---|---|
| `file` | `file` | File (contoh path lokal di Postman: `/C:/Users/Ridzuan/Downloads/Hasil_Pemeriksaan_Lab_Dummy.pdf`) |

### Contoh Response
- **200 OK**
```json
{
  "message": "Berkas hasil pemeriksaan berhasil diunggah",
  "data": {
    "file_name": "hasil_pemeriksaan.pdf",
    "file_type": "PDF"
  }
}
```
- **400 Bad Request**
```json
{
  "message": "File tidak valid"
}
```

---

## PATCH Update Status Hasil

- **Method**: `PATCH`
- **Path**: `/exams/10`
- **Akses**: PETUGAS

### Header
```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer {{token}}
```

### Request Body (JSON)
```json
{
  "status_validasi": "TERVALIDASI",
  "status_hasil": "HASIL_TERSEDIA"
}
```

### Contoh Response
- **200 OK**
```json
{
  "message": "Status pemeriksaan berhasil diperbarui",
  "data": {
    "status_validasi": "TERVALIDASI",
    "status_hasil": "HASIL_TERSEDIA"
  }
}
```
- **404 Not Found**
```json
{
  "message": "Pemeriksaan tidak ditemukan"
}
```
## Antrian

### POST Memanggil antrian

- **Method**: `POST`
- **Path**: `/queue/11/call`
- **Akses**: -

**Header**
```http
Accept: application/json
Authorization: Bearer {{token}}
```

**Contoh Response**
- **200 OK**
```json
{
  "message": "Antrian dipanggil",
  "data": {
    "id": 11,
    "status": "DIPANGGIL"
  }
}
```
- **404 Not Found**
```json
{
  "message": "Antrian tidak ditemukan"
}
```

---

### POST Next Antrian

- **Method**: `POST`
- **Path**: `/queue/9/next`
- **Akses**: -

**Header**
```http
Accept: application/json
Authorization: Bearer {{token}}
```

**Contoh Response**
- **200 OK**
```json
{
  "message": "Berhasil memproses antrian berikutnya",
  "data": {
    "id": 10,
    "status": "DILAYANI"
  }
}
```
- **404 Not Found**
```json
{
  "message": "Antrian tidak ditemukan"
}
```

---

### POST Cancel Antrian

- **Method**: `POST`
- **Path**: `/queue/9/cancel`
- **Akses**: -

**Header**
```http
Accept: application/json
Authorization: Bearer {{token}}
```

**Request Body (JSON)**
```json
{
  "reason": "Pasien membatalkan pemeriksaan"
}
```

**Contoh Response**
- **200 OK**
```json
{
  "message": "Antrian berhasil dibatalkan",
  "data": {
    "id": 9,
    "status": "DIBATALKAN"
  }
}
```
- **400 Bad Request**
```json
{
  "message": "Alasan pembatalan wajib diisi"
}
```

---

### Get Antrian Today

- **Method**: `GET`
- **Path**: `/queue/today`
- **Akses**: -

**Contoh Response**
- **200 OK**
```json
{
  "tanggal": "YYYY-MM-DD",
  "data": [
    {
      "id": 1,
      "pasien_id": 1,
      "nama": "string",
      "no_antrian": 1,
      "status": "MENUNGGU"
    }
  ]
}
```

---

### Get Statistik Antrian

- **Method**: `GET`
- **Path**: `/queue/stats`
- **Akses**: -

**Contoh Response**
- **200 OK**
```json
{
  "total": 0,
  "menunggu": 0,
  "dilayani": 0,
  "selesai": 0,
  "dibatalkan": 0
}
```

---

## Pendaftaran (Registrations)

### Pendaftaran Pemeriksaan

- **Method**: `POST`
- **Path**: `/registrations/`
- **Akses**: PASIEN

**Request Body (multipart/form-data)**

| Field                     | Tipe   | Contoh/Deskripsi                                               |
|---------------------------|--------|---------------------------------------------------------------|
| `jadwal_pemeriksaan_at`   | `text` | `2025-12-31 20:00:00`                                        |
| `surat_rujukan`           | `file` | File (contoh path lokal di Postman: `/C:/Users/ridzuan/Downloads/Surat_Rujukan_Dummy.pdf`) |
| `tanggal_antrian`         | `text` | `2025-12-31`                                                 |

**Contoh Response**
- **201 Created**
```json
{
  "message": "Pendaftaran pemeriksaan berhasil",
  "data": {
    "id": 15,
    "no_antrian": 5,
    "tanggal_antrian": "YYYY-MM-DD"
  }
}
```
- **400 Bad Request**
```json
{
  "message": "Data pendaftaran tidak valid"
}
```
---

## Patients (Dokter & Petugas only) 👩‍⚕️👨‍⚕️

### GET ALL PASIEN
- **Method**: `GET`
- **Path**: `/patients/`
- **Access**: DOKTER, PETUGAS

**Example Response**
- **200 OK**
```json
{
  "data": [
    {
      "id": 7,
      "nama": "string",
      "nik": "string"
    }
  ]
}
```

---

### GET DETAIL PASIEN
- **Method**: `GET`
- **Path**: `/patients/7`
- **Access**: DOKTER, PETUGAS

**Example Response**
- **200 OK**
```json
{
  "data": {
    "id": 7,
    "nama": "string",
    "nik": "string",
    "alamat": "string",
    "no_telepon": "string"
  }
}
```
- **404 Not Found**
```json
{
  "message": "Pasien tidak ditemukan"
}
```

---

## Audit Log (Petugas Only) 📋

### Get All Audit Log
- **Method**: `GET`
- **Path**: `/audit-logs`
- **Access**: PETUGAS

**Example Response**
- **200 OK**
```json
{
  "data": [
    {
      "id": 1,
      "aksi": "CREATE",
      "entity": "pemeriksaan",
      "created_at": "ISO-8601"
    }
  ]
}
```

---

## Standard Error Format ⚠️
```json
{
  "message": "Pesan kesalahan",
  "errors": []
}
```

---

## HTTP Status Codes 📊
| Code | Description |
|---:|---|
| 400 | Bad Request (permintaan tidak valid) |
| 401 | Unauthorized (token tidak valid/kedaluwarsa) |
| 403 | Forbidden (hak akses tidak mencukupi) |
| 404 | Not Found (data tidak ditemukan) |
| 500 | Internal Server Error |

---

## Conclusion 📝
Dokumentasi ini diharapkan dapat menjadi acuan resmi dalam proses pengembangan, integrasi, dan pengujian sistem Elabora. Perubahan terhadap API harus disertai pembaruan dokumentasi ini secara berkala.