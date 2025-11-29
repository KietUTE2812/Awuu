const { Router } = require("express");
const CryptoJS = require("crypto-js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Report = require("../models/ReportSchema");
const Teacher = require("../models/TeacherSchema");
const Settings = require("../models/Settings");
const { isAdmin, isTeacher, JWT_SECRET } = require("../middlewares/isAdmin");
const dotenv = require("dotenv");
dotenv.config();
const SECRET_KEY = process.env.SECRET_KEY || "default_secret";
const ENV_FALLBACK_PIN = process.env.ADMIN_MASTER_PIN || "123456";

const router = Router();

async function getSettings() {
  let s = await Settings.findOne({ key: 'global' });
  if (!s) s = await Settings.create({ key: 'global' });
  return s;
}

async function verifyPin(pin) {
  const s = await getSettings();
  if (s.adminMasterPinHash) {
    return bcrypt.compare(pin, s.adminMasterPinHash);
  }
  // fallback to ENV when no PIN configured in DB
  return pin === ENV_FALLBACK_PIN;
}

// --- LOGIN for admin/teacher (returns JWT token) ---
router.post("/login", async (req, res) => {
  try {
    const { sdt, password } = req.body || {};
    if (!sdt || !password) {
      return res.status(400).json({ error: "Thiếu thông tin đăng nhập" });
    } 
    
    const teacher = await Teacher.findOne({ sdt }).lean();
    if (!teacher) {
      return res.status(403).json({ error: "Số điện thoại không tồn tại" });
    }
    
    // So sánh mật khẩu đã hash
    const isPasswordValid = await bcrypt.compare(password, teacher.password);
    if (!isPasswordValid) {
      return res.status(403).json({ error: "Mật khẩu không đúng" });
    }
    
    // Tạo JWT token
    const tokenPayload = {
      id: teacher._id.toString(),
      sdt: teacher.sdt,
      name: teacher.name,
      role: teacher.role
    };
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
    
    return res.json({
      token,
      user: {
        id: teacher._id,
        name: teacher.name,
        sdt: teacher.sdt,
        role: teacher.role
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// --- GET: List reports (teacher or admin) ---
router.get("/reports", async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const q = {};
    if (status) q.status = status;

    const skip = (Math.max(Number(page), 1) - 1) * Math.max(Number(limit), 1);
    const docs = await Report.find(q)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Math.max(Number(limit), 1))
      .lean();

    const items = docs.map((d) => ({
      id: d._id,
      display_name: d.display_name,
      type: d.type,
      content: d.content,
      images: d.images || [],
      status: d.status,
      created_at: d.created_at,
      has_encrypted_id: Boolean(d.encrypted_id),
    }));

    const total = await Report.countDocuments(q);
    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error("List reports error:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// --- POST: Update report status ---
router.post("/reports/:id/status", isTeacher, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = new Set(["pending", "processed"]);
    if (!allowed.has(status)) return res.status(400).json({ error: "Trạng thái không hợp lệ" });

    const updated = await Report.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: "Không tìm thấy báo cáo" });
    res.json({ id: updated._id, status: updated.status });
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// --- POST: Reveal identity (principal level) ---
router.post("/reveal-identity", isAdmin, async (req, res) => {
  try {
    const { reportId, adminPassword } = req.body || {};
    if (!reportId) return res.status(400).json({ error: "Thiếu mã báo cáo" });
    const ok = await verifyPin(adminPassword);
    if (!ok) return res.status(403).json({ error: "Sai mã PIN khẩn cấp!" });

    const report = await Report.findById(reportId).lean();
    if (!report) return res.status(404).json({ error: "Không tìm thấy" });
    if (!report.encrypted_id) return res.status(400).json({ error: "Không có danh tính để giải mã" });

    const bytes = CryptoJS.AES.decrypt(report.encrypted_id, SECRET_KEY);
    const realZaloId = bytes.toString(CryptoJS.enc.Utf8);

    console.warn(
      `AUDIT LOG: ${new Date().toISOString()} User ID ${req.user?.id || "unknown"} (${req.user?.sdt || "unknown"}) revealed identity for report ${reportId}`
    );

    res.json({ realZaloId, sender_info: report.sender_info });
  } catch (err) {
    console.error("Reveal identity error:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// --- ADMIN: PIN management ---
router.get("/pin/status", isAdmin, async (_req, res) => {
  const s = await getSettings();
  res.json({ configured: Boolean(s.adminMasterPinHash) });
});

router.post("/pin", isAdmin, async (req, res) => {
  const { newPin } = req.body || {};
  if (!newPin || String(newPin).length < 4) return res.status(400).json({ error: "PIN phải từ 4 ký tự" });
  const s = await getSettings();
  const hash = await bcrypt.hash(String(newPin), 10);
  s.adminMasterPinHash = hash;
  s.updated_at = new Date();
  await s.save();
  res.json({ success: true });
});

// --- ADMIN: Teacher management ---
router.get("/teachers", isAdmin, async (_req, res) => {
  const list = await Teacher.find({}, { password: 0 }).lean();
  res.json(list);
});

router.post("/teachers", isAdmin, async (req, res) => {
  try {
    const { sdt, name, role = 'teacher', password = '' } = req.body || {};
    if (!sdt) return res.status(400).json({ error: 'Thiếu số điện thoại' });
    if (!['teacher', 'admin'].includes(role)) return res.status(400).json({ error: 'Vai trò không hợp lệ' });
    
    // Hash password nếu có password mới
    let updateData = { name, role };
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }
    
    const updated = await Teacher.findOneAndUpdate(
      { sdt },
      { $set: updateData },
      { upsert: true, new: true, fields: { password: 0 } }
    ).lean();
    
    res.json(updated);
  } catch (err) {
    console.error("Teacher update error:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

router.delete("/teachers/:sdt", isAdmin, async (req, res) => {
  const { sdt } = req.params;
  if (!sdt) return res.status(400).json({ error: 'Thiếu số điện thoại' });
  const r = await Teacher.deleteOne({ sdt });
  res.json({ deleted: r.deletedCount });
});

module.exports = router;