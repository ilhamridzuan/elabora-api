# TEST CASE WBT

**Nama Project: eLabora - Sistem Informasi lab**

**Fungsi yang di gunakan untuk test case ini adalah yang berada pada file auth.service, registration.service, patients.service, dan exams.service.**

\---

## TC - 01

* **No:** 1
* **Requirement ID:** FR - 01

**Test Description**

Gagal login karena username tidak terdaftar di database.

**Test Steps**

1. Panggil fungsi `AuthService.login("usernotfound", "P@ssw0rd!")`.
2. Ambil koneksi database via `db.getConnection()`.
3. Panggil `AuthRepository.findByUsername` — mock return: `null`.
4. Sistem mendeteksi `!akun` bernilai `true`.
5. Sistem membuat error dan melemparnya.
6. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```
username: "usernotfound",
password: "P@ssw0rd!"
```

**Expected Result**

* Melempar objek Error.
* `error.message` = `"Username atau password salah"`
* `error.status` = `401`
* `conn.release()` tetap dipanggil tepat 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 02

* **No:** 2
* **Requirement ID:** FR - 01

**Test Description**

Gagal login karena password tidak cocok (mismatch).

**Test Steps**

1. Panggil fungsi `AuthService.login("misteraloy", "WrongPass999!")`.
2. Ambil koneksi database via `db.getConnection()`.
3. Panggil `AuthRepository.findByUsername` — mock return: `{ id: 7, username: "misteraloy", password_hash: "<bcrypt_hash>", role: "PASIEN" }`.
4. Panggil `bcrypt.compare` — mock return: `false`.
5. Sistem mendeteksi `!match` bernilai `true`.
6. Sistem membuat error dan melemparnya.
7. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```
username: "misteraloy",
password: "WrongPass999!"
```

> Pre-condition: Mock `AuthRepository.findByUsername` mengembalikan user valid dengan `password_hash` yang tidak cocok dengan password input.

**Expected Result**

* Melempar objek Error.
* `error.message` = `"Username atau password salah"`
* `error.status` = `401`
* `conn.release()` tetap dipanggil tepat 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 03

* **No:** 3
* **Requirement ID:** FR - 01

**Test Description**

Berhasil login dengan kredensial yang valid.

**Test Steps**

1. Panggil fungsi `AuthService.login("misteraloy", "@Password123")`.
2. Ambil koneksi database via `db.getConnection()`.
3. Panggil `AuthRepository.findByUsername` — mock return: `{ id: 7, username: "misteraloy", password_hash: "<bcrypt_hash>", role: "PASIEN" }`.
4. Panggil `bcrypt.compare` — mock return: `true`.
5. Sistem men-generate JWT Token dari payload `{ akun_id: 7, role: "PASIEN" }`.
6. Fungsi mengembalikan `{ token, role }`.
7. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```
username: "misteraloy",
password: "@Password123"
```

> Pre-condition: Mock `AuthRepository.findByUsername` mengembalikan `{ id: 7, username: "misteraloy", password_hash: "<bcrypt_hash>", role: "PASIEN" }`. Mock `bcrypt.compare` mengembalikan `true`.

**Expected Result**

* Mengembalikan objek `{ token: "<string_jwt>", role: "PASIEN" }`.
* `token` adalah string non-kosong.
* `conn.release()` dipanggil tepat 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 04

* **No:** 4
* **Requirement ID:** FR - 02

**Test Description**

Gagal Registrasi: Username atau Email sudah terdaftar.

**Test Steps**

1. Panggil fungsi `AuthService.registerPasien(payload)`.
2. Ambil koneksi database via `db.getConnection()`.
3. Panggil `AuthRepository.checkUsernameOrEmailExists` — mock return: `true`.
4. Sistem mendeteksi `exists` bernilai `true`.
5. Sistem membuat error dan melemparnya sebelum transaksi dimulai.
6. Blok `catch` memicu `conn.rollback()`, kemudian blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
payload: {
  username: "misteraloy",
  email: "misteraloy@mail.com",
  password: "@Password123",
  nik: "4321098743216666",
  nama: "Aldy Kurniawan",
  jenis_kelamin: "L"
}
```

**Expected Result**

* Melempar objek Error.
* `error.message` = `"Username atau email sudah digunakan"`
* `error.status` = `409`
* `conn.beginTransaction` **tidak** dipanggil.
* `conn.release()` dipanggil tepat 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 05

* **No:** 5
* **Requirement ID:** FR - 02

**Test Description**

Registrasi Sukses: Kredensial unik dan semua proses insert berhasil.

**Test Steps**

1. Panggil fungsi `AuthService.registerPasien(payload)`.
2. Panggil `AuthRepository.checkUsernameOrEmailExists` — mock return: `false`.
3. Jalankan `conn.beginTransaction()`.
4. Panggil `bcrypt.hash` — mock return: `"$2b$12$hashedpassword"`.
5. Panggil `AuthRepository.insertAkun` — mock return: `101` (akunId baru).
6. Panggil `AuthRepository.insertPasien` dengan `akun_id = 101`.
7. Jalankan `conn.commit()`.
8. Generate JWT Token dari payload `{ akun_id: 101, role: "PASIEN" }`.
9. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
payload: {
  username: "testpasienbaru1",
  email: "testpasienbaru1@mail.com",
  password: "@Password123",
  nik: "3273888843210987",
  nama: "Budi Santoso",
  jenis_kelamin: "L"
}
```

> Pre-condition: Mock `checkUsernameOrEmailExists` → `false`. Mock `insertAkun` → `101`.

**Expected Result**

* Mengembalikan objek: `{ akun_id: 101, role: "PASIEN", token: "<string_jwt>" }`.
* `conn.beginTransaction()`, `conn.commit()`, dan `conn.release()` masing-masing dipanggil tepat 1 kali.
* `conn.rollback()` **tidak** dipanggil.

**Actual Result**

