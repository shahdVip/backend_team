import jwt from "jsonwebtoken";
import userModel from "../../DB/models/user.model.js";
import { Employee } from "../../DB/models/employee.model.js";
import Role from "../../DB/models/role.model.js";
import Permission from "../../DB/models/permission.model.js";

export const roles = {
  Admin: "admin",
  Coach: "coach",
  Member: "member",
  Receptionist: "receptionist",
  Accountant: "accountant",
};

export const auth = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const { authorization } = req.headers;
      if (!authorization || !authorization.startsWith("Bearer ")) {
        return res.status(401).json({
          status: "error",
          message: "Unauthorized: Missing token",
          data: null,
        });
      }

      const token = authorization.split(" ")[1];
      let decoded;

      // أولاً نحاول التحقق من الـ access token
      try {
        decoded = jwt.verify(token, process.env.LOGINTOKEN);
      } catch {
        // إذا انتهى صلاحية الـ access token أو غير صالح، نبحث مباشرة عن المستخدم باستخدام refresh token
        let account =
          (await Employee.findOne({ refreshToken: token }).lean()) ||
          (await userModel.findOne({ refreshToken: token }).lean());

        if (!account) {
          return res.status(401).json({
            status: "error",
            message: "Unauthorized: Invalid or expired token",
            data: null,
          });
        }

        // نستخدم بيانات المستخدم من refresh token
        decoded = { id: account._id, role: account.role };

        // إنشاء access token جديد
        const newAccessToken = jwt.sign(
          { id: account._id, role: account.role },
          process.env.LOGINTOKEN,
          { expiresIn: "15m" }
        );
        res.setHeader("x-access-token", newAccessToken);
      }

      // البحث عن المستخدم في DB (موظف أو مستخدم)
      let user =
        (await Employee.findById(decoded.id).select("username role").lean()) ||
        (await userModel.findById(decoded.id).select("userName role").lean());

      if (!user) {
        return res.status(401).json({
          status: "error",
          message: "Unauthorized: User not found",
          data: null,
        });
      }

      req.user = user;
      req.userId = decoded.id;
      req.user.roleName = (user.role || "").toString().toLowerCase();

      // التحقق من السماح بالدور
      if (allowedRoles.length) {
        const allowed = allowedRoles.map((r) => r.toString().toLowerCase());
        if (!allowed.includes(req.user.roleName)) {
          return res.status(403).json({
            status: "error",
            message: "Forbidden: You do not have permission",
            data: null,
          });
        }
      }

      next();
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: error.message || "Internal server error",
        data: null,
      });
    }
  };
};
