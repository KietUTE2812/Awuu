# API Upload Ảnh cho Zalo Mini App

## 📸 Tích hợp với Zalo openMediaPicker

API này được thiết kế để làm việc với [Zalo openMediaPicker](https://miniapp.zaloplatforms.com/documents/api/openMediaPicker/)

## 🚀 Endpoints

### 1. Upload Multiple Images (FormData)
**Endpoint:** `POST /api/upload-images`

**Method:** Sử dụng khi bạn có file object từ Zalo

```javascript
// Ví dụ sử dụng trong Zalo Mini App
import { openMediaPicker } from "zmp-sdk/apis";
import axios from "axios";

const handleUploadImages = async () => {
  try {
    // Bước 1: Mở picker để user chọn ảnh
    const { data } = await openMediaPicker({
      type: "photo",
      maxSelectItem: 5,
      serverUploadUrl: "", // Để trống vì ta sẽ tự xử lý upload
    });

    if (!data || data.length === 0) {
      console.log("Không có ảnh nào được chọn");
      return [];
    }

    // Bước 2: Convert base64 sang blob và upload lên server
    const uploadedUrls = [];
    
    for (const item of data) {
      // item.path chứa base64 string của ảnh
      const response = await axios.post(
        'http://localhost:7000/api/upload-image-base64',
        {
          imageData: item.path, // base64 string
          fileName: item.name || 'image'
        }
      );
      
      if (response.data.success) {
        uploadedUrls.push(response.data.image.url);
      }
    }

    return uploadedUrls;
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
};
```

### 2. Upload Single Image (Base64)
**Endpoint:** `POST /api/upload-image-base64`

**Request Body:**
```json
{
  "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "fileName": "optional_name"
}
```

**Response:**
```json
{
  "success": true,
  "image": {
    "url": "https://res.cloudinary.com/xxx/image/upload/v123/school-violence-reports/xxx.jpg",
    "publicId": "school-violence-reports/xxx",
    "width": 1200,
    "height": 800,
    "format": "jpg"
  }
}
```

## 🔧 Cấu hình

### 1. Tạo tài khoản Cloudinary
1. Đăng ký tại https://cloudinary.com/
2. Lấy thông tin từ Dashboard:
   - Cloud Name
   - API Key
   - API Secret

### 2. Cập nhật file `.env`
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 📱 Ví dụ hoàn chỉnh trong Zalo Mini App

```javascript
// components/ReportForm.jsx
import React, { useState } from 'react';
import { openMediaPicker } from "zmp-sdk/apis";
import axios from "axios";

const ReportForm = () => {
  const [imageUrls, setImageUrls] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSelectImages = async () => {
    try {
      setLoading(true);
      
      const { data } = await openMediaPicker({
        type: "photo",
        maxSelectItem: 5,
        serverUploadUrl: "",
      });

      if (!data || data.length === 0) return;

      // Upload từng ảnh lên server
      const uploadPromises = data.map(async (item) => {
        const response = await axios.post(
          'http://localhost:7000/api/upload-image-base64',
          {
            imageData: item.path,
            fileName: item.name
          }
        );
        return response.data.image.url;
      });

      const urls = await Promise.all(uploadPromises);
      setImageUrls(urls);
      
    } catch (error) {
      console.error("Error:", error);
      alert("Lỗi khi upload ảnh");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async () => {
    try {
      const response = await axios.post('http://localhost:7000/api/submit', {
        content: "Nội dung báo cáo...",
        type: "physical",
        images: imageUrls, // Gửi mảng URLs đã upload
        zaloId: "user_zalo_id"
      });
      
      console.log("Report submitted:", response.data);
    } catch (error) {
      console.error("Submit error:", error);
    }
  };

  return (
    <div>
      <button onClick={handleSelectImages} disabled={loading}>
        {loading ? "Đang upload..." : "Chọn ảnh"}
      </button>
      
      {imageUrls.length > 0 && (
        <div>
          <p>Đã upload {imageUrls.length} ảnh</p>
          {imageUrls.map((url, index) => (
            <img key={index} src={url} alt={`Image ${index}`} style={{ width: 100 }} />
          ))}
        </div>
      )}
      
      <button onClick={handleSubmitReport}>Gửi báo cáo</button>
    </div>
  );
};

export default ReportForm;
```

## 🛡️ Giới hạn & Bảo mật

- **Kích thước file:** Tối đa 10MB/ảnh
- **Số lượng:** Tối đa 5 ảnh/request
- **Định dạng:** Chỉ chấp nhận file ảnh (jpg, png, gif, webp, etc.)
- **Auto resize:** Ảnh lớn hơn 1200x1200 sẽ tự động resize
- **Auto optimize:** Cloudinary tự động tối ưu chất lượng

## 🐛 Xử lý lỗi

```javascript
try {
  const response = await axios.post('/api/upload-image-base64', {
    imageData: base64Image
  });
  
  if (response.data.success) {
    console.log("Upload thành công:", response.data.image.url);
  }
} catch (error) {
  if (error.response?.status === 400) {
    console.error("Dữ liệu không hợp lệ");
  } else if (error.response?.status === 500) {
    console.error("Lỗi server:", error.response.data.details);
  }
}
```

## 📝 Notes

- Zalo openMediaPicker trả về ảnh dưới dạng base64
- API `/upload-image-base64` được thiết kế để nhận base64 từ Zalo
- Ảnh được lưu trong folder `school-violence-reports` trên Cloudinary
- URL trả về là permanent link, có thể lưu vào database
