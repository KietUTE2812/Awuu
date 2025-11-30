const { Router } = require("express");
const CryptoJS = require("crypto-js");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const Report = require("../models/ReportSchema");
const dotenv = require("dotenv");
dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY || "default_secret";

const router = Router();

// Cấu hình multer để xử lý upload từ memory (không lưu file vào disk)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // Giới hạn 50MB mỗi file
  }
});

// Static report types for the app selector
const REPORT_TYPES = [
  { value: "physical", title: "Bạo lực Thể chất" },
  { value: "verbal", title: "Bạo lực Lời nói/Tinh thần" },
  { value: "cyber", title: "Bạo lực Mạng" },
  { value: "other", title: "Góp ý/Khác" },
];

// --- API: Report types ---
router.get("/report-types", (req, res) => {
  return res.json(REPORT_TYPES);
});

// --- API: Upload ảnh lên Cloudinary ---
router.post("/upload/media", upload.array('file', 5), async (req, res) => {
  try {
    console.log('Received files:', req.files);
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Không có file ảnh nào được upload" });
    }

    const uploadPromises = req.files.map((file) => {
      return new Promise((resolve, reject) => {
        // Upload từ buffer lên Cloudinary
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'school-violence-reports', // Thư mục lưu ảnh trên Cloudinary
            resource_type: 'auto', // Tự động nhận diện loại file
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
                format: result.format
              });
            }
          }
        );

        // Pipe buffer vào upload stream
        uploadStream.end(file.buffer);
      });
    });

    const uploadedImages = await Promise.all(uploadPromises);

    res.json({
      error: 0,
      success: true,
      images: uploadedImages,
      count: uploadedImages.length
    });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: -1, message: "Lỗi khi upload ảnh", details: err.message });
  }
});

// --- API: Upload single image from base64 (alternative method for Zalo) ---
router.post("/upload-image-base64", async (req, res) => {
  try {
    const { imageData, fileName } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: "Thiếu dữ liệu ảnh" });
    }

    // Upload base64 string lên Cloudinary
    const result = await cloudinary.uploader.upload(imageData, {
      folder: 'school-violence-reports',
      resource_type: 'image',
      public_id: fileName ? `${Date.now()}_${fileName}` : undefined,
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' }
      ]
    });

    res.json({
      success: true,
      image: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format
      }
    });

  } catch (err) {
    console.error("Upload base64 error:", err);
    res.status(500).json({ error: "Lỗi khi upload ảnh", details: err.message });
  }
});

// --- API: Submit report (Students) ---
router.post("/submit", async (req, res) => {
  try {
    const { zaloId, content, type, images, sender_info } = req.body || {};

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ error: "Nội dung bắt buộc" });
    }
    const allowed = new Set(REPORT_TYPES.map((t) => t.value));
    if (type && !allowed.has(type)) {
      return res.status(400).json({ error: "Loại báo cáo không hợp lệ" });
    }

    // Validate images array (nếu có)
    let validImages = [];
    if (images && Array.isArray(images)) {
      validImages = images
        .filter(img => typeof img === 'string' && img.trim().length > 0)
        .slice(0, 5); // Giới hạn tối đa 5 ảnh
    }

    const encryptedId = zaloId
      ? CryptoJS.AES.encrypt(String(zaloId), SECRET_KEY).toString()
      : null;

    const fakeName = `Student_${Math.floor(1000 + Math.random() * 9000)}`;

    const newReport = new Report({
      encrypted_id: encryptedId,
      display_name: fakeName,
      type: allowed.has(type) ? type : "other",
      content: content.trim().slice(0, 1000),
      images: validImages,
      sender_info: {
        name: sender_info?.name || "",
        sdt: sender_info?.sdt || "",
        avatar: sender_info?.avatar || ""
      }
    });

    const saved = await newReport.save();
    res.json({ success: true, fakeName, reportId: saved._id });
  } catch (err) {
    console.error("Submit error:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

module.exports = router;