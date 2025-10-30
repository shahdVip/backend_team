import * as Yup from "yup";

// Step 1 (البيانات الأساسية)
export const step1Schema = Yup.object().shape({
  firstName: Yup.string()
    .required("الاسم الأول مطلوب")
    .min(2, "يجب أن يحتوي على حرفين على الأقل"),

  lastName: Yup.string()
    .required("الاسم الثاني مطلوب")
    .min(2, "يجب أن يحتوي على حرفين على الأقل"),

  gender: Yup.string().required("يجب اختيار الجنس"),

  nationalId: Yup.string()
    .matches(/^\d{9}$/, "رقم الهوية يجب أن يتكون من 9 أرقام")
    .notRequired()
    .nullable()
    .transform((value) => (value === "" ? null : value)),

  birthDate: Yup.string().notRequired().nullable(),

  image: Yup.mixed().notRequired(),
});

// Step 4 (بيانات الدخول)
export const step4Schema = Yup.object().shape({
  username: Yup.string()
    .required("اسم المستخدم مطلوب")
    .min(3, "يجب أن يحتوي اسم المستخدم على 3 أحرف على الأقل"),

  password: Yup.string()
    .required("كلمة المرور مطلوبة")
    .min(6, "كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل"),

  role: Yup.string().required("مستوى الصلاحية مطلوب"),

  notes: Yup.string().min(3, "يجب أن تحتوي الملاحظات على 3 أحرف على الأقل"),
});

// Step 2 (بيانات الاتصال)
export const step2Schema = Yup.object().shape({
  phoneNumber: Yup.string()
    .required("رقم الهاتف مطلوب")
    .matches(/^05\d{8}$/, "رقم الهاتف يجب أن يبدأ بـ05 ويتكون من 10 أرقام"),

  email: Yup.string()
    .required("البريد الإلكتروني مطلوب")
    .matches(
      /^[a-zA-Z0-9._%+-]+@gmail\.com$/,
      "يجب أن يكون البريد بصيغة @gmail.com فقط"
    ),

  address: Yup.string()
    .required("العنوان مطلوب")
    .min(3, "يجب أن يحتوي العنوان على 3 أحرف على الأقل"),
});
// Step 3 (معلومات الوظيفة)
export const step3Schema = Yup.object().shape({
  jobTitle: Yup.string().required("الوظيفة مطلوبة"),
  department: Yup.string()
    .min(2, "يجب أن يحتوي على حرفين على الأقل")
    .required("القسم مطلوب"),
  contractType: Yup.string().required("نوع العقد مطلوب"),
  startDate: Yup.date().required("تاريخ التعيين مطلوب"),
});
