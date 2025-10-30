// src/api/bookingsApi.js
import axios from "axios";

/* ----------------------------------------------------------
    إعداد الاتصال مع السيرفر
---------------------------------------------------------- */
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://rezly-ddms-rifd-2025y-01p.onrender.com/booking";

const TOKEN = import.meta.env.VITE_API_TOKEN || "";

//  قراءة التوكن الحالي من localStorage أو من .env
function getCurrentToken() {
  const token =
    localStorage.getItem("token") || import.meta.env.VITE_API_TOKEN || "";
  return token.startsWith("Bearer") ? token : `Bearer ${token.trim()}`;
}

//  إنشاء instance للـ axios
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: getCurrentToken(),
  },
});

// تحديث الهيدر ديناميكيًا قبل كل طلب
api.interceptors.request.use((config) => {
  const token = getCurrentToken();
  config.headers.Authorization = token;
  return config;
});

/* ----------------------------------------------------------
    استخراج بيانات المستخدم من التوكن
---------------------------------------------------------- */
export async function getUserFromToken() {
  try {
    const tokenStr = localStorage.getItem("token") || "";
    const token = tokenStr.split(" ")[1];
    if (!token) return null;

    const payload = JSON.parse(atob(token.split(".")[1]));
    const id = payload.id;

    try {
      const res = await axios.get(
        "https://rezly-ddms-rifd-2025y-01p.onrender.com/auth/getAllEmployees",
        {
          headers: {
            Authorization: tokenStr.startsWith("Bearer ")
              ? tokenStr
              : `Bearer ${tokenStr}`,
          },
        }
      );

      const employees = res.data?.employees || [];
      const found = employees.find(
        (emp) => String(emp._id) === String(id) || String(emp.id) === String(id)
      );

      const role = found?.role || "Unknown";
      console.log(" المستخدم الحالي:", { ...payload, role });
      return { ...payload, role };
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        console.log(" المستخدم الحالي: Coach (403/401)");
        return { ...payload, role: "Coach" };
      } else {
        console.warn("⚠️ فشل جلب الموظفين:", err.message);
        return { ...payload, role: "Unknown" };
      }
    }
  } catch (err) {
    console.error("❌ فشل قراءة التوكن:", err);
    return null;
  }
}

/* ----------------------------------------------------------
   دوال مساعدة داخلية
---------------------------------------------------------- */
const getHeaders = () => {
  const token = localStorage.getItem("accessToken");
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  };
};

// تحويل الوقت إلى 12 ساعة عربية
const convertTo12Hour = (time) => {
  if (!time) return "08:00 ص";
  const [h, m] = time.split(":").map(Number);
  let hour = h % 12 || 12;
  const period = h >= 12 ? "م" : "ص";
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
};

// تحويل أيام الأسبوع للعربية ⇄ الإنجليزية
const daysMap = {
  أحد: "Sun",
  إثنين: "Mon",
  ثلاثاء: "Tue",
  أربعاء: "Wed",
  خميس: "Thu",
  جمعة: "Fri",
  سبت: "Sat",
};

// تحويل مدة الاشتراك إلى صيغة السيرفر
const durationMap = {
  أسبوع: "1week",
  أسبوعين: "2weeks",
  "3 أسابيع": "3weeks",
  شهر: "1month",
  "3 أشهر": "3months",
  "6 أشهر": "6months",
  سنة: "1year",
};

// تحويل التذكير
const remindersMap = {
  0: "0",
  "30m": "30m",
  "1h": "1h",
  "1d": "1d",
};

// تنسيق البيانات قبل الإرسال للسيرفر
function formatPayload(raw) {
  const date = raw.start ? raw.start.split("T")[0] : raw.date || "";
  const recurrence = (raw.repeatDays || []).map((d) => daysMap[d] || d);

  return {
    service: raw.title || raw.service || "",
    description: raw.description || "",
    coachId: raw.coachId || raw.coach || raw.trainerId || "",
    date,
    timeStart: convertTo12Hour(raw.start?.split("T")[1] || raw.timeStart),
    timeEnd: convertTo12Hour(raw.end?.split("T")[1] || raw.timeEnd),
    location: raw.room || raw.location || "",
    maxMembers: parseInt(raw.maxMembers) || 1,
    recurrence,
    subscriptionDuration: durationMap[raw.subscriptionDuration] || "1week",
    reminders:
      Array.isArray(raw.reminders) && raw.reminders.length
        ? raw.reminders.map((r) => remindersMap[r] || r)
        : [],
    members: raw.members || [],
  };
}

