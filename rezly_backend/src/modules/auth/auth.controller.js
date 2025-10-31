import userModel from "../../../DB/models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppError } from "../../../AppError.js";
import { sendEmail } from "../../Utils/sendEmail.js";
import { customAlphabet } from "nanoid";
import { arabicSlugify } from "../../Utils/ArabicSlug.js";
import mongoose from "mongoose";
import Role from "../../../DB/models/role.model.js";
import { employeeSchema, employeeUpdateSchema } from "./auth.validation.js";
import { Employee } from "../../../DB/models/employee.model.js";
import Package from "../../../DB/models/packages.model.js";

import crypto from "crypto";



export const employeeSignUp = async (req, res) => {
  try {
    const {
      firstName,lastName,birthDate,nationalId,gender, phoneNumber,
      email,address,jobTitle,department,contractType,startDate,
      username, password, role,notes,
    } = req.body;
    
    const { error } = employeeSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        errors: error.details.map((e) => e.message),
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const refreshToken = jwt.sign(
      { id: new mongoose.Types.ObjectId() },
      process.env.REFRESHTOKEN_SECRET,
      { expiresIn: "30d" }
    );

    const token = jwt.sign({ email }, process.env.CONFIRMEMAILTOKEN, {
      expiresIn: "1h",
    });

    // ===== معالجة الصورة (تشفر وتخزن كـ Base64) =====
    let encryptedImage = "";

if (req.file) {
  const key = Buffer.from(process.env.IMAGE_ENCRYPTION_KEY, "hex"); // لازم 32 بايت
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(req.file.buffer), cipher.final()]);

  encryptedImage = {
    data: encrypted, // ❌ هنا احذف toString("base64")
    iv: iv.toString("hex"),
    mimetype: req.file.mimetype,
  };
}

    const newEmployee = new Employee({
      firstName,lastName,birthDate,image: encryptedImage,
      nationalId, gender, phoneNumber,email,address,
      jobTitle,department,contractType,startDate,
      username,password: hashedPassword,role,notes,
      confirmEmail: false,
      refreshToken,
      active: true,
    });

    await newEmployee.save();

    // const confirmLink = `https://rezly-ddms-rifd-2025y-01p.onrender.com/auth/confirmEmail/${token}`;
    // console.log("Confirm link:", confirmLink); // لا يزال للـ testing

    // await sendEmail(email, `confirm email from Booking`, username, token);

    console.log("User created with refresh token:", newEmployee.refreshToken);

    res.status(201).json({
      message:
        "تم إنشاء الحساب بنجاح، يرجى تأكيد بريدك الإلكتروني عبر الرابط المرسل.",
    });
  } catch (error) {
    console.error(error);

    // ===== معالجة أخطاء التكرار =====
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      let message = "";

      switch (field) {
        case "username":
          message = "اسم المستخدم موجود بالفعل";
          break;
        case "email":
          message = "البريد الإلكتروني مستخدم بالفعل";
          break;
        case "nationalId":
          message = "رقم الهوية مستخدم بالفعل";
          break;
    case "phoneNumber": message = "رقم الهاتف مستخدم بالفعل"; break;


        default:
          message = "قيمة مكررة في أحد الحقول";
      }

      return res.status(400).json({ errors: [message] });
    }

  console.log("❌ Error while creating account:", error);

res.status(500).json({
  message: "حدث خطأ أثناء إنشاء الحساب",
});

  }
};

export const getEmployeeImage = async (req, res) => {
  try {
    // 1️⃣ استدعاء الموظف من MongoDB
    const employee = await Employee.findById(req.params.id);
    if (!employee || !employee.image || !employee.image.data) {
      return res.status(404).json({ message: "Image not found" });
    }



const key = Buffer.from(process.env.IMAGE_ENCRYPTION_KEY, "hex");
const iv = Buffer.from(employee.image.iv, "hex");

// فك التشفير مباشرة من الـ Buffer المخزن
const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
const decrypted = Buffer.concat([decipher.update(employee.image.data), decipher.final()]);


    // 4️⃣ إرسال الصورة مباشرة للفرونت
    res.writeHead(200, {
      "Content-Type": employee.image.mimetype,
      "Content-Length": decrypted.length,
    });
    res.end(decrypted);
    
  } catch (error) {
    console.error("Error decrypting image:", error);
    res.status(500).json({ message: "Error decrypting image", error: error.message });
  }
};