*(belum diisi)*

\---

## TC - 06

* **No:** 6
* **Requirement ID:** FR - 02

**Test Description**

Gagal Registrasi (Error DB): Terjadi kegagalan sistem saat operasi insert ke DB.

**Test Steps**

1. Panggil fungsi `AuthService.registerPasien(payload)`.
2. Panggil `AuthRepository.checkUsernameOrEmailExists` — mock return: `false`.
3. Jalankan `conn.beginTransaction()`.
4. Panggil `bcrypt.hash` — mock return: `"$2b$12$hashedpassword"`.
5. Panggil `AuthRepository.insertAkun` — mock return: `101`.
6. Panggil `AuthRepository.insertPasien` — mock **melempar** `new Error("ER_DUP_ENTRY")`.
7. Aliran masuk ke blok `catch`, jalankan `conn.rollback()`.
8. Error dilempar kembali (`throw err`).
9. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
payload: {
  username: "testpasienbaru2",
  email: "testpasienbaru2@mail.com",
  password: "@Password123",
  nik: "3273000098764321",
  nama: "Teddy Kurniawan",
  jenis_kelamin: "L"
}
```

> Pre-condition: Mock `checkUsernameOrEmailExists` → `false`. Mock `insertAkun` → `101`. Mock `insertPasien` → melempar `new Error("ER_DUP_ENTRY")`.

**Expected Result**

* Melempar kembali error database yang sama (`error.message = "ER_DUP_ENTRY"`).
* `conn.beginTransaction()` dipanggil 1 kali.
* `conn.rollback()` dipanggil 1 kali.
* `conn.release()` dipanggil 1 kali.
* `conn.commit()` **tidak** dipanggil.

**Actual Result**

*(belum diisi)*

\---

## TC - 07

* **No:** 7
* **Requirement ID:** FR - 03

**Test Description**

Gagal Validasi: File rujukan tidak diunggah (null/undefined).

**Test Steps**

1. Panggil `RegistrationService.create(payload)` dengan `file: null`.
2. Evaluasi kondisi `!file` — bernilai `true`.
3. Sistem membuat error dan langsung melemparnya (tanpa menyentuh DB).

**Test Input Data**

```javascript
payload: {
  akun_id: 1,
  jadwal_pemeriksaan_at: "2026-07-01 10:00:00",
  tanggal_antrian: "2026-07-01",
  file: null
}
```

**Expected Result**

* Melempar objek Error.
* `error.statusCode` = `400`
* `error.message` = `"Surat rujukan wajib diupload"`
* `db.getConnection()` **tidak** dipanggil.

**Actual Result**

*(belum diisi)*

\---

## TC - 08

* **No:** 8
* **Requirement ID:** FR - 03

**Test Description**

Gagal Validasi: Format tipe berkas tidak sesuai aturan whitelist.

**Test Steps**

1. Panggil `RegistrationService.create(payload)` dengan file bertipe `.exe`.
2. Lolos validasi keberadaan file (`!file` = `false`).
3. Evaluasi kondisi MIME (`"application/x-msdownload"` tidak ada di `ALLOWED_MIME`) — bernilai `true`.
4. Sistem melempar error format.

**Test Input Data**

```javascript
payload: {
  akun_id: 1,
  jadwal_pemeriksaan_at: "2026-07-01 10:00:00",
  tanggal_antrian: "2026-07-01",
  file: {
    originalname: "skrip.exe",
    mimetype: "application/x-msdownload",
    size: 1024,
    buffer: Buffer.from("fake")
  }
}
```

**Expected Result**

* Melempar objek Error.
* `error.statusCode` = `422`
* `error.message` = `"Format file tidak diizinkan"`
* `db.getConnection()` **tidak** dipanggil.

**Actual Result**

*(belum diisi)*

\---

## TC - 09

* **No:** 9
* **Requirement ID:** FR - 03

**Test Description**

Gagal Validasi: Ukuran berkas melebihi batasan sistem (> 5MB).

**Test Steps**

1. Panggil `RegistrationService.create(payload)` dengan file PDF berukuran 6MB.
2. Lolos validasi keberadaan file dan validasi format MIME/ext.
3. Evaluasi kondisi `file.size > 5 * 1024 * 1024` — bernilai `true`.
4. Sistem melempar error ukuran.

**Test Input Data**

```javascript
payload: {
  akun_id: 1,
  jadwal_pemeriksaan_at: "2026-07-01 10:00:00",
  tanggal_antrian: "2026-07-01",
  file: {
    originalname: "rujukan.pdf",
    mimetype: "application/pdf",
    size: 6 * 1024 * 1024,
    buffer: Buffer.alloc(6 * 1024 * 1024)
  }
}
```

**Expected Result**

* Melempar objek Error.
* `error.statusCode` = `422`
* `error.message` = `"File size exceeds 5MB limit"`
* `db.getConnection()` **tidak** dipanggil.

**Actual Result**

*(belum diisi)*

\---

## TC - 10

* **No:** 10
* **Requirement ID:** FR - 03

**Test Description**

Gagal Bisnis (Kompensasi): Data entitas Pasien tidak ditemukan di DB.

**Test Steps**

1. Panggil `RegistrationService.create(payload)` dengan file valid.
2. Lolos semua validasi file (presence, MIME, size).
3. `blobService.upload` berhasil (mock sukses).
4. Buka koneksi DB, jalankan `conn.beginTransaction()`.
5. Panggil `RegistrationRepository.findPasienByAkunId` — mock return: `null`.
6. Sistem mendeteksi `!pasien` = `true`, jalankan `conn.rollback()`.
7. Jalankan kompensasi `blobService.deleteBlob`.
8. Return objek `{ ok: false, status: 404, message: "Pasien tidak ditemukan" }`.
9. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
payload: {
  akun_id: 999,
  jadwal_pemeriksaan_at: "2026-07-01 10:00:00",
  tanggal_antrian: "2026-07-01",
  file: {
    originalname: "rujukan.pdf",
    mimetype: "application/pdf",
    size: 100000,
    buffer: Buffer.from("pdf-content")
  }
}
```

