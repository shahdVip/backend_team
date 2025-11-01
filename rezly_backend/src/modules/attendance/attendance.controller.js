import QRCode from "qrcode";
import attendanceModel from "../../../DB/models/attendance.model.js";
import userModel from "../../../DB/models/user.model.js";
import { Employee } from "../../../DB/models/employee.model.js";

// ==================== عرض كود الحضور والانصراف ====================
export const getAttendanceQRCodes = async (req, res, next) => {
  try {
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://192.168.1.9:5173";

    const qrCheckIn = await QRCode.toDataURL("CHECK_IN");
    const qrCheckOut = await QRCode.toDataURL("CHECK_OUT");

    res.status(200).json({
      message: "تم إنشاء أكواد الحضور والانصراف بنجاح ✅",
      checkInQR: qrCheckIn,
      checkOutQR: qrCheckOut,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== مسح كود الحضور أو الانصراف ====================
export const scanAttendance = async (req, res, next) => {
  try {
    const { qrType } = req.body; // "CHECK_IN" أو "CHECK_OUT"
    const userId = req.userId; // استخدم req.userId اللي جاي من الميدلوير
    const role = req.user.role || "User"; // لو الموظف أو مستخدم عادي

    if (qrType !== "CHECK_IN" && qrType !== "CHECK_OUT") {
      return res.status(400).json({ message: "رمز QR غير صالح" });
    }

    const today = new Date().toISOString().split("T")[0];

    let record = await attendanceModel.findOne({ userId, date: today });

    // إذا ما في سجل لليوم → بنعمل واحد جديد
    if (!record) {
      record = await attendanceModel.create({
        userId,
        role, // استخدمنا role مضبوط
        date: today,
      });
    }
    // لو المستخدم بيحاول يعمل CHECK_OUT بدون ما يكون سجل دخول
    if (qrType === "CHECK_OUT" && (!record || !record.checkIn)) {
      return res
        .status(400)
        .json({ message: "لا يمكن تسجيل الانصراف بدون تسجيل دخول أولاً ❌" });
    }

    // في حالة الحضور
    if (qrType === "CHECK_IN") {
      if (record.checkIn) {
        return res.json({ message: "تم تسجيل الحضور مسبقًا اليوم ✅" });
      }

      record.checkIn = new Date();
      await record.save();

      // تحديث حالة المستخدم
      const Model = role.toLowerCase() === "employee" ? Employee : userModel;
      await Model.findByIdAndUpdate(userId, { active: true });

      return res.json({ message: "تم تسجيل الحضور بنجاح ✅", record });
    }

    // في حالة الانصراف
    if (qrType === "CHECK_OUT") {
      if (record.checkOut) {
        return res.json({ message: "تم تسجيل الانصراف مسبقًا اليوم ✅" });
      }

      record.checkOut = new Date();
      await record.save();

      const Model = role.toLowerCase() === "employee" ? Employee : userModel;
      await Model.findByIdAndUpdate(userId, { active: false });

      return res.json({ message: "تم تسجيل الانصراف بنجاح ✅", record });
    }
  } catch (error) {
    next(error);
  }
};