export const getAllEmployees = async (req, res) => {
  try {
    const { id, role } = req.query;
    const query = { active: true}; // 🔹 أضفنا الشرط هون

    if (id) query._id = id;
    if (role) query.role = role;

    const employees = await Employee.find(query);

    const key = Buffer.from(process.env.IMAGE_ENCRYPTION_KEY, "hex");

    // نفك تشفير كل صورة
    const employeesWithImages = employees.map((emp) => {
      let imageBase64 = null;

      if (emp.image && emp.image.data && emp.image.iv) {
        try {
          const iv = Buffer.from(emp.image.iv, "hex");
          const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
          const decrypted = Buffer.concat([
            decipher.update(emp.image.data, "base64"),
            decipher.final(),
          ]);
          imageBase64 = `data:${emp.image.mimetype};base64,${decrypted.toString("base64")}`;
        } catch (err) {
          console.warn(`Cannot decrypt image for employee ${emp._id}:`, err.message);
          imageBase64 = null; // نتجنب الكراش
        }
      }

      return {
        ...emp.toObject(),
        image: imageBase64,
      };
    });

    res.status(200).json({
      totalCount: employees.length,
      employees: employeesWithImages,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({
      message: "فشل في جلب بيانات الموظفين",
      error: error.message,
    });
  }
};


export const updateRole = async (req, res) => {
  try {
    const { id,role } = req.params; // ID الموظف اللي بدنا نغير دوره

  
    const validRoles = ["Admin", "Coach", "Accountant", "Receptionist", "Member"];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        status: "error",
        message: `Invalid role. Allowed roles: ${validRoles.join(", ")}`,
      });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found",
      });
    }

    // تحديث الرول
    employee.role = role;
    await employee.save();

    return res.status(200).json({
      status: "success",
      message: `Role updated successfully to ${role}`,
      data: {
        id: employee._id,
        name: `${employee.firstName} ${employee.lastName}`,
        newRole: employee.role,
      },
    });
  } catch (error) {
    console.error("Error updating role:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message,
    });
  }
};