> Pre-condition: Mock `RegistrationRepository.findPasienByAkunId` → `null`. Mock `blobService.upload` → sukses. Mock `blobService.deleteBlob` → sukses.

**Expected Result**

* Mengembalikan objek: `{ ok: false, status: 404, message: "Pasien tidak ditemukan" }`.
* `blobService.deleteBlob` dipanggil 1 kali.
* `conn.rollback()` dipanggil 1 kali.
* `conn.release()` dipanggil 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 11

* **No:** 11
* **Requirement ID:** FR - 03

**Test Description**

Pendaftaran Sukses: Seluruh rangkaian proses validasi, berkas, dan DB berhasil.

**Test Steps**

1. Panggil `RegistrationService.create(payload)` dengan file PDF valid.
2. Lolos semua validasi file; `blobService.upload` sukses.
3. Buka koneksi DB, jalankan `conn.beginTransaction()`.
4. `RegistrationRepository.findPasienByAkunId` — mock return: `{ id: 5, akun_id: 1, nik: "...", nama: "Budi" }`.
5. `RegistrationRepository.getLastQueueNumberForDate` — mock return: `2`.
6. Hitung `nextNo = 3`; `RegistrationRepository.getNextPendaftaranId` — mock return: `12`.
7. `RegistrationRepository.insertPendaftaran` — mock return: `12`.
8. `RegistrationRepository.updateNoLab` dengan `no_lab = "LAB-20260701-0012"`.
9. `AuditRepository.insert` dipanggil.
10. Jalankan `conn.commit()`.
11. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
payload: {
  akun_id: 1,
  jadwal_pemeriksaan_at: "2026-07-01 10:00:00",
  tanggal_antrian: "2026-07-01",
  file: {
    originalname: "rujukan.pdf",
    mimetype: "application/pdf",
    size: 100000,
    buffer: Buffer.from("pdf-content")
  }
}
```

> Pre-condition: Semua mock repositori sukses. `findPasienByAkunId` → `{ id: 5 }`. `getLastQueueNumberForDate` → `2`. `getNextPendaftaranId` → `12`.

**Expected Result**

* Mengembalikan objek:
  ```json
  {
    "id": 12,
    "no_antrian": "003",
    "no_lab": "LAB-20260701-0012",
    "status": "MENUNGGU",
    "tanggal_antrian": "2026-07-01",
    "jadwal_pemeriksaan_at": "2026-07-01 10:00:00"
  }
  ```
* `no_antrian` terformat padding 3 digit (`"003"`).
* `conn.commit()` dan `conn.release()` masing-masing dipanggil 1 kali.
* `blobService.deleteBlob` **tidak** dipanggil.

**Actual Result**

*(belum diisi)*

\---

## TC - 12

* **No:** 12
* **Requirement ID:** FR - 04

**Test Description**

Pasien Tidak Ditemukan: Mengembalikan objek null jika `akun_id` tidak terdaftar sebagai pasien.

**Test Steps**

1. Panggil `RegistrationService.queueToday({ akun_id: 999 })`.
2. Ambil koneksi DB via `db.getConnection()`.
3. Panggil `RegistrationRepository.findPasienByAkunId` — mock return: `null`.
4. Evaluasi kondisi `!pasien` — bernilai `true`.
5. Fungsi langsung return `{ my: null, stats: null }`.
6. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
payload: {
  akun_id: 999
}
```

> Pre-condition: Mock `RegistrationRepository.findPasienByAkunId` → `null`.

**Expected Result**

* Mengembalikan objek: `{ my: null, stats: null }`.
* `conn.release()` dipanggil tepat 1 kali.
* `RegistrationRepository.findMyQueueToday` **tidak** dipanggil.
* `RegistrationRepository.getQueueStats` **tidak** dipanggil.

**Actual Result**

*(belum diisi)*

\---

## TC - 13

* **No:** 13
* **Requirement ID:** FR - 04

**Test Description**

Data Antrian Ditemukan: Mengembalikan data antrian saya dan statistik hari ini secara lengkap.

**Test Steps**

1. Panggil `RegistrationService.queueToday({ akun_id: 10 })`.
2. Ambil koneksi DB via `db.getConnection()`.
3. Panggil `RegistrationRepository.findPasienByAkunId` — mock return: `{ id: 5, akun_id: 10 }`.
4. Evaluasi kondisi `!pasien` — bernilai `false`.
5. Panggil `RegistrationRepository.findMyQueueToday` — mock return: `{ id: 7, no_antrian: 3, status: "MENUNGGU", no_lab: "LAB-20260614-0007" }`.
6. Panggil `RegistrationRepository.getQueueStats` — mock return: `{ total: 10, menunggu: 5, dilayani: 1, selesai: 4, dibatalkan: 0 }`.
7. Kembalikan objek kombinasi data.
8. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
payload: {
  akun_id: 10
}
```

> Pre-condition: Mock `findPasienByAkunId` → `{ id: 5, akun_id: 10 }`. Mock `findMyQueueToday` dan `getQueueStats` → data valid.

**Expected Result**

* Mengembalikan objek yang memiliki properti `my`, `stats`, dan `tanggal`.
* `my` berisi data antrian pasien (objek non-null).
* `stats` berisi ringkasan statistik antrian hari ini.
* `tanggal` berisi tanggal hari ini dalam format `YYYY-MM-DD`.
* `conn.release()` dipanggil tepat 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 14

* **No:** 14
* **Requirement ID:** FR - 05 & FR - 06

**Test Description**

Ambil Daftar Sukses: Memastikan fungsi mengembalikan array data pemeriksaan pasien dan koneksi dilepaskan.

**Test Steps**

1. Panggil `ExamsService.listByPatient(5)`.
2. Ambil koneksi database via `db.getConnection()`.
3. Panggil `ExamsRepository.listByPatient(conn, { pasien_id: 5 })`.
4. Mock repositori mengembalikan array objek pemeriksaan.
5. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
pasienId: 5
```

