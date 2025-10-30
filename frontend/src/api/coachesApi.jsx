import axios from "axios";

const BASE_URL = "https://rezly-ddms-rifd-2025y-01p.onrender.com";

// ✅ نستخدم التوكن من localStorage بدل .env
export const getAllCoachesAPI = async () => {
  try {
    const token =
      localStorage.getItem("token") || import.meta.env.VITE_API_TOKEN || "";

    const res = await axios.get(`${BASE_URL}/auth/getAllEmployees?role=Coach`, {
      headers: {
        Authorization: token.startsWith("Bearer") ? token : `Bearer ${token}`,
      },
    });

    // ✅ النتيجة مصفوفة
    return res.data?.employees || [];
  } catch (err) {
    console.error("Error fetching coaches:", err.response?.data || err.message);
    return [];
  }
};