export const deleteEmployee = async (req, res) => {
  try {
    let { id } = req.query; // ممكن تكون id واحدة أو مصفوفة من ids

    if (!id) {
      return res.status(400).json({ message: "لم يتم إرسال رقم الموظف (id)" });
    }

    if (!Array.isArray(id)) {
      id = [id];
    }

    const result = await Employee.deleteMany({ _id: { $in: id } });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ message: "لم يتم العثور على أي موظف للحذف" });
    }

    res.status(200).json({
      message:
        result.deletedCount === 1
          ? "تم حذف الموظف بنجاح"
          : `تم حذف ${result.deletedCount} موظفين بنجاح`,
    });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({
      message: "حدث خطأ أثناء حذف الموظف",
      error: error.message,
    });
  }
};
export const updateEmployee = async (req, res) => {
  try {
    const employeeId = req.params.id;
    const currentUser = req.user; // جاية من الـ middleware
    console.log("Current user:", currentUser);

    // التحقق من الصلاحية
    if (
      currentUser.role !== "Admin" &&
      currentUser._id.toString() !== employeeId
    ) {
      return res
        .status(403)
        .json({ message: "You are not authorized to update this employee" });
    }

    // التحقق من وجود الموظف
    const existingEmployee = await Employee.findById(employeeId);
    if (!existingEmployee)
      return res.status(404).json({ message: "Employee not found" });

    // التحقق من صحة البيانات
    const { error } = employeeUpdateSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json({
        errors: error.details.map((e) => e.message),
      });
    }

    const updateData = { ...req.body };

    // تحديث كلمة المرور إن وجدت
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // إذا تم إرسال صورة جديدة
    if (req.file) {
      const key = Buffer.from(process.env.IMAGE_ENCRYPTION_KEY, "hex");
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
      let encrypted = cipher.update(req.file.buffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      updateData.image = {
        data: encrypted.toString("base64"),
        iv: iv.toString("hex"),
        mimetype: req.file.mimetype,
      };
    }

    // تحديث بيانات الموظف
    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Employee updated successfully",
      data: updatedEmployee,
    });
  } catch (error) {
    console.error(error);

    // معالجة أخطاء التكرار
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      let message = "";
      switch (field) {
        case "username":
          message = "Username already exists";
          break;
        case "email":
          message = "Email already exists";
          break;
        case "nationalId":
          message = "National ID already exists";
          break;
        default:
          message = "Duplicate value in one of the fields";
      }
      return res.status(400).json({ errors: [message] });
    }

    res
      .status(500)
      .json({ message: "Error updating employee", error: error.message });
  }
};
export const createMemberprice = async (req, res, next) => {
  try {
    if (req.user?.role !== "Admin") {
      return next(new AppError("غير مصرح لك بإنشاء مشترك جديد", 403));
    }
const {
  userName,
  firstName,
  lastName,
  gender,
  idNumber,
  birthDate,
  phone,
  startDate,
  email,
  city,
  address,
  image,
  packageId,
  paymentMethod,
  coachId,
  password,
  fees,
} = req.body;

    const existingUser = await userModel.findOne({ $or: [{ email }, { idNumber }] });
    if (existingUser)
      return next(new AppError("المستخدم موجود مسبقًا بنفس البريد أو رقم الهوية", 409));

    // التأكد من وجود الباقة
    const selectedPackage = await Package.findById(packageId);
    if (!selectedPackage)
      return next(new AppError("الاشتراك المحدد غير موجود", 404));

    // ✅ تحديث سعر الباقة بما أدخله المستخدم
    if (fees) {
      selectedPackage.price_cents = Math.round(fees * 100); // نحول إلى سنتات (لو السعر بالدولار)
      await selectedPackage.save();
    }

    // إنشاء refresh token
    const refreshToken = jwt.sign(
      { id: new mongoose.Types.ObjectId() },
      process.env.REFRESHTOKEN_SECRET,
      { expiresIn: "30d" }
    );

    // حساب تاريخ انتهاء الاشتراك
    let endDate = new Date();
    const unit = selectedPackage.duration_unit.toLowerCase();
    switch (unit) {
      case "days": endDate.setDate(endDate.getDate() + selectedPackage.duration_value); break;
      case "weeks": endDate.setDate(endDate.getDate() + selectedPackage.duration_value * 7); break;
      case "months": endDate.setMonth(endDate.getMonth() + selectedPackage.duration_value); break;
      case "years": endDate.setFullYear(endDate.getFullYear() + selectedPackage.duration_value); break;
    }

    // التأكد من وجود دور Member
    let memberRole = await Role.findOne({ name: "Member" });
    if (!memberRole) {
      memberRole = await Role.create({
        name: "Member",
        description: "مشترك في النظام",
        permissions: [],
      });
    }

    // إنشاء العضو
    const member = await userModel.create({
      firstName,
      lastName,
      gender,
      idNumber,
      birthDate,
      phone,
      email,
      address: `${city || ""} - ${address || ""}`,
      image,
      roleId: memberRole._id,
      packageId,
      coachId,
      paymentStatus: "مدفوع",
      subscriptionStatus: "Active",
      responsibleEmployee: req.user?._id,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate,
      slug: `arabicSlugify(${firstName}-${lastName})`,
      refreshToken,
    });

    // populate البيانات
    const populatedMember = await userModel.findById(member._id)
      .populate({ path: "roleId", select: "name description" })
      .populate({ path: "packageId", select: "name price_cents duration_value duration_unit price_type" })
      .populate({ path: "responsibleEmployee", select: "firstName lastName email" })
      .populate({ path: "coachId", select: "_id username firstName lastName email phoneNumber" })
      .lean();

    // إرسال إيميل تأكيد
    const confirmToken = jwt.sign({ email }, process.env.CONFIRMEMAILTOKEN, { expiresIn: "1h" });
    await sendEmail(email, "تأكيد الحساب في النظام", confirmToken);

    // ربط العضو بالمدرب
    if (coachId) {
      await userModel.findByIdAndUpdate(coachId, { $push: { members: member._id } });
    }

    // الرد النهائي
    return res.status(201).json({
      message: "تم إنشاء المشترك بنجاح",
      member: populatedMember,
      package: {
        name: selectedPackage.name,
        price: selectedPackage.price_cents / 100,
        duration: `${selectedPackage.duration_value} ${selectedPackage.duration_unit}`,
        paymentMethod,
        updatedPrice: fees ? fees : selectedPackage.price_cents / 100, // السعر المُدخل (إن وُجد)
      },
    });

  } catch (error) {
    next(error);
    console.error(error);
  }
};

