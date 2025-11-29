# AwuU Backend (Node.js/Express)

APIs supporting the Zalo Mini App for anonymous school bullying reports and teacher/admin review.

## Environment

Create `.env` in `awuu-be/`:

```env
# Database
DATABASE_URL=mongodb://localhost:27017/zalo_reports

# Server
PORT=7000

# JWT Secret
JWT_SECRET=your-strong-secret-key-change-this-in-production

# Encryption
SECRET_KEY=your_secret_key_here

# Admin Master PIN (for revealing identities)
ADMIN_MASTER_PIN=mat_khau_khan_cap_113

# Cloudinary Configuration (Required for image upload)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Default Admin Account
ADMIN_NAME=Admin User
ADMIN_SDT=0123456789
ADMIN_PASSWORD=admin_password
```

## Install & Run

```bash
# from awuu-be folder
yarn install

# Seed admin user
yarn seed:admin

# Start development server
yarn dev
```

Backend base URL: `http://localhost:7000/api`

## Public APIs

### 1. Get Report Types
- `GET /api/report-types`: List of available report types.

### 2. Upload Images (for Zalo Mini App)
- `POST /api/upload-image-base64`
  - Body: `{ imageData: string (base64), fileName?: string }`
  - Response: `{ success: true, image: { url, publicId, width, height, format } }`
  - **Note**: Dùng endpoint này để upload ảnh từ Zalo `openMediaPicker`

- `POST /api/upload-images` (alternative with FormData)
  - Body: FormData with `images` field (max 5 files, 10MB each)
  - Response: `{ success: true, images: [...], count: number }`

### 3. Submit Report
- `POST /api/submit`
  - Body: `{ zaloId?: string, content: string, type: "physical"|"verbal"|"cyber"|"other", images?: string[], sender_info?: { name, sdt, avatar } }`
  - Response: `{ success: true, fakeName: string, reportId: string }`

📖 **Xem chi tiết tích hợp Zalo:** [UPLOAD_API_GUIDE.md](./UPLOAD_API_GUIDE.md)

## Admin & Teacher APIs

**Authentication**: All admin/teacher APIs require JWT token in header:
```
Authorization: Bearer <jwt_token>
```

### Login
- `POST /api/admin/login`
  - Body: `{ sdt: string, password: string }`
  - Response: `{ token: string, user: { id, name, sdt, role } }`

### Reports Management
- `GET /api/admin/reports?status=&page=&limit=` (teacher/admin)
  - Response: `{ items, total, page, limit }`
- `POST /api/admin/reports/:id/status` (teacher/admin)
  - Body: `{ status: "pending"|"processed" }`
- `POST /api/admin/reveal-identity` (admin only)
  - Body: `{ reportId: string, adminPassword: string }`
  - Verifies PIN either from DB (Settings) or ENV fallback on first use.

### Admin-only management
- `GET /api/admin/teachers` – list teachers (without passwords)
- `POST /api/admin/teachers` – upsert a teacher `{ sdt, name, role, password }`
  - **Note**: Password sẽ tự động hash với bcrypt
- `DELETE /api/admin/teachers/:sdt` – remove teacher by sdt
- `GET /api/admin/pin/status` – check if a PIN is configured in DB
- `POST /api/admin/pin` – set/update PIN `{ newPin }` (stored as hash)

## Testing

```bash
# Test API upload (cần server đang chạy)
node test-upload.js
```

## Features

✅ JWT Authentication với bcrypt password hashing  
✅ Cloudinary image upload integration  
✅ Zalo Mini App openMediaPicker support  
✅ Anonymous report system với encryption  
✅ Role-based access control (Admin/Teacher)  
✅ Image upload với auto-resize & optimization  
✅ Complete error handling

## Notes

- Student Zalo IDs are AES-encrypted with `SECRET_KEY` and never returned to admin APIs.
- Identity reveal is gated by a master PIN and is audited in logs.
