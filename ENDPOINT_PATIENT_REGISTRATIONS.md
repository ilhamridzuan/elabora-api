# Endpoint: Get Patient Registrations

## Overview
Endpoint baru untuk mengambil daftar pendaftaran (registrations) berdasarkan patient ID. Endpoint ini dapat diakses oleh **PETUGAS** dan **DOKTER** untuk melihat semua pendaftaran yang pernah dilakukan oleh pasien tertentu.

## Endpoint Details

**Method:** `GET`  
**Path:** `/patients/:patientId/registrations`  
**Access:** PETUGAS, DOKTER (requires authentication)

## Query Parameters (Optional)

| Parameter | Type | Description | Default | Max |
|-----------|------|-------------|---------|-----|
| `status` | string | Filter berdasarkan status: `MENUNGGU`, `DISETUJUI`, `DITOLAK`, `DIBATALKAN` | - | - |
| `limit` | number | Jumlah data per halaman | 20 | 100 |
| `page` | number | Nomor halaman | 1 | - |

## Response Format

### Success (200 OK)
```json
{
  "data": [
    {
      "id": 15,
      "pasien_id": 7,
      "no_antrian": 5,
      "no_lab": "LAB-20251231-0015",
      "status": "DISETUJUI",
      "tanggal_antrian": "2025-12-31",
      "jadwal_pemeriksaan_at": "2025-12-31 10:00:00",
      "file_path": "referrals/2025/12/uuid.pdf",
      "created_at": "2025-12-30 10:00:00"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "message": "Invalid patient ID"
}
```
atau
```json
{
  "message": "Invalid status. Must be one of: MENUNGGU, DISETUJUI, DITOLAK, DIBATALKAN"
}
```

#### 401 Unauthorized
```json
{
  "message": "Unauthorized"
}
```

#### 403 Forbidden
```json
{
  "message": "Forbidden"
}
```

#### 404 Not Found
```json
{
  "message": "Patient not found"
}
```

## Implementation Details

### Files Modified

1. **`src/modules/registrations/registration.repository.js`**
   - Added `listByPatientIdWithPagination()` - Fetches registrations with pagination
   - Added `countByPatientId()` - Counts total registrations for pagination

2. **`src/modules/registrations/registration.service.js`**
   - Added `getByPatientId()` - Business logic layer with validation:
     - Validates patientId is a valid number
     - Validates status is one of the allowed values
     - Validates and enforces limit constraints (max 100)
     - Checks if patient exists
     - Returns paginated results with metadata

3. **`src/modules/patients/patients.controller.js`**
   - Added `getPatientRegistrations()` - HTTP request handler
   - Extracts parameters from request
   - Calls service layer
   - Returns JSON response

4. **`src/modules/patients/patients.routes.js`**
   - Added new route: `GET /:patientId/registrations`
   - Applied `requireAuth` middleware
   - Applied `requireRole("DOKTER", "PETUGAS")` middleware
   - Route placed before `/:id` to avoid path matching conflicts

## Features Implemented

✅ **Authentication & Authorization**
- Requires valid JWT token
- Only DOKTER and PETUGAS roles can access

✅ **Validation**
- Patient ID must be a valid positive number
- Patient must exist in database
- Status filter validates against allowed values
- Limit is capped at 100 items per page

✅ **Pagination**
- Supports `page` and `limit` query parameters
- Returns metadata with current page, limit, and total count
- Default limit: 20, max limit: 100

✅ **Filtering**
- Optional status filter
- Results ordered by `tanggal_antrian DESC, created_at DESC` (newest first)

✅ **Data Returned**
- Registration details (id, no_antrian, no_lab, status, dates)
- Returns `file_path` (blob name) for surat rujukan download

✅ **Error Handling**
- Proper HTTP status codes
- Descriptive error messages
- Database connection cleanup in finally blocks

## Testing Instructions

### 1. Start the Server
```bash
npm run dev
```

### 2. Get Authentication Token
First, login as DOKTER or PETUGAS:
```bash
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "username": "alfianrizky",
  "password": "password123"
}
```

Save the token from the response.

### 3. Test the Endpoint

#### Basic Request (Get all registrations for patient ID 7)
```bash
GET http://localhost:3000/patients/7/registrations
Authorization: Bearer <your_token>
```

#### With Status Filter
```bash
GET http://localhost:3000/patients/7/registrations?status=DISETUJUI
Authorization: Bearer <your_token>
```

#### With Pagination
```bash
GET http://localhost:3000/patients/7/registrations?page=1&limit=10
Authorization: Bearer <your_token>
```

#### Combined Filters
```bash
GET http://localhost:3000/patients/7/registrations?status=MENUNGGU&page=1&limit=20
Authorization: Bearer <your_token>
```

### 4. Test Error Cases

#### Invalid Patient ID
```bash
GET http://localhost:3000/patients/abc/registrations
Authorization: Bearer <your_token>
# Expected: 400 Bad Request
```

#### Non-existent Patient
```bash
GET http://localhost:3000/patients/99999/registrations
Authorization: Bearer <your_token>
# Expected: 404 Not Found
```

#### Invalid Status
```bash
GET http://localhost:3000/patients/7/registrations?status=INVALID
Authorization: Bearer <your_token>
# Expected: 400 Bad Request
```

#### No Authentication
```bash
GET http://localhost:3000/patients/7/registrations
# Expected: 401 Unauthorized
```

#### Wrong Role (PASIEN)
```bash
# Login as PASIEN first, then:
GET http://localhost:3000/patients/7/registrations
Authorization: Bearer <pasien_token>
# Expected: 403 Forbidden
```

## Important Notes

### Why Kategori is Not Included
📝 **Note**: Kategori pemeriksaan **tidak ditampilkan** dalam endpoint ini karena kategori baru ditentukan saat pemeriksaan (pemeriksaan) dibuat oleh petugas, bukan saat pendaftaran. Pada saat pasien melakukan pendaftaran, mereka hanya mengunggah surat rujukan dan memilih jadwal, tetapi kategori pemeriksaan belum ditentukan.

Untuk mendapatkan informasi kategori pemeriksaan, gunakan endpoint pemeriksaan (exams) yang sudah tersedia.

### Route Ordering
The route `/:patientId/registrations` is placed **before** `/:id` in the router to prevent Express from matching `/7/registrations` as `/:id` with id="7/registrations". This is critical for proper routing.

### File Path
The `file_path` field returns the blob name (e.g., `2025/12/uuid.pdf`), not a full URL. To download the file, use the existing endpoint:
```
GET /registrations/:id/surat-rujukan/download
```

## Next Steps

1. **Test the endpoint** with various scenarios
2. **Update API documentation** - add this endpoint to `Dokumentasi API eLabora.md`
3. **Create Postman collection** - add test cases to `POSTMAN_TEST_GUIDE.md`
4. **Update frontend integration guide** - document this endpoint in `PANDUAN_INTEGRASI_FRONTEND.md`

## Example Postman Request

```
GET {{baseURL}}/patients/7/registrations?status=DISETUJUI&page=1&limit=20
Authorization: Bearer {{token}}
Accept: application/json
```

## Security Considerations

✅ Authentication required via JWT  
✅ Role-based access control (DOKTER, PETUGAS only)  
✅ Patient ID validation prevents SQL injection  
✅ Input sanitization for status parameter  
✅ Pagination limits prevent excessive data retrieval  
✅ Database connections properly released  

---

**Implementation Date:** 2026-05-29  
**Status:** ✅ Complete and ready for testing
