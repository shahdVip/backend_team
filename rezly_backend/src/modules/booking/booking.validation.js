import Joi from "joi";
import mongoose from "mongoose";

// Schema for individual schedule item
const convertArabicTimeTo24Hour = (timeStr) => {
  const match = timeStr.match(/^([0-9]{1,2}):([0-9]{2})\s?(ص|م)$/);
  if (!match) return null;

  let [_, hours, minutes, period] = match;
  hours = parseInt(hours, 10);
  minutes = parseInt(minutes, 10);

  if (period === "م" && hours < 12) hours += 12;
  if (period === "ص" && hours === 12) hours = 0;

  return hours * 60 + minutes; // تحويل الوقت إلى دقائق ليسهل المقارنة
};

export const scheduleSchema = Joi.object({
  dayOfWeek: Joi.number().integer().min(0).max(6).required().messages({
    "number.base": "اليوم يجب أن يكون رقمًا بين 0 و6",
    "any.required": "يجب تحديد اليوم (dayOfWeek)",
  }),

  timeStart: Joi.string()
    .pattern(/^([0-9]{1,2}):([0-9]{2})\s?(ص|م)$/)
    .required()
    .messages({
      "string.pattern.base":
        "تنسيق الوقت غير صالح، استخدم مثل: 10:00 ص أو 9:00 م",
      "any.required": "وقت البداية مطلوب",
    }),

  timeEnd: Joi.string()
    .pattern(/^([0-9]{1,2}):([0-9]{2})\s?(ص|م)$/)
    .required()
    .custom((value, helpers) => {
      const { timeStart } = helpers.state.ancestors[0];
      const startMinutes = convertArabicTimeTo24Hour(timeStart);
      const endMinutes = convertArabicTimeTo24Hour(value);

      if (startMinutes === null || endMinutes === null)
        return helpers.error("string.pattern.base");

      if (endMinutes <= startMinutes)
        return helpers.message("وقت النهاية يجب أن يكون بعد وقت البداية");

      return value;
    })
    .messages({
      "string.pattern.base":
        "تنسيق الوقت غير صالح، استخدم مثل: 10:00 ص أو 9:00 م",
      "any.required": "وقت النهاية مطلوب",
    }),
});

// Create booking validation schema
export const createBookingSchema = Joi.object({
  service: Joi.string().required().messages({
    "any.required": "اسم الخدمة مطلوب",
  }),

  description: Joi.string().optional().messages({
    "string.base": "الوصف يجب أن يكون نصًا",
  }),

  coachId: Joi.string().length(24).optional().messages({
    "string.length": "معرّف الكوتش غير صالح",
  }),

  createdBy: Joi.string().length(24).optional().messages({
    "string.length": "معرّف غير صالح",
  }),

  startDate: Joi.date().required().messages({
    "any.required": "تاريخ البداية مطلوب",
    "date.base": "تاريخ البداية غير صالح",
  }),

  schedules: Joi.array().items(scheduleSchema).min(1).required().messages({
    "any.required": "يجب تحديد مواعيد الحجوزات",
    "array.min": "يجب تحديد موعد واحد على الأقل",
    "array.base": "مواعيد الحجوزات يجب أن تكون مصفوفة",
  }),

  location: Joi.string().required().messages({
    "any.required": "الموقع مطلوب",
  }),

  status: Joi.string()
    .valid("pending", "confirmed", "cancelled")
    .default("pending"),

  maxMembers: Joi.number().integer().min(1).required().messages({
    "number.base": "عدد الأعضاء يجب أن يكون رقمًا",
    "any.required": "عدد الأعضاء مطلوب",
    "number.min": "عدد الأعضاء يجب أن يكون على الأقل 1",
  }),

  members: Joi.array().items(Joi.string().length(24)).optional().messages({
    "string.length": "معرّف العضو غير صالح",
  }),

  reminders: Joi.array().items(Joi.string()).optional().messages({
    "array.base": "التذكيرات يجب أن تكون مصفوفة",
  }),
  startDate: Joi.date().required().messages({
    "any.required": "تاريخ البداية مطلوب",
    "date.base": "تاريخ البداية غير صالح",
  }),
  subscriptionDuration: Joi.string()
    .valid(
      "1day",
      "1week",
      "2weeks",
      "3weeks",
      "1month",
      "3months",
      "6months",
      "1year"
    )
    .required()
    .messages({
      "any.required": "مدة الاشتراك مطلوبة",
      "any.only": "مدة الاشتراك غير صالحة",
    }),

  notes: Joi.string().optional(),
});

// تحويل الوقت عربي 12 ساعة إلى دقائق للمقارنة
function timeToMinutes(timeStr) {
  const match = timeStr.match(/^([0-9]{1,2}):([0-9]{2})\s?(ص|م)$/);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3];
  if (period === "م" && hour < 12) hour += 12;
  if (period === "ص" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

export const updateBookingSchema = Joi.object({
  date: Joi.date().required().messages({
    "any.required": "التاريخ مطلوب",
    "date.base": "التاريخ غير صالح",
  }),
  timeStart: Joi.string()
    .pattern(/^([0-9]{1,2}):([0-9]{2})\s?(ص|م)$/)
    .required()
    .messages({
      "string.pattern.base":
        "تنسيق وقت البداية غير صالح، استخدم مثل: 10:00 ص أو 9:00 م",
      "any.required": "وقت البداية مطلوب",
    }),
  timeEnd: Joi.string()
    .pattern(/^([0-9]{1,2}):([0-9]{2})\s?(ص|م)$/)
    .required()
    .messages({
      "string.pattern.base":
        "تنسيق وقت النهاية غير صالح، استخدم مثل: 10:00 ص أو 9:00 م",
      "any.required": "وقت النهاية مطلوب",
    }),
  updateFuture: Joi.boolean().optional().messages({
    "boolean.base": "updateFuture يجب أن يكون true أو false",
  }),
}).custom((value, helpers) => {
  const startMinutes = timeToMinutes(value.timeStart);
  const endMinutes = timeToMinutes(value.timeEnd);

  if (startMinutes === null || endMinutes === null)
    return helpers.error("any.invalid", { message: "وقت غير صالح" });

  if (endMinutes <= startMinutes)
    return helpers.error("any.invalid", {
      message: "وقت النهاية يجب أن يكون بعد وقت البداية",
    });

  return value;
}, "Time validation");

// Validate MongoDB ObjectId
export const validateObjectId = (paramName) => (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
    return res.status(400).json({
      status: "error",
      message: "معرّف غير صالح (Invalid ID format)",
    });
  }
  next();
};
