require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Teacher = require('../models/TeacherSchema');

const admin = {
  name: process.env.ADMIN_NAME || 'Admin User',
  password: process.env.ADMIN_PASSWORD || 'admin_password',
  sdt: process.env.ADMIN_SDT || '0123456789',
}

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.DATABASE_URL || "mongodb://localhost:27017/zalo_reports", {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("Connected to MongoDB for seeding admin");
    
    const existingAdmin = await Teacher.findOne({ sdt: admin.sdt }).lean();
    if (existingAdmin) {
      console.log("Admin user already exists:", { name: existingAdmin.name, sdt: existingAdmin.sdt, role: existingAdmin.role });
    }
    else {
      // Hash password trước khi lưu
      const hashedPassword = await bcrypt.hash(admin.password, 10);
      
      const newAdmin = new Teacher({
        name: admin.name,
        sdt: admin.sdt,
        password: hashedPassword,
        role: 'admin'
      });
      await newAdmin.save();
      console.log("Admin user created successfully:", { name: newAdmin.name, sdt: newAdmin.sdt, role: newAdmin.role });
      console.log("Password (plaintext, for your reference):", admin.password);
    }
    mongoose.connection.close();
  } catch (err) {
    console.error("Error seeding admin user:", err);
    mongoose.connection.close();
  }
}

seedAdmin();