/* ----------------------------------------------------------
    CRUD APIs (إنشاء / قراءة / تعديل / حذف)
---------------------------------------------------------- */

// إنشاء حجز جديد (حسب الباك الجديد)
export const createBookingAPI = async (bookingData) => {
  try {
    const { data } = await api.post("/addBooking", bookingData);
    return data;
  } catch (err) {
    handleApiError(err, "فشل إنشاء الحجز");
    throw err;
  }
};

// 🟣 جلب جميع الحجوزات
export async function getAllBookingsAPI() {
  try {
    const token = localStorage.getItem("token");
    const res = await api.get("/all_booking", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data;
  } catch (err) {
    console.error("خطأ أثناء جلب الحجوزات:", err.response?.data || err);
    throw err;
  }
}

// جلب حجز واحد حسب الـ ID
export async function getBookingByIdAPI(id) {
  try {
    const res = await api.get(`/${id}`);
    return res.data;
  } catch (err) {
    console.error("فشل جلب الحجز:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "فشل جلب تفاصيل الحجز");
  }
}

export const updateGeneralBookingAPI = async (id, body, mode = "") => {
  let url = `${BASE_URL}/${id}`;
  if (mode === "updateAllSameGroup") {
    url += "?updateAllSameGroup=true";
  }
  const res = await axios.put(url, body, getHeaders());
  return res.data;
};

export async function updateSingleScheduleAPI(bookingId, body) {
  try {
    const token =
      localStorage.getItem("token") || import.meta.env.VITE_API_TOKEN || "";

    // body لازم يحتوي على updateByDate, timeStart, timeEnd, location, ...الخ
    const res = await api.put(`/${bookingId}`, body, {
      headers: {
        Authorization: token.startsWith("Bearer") ? token : `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    return res.data;
  } catch (err) {
    console.error(
      "❌ خطأ في updateSingleScheduleAPI:",
      err.response?.data || err.message
    );
    throw err;
  }
}

// حذف حجز (واحد أو مجموعة)
export async function deleteBookingAPI(id, isGroup = false) {
  try {
    const url = isGroup ? `/${id}?type=group` : `/${id}`;
    const res = await api.delete(url);
    return res.data;
  } catch (err) {
    console.error("خطأ أثناء حذف الحجز:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "فشل حذف الحجز");
  }
}

/* ----------------------------------------------------------
   دوال إضافية
---------------------------------------------------------- */

// فلترة الحجوزات
export async function filterBookingsAPI(query = {}) {
  try {
    const res = await api.get("/filter", { params: query });
    return res.data;
  } catch (err) {
    console.error("فشل فلترة الحجوزات:", err.response?.data || err.message);
    throw new Error("فشل فلترة الحجوزات");
  }
}

// عرض الحجوزات على التقويم
export async function calendarViewAPI() {
  try {
    const res = await api.get("/calendar");
    return res.data;
  } catch (err) {
    console.error("فشل جلب التقويم:", err.response?.data || err.message);
    throw new Error("فشل جلب بيانات التقويم");
  }
}

// إلغاء الحجز
export async function cancelBookingAPI(bookingId) {
  try {
    const res = await api.patch(`/cancel/${bookingId}`);
    return res.data;
  } catch (err) {
    console.error("فشل إلغاء الحجز:", err.response?.data || err.message);
    throw new Error("فشل إلغاء الحجز");
  }
}

// src/api/bookingsApi.js
export async function getBookingsCountAPI() {
  try {
    const res = await api.get("/all_booking");
    return res.data.metadata?.totalResults || 0; // إذا موجود ارجع العدد، وإلا 0
  } catch (err) {
    console.error("خطأ أثناء جلب عدد الحجوزات:", err.response?.data || err);
    throw err;
  }
}

export default {
  createBookingAPI,
  getAllBookingsAPI,
  getBookingByIdAPI,
  deleteBookingAPI,
  filterBookingsAPI,
  calendarViewAPI,
  cancelBookingAPI,
  getBookingsCountAPI,
  getUserFromToken,
  updateSingleScheduleAPI,
  updateGeneralBookingAPI,
};
