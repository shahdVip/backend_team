import React, { useState, useEffect } from "react";
import axios from "axios";
import { getAllPackages, getAllEmployees } from "../../api";

export default function Step4Participant({
  memberData,
  setMemberData,
  packages = [],
}) {
  const [selectedPackage, setSelectedPackage] = useState(null);
  // عند تحميل العضو، تحقق من القيمة
  const [paymentMethod, setPaymentMethod] = useState(
    memberData.paymentMethod === "نقداً"
      ? "نقداً"
      : memberData.paymentMethod === "بطاقة"
      ? "بطاقة"
      : ""
  );

  const [trainer, setTrainer] = useState(memberData.trainer || "");

  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTgxNjE2YWRkZWM2YmI5OTYzYTBkMyIsImlhdCI6MTc2MDI4ODExOSwiZXhwIjoxNzYyODgwMTE5fQ.otxs7BqWLTxQxjYmMJ8gXqnl5pbyOB0_VgwX1E6OQR0";
  const memberId = memberData._id;

  //  دالة عامة لتحديث أي حقل في الباك
  const updateMemberField = async (fieldName, value) => {
    try {
      if (!memberId) return;
      const response = await axios.put(
        `/auth/updateMember/${memberId}`,
        { [fieldName]: value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(` تم تحديث ${fieldName}:`, response.data);
    } catch (error) {
      console.error(`  خطأ أثناء تحديث ${fieldName}:`, error);
    }
  };

  // بعد تحميل الباقات، تعيين الباقة الحالية للعضو
  useEffect(() => {
    if (packages.length > 0 && memberData.packageId) {
      const currentPackage = packages.find(
        (pkg) => pkg._id === memberData.packageId
      );
      if (currentPackage) setSelectedPackage(currentPackage);
    }
  }, [packages, memberData.packageId]);

  // تغيير الباقة
  const handlePackageChange = (packageId) => {
    const pkg = packages.find((p) => p._id === packageId) || null;
    setSelectedPackage(pkg);

    // تحديث في الواجهة
    setMemberData({
      ...memberData,
      packageId,
      coachId: trainer,
      paymentMethod,
    });

    // تحديث في الباك
    updateMemberField("packageId", packageId);
  };

  // تغيير طريقة الدفع
  const handlePaymentChange = (e) => {
    const newMethod = e.target.value;
    setPaymentMethod(newMethod);

    // تحديث في الواجهة
    setMemberData({
      ...memberData,
      paymentMethod: newMethod,
    });

    // تحديث في الباك
    updateMemberField("paymentMethod", newMethod);
  };

  const [coaches, setCoaches] = useState([]);

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const res = await getAllEmployees(); // نداء الـ API
        // تأكد أن الريسبونس فيه employees
        const employees = Array.isArray(res.employees) ? res.employees : [];

        // فلترة فقط المدربين
        const filteredCoaches = employees.filter((emp) => emp.role === "Coach");

        setCoaches(filteredCoaches);
      } catch (err) {
        console.error("❌ خطأ أثناء جلب المدربين:", err);
      }
    };

    fetchCoaches();
  }, []);

  // تغيير المدرب
  const handleTrainerChange = (e) => {
    const newTrainer = e.target.value;
    setTrainer(newTrainer);

    // تحديث في الواجهة
    setMemberData({
      ...memberData,
      coachId: newTrainer,
    });

    // تحديث في الباك
    updateMemberField("coachId", newTrainer);
  };
  useEffect(() => {
    console.log(memberData);
  }, [memberData]);

  return (
    <div className="flex justify-center bg-white w-full">
      <form className="w-[343px] flex flex-col gap-3 font-[Cairo]">
        {/* نوع الاشتراك */}
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-[700] text-black">
            نوع الاشتراك <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedPackage?._id || ""}
            onChange={(e) => handlePackageChange(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-[12px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
          >
            <option value="">اختر نوع الاشتراك</option>
            {packages.map((pkg) => (
              <option key={pkg._id} value={pkg._id}>
                {pkg.name}
              </option>
            ))}
          </select>
        </div>

        {/* مدة الاشتراك */}
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-[700] text-black">
            مدة الاشتراك
          </label>
          <input
            type="text"
            value={
              selectedPackage
                ? `${selectedPackage.duration_value || ""} ${
                    selectedPackage.duration_unit || ""
                  }`
                : ""
            }
            readOnly
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-[12px] text-gray-500 bg-gray-100 cursor-not-allowed"
          />
        </div>

        {/* السعر */}
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-[700] text-black">الرسوم</label>
          <input
            type="text"
            value={memberData.fees ? memberData.fees.toString() : ""}
            onChange={(e) =>
              setMemberData({
                ...memberData,
                fees: parseFloat(e.target.value || 0), // السعر بالدولار أو الوحدة المناسبة
              })
            }
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-[12px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>

        {/* طريقة الدفع */}
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-[700] text-black">
            طريقة الدفع <span className="text-red-500">*</span>
          </label>
          <select
            value={paymentMethod}
            onChange={handlePaymentChange}
            className="w-full border border-gray-300 rounded-xl px-2.5 py-3 text-[12px] focus:outline-none focus:ring-2 focus:ring-purple-600"
          >
            <option value="">اختر طريقة الدفع</option>
            <option value="نقداً">نقداً</option>
            <option value="بطاقة">بطاقة</option>
          </select>
        </div>

        {/* المدرب */}
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-[700] text-black">
            المدرب المسؤول <span className="text-red-500">*</span>
          </label>
          <select
            value={trainer || ""}
            onChange={handleTrainerChange}
            className="w-full border border-gray-300 rounded-xl px-2.5 py-3 text-[12px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
          >
            <option value="">اختر المدرب المسؤول</option>

            {coaches.length > 0 ? (
              coaches.map((coach) => (
                <option key={coach._id} value={coach._id}>
                  {`${coach.firstName || ""} ${coach.lastName || ""}`.trim() ||
                    coach.username ||
                    "مدرب بدون اسم"}
                </option>
              ))
            ) : (
              <option disabled>لا يوجد مدربين</option>
            )}
          </select>
        </div>
      </form>
    </div>
  );
}
