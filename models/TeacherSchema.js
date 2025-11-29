const mongoose = require("mongoose");

// --- SCHEMA DATABASE ---
const TeacherSchema = new mongoose.Schema({
  id: mongoose.Schema.Types.ObjectId,
  name: String,   // Tên thật của giáo viên
  sdt: { type: String, required: true, unique: true },    // Số điện thoại (bắt buộc, duy nhất)
  password: { type: String, required: true }, // Mật khẩu đã hash (bắt buộc)
  role: { type: String, default: 'teacher', enum: ['teacher', 'admin'] } // teacher, admin
}, { timestamps: true });

const Teacher = mongoose.model("Teacher", TeacherSchema);

module.exports = Teacher;