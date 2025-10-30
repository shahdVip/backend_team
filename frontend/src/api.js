import axios from "axios";

const api = axios.create({
  baseURL: "https://rezly-ddms-rifd-2025y-01p.onrender.com",
});

// const FIXED_TOKEN =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTgxNjE2YWRkZWM2YmI5OTYzYTBkMyIsImlhdCI6MTc2MDI4ODExOSwiZXhwIjoxNzYyODgwMTE5fQ.otxs7BqWLTxQxjYmMJ8gXqnl5pbyOB0_VgwX1E6OQR0";
const FIXED_TOKEN = localStorage.getItem("token");

// إضافة موظف
export const createEmployee = async (formData) => {
  const res = await api.post("/auth/employeeSignUp", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${FIXED_TOKEN}`,
    },
  });
  console.log("response من API:", res.data);

  return res.data;
};

// جلب جميع الموظفين
export const getAllEmployees = async () => {
  const res = await api.get("/auth/getAllEmployees", {
    headers: { Authorization: `Bearer ${FIXED_TOKEN}` },
  });

  return res.data;
};
// حذف أو تعطيل موظف
export const toggleEmployeeStatus = async (id, active) => {
  const res = await api.patch(
    `/auth/toggleEmployeeStatus?id=${id}&active=${active}`,
    {},
    {
      headers: { Authorization: `Bearer ${FIXED_TOKEN}` },
    }
  );
  return res.data;
};

const handleDeleteEmployee = async (id) => {
  try {
    await toggleEmployeeStatus(id, false);
    const updated = employees.filter((emp) => emp._id !== id);
    setEmployees(updated);
    setEmployeeCount(updated.length);
  } catch (err) {
    console.error("خطأ أثناء الحذف:", err);
  }
};

export const updateEmployee = async (employeeId, formData) => {
  try {
    console.log("📝 إرسال بيانات لتحديث الموظف:", employeeId);

    const response = await api.put(
      `/auth/updateEmployee/${employeeId}`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${FIXED_TOKEN}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );

    console.log("  رد السيرفر بعد التحديث:", response.data);
    return response.data;
  } catch (err) {
    console.error("   خطأ في updateEmployee:", err);
    throw err;
  }
};

export const updateEmployeeRole = async (id, newRole) => {
  try {
    console.log(" Trying to update role...");
    console.log(" Employee ID:", id);
    console.log(" New Role:", newRole);

    if (!id || !newRole) {
      throw new Error(" Missing required parameters: id or newRole");
    }

    const res = await api.patch(
      `/auth/updateRole/${id}/${newRole}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${FIXED_TOKEN}`,
        },
      }
    );

    console.log(" Role updated successfully:", res.data);
    return res.data;
  } catch (err) {
    console.error(" Error updating role:");
    console.error("Message:", err.message);
    console.error("Response data:", err.response?.data);
    console.error("Full error object:", err);
    throw err;
  }
};

// دالة تسجيل الدخول
export const signIn = async (formData) => {
  try {
    const res = await api.post("/auth/Signin", formData);
    return res;
  } catch (err) {
    console.error("SignIn error:", err);
    throw err;
  }
};

export const signup = async (formData) => {
  try {
    const res = await api.post("/auth/signup", formData);
    return res;
  } catch (err) {
    console.error("Signup error:", err);
    throw err;
  }
};

///////////////////////////////////////////
// إضافة مشترك جديد باستخدام Axios
export const addNewMember = async (memberData) => {
  try {
    // 🧹 إزالة الحقول غير المسموحة من البيانات
    const { sendMethod, healthForm, ...filteredData } = memberData;

    // 🧩 إضافة userName و password إذا مش موجودين
    if (!filteredData.userName) {
      // توليد اسم مستخدم بسيط من رقم الهوية أو الاسم الكامل
      if (filteredData.nationalId) {
        filteredData.userName = `user${filteredData.nationalId}`;
      } else if (filteredData.fullName) {
        filteredData.userName = filteredData.fullName
          .replace(/\s+/g, "")
          .toLowerCase();
      } else {
        filteredData.userName = `user${Date.now()}`; // احتياط
      }
    }

    if (!filteredData.password) {
      filteredData.password = "123456"; // كلمة مرور مؤقتة
    }
    // 🚀 إرسال الطلب بعد التنظيف
    const res = await api.post("/auth/addNewMember3", filteredData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIXED_TOKEN}`,
      },
    });

    console.log(" تم إضافة المشترك:", res.data);
    return res.data;
  } catch (err) {
    console.error(
      " خطأ أثناء إضافة المشترك:",
      err.response?.data || err.message
    );
    throw err;
  }
};

// جلب جميع الأعضاء (المشتركين)
export const getAllMembers = async () => {
  try {
    const token = localStorage.getItem("token"); // استخدام التوكن الديناميكي
    const res = await api.get("/auth/getAllMembers", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // ارجع فقط members لأنها المصفوفة اللي نحتاجها
    return res.data.members || [];
  } catch (err) {
    console.error("❌ خطأ أثناء جلب الأعضاء:", err.response?.data || err);
    throw err;
  }
};

export const getmemb = async () => {
  try {
    const res = await axios.get("/auth/getAllMembers", {
      headers: {
        authorization: `Bearer ${FIXED_TOKEN}`,
      },
    });
  } catch (e) {
    console.log("mmmmmmmmmmmm");
  }
};

export const deleteMember = async (id) => {
  if (!id) throw new Error("Missing member ID");

  try {
    const response = await api.delete(`/auth/deleteMember/${id}`, {
      headers: {
        Authorization: `Bearer ${FIXED_TOKEN}`,
      },
    });

    if (response.status === 200) {
      console.log(`تم حذف المشترك بنجاح: ${id}`);
      return response.data;
    } else {
      throw new Error(`حذف المشترك فشل برمز ${response.status}`);
    }
  } catch (error) {
    console.error(
      " خطأ أثناء حذف المشترك:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// جلب قائمة الباقات (Packages)
export const getAllPackages = async () => {
  try {
    const res = await api.get("/package/listPackages", {
      headers: { Authorization: `Bearer ${FIXED_TOKEN}` },
    });

    console.log("📦 قائمة الباقات:", res.data);
    return res.data.packages || [];
  } catch (err) {
    console.error(
      "❌ خطأ أثناء جلب الباقات:",
      err.response?.data || err.message
    );
    throw err;
  }
};

// تحديث بيانات مشترك موجود
export const updateMember = async (memberId, memberData) => {
  if (!memberId) throw new Error("Missing member ID");

  try {
    const res = await api.put(`/auth/updateMember/${memberId}`, memberData, {
      headers: {
        Authorization: `Bearer ${FIXED_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log("📦 رد السيرفر بعد تحديث المشترك:", res.data);
    return res.data;
  } catch (err) {
    console.error(
      "❌ خطأ أثناء تحديث المشترك:",
      err.response?.data || err.message
    );
    throw err;
  }
};
const updateMemberPayment = async (newPaymentMethod) => {
  try {
    const response = await axios.put(
      `/auth/updateMember/${memberId}`,
      { paymentMethod: newPaymentMethod },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log("✅ تم تحديث طريقة الدفع:", response.data);
  } catch (error) {
    console.error("❌ خطأ أثناء تحديث طريقة الدفع:", error);
  }
};

export default api;
