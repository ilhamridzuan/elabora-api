# Panduan Testing Patient Search Optimization - Postman

## Setup Awal

**Base URL:** `http://localhost:3000`

**Authentication Required:** Ya, semua endpoint butuh JWT token

### Cara Dapat Token

1. Login dulu via endpoint auth
2. Copy token dari response
3. Tambah ke header: `Authorization: Bearer <token>`

---

## Endpoint 1: Legacy Search (GET)

**Backward compatibility test - endpoint lama tetap jalan**

### URL
```
GET http://localhost:3000/api/patients?search=<keyword>&page=1&pageSize=20
```

### Headers
```
Authorization: Bearer <your_jwt_token>
```

### Test Cases

#### TC1.1: Search by name
```
GET http://localhost:3000/api/patients?search=budi
```
**Expected:** Return pasien dengan nama contain "budi" (case-insensitive)

#### TC1.2: Search by NIK
```
GET http://localhost:3000/api/patients?search=3201
```
**Expected:** Return pasien dengan NIK contain "3201"

#### TC1.3: Pagination
```
GET http://localhost:3000/api/patients?search=&page=2&pageSize=10
```
**Expected:** Return page 2, max 10 records

#### TC1.4: Empty search
```
GET http://localhost:3000/api/patients?search=
```
**Expected:** Return all patients, sorted by nama ASC

---

## Endpoint 2: Advanced Search (POST)

**New endpoint - multi-filter search**

### URL
```
POST http://localhost:3000/api/patients/search
```

### Headers
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

### Test Cases

#### TC2.1: Search by name only
```json
{
  "name": "budi"
}
```
**Expected:** Return pasien dengan nama contain "budi" (case-insensitive, partial match)

#### TC2.2: Search by NIK prefix
```json
{
  "nik": "3201"
}
```
**Expected:** Return pasien dengan NIK start with "3201"

#### TC2.3: Search by phone prefix
```json
{
  "phone": "0812"
}
```
**Expected:** Return pasien dengan no_telepon start with "0812"

#### TC2.4: Multi-filter (name + NIK)
```json
{
  "name": "budi",
  "nik": "3201"
}
```
**Expected:** Return pasien yang satisfy BOTH conditions (AND logic)

#### TC2.5: Date of birth range
```json
{
  "dobStart": "1990-01-01",
  "dobEnd": "2000-12-31"
}
```
**Expected:** Return pasien lahir antara 1990-2000

#### TC2.6: Registration date range
```json
{
  "regStart": "2024-01-01",
  "regEnd": "2024-12-31"
}
```
**Expected:** Return pasien registered di 2024

#### TC2.7: Complex multi-filter
```json
{
  "name": "budi",
  "dobStart": "1990-01-01",
  "dobEnd": "2000-12-31",
  "regStart": "2024-01-01"
}
```
**Expected:** Return pasien yang satisfy ALL conditions

#### TC2.8: Pagination
```json
{
  "page": 2,
  "pageSize": 10
}
```
**Expected:** Return page 2, max 10 records

#### TC2.9: Sorting by NIK descending
```json
{
  "sortBy": "nik",
  "sortOrder": "DESC"
}
```
**Expected:** Return all patients sorted by NIK descending

#### TC2.10: Sorting by birth date ascending
```json
{
  "sortBy": "tgl_lahir",
  "sortOrder": "ASC"
}
```
**Expected:** Return patients sorted by tgl_lahir oldest first

#### TC2.11: Sorting by registration date
```json
{
  "sortBy": "created_at",
  "sortOrder": "DESC"
}
```
**Expected:** Return patients sorted by created_at newest first

---

## Validation Test Cases

**Test input validation - expect 400 errors**

### TV1: Invalid date format
```json
{
  "dobStart": "01-01-1990"
}
```
**Expected:** 400 Bad Request - "Invalid date format for dobStart"

### TV2: Invalid sortBy
```json
{
  "sortBy": "email"
}
```
**Expected:** 400 Bad Request - "Invalid sortBy value"

### TV3: Invalid sortOrder
```json
{
  "sortOrder": "ASCENDING"
}
```
**Expected:** 400 Bad Request - "Invalid sortOrder value"

### TV4: Invalid page
```json
{
  "page": 0
}
```
**Expected:** 400 Bad Request - "Page must be a positive integer"

### TV5: Invalid pageSize
```json
{
  "pageSize": 150
}
```
**Expected:** 400 Bad Request - "PageSize must be between 1 and 100"

### TV6: Date range logic error (end before start)
```json
{
  "dobStart": "2000-01-01",
  "dobEnd": "1990-01-01"
}
```
**Expected:** 400 Bad Request - "Date of birth end date must be after start date"

