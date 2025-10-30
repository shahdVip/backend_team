import {Router} from "express";
const router=Router();
import * as authController from './auth.controller.js';
import validation from '../../Middleware/validation.js';
import { asyncHandler } from "../../Utils/catchError.js";
import * as schema from './auth.validation.js'
import  {confirmEmail} from '../auth/auth.controller.js'
import { auth, roles } from "../../Middleware/auth.js";
const storage = multer.memoryStorage();

import multer from "multer";
router.post('/SignUp',validation(schema.signUpSchema),asyncHandler (authController.SignUp));

router.post('/SignIn',validation(schema.SignInSchema),asyncHandler(authController.SignIn));

router.post("/addNewMember3", auth([ roles.Admin]), asyncHandler(authController.createMemberprice));

router.post("/addNewMember", auth([ roles.Admin]), validation(schema.createMemberSchema), asyncHandler(authController.createMember));
router.put("/updateMember/:id", auth([ roles.Admin]), validation(schema.updateMemberSchema), asyncHandler(authController.updateMember));
router.get("/getAllMembers", auth([ roles.Admin]), asyncHandler(authController.getAllMembers));
router.delete("/deleteMember/:id", auth([ roles.Admin]), asyncHandler(authController.deleteMember));
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 ميجا كحد أقصى
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("الملف يجب أن يكون صورة"), false);
    }
    cb(null, true);
  },
});

router.post(
  "/employeeSignUp",
  upload.single("image"), // حقل الصورة
validation(schema.employeeSchema, { allowUnknown: true }),
auth([roles.Admin]),
  asyncHandler(authController.employeeSignUp)
);
router.get('/getimage/:id', authController.getEmployeeImage);
router.get('/getAllEmployees',auth([roles.Admin]),
asyncHandler(authController.getAllEmployees));
router.put(
  "/updateEmployee/:id",
  upload.single("image"), 
  auth([roles.Admin,roles.Accountant,roles.Coach,roles.Member,roles.Receptionist]),
  validation(schema.employeeUpdateSchema, { allowUnknown: true }),

  asyncHandler(authController.updateEmployee)
);
router.patch(
  "/updateRole/:id/:role",
  auth([roles.Admin]), // فقط الأدمن
  asyncHandler(authController.updateRole)
);

router.delete('/deleteEmployee',auth([roles.Admin]),
asyncHandler(authController.deleteEmployee));

router.post('/refresh', asyncHandler(authController.refresh))
router.post('/logout',auth(),asyncHandler(authController.logout));

router.put('/sendCode',validation(schema.sendCodeSchema),asyncHandler(authController.sendCode));

router.put('/forgotpassword',validation(schema.forgotPasswordSchema),asyncHandler(authController.forgotpassword));

router.get('/confirmEmail/:token', asyncHandler(confirmEmail));

router.patch('/toggleEmployeeStatus',auth([roles.Admin]),asyncHandler(authController.toggleEmployeeStatus))
export default router;