const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
require('dotenv').config();
// Per-route auth will be applied inside routers
const {isAdmin} = require("./middlewares/isAdmin");

const app = express();
app.use(express.json({ limit: '50mb' })); // Tăng limit để xử lý base64 images
app.use(cors()); // Cho phép Admin Web gọi API

// --- KẾT NỐI DATABASE ---
mongoose.connect(process.env.DATABASE_URL || "mongodb://localhost:27017/zalo_reports", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// --- ROUTES ---
const publicRoutes = require("./routes/publicRoutes");
const adminRoutes = require("./routes/adminRoutes");

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use("/api", publicRoutes);
// Do NOT gate entire /api/admin with isAdmin; routes handle their own auth (teacher/admin)
app.use("/api/admin", adminRoutes);

// Basic error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // Xử lý lỗi Multer (file upload)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File quá lớn. Kích thước tối đa 50MB' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Quá nhiều file. Tối đa 5 ảnh' });
    }
    return res.status(400).json({ error: 'Lỗi upload file', details: err.message });
  }
  
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));