> Pre-condition: Mock `ExamsRepository.listByPatient` → `[{ pemeriksaan_id: 1, tgl_pemeriksaan: "2026-06-14", status_hasil: "MENUNGGU_HASIL" }]`.

**Expected Result**

* Mengembalikan array objek pemeriksaan (contoh: `[{ pemeriksaan_id: 1, tgl_pemeriksaan: "2026-06-14", status_hasil: "MENUNGGU_HASIL" }]`).
* `conn.release()` dipanggil tepat 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 15

* **No:** 15
* **Requirement ID:** FR - 05 & FR - 06

**Test Description**

Gagal Ambil Data (DB Error): Memastikan koneksi database tetap dilepaskan dengan aman meskipun query repositori mengalami crash.

**Test Steps**

1. Panggil `ExamsService.listByPatient(5)`.
2. Ambil koneksi database via `db.getConnection()`.
3. Panggil `ExamsRepository.listByPatient` — mock **melempar** `new Error("DB connection lost")`.
4. Aliran otomatis melompat ke blok `finally`.
5. Eksekusi `conn.release()`.

**Test Input Data**

```javascript
pasienId: 5
```

> Pre-condition: Mock `ExamsRepository.listByPatient` → melempar `new Error("DB connection lost")`.

**Expected Result**

* Melempar kembali objek error database asli (`error.message = "DB connection lost"`).
* `conn.release()` wajib tetap dipanggil tepat 1 kali untuk mencegah connection leak.

**Actual Result**

*(belum diisi)*

\---

## TC - 16

* **No:** 16
* **Requirement ID:** FR - 07

**Test Description**

Pemeriksaan Tidak Ditemukan: Melempar error 404 jika ID pemeriksaan tidak ada di database.

**Test Steps**

1. Panggil `ExamsService.detail(999)`.
2. Ambil koneksi DB via `db.getConnection()`.
3. Panggil `ExamsRepository.getDetail(conn, 999)` — mock return: `null`.
4. Evaluasi kondisi `!item` — bernilai `true`.
5. Sistem membuat dan melempar objek error.
6. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
pemeriksaanId: 999
```

> Pre-condition: Mock `ExamsRepository.getDetail` → `null`.

**Expected Result**

* Melempar objek Error.
* `error.statusCode` = `404`
* `error.message` = `"Pemeriksaan not found"`
* `ExamsRepository.listFiles` **tidak** dipanggil.
* `conn.release()` dipanggil tepat 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 17

* **No:** 17
* **Requirement ID:** FR - 07

**Test Description**

Ambil Hasil Pemeriksaan Sukses: Mengembalikan data pemeriksaan lengkap beserta array file pendukungnya.

**Test Steps**

1. Panggil `ExamsService.detail(8)`.
2. Ambil koneksi DB via `db.getConnection()`.
3. Panggil `ExamsRepository.getDetail(conn, 8)` — mock return: `{ id: 8, pasien_nama: "Budi", status_hasil: "MENUNGGU_HASIL" }`.
4. Evaluasi kondisi `!item` — bernilai `false`.
5. Panggil `ExamsRepository.listFiles(conn, 8)` — mock return: `[{ id: 1, blob_name: "2026/06/uuid.pdf", file_type: "PDF" }]`.
6. Fungsi mengembalikan objek gabungan.
7. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
pemeriksaanId: 8
```

> Pre-condition: Mock `ExamsRepository.getDetail` → `{ id: 8, pasien_nama: "Budi", status_hasil: "MENUNGGU_HASIL" }`. Mock `ExamsRepository.listFiles` → `[{ id: 1, blob_name: "...", file_type: "PDF" }]`.

**Expected Result**

* Mengembalikan objek yang merupakan spread dari data detail + properti `files`:
  ```json
  {
    "id": 8,
    "pasien_nama": "Budi",
    "status_hasil": "MENUNGGU_HASIL",
    "files": [{ "id": 1, "blob_name": "...", "file_type": "PDF" }]
  }
  ```
* `conn.release()` dipanggil tepat 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 18

* **No:** 18
* **Requirement ID:** FR - 08

**Test Description**

Gagal Download: Pemeriksaan ID tidak ditemukan di DB.

**Test Steps**

1. Panggil `ExamsService.downloadFile({ pemeriksaanId: 999, fileId: 1, user: { role: "DOKTER", akun_id: 5 } })`.
2. Ambil koneksi DB via `db.getConnection()`.
3. Panggil `ExamsRepository.getDetail(conn, 999)` — mock return: `null`.
4. Evaluasi kondisi `!exam` — bernilai `true`.
5. Sistem melempar error 404.
6. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
pemeriksaanId: 999,
fileId: 1,
user: { role: "DOKTER", akun_id: 5 }
```

> Pre-condition: Mock `ExamsRepository.getDetail` → `null`.

**Expected Result**

* Melempar objek Error.
* `error.statusCode` = `404`
* `error.message` = `"Pemeriksaan tidak ditemukan"`
* `conn.release()` dipanggil tepat 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 19

* **No:** 19
* **Requirement ID:** FR - 08

**Test Description**

Gagal Download: File baris DB tidak ada atau milik pemeriksaan lain.

**Test Steps**

1. Panggil `ExamsService.downloadFile({ pemeriksaanId: 1, fileId: 99, user: { role: "DOKTER", akun_id: 5 } })`.
2. Ambil koneksi DB via `db.getConnection()`.
3. Panggil `ExamsRepository.getDetail(conn, 1)` — mock return: `{ id: 1, pasien_id: 3 }`.
4. Lolos kondisi `!exam` (False).
5. Panggil `ExamsRepository.getFileById(conn, 99)` — mock return: `null`.
6. Evaluasi kondisi `!fileRow || fileRow.pemeriksaan_id !== pemeriksaanId` — bernilai `true`.
7. Sistem melempar error 404.
8. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
pemeriksaanId: 1,
fileId: 99,
user: { role: "DOKTER", akun_id: 5 }
```

