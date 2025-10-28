import Joi from "joi";
import { generalFeilds } from "../../Middleware/validation.js";
export const signUpSchema = Joi.object({
  userName: Joi.string().min(3).required().messages({
    "string.empty": "Username is required",
    "string.min": "Username must be at least 6 characters long",
  }),
  email: generalFeilds.email,
  password: generalFeilds.password,
  cpassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords must match",
    "string.empty": "Confirm password is required",
  }),

  phone: generalFeilds.phone,

      
    role: Joi.string().valid('Member','Admin','Coach','Receptionist').optional().messages({
      'any.only': 'Role must be either Coach or Admin  or Member or Receptionist',
    }),

    gender: Joi.string().valid('Male', 'Female').required().messages({
  'string.empty': 'Gender is required',
  'any.only': 'Gender must be either "Male" or "Female"'
}),

midicalIssue: Joi.string().max(255).allow('').messages({
  'string.max': 'Medical issue cannot exceed 255 characters'
}),


})
export const SignInSchema = Joi.object({
  identifier: Joi.required().messages({
    "any.required": "Username or Email is required",
    "string.empty": "Username or Email cannot be empty",
  }),
  password: generalFeilds.password.required().messages({
    "any.required": "Password is required",
    "string.empty": "Password cannot be empty",
  }),
  rememberMe: Joi.boolean().optional().messages({
    "boolean.base": "Remember Me must be true or false",
  }),
});

export const sendCodeSchema = Joi.object({
  email: generalFeilds.email,
});

export const forgotPasswordSchema = Joi.object({
  email: generalFeilds.email,
  password: generalFeilds.password,
  cpassword: Joi.any().valid(Joi.ref("password")).required().messages({
    "any.only": "Confirm password must match password",
    "any.required": "Confirm password is required",
  }),
  code: Joi.string().length(4).required().messages({
    "string.empty": "Code is required",
    "string.length": "Code must be 4 digits",
  }),
});

export const employeeSchema = Joi.object({
  firstName: Joi.string().required().messages({
    "any.required": "الاسم الأول مطلوب",
    "string.empty": "الاسم الأول لا يمكن أن يكون فارغ",
  }),
  lastName: Joi.string().required().messages({
    "any.required": "الاسم الثاني مطلوب",
    "string.empty": "الاسم الثاني لا يمكن أن يكون فارغ",
  }),
  birthDate: Joi.date().required().messages({
    "any.required": "تاريخ الميلاد مطلوب",
    "date.base": "تاريخ الميلاد غير صالح",
  }),
  image: Joi.any().optional().strip(),

  nationalId: Joi.string().required().messages({
    "any.required": "رقم الهوية مطلوب",
  }),
  gender: Joi.string().valid("ذكر", "أنثى").required().messages({
    "any.only": "اختر جنس صحيح",
  }),
  phoneNumber: Joi.string()
    .pattern(/^\+?\d{7,15}$/)
    .required()
    .messages({
      "string.pattern.base": "رقم الهاتف غير صالح",
    }),
  email: Joi.string().email().required().messages({
    "string.email": "البريد الإلكتروني غير صالح",
  }),
  address: Joi.string().required().messages({
    "any.required": "العنوان مطلوب",
  }),
  jobTitle: Joi.string().required().messages({
    "any.required": "المسمى الوظيفي مطلوب",
  }),
  department: Joi.string().required().messages({
    "any.required": "القسم مطلوب",
  }),
  contractType: Joi.string()
    .valid("كامل", "جزئي","مؤقت")
    .required()
    .messages({
      "any.only": "اختر نوع عقد صالح",
    }),
  startDate: Joi.date().required().messages({
    "date.base": "تاريخ بداية العمل غير صالح",
  }),
  username: Joi.string().required().messages({
    "any.required": "اسم المستخدم مطلوب",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
  }),
  role: Joi.string()
    .valid("Admin", "Coach", "Accountant", "Receptionist")
    .required()
    .messages({
      "any.only": "اختر دور صالح",
    }),
  notes: Joi.string().optional(),
});