export const createMember = async (req, res, next) => {
  try {
    if (req.user?.role !== "Admin") {
      return next(new AppError("غير مصرح لك بإنشاء مشترك جديد", 403));
    }
    const {
      firstName, lastName, gender, idNumber, birthDate, phone,startDate,
      email, city, address, image, packageId, paymentMethod, coachId,
    } = req.body;

    const existingUser = await userModel.findOne({ $or: [{ email }, { idNumber }] });
    if (existingUser) 
      return next(new AppError("المستخدم موجود مسبقًا بنفس البريد أو اسم المستخدم أو رقم الهوية", 409));

    // التأكد من وجود الباقة
    const selectedPackage = await Package.findById(packageId);
    if (!selectedPackage) 
      return next(new AppError("الاشتراك المحدد غير موجود", 404));


    // إنشاء refresh token
    const refreshToken = jwt.sign({ id: new mongoose.Types.ObjectId() }, process.env.REFRESHTOKEN_SECRET, { expiresIn: "30d" });

    // حساب تاريخ انتهاء الاشتراك
    let endDate = new Date();
    const unit = selectedPackage.duration_unit.toLowerCase();
    switch (unit) {
      case "days": endDate.setDate(endDate.getDate() + selectedPackage.duration_value); break;
      case "weeks": endDate.setDate(endDate.getDate() + selectedPackage.duration_value * 7); break;
      case "months": endDate.setMonth(endDate.getMonth() + selectedPackage.duration_value); break;
      case "years": endDate.setFullYear(endDate.getFullYear() + selectedPackage.duration_value); break;
    }

    // التأكد من وجود دور Member
    let memberRole = await Role.findOne({ name: "Member" });
    if (!memberRole) {
      memberRole = await Role.create({ name: "Member", description: "مشترك في النظام", permissions: [] });
    }

    // إنشاء العضو وحفظه
    const member = await userModel.create({
      firstName,
      lastName,
      gender,
      idNumber,
      birthDate,
      phone,
      email,
      userName,
      password,
      address: `${city || ""} - ${address || ""}`,
      image,
      roleId: memberRole._id,
      packageId: packageId,  // ربط العضو بالباكيج
      coachId: coachId,
      paymentStatus: "مدفوع",
      subscriptionStatus: "Active",
      responsibleEmployee: req.user?._id,
      startDate: startDate ? new Date(startDate) : new Date(), //اذا ما دخل تاريخ يحسبه تاريخ اليوم الحالي ,
      endDate,
      slug:`arabicSlugify(${firstName}-${lastName})`,
      refreshToken,
    });

    // populate الدور + الباكيج + الموظف المسؤول
    const populatedMember = await userModel.findById(member._id)
      .populate({ path: "roleId", select: "name description" })
      .populate({ path: "packageId", select: "name price_cents duration_value duration_unit price_type" })
      .populate({ path: "responsibleEmployee", select: "firstName lastName email" })
      .populate({ path: "coachId", select: "_id username firstName lastName email phoneNumber" })
      .lean();

    // إنشاء توكن تأكيد البريد
    const confirmToken = jwt.sign({ email }, process.env.CONFIRMEMAILTOKEN, { expiresIn: "1h" });
    await sendEmail(email, "تأكيد الحساب في النظام", confirmToken);

    // ربط العضو بالمدرب (إن وجد)
    if (coachId) {
      await userModel.findByIdAndUpdate(coachId, { $push: { members: member._id } });
    }

    // الرد النهائي
    return res.status(201).json({
      message: "تم إنشاء المشترك بنجاح",
      member: populatedMember,
      package: {
        name: selectedPackage.name,
        price: selectedPackage.price_cents / 100,
        duration: `${selectedPackage.duration_value} ${selectedPackage.duration_unit}`,
        paymentMethod,
      },
    });

  } catch (error) {
    next(error);
    console.log(error);
  }
};
/// سمحت بتعديل الايميل ورقم الهاتف مع اني مش حاسة انه منطقي 
export const updateMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {firstName,lastName,phone,email,city,address,image,password,packageId,paymentMethod,coachId,
    } = req.body;

    if (req.user.role !== "Admin") {
      return next(new AppError("غير مصرح لك بتعديل بيانات الأعضاء", 403));
    }

    const member = await userModel.findById(id); 
    if (!member) {
      return next(new AppError("المشترك غير موجود", 404));
    }

    const duplicate = await userModel.findOne({
      _id: { $ne: id }, 
      $or: [{ email }, { phone }],
    });

    if (duplicate) {
      return next(new AppError("البريد الإلكتروني أو رقم الهاتف مستخدم مسبقًا", 409));
    }

    if (password) {
      member.password = await bcrypt.hash(password, parseInt(process.env.SALTROUND));
    }

    // تعديل الحقول المسموح بها فقط
    if (firstName) member.firstName = firstName;
    if (lastName) member.lastName = lastName;
    if (phone) member.phone = phone;
    if (email) member.email = email;
    if (city || address)
      member.address = `${city || ""} - ${address || ""}.trim()`;
    if (image) member.image = image;
    member.slug = arabicSlugify(`${member.firstName}-${member.lastName}-${member.userName}`);

    if (packageId) {
      const selectedPackage = await Package.findById(packageId);
      if (!selectedPackage)
        return next(new AppError("الباقة المحددة غير موجودة", 404));

      member.packageId = selectedPackage._id;
      member.paymentMethod = paymentMethod || member.paymentMethod;
      member.paymentStatus = "مدفوع";
      member.subscriptionStatus = "Active";
      member.startDate = new Date();

      let endDate = new Date();
      const unit = selectedPackage.duration_unit.toLowerCase();
      switch (unit) {
        case "days":
          endDate.setDate(endDate.getDate() + selectedPackage.duration_value);
          break;
        case "weeks":
          endDate.setDate(endDate.getDate() + selectedPackage.duration_value * 7);
          break;
        case "months":
          endDate.setMonth(endDate.getMonth() + selectedPackage.duration_value);
          break;
        case "years":
          endDate.setFullYear(endDate.getFullYear() + selectedPackage.duration_value);
          break;
      }
      member.endDate = endDate;
    }

    if (coachId && coachId.toString() !== member.coachId?.toString()) {
      if (member.coachId) {
        await userModel.findByIdAndUpdate(member.coachId, {
          $pull: { members: member._id },
        });
      }
      await userModel.findByIdAndUpdate(coachId, {
        $push: { members: member._id },
      });
      member.coachId = coachId;
    }

    await member.save();

    return res.status(200).json({
      message: "تم تعديل بيانات المشترك بنجاح",
      member,
    });
  } catch (error) {
    next(error);
  }
};
//////////////////// DELETE MEMBER ////////////////////
export const deleteMember = async (req, res, next) => {
  try {
    const { id } = req.params;

    // فقط الأدمن يقدر يحذف
    if (req.user.role !== "Admin") {
      return next(new AppError("غير مصرح لك بحذف المشتركين", 403));
    }

    // التحقق من وجود المشترك
    const member = await userModel.findById(id);
    if (!member) {
      return next(new AppError("المشترك غير موجود", 404));
    }

    // إذا كان للمشترك مدرب، احذف العلاقة بينهما
    if (member.coachId) {
      await userModel.findByIdAndUpdate(member.coachId, {
        $pull: { members: member._id },
      });
    }

    // حذف المشترك فعليًا
    await userModel.findByIdAndDelete(id);

    return res.status(200).json({
      message: "تم حذف المشترك بنجاح",
      deletedMemberId: id,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllMembers = async (req, res, next) => {
  try {
    if (req.user?.role !== "Admin") {
      return next(new AppError("غير مصرح لك بعرض جميع الأعضاء", 403));
    }

    // فلترة
    const { search, packageId, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { userName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (packageId) {
      filter.packageId = packageId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const members = await userModel.find(filter)
      .populate({ path: "roleId", select: "name description" })
      .populate({ path: "packageId", select: "name price_cents duration_value duration_unit price_type" })
      .populate({ path: "responsibleEmployee", select: "firstName lastName email" })
      .populate({ path: "coachId", select: "_id username firstName lastName email phoneNumber" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await userModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      message: "success",
      page: parseInt(page),
      totalPages,
      totalMembers: total,
      members,
    });
  } catch (error) {
    next(error);
  }
};
export const toggleEmployeeStatus = async (req, res) => {
  try {
    const { id, active } = req.query; // الاثنين من الكويري

    if (!id) {
      return res.status(400).json({ message: "لم يتم إرسال رقم الموظف (id)" });
    }

    if (active === undefined) {
      return res
        .status(400)
        .json({ message: "لم يتم تحديد حالة الحساب (active)" });
    }

    // نحول القيمة من string إلى Boolean
    const isActive = active === "true";

    // تحديث الحالة
    const employee = await Employee.findByIdAndUpdate(
      id,
      { active: isActive },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({ message: "الموظف غير موجود" });
    }

    res.status(200).json({
      message: `تم ${isActive ? "تفعيل" : "تعطيل"} الحساب بنجاح`,
      employee,
    });
  } 
  catch (err) {
    console.error("Error updating employee status:", err);
    res.status(500).json({
      message: "حدث خطأ أثناء تحديث حالة الحساب",
      error: err.message,
    });
  }
};

export const SignUp = async (req, res, next) => {
    try {
        const { userName, email, password, phone, gender, midicalIssue, role } = req.body;

    // تحقق من وجود المستخدم مع استخدام projection أصغر لتسريع الاستعلام
    const existingUser = await userModel.findOne({ email }).lean();
    if (existingUser) return next(new AppError("Email already exists", 409));

    const passwordHashed = await bcrypt.hash(
      password,
      parseInt(process.env.SALTROUND)
    );

    const refreshToken = jwt.sign(
      { id: new mongoose.Types.ObjectId() },
      process.env.REFRESHTOKEN_SECRET,
      { expiresIn: "30d" }
    );

        const newUser = await userModel.create({
            userName,
            email,
            password: passwordHashed,
            phone,
            gender,
            midicalIssue,
            role,
            slug: arabicSlugify(`${userName.trim()}-${new mongoose.Types.ObjectId()}`),
            refreshToken
        });

    // أضف expiresIn لتوكن تأكيد الإيميل لتحسين الأمان
    const token = jwt.sign(
      { email },
      process.env.CONFIRMEMAILTOKEN,
      { expiresIn: "1h" } // صلاحية ساعة واحدة
    );

    const confirmLink = `https://rezly-ddms-rifd-2025y-01p.onrender.com/auth/confirmEmail/${token}`;
    console.log("Confirm link:", confirmLink); // لا يزال للـ testing

    await sendEmail(email, `confirm email from Booking`, userName, token);

    console.log("User created with refresh token:", newUser.refreshToken);

    return res.status(201).json({
      message: "success",
      user: newUser,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};
export const confirmEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.CONFIRMEMAILTOKEN);

    // حاول البحث أولًا في جدول المستخدمين العاديين
    let updatedUser = await userModel.findOneAndUpdate(
      { email: decoded.email },
      { confirmEmail: true },
      { new: true, lean: true }
    );

    let source = "user";

    // إذا ما وجدناه في المستخدمين، جرب جدول الموظفين
    if (!updatedUser) {
      updatedUser = await Employee.findOneAndUpdate(
        { email: decoded.email },
        { confirmEmail: true },
        { new: true, lean: true }
      );
      source = "employee";
    }

    if (!updatedUser) {
      return next(new AppError("User not found", 404));
    }

    console.log(`Email confirmed for ${source}:`, decoded.email);
    console.log("Token used:", token);

    return res.status(200).json({ message: "success", source });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Invalid or expired token" });
  }
};

export const SignIn = async (req, res, next) => {
  try {
    const { identifier, password, rememberMe } = req.body; // identifier = email or username

    if (!identifier || !password) {
      return next(
        new AppError("Username/Email and Password are required", 400)
      );
    }

    // البحث في جدول المستخدمين أولاً
    let user = await userModel
      .findOne({
        $or: [{ email: identifier }, { username: identifier }],
      })
      .select("password refreshToken role _id confirmEmail")
      .lean();

    let source = "user"; // لتحديد مصدر البحث

    // إذا ما لقينا المستخدم، جرب البحث في جدول الموظفين
    if (!user) {
      user = await Employee.findOne({
        $or: [{ email: identifier }, { username: identifier }],
      })
        .select("password refreshToken role _id confirmEmail")
        .lean();
      source = "employee";
    }

    if (!user) return next(new AppError("Email/Username not found", 404));

    if (!user.confirmEmail) {
      return next(new AppError("Please confirm your email", 409));
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return next(new AppError("Invalid password", 401));

    const token = jwt.sign(
      { id: user._id, role: user.role, source },
      process.env.LOGINTOKEN,
      { expiresIn: rememberMe ? "7d" : "30m" }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESHTOKEN_SECRET,
      { expiresIn: rememberMe ? "30d" : "7d" }
    );

    // تحديث refresh token في DB
    const ModelToUpdate = source === "user" ? userModel : Employee;
    await ModelToUpdate.findByIdAndUpdate(user._id, { refreshToken });

    return res.status(200).json({
      message: "SignIn success",
      token,
      refreshToken,
      role: user.role,
      source, // لمعرفة هل هو user أو employee
    });
  } catch (error) {
    next(error);
  }
};

// refresh token
export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return next(new AppError("Refresh token is required", 401));
    }

    // تحقق من صحة الـ refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESHTOKEN_SECRET);

    // جلب المستخدم مع الحقول الضرورية فقط
    const user = await userModel
      .findById(decoded.id)
      .select("refreshToken role _id")
      .lean();

    if (!user || !user.refreshToken) {
      return next(new AppError("Invalid refresh token or user not found", 401));
    }

    // المقارنة مع trim لتجنب الفراغات
    if (user.refreshToken.trim() !== refreshToken.trim()) {
      return next(new AppError("Invalid refresh token or user not found", 401));
    }

    // إنشاء access token جديد
    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.LOGINTOKEN,
      { expiresIn: "15m" }
    );

    return res.status(200).json({
      message: "New access token granted",
      accessToken: newAccessToken,
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(
        new AppError("Refresh token expired. Please log in again.", 401)
      );
    }
    return next(new AppError(error.message, 401));
  }
};
// تسجيل الخروج
export const logout = async (req, res, next) => {
  try {
    // تحديث refreshToken مباشرة بدون الحاجة لجلب كامل المستخدم
    const result = await userModel.findByIdAndUpdate(req.userId, {
      refreshToken: null,
    });
    if (!result) {
      return next(new AppError("User not found", 404));
    }
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

// sendCode function to the user email to confirm the property
export const sendCode = async (req, res, next) => {
  try {
    const { email } = req.body;
    const code = customAlphabet("1234567890", 4)();

    const user = await userModel.findOneAndUpdate(
      { email },
      { sendCode: code },
      { new: true, lean: true } // lean لتحسين الأداء
    );

    if (!user) {
      return next(new AppError("Email not found", 409));
    }

    const subject = "Reset Password";
    const username = user.userName || "";
    const token = code; // استخدام الكود كـ token هنا

    await sendEmail(email, subject, username, token, "sendCode");
    return res.status(200).json({ message: "success" });
  } catch (error) {
    next(error);
  }
};

// forgotPassword function
export const forgotpassword = async (req, res, next) => {
  try {
    const { email, password, code } = req.body;

    // جلب المستخدم مع الحقول الضرورية فقط
    const user = await userModel.findOne({ email }).select("+password");
    if (!user) {
      return next(new AppError("Email not found", 409));
    }

    if (user.sendCode !== code) {
      return next(new AppError("Invalid code", 409));
    }

    // hash بشكل async لتجنب blocking
    user.password = await bcrypt.hash(
      password,
      parseInt(process.env.SALTROUND)
    );
    user.sendCode = null;

    await user.save();
    return res.status(200).json({ message: "success" });
  } catch (error) {
    next(error);
  }
};


