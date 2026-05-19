# Frontend Integration Guide - eLabora Backend Updates

## Ringkasan Perubahan

Dokumen ini menjelaskan semua perubahan backend yang perlu diintegrasikan oleh tim frontend untuk dua fitur baru:

1. **Auth Security Hardening** - Penguatan keamanan autentikasi
2. **Patient Search Optimization** - Optimasi pencarian pasien dengan multi-filter

---

## 1. Auth Security Hardening

### Perubahan yang Mempengaruhi Frontend

#### 1.1 Password Requirements (BREAKING CHANGE)

**Apa yang Berubah:**
Password sekarang harus memenuhi kompleksitas minimum.

**Requirements Baru:**
- Minimal 8 karakter
- Minimal 1 huruf besar (A-Z)
- Minimal 1 huruf kecil (a-z)
- Minimal 1 angka (0-9)
- Minimal 1 karakter khusus (!@#$%^&*()_+-=[]{}|;:,.<>?)

**Impact ke Frontend:**
- Form registrasi harus menampilkan password requirements
- Tambahkan client-side validation untuk password strength
- Tampilkan error message yang jelas jika password tidak memenuhi syarat

**Error Response Contoh:**
```json
{
  "errors": [
    {
      "msg": "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character",
      "param": "password",
      "location": "body"
    }
  ]
}
```

**Rekomendasi UI:**
```
Password Requirements:
✓ Minimal 8 karakter
✗ Minimal 1 huruf besar
✓ Minimal 1 huruf kecil
✓ Minimal 1 angka
✗ Minimal 1 karakter khusus
```

---

#### 1.2 Rate Limiting (NEW)

**Apa yang Berubah:**
Backend sekarang membatasi jumlah request ke endpoint auth.

**Limits:**
- **Login**: Maksimal 5 percobaan per 15 menit per IP
- **Register**: Maksimal 3 registrasi per jam per IP

**Impact ke Frontend:**
- Handle HTTP 429 (Too Many Requests) response
- Tampilkan pesan yang user-friendly
- Disable form atau tampilkan countdown timer

**Error Response:**
```json
{
  "message": "Too many requests, please try again later"
}
```

**Response Headers:**
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640000000
Retry-After: 900
```

**Rekomendasi UI:**
```
Terlalu banyak percobaan login.
Silakan coba lagi dalam 15 menit.
```

---

#### 1.3 CORS Configuration (IMPORTANT)

**Apa yang Berubah:**
Backend sekarang hanya menerima request dari origin yang terdaftar.

**Impact ke Frontend:**
- Pastikan frontend origin sudah terdaftar di backend
- Jika dapat CORS error, hubungi backend team untuk whitelist origin
- Credentials (cookies, auth headers) sekarang di-support dengan benar

**CORS Error Contoh:**
```
Access to fetch at 'http://localhost:3000/api/auth/login' from origin 
'http://localhost:5173' has been blocked by CORS policy
```

**Action Required:**
- Berikan list semua frontend origins ke backend team:
  - Development: `http://localhost:5173`, `http://localhost:3000`
  - Staging: `https://staging.elabora.com`
  - Production: `https://elabora.com`

---

#### 1.4 Error Messages (CHANGED)

**Apa yang Berubah:**
Error messages sekarang lebih generic untuk keamanan.

**Login Errors:**

**Sebelum:**
- "User not found" (membocorkan info username exist atau tidak)
- "Invalid password" (membocorkan info username exist)

**Sekarang:**
- "Username atau password salah" (generic untuk semua kasus)

**Registration Errors:**

**Sebelum:**
```json
{
  "message": "Duplicate entry 'budi123' for key 'akun.username'"
}
```

**Sekarang:**
```json
{
  "message": "Username atau email sudah digunakan",
  "status": 409
}
```

**Impact ke Frontend:**
- Update error message display
- Tidak bisa lagi membedakan apakah username atau email yang duplicate
- Tampilkan pesan generic: "Username atau email sudah digunakan"

---

#### 1.5 Validation Errors (NEW FORMAT)

**Apa yang Berubah:**
Backend sekarang mengembalikan validation errors dalam format terstruktur.

**Error Response Format:**
```json
{
  "errors": [
    {
      "msg": "Email must be a valid email address",
      "param": "email",
      "location": "body"
    },
    {
      "msg": "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character",
      "param": "password",
      "location": "body"
    }
  ]
}
```

**Impact ke Frontend:**
- Parse `errors` array
- Map errors ke form fields berdasarkan `param`
- Tampilkan error message dari `msg`

**Contoh Implementasi (React):**
```javascript
const handleError = (error) => {
  if (error.response?.data?.errors) {
    const fieldErrors = {};
    error.response.data.errors.forEach(err => {
      fieldErrors[err.param] = err.msg;
    });
    setFormErrors(fieldErrors);
  }
};
```

---

### Testing Checklist untuk Frontend

- [ ] Test registrasi dengan password lemah (harus ditolak)
- [ ] Test registrasi dengan password kuat (harus berhasil)
- [ ] Test login dengan kredensial salah (pesan generic)
- [ ] Test 6 kali login berturut-turut (harus kena rate limit)
- [ ] Test 4 kali registrasi berturut-turut (harus kena rate limit)
- [ ] Test registrasi dengan username/email duplicate (pesan generic)
- [ ] Verify CORS tidak block request dari frontend origin
- [ ] Test validation error display untuk semua fields

---

## 2. Patient Search Optimization

### Endpoint Baru: Advanced Search

#### 2.1 New Endpoint

**URL:**
```
POST /api/patients/search
```

**Authentication:** Required (Bearer token)

**Authorization:** DOKTER atau PETUGAS only

**Content-Type:** `application/json`

---

#### 2.2 Request Body Parameters

Semua parameters **optional**. Jika tidak ada filter, return semua pasien.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `name` | string | Partial match pada nama (case-insensitive) | `"budi"` |
| `nik` | string | Prefix match pada NIK | `"3201"` |
| `phone` | string | Prefix match pada nomor telepon | `"0812"` |
| `dobStart` | string | Tanggal lahir mulai (ISO 8601: YYYY-MM-DD) | `"1990-01-01"` |
| `dobEnd` | string | Tanggal lahir sampai (ISO 8601: YYYY-MM-DD) | `"2000-12-31"` |
| `regStart` | string | Tanggal registrasi mulai (ISO 8601: YYYY-MM-DD) | `"2024-01-01"` |
| `regEnd` | string | Tanggal registrasi sampai (ISO 8601: YYYY-MM-DD) | `"2024-12-31"` |
| `page` | number | Halaman (default: 1, min: 1) | `2` |
| `pageSize` | number | Jumlah per halaman (default: 20, max: 100) | `50` |
| `sortBy` | string | Field untuk sorting: `nama`, `nik`, `tgl_lahir`, `created_at` | `"nama"` |
| `sortOrder` | string | Urutan: `ASC` atau `DESC` (default: ASC) | `"DESC"` |

---

#### 2.3 Request Examples

**Basic Search by Name:**
```json
{
  "name": "budi"
}
```

**Search by NIK Prefix:**
```json
{
  "nik": "3201"
}
```

**Multi-Filter Search:**
```json
{
  "name": "budi",
  "dobStart": "1990-01-01",
  "dobEnd": "2000-12-31",
  "page": 1,
  "pageSize": 20,
  "sortBy": "nama",
  "sortOrder": "ASC"
}
```

**Date Range Search:**
```json
{
  "regStart": "2024-01-01",
  "regEnd": "2024-12-31"
}
```

**Pagination with Sorting:**
```json
{
  "page": 2,
  "pageSize": 50,
  "sortBy": "created_at",
  "sortOrder": "DESC"
}
```

---

#### 2.4 Response Format

**Success Response (200 OK):**
```json
{
  "items": [
    {
      "id": 1,
      "nik": "3201123456789012",
      "nama": "Budi Santoso",
      "tgl_lahir": "1990-05-15",
      "no_telepon": "081234567890",
      "username": "budi123",
      "email": "budi@example.com"
    },
    {
      "id": 2,
      "nik": "3201987654321098",
      "nama": "Siti Nurhaliza",
      "tgl_lahir": "1995-08-20",
      "no_telepon": "081298765432",
      "username": "siti456",
      "email": "siti@example.com"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 150
}
```

**Response Fields:**
- `items`: Array of patient objects
- `page`: Current page number
- `pageSize`: Number of items per page
- `total`: Total number of matching records (for pagination)

---

#### 2.5 Error Responses

**Validation Error (400 Bad Request):**
```json
{
  "errors": [
    {
      "msg": "Invalid date format for dobStart",
      "param": "dobStart",
      "location": "body"
    }
  ]
}
```

**Date Range Logic Error (400 Bad Request):**
```json
{
  "message": "Date of birth end date must be after start date"
}
```

**Unauthorized (401):**
```json
{
  "message": "Unauthorized"
}
```

**Forbidden (403):**
```json
{
  "message": "Forbidden - Insufficient permissions"
}
```

---

#### 2.6 Filter Behavior

**Multi-Filter Logic:**
- Semua filter digabung dengan **AND** logic
- Contoh: `name="budi" AND nik="3201"` → hanya return pasien yang satisfy BOTH conditions

**Text Search:**
- `name`: Case-insensitive partial match (cari substring)
  - Input: `"ud"` → Match: "Budi", "Yuda", "Budiman"
- `nik`: Prefix match (exact dari awal)
  - Input: `"3201"` → Match: "3201123456", "3201987654"
- `phone`: Prefix match (exact dari awal)
  - Input: `"0812"` → Match: "081234567890", "081298765432"

**Date Range:**
- `dobStart` only: Return pasien dengan `tgl_lahir >= dobStart`
- `dobEnd` only: Return pasien dengan `tgl_lahir <= dobEnd`
- Both: Return pasien dengan `tgl_lahir` dalam range
- Same logic untuk `regStart` dan `regEnd`

**Pagination:**
- `pageSize > 100`: Automatically capped at 100
- `page < 1`: Automatically normalized to 1
- Calculate total pages: `Math.ceil(total / pageSize)`

**Sorting:**
- Default: `sortBy="nama"`, `sortOrder="ASC"`
- Invalid `sortBy`: Return 400 error
- Invalid `sortOrder`: Return 400 error

---

### Legacy Endpoint (Backward Compatible)

#### 2.7 Existing Endpoint Unchanged

**URL:**
```
GET /api/patients?search=<keyword>&page=1&pageSize=20
```

**Behavior:**
- Tetap berfungsi seperti sebelumnya
- Search di field `nama` dan `nik` (OR logic)
- Response format tidak berubah
- Sorting tetap by `nama` ASC

**Kapan Pakai Legacy vs Advanced:**
- **Legacy (GET)**: Simple search, single keyword, backward compatibility
- **Advanced (POST)**: Multi-filter, date ranges, custom sorting

---

### Frontend Implementation Guide

#### 2.8 UI Components Recommendations

**Basic Search Form:**
```
┌─────────────────────────────────────┐
│ Cari Pasien                         │
├─────────────────────────────────────┤
│ Nama: [________________]            │
│ NIK:  [________________]            │
│ Telp: [________________]            │
│                                     │
│ [Cari] [Reset]                      │
└─────────────────────────────────────┘
```

**Advanced Search Form:**
```
┌─────────────────────────────────────┐
│ Pencarian Lanjutan                  │
├─────────────────────────────────────┤
│ Nama:     [________________]        │
│ NIK:      [________________]        │
│ Telepon:  [________________]        │
│                                     │
│ Tanggal Lahir:                      │
│   Dari: [__________] s/d [________] │
│                                     │
│ Tanggal Registrasi:                 │
│   Dari: [__________] s/d [________] │
│                                     │
│ Urutkan: [Nama ▼] [Ascending ▼]    │
│                                     │
│ [Cari] [Reset]                      │
└─────────────────────────────────────┘
```

**Results Table:**
```
┌──────────────────────────────────────────────────────────┐
│ Hasil Pencarian (150 pasien ditemukan)                  │
├────┬──────────────┬─────────────┬──────────┬────────────┤
│ No │ Nama         │ NIK         │ Telepon  │ Tgl Lahir  │
├────┼──────────────┼─────────────┼──────────┼────────────┤
│ 1  │ Budi Santoso │ 3201123456  │ 08123456 │ 15/05/1990 │
│ 2  │ Siti Nurhal. │ 3201987654  │ 08129876 │ 20/08/1995 │
└────┴──────────────┴─────────────┴──────────┴────────────┘

[< Prev]  Page 1 of 8  [Next >]
```

---

#### 2.9 Sample Code (React/TypeScript)

**Type Definitions:**
```typescript
interface PatientSearchFilters {
  name?: string;
  nik?: string;
  phone?: string;
  dobStart?: string; // YYYY-MM-DD
  dobEnd?: string;   // YYYY-MM-DD
  regStart?: string; // YYYY-MM-DD
  regEnd?: string;   // YYYY-MM-DD
  page?: number;
  pageSize?: number;
  sortBy?: 'nama' | 'nik' | 'tgl_lahir' | 'created_at';
  sortOrder?: 'ASC' | 'DESC';
}

interface Patient {
  id: number;
  nik: string;
  nama: string;
  tgl_lahir: string;
  no_telepon: string;
  username: string;
  email: string;
}

interface PatientSearchResponse {
  items: Patient[];
  page: number;
  pageSize: number;
  total: number;
}
```

**API Call Function:**
```typescript
const searchPatients = async (
  filters: PatientSearchFilters
): Promise<PatientSearchResponse> => {
  const response = await fetch('http://localhost:3000/api/patients/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify(filters)
  });

  if (!response.ok) {
    if (response.status === 400) {
      const error = await response.json();
      throw new ValidationError(error.errors);
    }
    throw new Error('Search failed');
  }

  return response.json();
};
```

**Form Handler:**
```typescript
const handleSearch = async (formData: PatientSearchFilters) => {
  try {
    setLoading(true);
    setError(null);
    
    const result = await searchPatients(formData);
    
    setPatients(result.items);
    setPagination({
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / result.pageSize)
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      setFormErrors(err.errors);
    } else {
      setError('Pencarian gagal. Silakan coba lagi.');
    }
  } finally {
    setLoading(false);
  }
};
```

**Date Input Validation:**
```typescript
const validateDateRange = (start?: string, end?: string): string | null => {
  if (!start || !end) return null;
  
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  if (endDate < startDate) {
    return 'Tanggal akhir harus setelah tanggal awal';
  }
  
  return null;
};
```

---

#### 2.10 Validation Rules (Client-Side)

**Date Format:**
- Must be ISO 8601: `YYYY-MM-DD`
- Use HTML5 date input: `<input type="date">`
- Validate before submit

**Page/PageSize:**
- `page`: Must be positive integer (>= 1)
- `pageSize`: Must be positive integer (1-100)
- Show warning if user tries pageSize > 100

**SortBy:**
- Only allow: `nama`, `nik`, `tgl_lahir`, `created_at`
- Use dropdown/select to prevent invalid values

**SortOrder:**
- Only allow: `ASC`, `DESC`
- Use radio buttons or toggle

---

### Testing Checklist untuk Frontend

**Basic Functionality:**
- [ ] Search by name (partial match, case-insensitive)
- [ ] Search by NIK (prefix match)
- [ ] Search by phone (prefix match)
- [ ] Multi-filter search (name + NIK + dates)
- [ ] Empty search (return all patients)

**Date Ranges:**
- [ ] Date of birth range (both start and end)
- [ ] Date of birth start only
- [ ] Date of birth end only
- [ ] Registration date range
- [ ] Invalid date range (end before start) - should show error

**Pagination:**
- [ ] Navigate to page 2, 3, etc.
- [ ] Change page size (10, 20, 50, 100)
- [ ] PageSize > 100 (should be capped)
- [ ] Page < 1 (should normalize to 1)
- [ ] Calculate total pages correctly

**Sorting:**
- [ ] Sort by nama (ASC/DESC)
- [ ] Sort by NIK (ASC/DESC)
- [ ] Sort by tgl_lahir (ASC/DESC)
- [ ] Sort by created_at (ASC/DESC)
- [ ] Default sort (nama ASC)

**Error Handling:**
- [ ] Invalid date format (should show validation error)
- [ ] Invalid sortBy (should show validation error)
- [ ] Invalid sortOrder (should show validation error)
- [ ] Unauthorized access (401) - redirect to login
- [ ] Forbidden access (403) - show permission error
- [ ] Network error - show retry option

**Edge Cases:**
- [ ] Search with special characters in name
- [ ] Search with very long strings
- [ ] Search with empty strings (should ignore filter)
- [ ] Rapid consecutive searches (debounce recommended)

**Legacy Endpoint:**
- [ ] Verify GET /api/patients still works
- [ ] Verify backward compatibility with existing UI

---

## 3. Environment Variables

### Required Environment Variables

Backend team perlu set environment variables berikut:

**Auth Security:**
```env
JWT_SECRET=<minimum_32_characters_random_string>
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,https://elabora.com
NODE_ENV=production
```

**Database:**
```env
DB_HOST=localhost
DB_USER=root
DB_PASS=<password>
DB_NAME=elabora_db
DB_PORT=3306
```

**Frontend Action Required:**
- Berikan list semua frontend origins ke backend team
- Pastikan JWT_SECRET sudah di-set dengan benar (min 32 chars)
- Confirm NODE_ENV di production

---

## 4. Migration Notes

### Database Changes

**Patient Search Optimization:**
- Backend menambahkan indexes pada tabel `pasien`
- Indexes: `nama`, `nik`, `no_telepon`, `tgl_lahir`, `created_at`
- **No schema changes** - hanya performance improvement
- **No data migration needed**

**Auth Security:**
- **No database changes**
- Hanya perubahan logic dan validation

---

## 5. Breaking Changes Summary

### BREAKING CHANGES (Require Frontend Updates)

1. **Password Requirements** - Frontend MUST validate password complexity
2. **Rate Limiting** - Frontend MUST handle 429 responses
3. **CORS Configuration** - Frontend origin MUST be whitelisted
4. **Error Message Format** - Frontend MUST parse new validation error format

### NON-BREAKING CHANGES (Optional Updates)

1. **Advanced Search Endpoint** - New endpoint, legacy still works
2. **Generic Error Messages** - More secure, but less specific
3. **Bcrypt Rounds** - Backend only, no frontend impact

---

## 6. Rollout Plan

### Phase 1: Auth Security (CRITICAL - Deploy First)

**Backend:**
1. Deploy auth security hardening
2. Set environment variables (JWT_SECRET, CORS_ALLOWED_ORIGINS)
3. Verify rate limiting works
4. Monitor error logs

**Frontend:**
1. Update password validation
2. Handle 429 rate limit errors
3. Update error message display
4. Test with backend staging

**Timeline:** 1-2 days

---

### Phase 2: Patient Search (Feature Enhancement)

**Backend:**
1. Run database migration (add indexes)
2. Deploy advanced search endpoint
3. Verify legacy endpoint still works

**Frontend:**
1. Build advanced search UI
2. Integrate new endpoint
3. Add date range pickers
4. Add sorting controls
5. Test pagination

**Timeline:** 3-5 days

---

## 7. Support & Contact

**Questions about:**
- Auth security changes → Backend team
- CORS whitelist → Backend team / DevOps
- Patient search API → Backend team
- Database performance → Backend team / DBA

**Testing:**
- Postman collection available: `POSTMAN_TEST_GUIDE.md`
- Staging environment: `<staging_url>`
- API documentation: `Dokumentasi API eLabora.md`

---

## 8. Appendix: Complete API Reference

### Auth Endpoints (Updated)

**POST /auth/register**
- Body: `{ username, email, password, nama, tgl_lahir, no_telepon, alamat }`
- Password must meet complexity requirements
- Rate limit: 3 per hour per IP
- Returns: JWT token + user data

**POST /auth/register-dokter**
- Body: `{ username, email, password, nip, nama }`
- Password must meet complexity requirements
- Rate limit: 3 per hour per IP
- Returns: JWT token + doctor data

**POST /auth/register-petugas**
- Body: `{ username, email, password, nip, nama }`
- Password must meet complexity requirements
- Rate limit: 3 per hour per IP
- Returns: JWT token + staff data

**POST /auth/login**
- Body: `{ username, password }`
- Rate limit: 5 per 15 minutes per IP
- Returns: JWT token + user data

**GET /auth/me**
- Headers: `Authorization: Bearer <token>`
- Returns: Current user data + profile

---

### Patient Search Endpoints

**GET /api/patients** (Legacy)
- Query: `?search=<keyword>&page=1&pageSize=20`
- Auth: Required (DOKTER/PETUGAS)
- Returns: Paginated patient list

**POST /api/patients/search** (New)
- Body: See section 2.2 for all parameters
- Auth: Required (DOKTER/PETUGAS)
- Returns: Paginated patient list with filters

**GET /api/patients/:id**
- Auth: Required (DOKTER/PETUGAS)
- Returns: Patient detail

---

## Changelog

**Version 1.0 - Initial Release**
- Auth security hardening implemented
- Patient search optimization implemented
- Frontend integration guide created

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Maintained By:** Backend Team