> Pre-condition: Mock `ExamsRepository.getDetail` → `{ id: 1, pasien_id: 3 }`. Mock `ExamsRepository.getFileById` → `null`.

**Expected Result**

* Melempar objek Error.
* `error.statusCode` = `404`
* `error.message` = `"File tidak ditemukan"`
* `conn.release()` dipanggil tepat 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 20

* **No:** 20
* **Requirement ID:** FR - 08

**Test Description**

Akses Ditolak (RBAC): User Pasien mendownload file milik Pasien lain.

**Test Steps**

1. Panggil `ExamsService.downloadFile({ pemeriksaanId: 1, fileId: 2, user: { role: "PASIEN", akun_id: 10 } })`.
2. Ambil koneksi DB via `db.getConnection()`.
3. `ExamsRepository.getDetail` — mock return: `{ id: 1, pasien_id: 3 }` *(pasien_id berbeda dari akun_id 10)*.
4. `ExamsRepository.getFileById` — mock return: `{ id: 2, pemeriksaan_id: 1, blob_name: "..." }`.
5. Evaluasi `user.role === "PASIEN"` — bernilai `true`.
6. Panggil `ExamsRepository.findPasienByAkunId(conn, 10)` — mock return: `{ id: 10 }`.
7. Evaluasi `!pasien || pasien.id !== exam.pasien_id` → `10 !== 3` = `true`.
8. Sistem melempar error 403.
9. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
pemeriksaanId: 1,
fileId: 2,
user: { role: "PASIEN", akun_id: 10 }
```

> Pre-condition: Mock `getDetail` → `{ id: 1, pasien_id: 3 }`. Mock `getFileById` → `{ id: 2, pemeriksaan_id: 1 }`. Mock `findPasienByAkunId` → `{ id: 10, akun_id: 10 }`.

**Expected Result**

* Melempar objek Error.
* `error.statusCode` = `403`
* `error.message` = `"Akses ditolak"`
* `conn.release()` dipanggil tepat 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 21

* **No:** 21
* **Requirement ID:** FR - 08

**Test Description**

Akses Ditolak (RBAC): User dengan role yang tidak diizinkan mencoba mengunduh.

**Test Steps**

1. Panggil `ExamsService.downloadFile({ pemeriksaanId: 1, fileId: 2, user: { role: "ADMIN", akun_id: 11 } })`.
2. Ambil koneksi DB via `db.getConnection()`.
3. `ExamsRepository.getDetail` — mock return: `{ id: 1, pasien_id: 3 }`.
4. `ExamsRepository.getFileById` — mock return: `{ id: 2, pemeriksaan_id: 1, blob_name: "..." }`.
5. Evaluasi `user.role === "PASIEN"` — bernilai `false`.
6. Evaluasi `!["PETUGAS", "DOKTER"].includes("ADMIN")` — bernilai `true`.
7. Sistem melempar error 403.
8. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
pemeriksaanId: 1,
fileId: 2,
user: { role: "ADMIN", akun_id: 11 }
```

> Pre-condition: Mock `getDetail` → `{ id: 1, pasien_id: 3 }`. Mock `getFileById` → `{ id: 2, pemeriksaan_id: 1 }`.

**Expected Result**

* Melempar objek Error.
* `error.statusCode` = `403`
* `error.message` = `"Akses ditolak"`
* `conn.release()` dipanggil tepat 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 22

* **No:** 22
* **Requirement ID:** FR - 08

**Test Description**

Gagal Download: Data DB valid, namun berkas fisik hilang dari Cloud Storage.

**Test Steps**

1. Panggil `ExamsService.downloadFile({ pemeriksaanId: 1, fileId: 2, user: { role: "DOKTER", akun_id: 5 } })`.
2. Lolos seluruh pengecekan DB (exam valid, fileRow valid, RBAC valid).
3. Panggil `blobService.exists` — mock return: `false`.
4. Evaluasi kondisi `!exists` — bernilai `true`.
5. Sistem melempar error 404.
6. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
pemeriksaanId: 1,
fileId: 2,
user: { role: "DOKTER", akun_id: 5 }
```

> Pre-condition: Mock `getDetail` → valid. Mock `getFileById` → `{ id: 2, pemeriksaan_id: 1, blob_name: "2026/06/uuid.pdf", container: "exams" }`. Mock `blobService.exists` → `false`.

**Expected Result**

* Melempar objek Error.
* `error.statusCode` = `404`
* `error.message` = `"File tidak ditemukan"`
* `conn.release()` dipanggil tepat 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 23

* **No:** 23
* **Requirement ID:** FR - 08

**Test Description**

Download Berhasil: Skenario sukses untuk user dengan role Pasien.

**Test Steps**

1. Panggil `ExamsService.downloadFile({ pemeriksaanId: 1, fileId: 2, user: { role: "PASIEN", akun_id: 3 } })`.
2. `ExamsRepository.getDetail` — mock return: `{ id: 1, pasien_id: 7 }`.
3. `ExamsRepository.getFileById` — mock return: `{ id: 2, pemeriksaan_id: 1, blob_name: "...", container: "exams" }`.
4. `ExamsRepository.findPasienByAkunId(conn, 3)` — mock return: `{ id: 7, akun_id: 3 }` *(cocok dengan exam.pasien_id = 7)*.
5. Lolos RBAC. `blobService.exists` — mock return: `true`.
6. `blobService.generateReadSas` — mock return: `{ url: "https://storage.example.com/...", expiresAt: "2026-06-14T12:00:00Z" }`.
7. `AuditRepository.insert` dipanggil (fire-and-forget).
8. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
pemeriksaanId: 1,
fileId: 2,
user: { role: "PASIEN", akun_id: 3 }
```