export const employeeUpdateSchema = Joi.object({
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  birthDate: Joi.date().optional(),
  image: Joi.any().optional().strip(),
  nationalId: Joi.string().optional(),
  gender: Joi.string().valid("ذكر", "أنثى").optional(),
  phoneNumber: Joi.string()
    .pattern(/^\+?\d{7,15}$/)
    .optional(),
  email: Joi.string().email().optional(),
  address: Joi.string().optional(),
  jobTitle: Joi.string().optional(),
  department: Joi.string().optional(),
  contractType: Joi.string().valid("كامل", "جزئي", "مؤقت").optional(),
  startDate: Joi.date().optional(),
  username: Joi.string().optional(),
  password: Joi.string().min(6).optional(),
  role: Joi.string()
    .valid("Admin", "Coach", "Accountant", "Receptionist")
    .optional(),
  notes: Joi.string().optional(),
}).unknown(true); // يسمح بأي حقل إضافي مثل id بدون مشكلة
export const createMemberSchema = Joi.object({
  
  firstName: Joi.string().required().messages({
    "string.empty": "الاسم الأول مطلوب",
  }),
  lastName: Joi.string().required().messages({
    "string.empty": "الاسم الأخير مطلوب",
  }),
  gender: Joi.string().valid("ذكر", "أنثى").required().messages({
    "any.only": "الرجاء اختيار جنس صحيح (ذكر أو أنثى)",
    "string.empty": "الجنس مطلوب",
  }),
  idNumber: Joi.string()
    .pattern(/^[0-9]{9}$/)
    .required()
    .messages({
      "string.pattern.base": "رقم الهوية يجب أن يتكوّن من 9 أرقام فقط",
      "string.empty": "رقم الهوية مطلوب",
    }),
  birthDate: Joi.date().less("now").required().messages({
    "date.base": "تاريخ الميلاد غير صالح",
    "date.less": "تاريخ الميلاد لا يمكن أن يكون في المستقبل",
    "any.required": "تاريخ الميلاد مطلوب",
  }),
  phone: generalFeilds.phone.optional(),
  email: generalFeilds.email,
  city: Joi.string().optional().allow(""),
  address: Joi.string().optional().allow(""),
  image: Joi.string().uri().optional().allow(""),
  notes: Joi.string().optional().allow(""),
  startDate: Joi.date()
    .min("now")
    .optional()
    .messages({
      "date.base": "تاريخ البدء غير صالح",
      "date.min": "تاريخ البدء يجب أن يكون اليوم أو مستقبلًا",
    }),
  packageId: Joi.string().required().messages({
    "string.empty": "الاشتراك مطلوب",
  }),
  paymentMethod: Joi.string().valid("نقداً", "بطاقة", "أونلاين").required().messages({
    "any.only": "طريقة الدفع غير صحيحة",
    "string.empty": "طريقة الدفع مطلوبة",
  }),
  coachId: Joi.string().optional().allow(""),
});

export const updateMemberSchema = Joi.object({
  firstName: Joi.string().optional().messages({
    "string.empty": "الاسم الأول مطلوب",
  }),
  lastName: Joi.string().optional().messages({
    "string.empty": "الاسم الأخير مطلوب",
  }),
  phone: generalFeilds.phone.optional(),
  email: generalFeilds.email.optional(),
  password: generalFeilds.password.optional(),
  city: Joi.string().optional().allow(""),
  address: Joi.string().optional().allow(""),
  image: Joi.string().uri().optional().allow(""),
  notes: Joi.string().optional().allow(""),
  packageId: Joi.string().optional().messages({
    "string.empty": "الاشتراك مطلوب",
  }),
  paymentMethod: Joi.string()
    .valid("نقداً", "بطاقة", "أونلاين")
    .optional()
    .messages({
      "any.only": "طريقة الدفع غير صحيحة",
    }),
  coachId: Joi.string().optional().allow(""),
  startDate: Joi.date()
    .min("now")
    .optional()
    .messages({
      "date.base": "تاريخ البدء غير صالح",
      "date.min": "تاريخ البدء يجب أن يكون اليوم أو مستقبلًا",
    }),
}).unknown(true);