### TV7: Registration date range logic error
```json
{
  "regStart": "2024-12-31",
  "regEnd": "2024-01-01"
}
```
**Expected:** 400 Bad Request - "Registration end date must be after start date"

---

## Authorization Test Cases

**Test role-based access control**

### TA1: DOKTER role
**Setup:** Login dengan user role DOKTER
```json
{
  "name": "test"
}
```
**Expected:** 200 OK - access granted

### TA2: PETUGAS role
**Setup:** Login dengan user role PETUGAS
```json
{
  "name": "test"
}
```
**Expected:** 200 OK - access granted

### TA3: Unauthorized role (e.g., PASIEN)
**Setup:** Login dengan user role PASIEN
```json
{
  "name": "test"
}
```
**Expected:** 403 Forbidden

### TA4: No authentication
**Setup:** Remove Authorization header
```json
{
  "name": "test"
}
```
**Expected:** 401 Unauthorized

---

## Edge Cases

### EC1: Empty filters
```json
{}
```
**Expected:** Return all patients with default pagination (page=1, pageSize=20)

### EC2: PageSize > 100 (should cap at 100)
```json
{
  "pageSize": 500
}
```
**Expected:** Return max 100 records (capped)

### EC3: Page < 1 (should normalize to 1)
```json
{
  "page": -5
}
```
**Expected:** Return page 1

### EC4: Case-insensitive name search
```json
{
  "name": "BUDI"
}
```
**Expected:** Return pasien dengan nama "budi", "Budi", "BUDI", etc.

### EC5: Partial name match
```json
{
  "name": "ud"
}
```
**Expected:** Return pasien dengan nama contain "ud" (e.g., "Budi", "Yuda")

### EC6: NIK prefix exact match
```json
{
  "nik": "32"
}
```
**Expected:** Return pasien dengan NIK start with "32" (e.g., "3201123456", "3202987654")

### EC7: Phone prefix exact match
```json
{
  "phone": "08"
}
```
**Expected:** Return pasien dengan phone start with "08"

### EC8: Single date bound (dobStart only)
```json
{
  "dobStart": "1990-01-01"
}
```
**Expected:** Return pasien lahir >= 1990-01-01

### EC9: Single date bound (dobEnd only)
```json
{
  "dobEnd": "2000-12-31"
}
```
**Expected:** Return pasien lahir <= 2000-12-31

---

## Response Structure Validation

**Verify response format correct**

### Expected Response Format
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
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 150
}
```

**Check:**
- `items` array exist
- Each item has: id, nik, nama, tgl_lahir, no_telepon, username, email
- `page`, `pageSize`, `total` exist
- `total` = total matching records (not just current page)

---

## Performance Test

### PT1: Large dataset query
```json
{
  "name": "a"
}
```
**Expected:** Response time < 200ms (with 100k records + indexes)

### PT2: Multi-filter query
```json
{
  "name": "budi",
  "dobStart": "1990-01-01",
  "dobEnd": "2000-12-31"
}
```
**Expected:** Response time < 200ms (indexes used)

---

## Postman Collection Setup

### Environment Variables
```
base_url: http://localhost:3000
token: <paste_your_jwt_token_here>
```

### Pre-request Script (untuk auto-add token)
```javascript
pm.request.headers.add({
  key: 'Authorization',
  value: 'Bearer ' + pm.environment.get('token')
});
```

### Test Script (untuk validate response)
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has items array", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('items');
    pm.expect(jsonData.items).to.be.an('array');
});

pm.test("Response has pagination info", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('page');
    pm.expect(jsonData).to.have.property('pageSize');
    pm.expect(jsonData).to.have.property('total');
});

pm.test("Each item has required fields", function () {
    var jsonData = pm.response.json();
    if (jsonData.items.length > 0) {
        var item = jsonData.items[0];
        pm.expect(item).to.have.property('id');
        pm.expect(item).to.have.property('nik');
        pm.expect(item).to.have.property('nama');
        pm.expect(item).to.have.property('tgl_lahir');
        pm.expect(item).to.have.property('no_telepon');
        pm.expect(item).to.have.property('username');
        pm.expect(item).to.have.property('email');
    }
});
```

---

## Quick Test Checklist

- [ ] Legacy endpoint still works (TC1.1-1.4)
- [ ] Advanced search single filters work (TC2.1-2.3)
- [ ] Multi-filter AND logic works (TC2.4, TC2.7)
- [ ] Date range filtering works (TC2.5-2.6)
- [ ] Pagination works (TC2.8)
- [ ] Sorting works (TC2.9-2.11)
- [ ] Validation rejects invalid inputs (TV1-TV7)
- [ ] Authorization enforced (TA1-TA4)
- [ ] Edge cases handled (EC1-EC9)
- [ ] Response structure correct
- [ ] Performance acceptable (PT1-PT2)