> Pre-condition: Semua mock berjalan sukses. `findPasienByAkunId` → `{ id: 7 }` cocok dengan `exam.pasien_id = 7`.

**Expected Result**

* Mengembalikan objek:
  ```json
  {
    "url": "https://storage.example.com/...",
    "expires_at": "2026-06-14T12:00:00Z",
    "content_type": "<mime_type>",
    "filename": "<nama_file>"
  }
  ```
* `AuditRepository.insert` dipanggil 1 kali.
* `conn.release()` dipanggil tepat 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 24

* **No:** 24
* **Requirement ID:** FR - 08

**Test Description**

Download Berhasil: Skenario sukses untuk user Dokter / Petugas Lab.

**Test Steps**

1. Panggil `ExamsService.downloadFile({ pemeriksaanId: 1, fileId: 2, user: { role: "DOKTER", akun_id: 5 } })`.
2. `ExamsRepository.getDetail` — mock return: `{ id: 1, pasien_id: 7 }`.
3. `ExamsRepository.getFileById` — mock return: `{ id: 2, pemeriksaan_id: 1, blob_name: "2026/06/uuid.pdf", container: "exams", content_type: "application/pdf" }`.
4. Evaluasi RBAC: `role === "DOKTER"` — tidak masuk cabang PASIEN, lolos whitelist.
5. `blobService.exists` — mock return: `true`.
6. `blobService.generateReadSas` — mock return: `{ url: "https://storage.example.com/...", expiresAt: "2026-06-14T12:00:00Z" }`.
7. `AuditRepository.insert` dipanggil (fire-and-forget).
8. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
pemeriksaanId: 1,
fileId: 2,
user: { role: "DOKTER", akun_id: 5 }
```

> Pre-condition: Semua mock berjalan sukses. Mock `blobService.exists` → `true`. Mock `generateReadSas` → `{ url: "...", expiresAt: "..." }`.

**Expected Result**

* Mengembalikan objek yang berisi properti `url`, `expires_at`, `content_type`, dan `filename`.
* `AuditRepository.insert` dipanggil 1 kali.
* `conn.release()` dipanggil tepat 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 25

* **No:** 25
* **Requirement ID:** FR - 09

**Test Description**

Gagal Sistem (DB Crash): Memastikan koneksi DB tetap dilepaskan meskipun kueri paralel mengalami kegagalan teknis.

**Test Steps**

1. Panggil `PatientsService.list({ search: "Budi", page: 1, pageSize: 20 })`.
2. Parameter dinormalisasi: `p = 1`, `ps = 20`, `offset = 0`.
3. Ambil koneksi DB dan panggil `Promise.all([...list, ...count])`.
4. Mock `PatientsRepository.list` melempar `new Error("Database Error")`.
5. `Promise.all` reject, aliran langsung masuk blok `finally`.
6. Eksekusi `conn.release()`.

**Test Input Data**

```javascript
search: "Budi",
page: 1,
pageSize: 20
```

> Pre-condition: Mock `PatientsRepository.list` → melempar `new Error("Database Error")`.

**Expected Result**

* Melempar kembali error DB asli (`error.message = "Database Error"`).
* `conn.release()` wajib dipanggil tepat 1 kali untuk mencegah kebocoran koneksi pool.

**Actual Result**

*(belum diisi)*

\---

## TC - 26

* **No:** 26
* **Requirement ID:** FR - 09

**Test Description**

Ambil Data Sukses: Menggunakan parameter valid standar tanpa manipulasi batas.

**Test Steps**

1. Panggil `PatientsService.list({ search: "Budi", page: 2, pageSize: 10 })`.
2. Parameter dinormalisasi: `p = 2`, `ps = 10`, `offset = 10`.
3. Jalankan `Promise.all([PatientsRepository.list, PatientsRepository.count])` secara paralel.
4. Mock `PatientsRepository.list` → mengembalikan array 10 item.
5. Mock `PatientsRepository.count` → mengembalikan `100`.
6. Kembalikan objek hasil dan lepas koneksi via `finally`.

**Test Input Data**

```javascript
search: "Budi",
page: 2,
pageSize: 10
```

> Pre-condition: Mock `PatientsRepository.list` → array 10 item. Mock `PatientsRepository.count` → `100`.

**Expected Result**

* Mengembalikan objek: `{ items: [...], page: 2, pageSize: 10, total: 100 }`.
* `PatientsRepository.list` dipanggil dengan argumen `{ search: "Budi", limit: 10, offset: 10 }`.
* `conn.release()` dipanggil 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 27

* **No:** 27
* **Requirement ID:** FR - 09

**Test Description**

Pasien Tidak Ditemukan: Melempar error 404 jika ID pasien tidak terdaftar di sistem.

**Test Steps**

1. Panggil `PatientsService.detail("999")`.
2. Ambil koneksi database pool via `db.getConnection()`.
3. Panggil `PatientsRepository.findById(conn, "999")` — mock return: `null`.
4. Evaluasi kondisi `!patient` — bernilai `true`.
5. Sistem membuat dan melempar objek error.
6. Aliran masuk ke blok `finally` untuk melepas koneksi.

**Test Input Data**

```javascript
patientId: "999"
```

> Pre-condition: Mock `PatientsRepository.findById` → `null`.

**Expected Result**

* Melempar objek Error.
* `error.statusCode` = `404`
* `error.message` = `"Patient not found"`
* `conn.release()` terbukti dipanggil tepat 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 28

* **No:** 28
* **Requirement ID:** FR - 09

**Test Description**

Ambil Detail Sukses: Mengembalikan objek data pasien secara utuh ketika ID ditemukan.

**Test Steps**

1. Panggil `PatientsService.detail("2")`.
2. Ambil koneksi database pool via `db.getConnection()`.
3. Panggil `PatientsRepository.findById(conn, "2")` — mock return: `{ id: 2, nik: "3273000012345678", nama: "John Doe", jenis_kelamin: "L" }`.
4. Evaluasi kondisi `!patient` — bernilai `false`.
5. Fungsi mengembalikan objek pasien secara langsung.
6. Aliran masuk ke blok `finally` untuk melepas koneksi.

**Test Input Data**

```javascript
patientId: "2"
```

> Pre-condition: Mock `PatientsRepository.findById` → `{ id: 2, nik: "3273000012345678", nama: "John Doe", jenis_kelamin: "L" }`.

**Expected Result**

* Mengembalikan objek data pasien sesuai hasil mock DB: `{ id: 2, nik: "3273000012345678", nama: "John Doe", jenis_kelamin: "L" }`.
* `conn.release()` terbukti dipanggil tepat 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 29

* **No:** 29
* **Requirement ID:** FR - 10

**Test Description**

Petugas Lab Tidak Ditemukan: Melempar error jika `akunId` yang mengeksekusi bukan milik petugas lab yang sah.

**Test Steps**

1. Panggil `ExamsService.create({ payload, akunId: 99 })`.
2. Ambil koneksi database pool via `db.getConnection()`.
3. Panggil `ExamsRepository.findPetugasLabIdByAkunId(conn, 99)` — mock return: `null`.
4. Evaluasi kondisi `!petugasLab` — bernilai `true`.
5. Sistem melempar `new Error("Data petugas_lab tidak ditemukan untuk akun ini")`.
6. Aliran masuk ke blok `finally` untuk melepas koneksi.

**Test Input Data**

```javascript
akunId: 99,

