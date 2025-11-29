const jwt = require("jsonwebtoken");
const Teacher = require("../models/TeacherSchema");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace("Bearer ", "");
        
        if (!token) {
            return res.status(401).json({ error: "Token không tồn tại" });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, sdt, role, name }
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token đã hết hạn" });
        }
        return res.status(401).json({ error: "Token không hợp lệ" });
    }
};

const isAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace("Bearer ", "");
        if (!token) return res.status(401).json({ error: "Token không tồn tại" });

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;

        if (decoded.role !== "admin") {
            return res.status(403).json({ error: "Yêu cầu quyền Admin" });
        }

        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token đã hết hạn" });
        }
        return res.status(401).json({ error: "Token không hợp lệ" });
    }
};

const isTeacher = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace("Bearer ", "");
        if (!token) return res.status(401).json({ error: "Token không tồn tại" });

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;

        if (decoded.role !== "teacher" && decoded.role !== "admin") {
            return res.status(403).json({ error: "Yêu cầu quyền Teacher hoặc Admin" });
        }

        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token đã hết hạn" });
        }
        return res.status(401).json({ error: "Token không hợp lệ" });
    }
};

module.exports = { isAdmin, isTeacher, verifyToken, JWT_SECRET };