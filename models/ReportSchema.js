const mongoose = require("mongoose");

// --- SCHEMA DATABASE ---
const ReportSchema = new mongoose.Schema({
  encrypted_id: String, // ID Zalo đã bị mã hóa (Ví dụ: U2FsdGVkX1...)
  display_name: String, // Tên giả (Ví dụ: Student_X88)
  type: String,         // physical, verbal...
  content: String,
  images: [String],
  sender_info: {
    name: String,
    sdt: String,
    avatar: String
  },
  status: { type: String, default: 'pending' }, // pending, processed
  created_at: { type: Date, default: Date.now }
});
const Report = mongoose.model("Report", ReportSchema);
module.exports = Report;