payload: {
  pendaftaran_id: 1,
  kategori_id: 2,
  tgl_pemeriksaan: "2026-07-01"
}
```

> Pre-condition: Mock `ExamsRepository.findPetugasLabIdByAkunId` → `null`.

**Expected Result**

* Melempar objek Error.
* `error.message` = `"Data petugas_lab tidak ditemukan untuk akun ini"`
* `ExamsRepository.create` **tidak** dipanggil.
* `conn.release()` terbukti dipanggil tepat 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 30

* **No:** 30
* **Requirement ID:** FR - 10

**Test Description**

Pembuatan Pemeriksaan Sukses: Menyimpan data pemeriksaan baru, mencatat log audit, dan mengembalikan detail data secara utuh.

**Test Steps**

1. Panggil `ExamsService.create({ payload, akunId: 10 })`.
2. Ambil koneksi database pool via `db.getConnection()`.
3. Panggil `ExamsRepository.findPetugasLabIdByAkunId(conn, 10)` — mock return: `{ id: 5 }`.
4. Evaluasi kondisi `!petugasLab` — bernilai `false`.
5. Panggil `ExamsRepository.create(conn, { ...payload, petugas_lab_id: 5 })` — mock return: `202`.
6. Panggil `AuditRepository.insert` dengan aksi `"CREATE"`, `changed_by_akun_id: 10`.
7. Panggil `ExamsRepository.getDetail(conn, 202)` — mock return: objek detail pemeriksaan.
8. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
akunId: 10,

payload: {
  pendaftaran_id: 1,
  kategori_id: 2,
  tgl_pemeriksaan: "2026-07-01"
}
```

> Pre-condition: Mock `findPetugasLabIdByAkunId` → `{ id: 5 }`. Mock `ExamsRepository.create` → `202`. Mock `ExamsRepository.getDetail` → `{ id: 202, pasien_nama: "Budi", status_hasil: "MENUNGGU_HASIL" }`.

**Expected Result**

* Mengembalikan objek detail pemeriksaan: `{ id: 202, pasien_nama: "Budi", status_hasil: "MENUNGGU_HASIL" }`.
* `ExamsRepository.create`, `AuditRepository.insert`, dan `ExamsRepository.getDetail` masing-masing dipanggil 1 kali dengan argumen yang sesuai.
* `conn.release()` terbukti dipanggil tepat 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 31

* **No:** 31
* **Requirement ID:** FR - 10

**Test Description**

Gagal Sistem (DB Crash): Memastikan koneksi database tetap dilepaskan dengan aman meskipun query pembaruan (update) mengalami kegagalan teknis.

**Test Steps**

1. Panggil `ExamsService.update("EXM-101", { status_hasil: "SELESAI" }, 5)`.
2. Ambil koneksi database pool via `db.getConnection()`.
3. Panggil `ExamsRepository.update` — mock **melempar** `new Error("Database Error")`.
4. Aliran terputus dan langsung masuk blok `finally`.
5. Eksekusi `conn.release()`.

**Test Input Data**

```javascript
pemeriksaanId: "EXM-101",
patch: { status_hasil: "SELESAI" },
akunId: 5
```

> Pre-condition: Mock `ExamsRepository.update` → melempar `new Error("Database Error")`.

**Expected Result**

* Melempar kembali objek error database asli (`error.message = "Database Error"`).
* `AuditRepository.insert` dan `ExamsRepository.getDetail` **tidak** dieksekusi.
* `conn.release()` wajib dipanggil tepat 1 kali untuk mencegah connection leak.

**Actual Result**

*(belum diisi)*

\---

## TC - 32

* **No:** 32
* **Requirement ID:** FR - 10

**Test Description**

Pembaruan Data Sukses: Mengubah data pemeriksaan, mencatat log audit, dan mengembalikan detail data terbaru yang telah di-update.

**Test Steps**

