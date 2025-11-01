import { Router } from "express";
import { getAttendanceQRCodes, scanAttendance } from "./attendance.controller.js"
import { auth, roles } from "../../Middleware/auth.js";
import { asyncHandler } from "../../Utils/catchError.js";


const router = Router();


// جلب أكواد الحضور والانصراف
router.get("/qrcodes", getAttendanceQRCodes);

// تسجيل الحضور أو الانصراف
router.post("/scan", auth([], true), asyncHandler(scanAttendance));


export default router;