1. Panggil `ExamsService.update("EXM-101", { status_hasil: "SELESAI" }, 5)`.
2. Ambil koneksi database pool via `db.getConnection()`.
3. Panggil `ExamsRepository.update(conn, "EXM-101", { status_hasil: "SELESAI" })` — sukses.
4. Panggil `AuditRepository.insert` dengan `aksi: "UPDATE"`, `changed_by_akun_id: 5`.
5. Panggil `ExamsRepository.getDetail(conn, "EXM-101")` — mock return: `{ id: "EXM-101", status_hasil: "SELESAI" }`.
6. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
pemeriksaanId: "EXM-101",
patch: { status_hasil: "SELESAI" },
akunId: 5
```

> Pre-condition: Semua mock repositori sukses. Mock `ExamsRepository.getDetail` → `{ id: "EXM-101", status_hasil: "SELESAI" }`.

**Expected Result**

* Mengembalikan objek detail pemeriksaan terbaru: `{ id: "EXM-101", status_hasil: "SELESAI" }`.
* `ExamsRepository.update` dipanggil dengan argumen `("EXM-101", { status_hasil: "SELESAI" })`.
* `AuditRepository.insert` dipanggil 1 kali dengan `changed_by_akun_id: 5`.
* `conn.release()` terbukti dipanggil tepat 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 33

* **No:** 33
* **Requirement ID:** FR - 10

**Test Description**

Gagal Transaksi (DB Crash): Terjadi kegagalan SQL saat menghapus data. Seluruh perubahan di-rollback dan koneksi pool dilepaskan.

**Test Steps**

1. Panggil `ExamsService.deleteExam({ pemeriksaanId: "EXM-777", akunId: 5 })`.
2. Ambil koneksi DB; jalankan `conn.beginTransaction()`.
3. `ExamsRepository.listFiles` — mock return: `[{ blob_name: "a.pdf", container: "exams" }, { blob_name: "b.jpg", container: "exams" }]`.
4. `ExamsRepository.deleteFilesByExamId` sukses.
5. `ExamsRepository.deleteExam` — mock **melempar** `new Error("ER_ROW_IS_REFERENCED")`.
6. Aliran masuk ke blok `catch`, jalankan `conn.rollback()`.
7. Error dilempar kembali.
8. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
pemeriksaanId: "EXM-777",
akunId: 5
```

> Pre-condition: Mock `ExamsRepository.listFiles` → 2 item. Mock `ExamsRepository.deleteExam` → melempar `new Error("ER_ROW_IS_REFERENCED")`.

**Expected Result**

* Melempar kembali error database asli (`error.message = "ER_ROW_IS_REFERENCED"`).
* `conn.rollback()` dipanggil 1 kali.
* `conn.commit()` dan `blobService.deleteBlob` **tidak** dipanggil.
* `conn.release()` dipanggil 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 34

* **No:** 34
* **Requirement ID:** FR - 10

**Test Description**

Penghapusan Sukses: Data DB terhapus, log audit tercatat, dan semua berkas cloud dibersihkan dengan lancar.

**Test Steps**

1. Panggil `ExamsService.deleteExam({ pemeriksaanId: "EXM-777", akunId: 5 })`.
2. Ambil koneksi DB; jalankan `conn.beginTransaction()`.
3. `ExamsRepository.listFiles` — mock return: `[{ blob_name: "a.pdf", container: "exams" }, { blob_name: "b.jpg", container: "exams" }]`.
4. `ExamsRepository.deleteFilesByExamId` sukses.
5. `ExamsRepository.deleteExam` sukses.
6. `AuditRepository.insert` dengan `aksi: "DELETE"`, `detail: { deleted_blobs: 2 }`.
7. Jalankan `conn.commit()`.
8. Blok `finally` mengeksekusi `conn.release()`.
9. Loop post-commit: `blobService.deleteBlob` dipanggil untuk setiap file (2 kali).

**Test Input Data**

```javascript
pemeriksaanId: "EXM-777",
akunId: 5
```

> Pre-condition: Semua repositori dan layanan cloud berjalan sukses. Mock `ExamsRepository.listFiles` → 2 item.

**Expected Result**

* Mengembalikan: `{ success: true, deletedFiles: 2 }`.
* `conn.commit()` dipanggil 1 kali.
* `blobService.deleteBlob` dipanggil sebanyak 2 kali (untuk setiap file).
* `conn.release()` dipanggil 1 kali.

**Actual Result**

*(belum diisi)*

\---

## TC - 35

* **No:** 35
* **Requirement ID:** FR - 10 & FR - 11

**Test Description**

Penyematan Berkas Sukses: Seluruh rangkaian validasi, unggah file, komit database, dan pengambilan daftar file berjalan lancar.

**Test Steps**

1. Panggil `ExamsService.attachFile({ pemeriksaanId: "EXM-505", file, akunId: 10 })`.
2. Lolos validasi file (presence, MIME, size).
3. `blobService.upload` sukses.
4. Ambil koneksi DB; jalankan `conn.beginTransaction()`.
5. `ExamsRepository.insertFile` dipanggil dengan metadata blob.
6. `AuditRepository.insert` dengan `aksi: "UPDATE"`, `changed_by_akun_id: 10`.
7. Jalankan `conn.commit()`.
8. Panggil `ExamsRepository.listFiles(conn, "EXM-505")` — mock return: `[{ id: 1, file_type: "PNG" }]`.
9. Blok `finally` mengeksekusi `conn.release()`.

**Test Input Data**

```javascript
pemeriksaanId: "EXM-505",
file: {
  originalname: "hasil_rontgen.png",
  mimetype: "image/png",
  size: 50000,
  buffer: Buffer.from("fake-image-content")
},
akunId: 10
```

> Pre-condition: Semua mock repositori dan layanan cloud berjalan sukses. Mock `ExamsRepository.listFiles` → `[{ id: 1, file_type: "PNG", blob_name: "..." }]`.

**Expected Result**

* Mengembalikan array objek daftar berkas hasil `listFiles`: `[{ id: 1, file_type: "PNG", blob_name: "..." }]`.
* `conn.commit()` dan `conn.release()` masing-masing dipanggil tepat 1 kali.
* `blobService.deleteBlob` **tidak** dipanggil.

**Actual Result**

*(belum diisi)*

\---

\---
