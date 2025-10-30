import React from "react";

export default function Step2Participant({ memberData, setMemberData }) {
  //  دالة لتحديث أي حقل
  const handleChange = (field, value) => {
    setMemberData({
      ...memberData, // نحافظ على باقي القيم
      [field]: value, // نحدث الحقل المحدد فقط
    });
  };
  console.log(memberData);
  return (
    <div className="flex justify-center bg-white w-full">
      <form className="w-[343px] flex flex-col gap-3 font-[Cairo]">
        {/*  رقم الهاتف */}
        <div>
          <label className="block text-[14px] font-[700] text-black mb-1.5">
            رقم الهاتف <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="05xxxxxxxxxx"
            value={memberData.phone || ""} // نعرض القيمة من الـ state
            onChange={(e) => handleChange("phone", e.target.value)} // نحدّثها
            className="w-full p-2.5 border border-gray-300 rounded-xl text-sm 
                                   placeholder-[color:var(--grey,#7E818C)] focus:outline-none 
                                   focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* 📧 الإيميل */}
        <div>
          <label className="block text-[14px] font-[700] text-black mb-1.5">
            الإيميل <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            placeholder="example@gmail.com"
            value={memberData.email || ""}
            onChange={(e) => handleChange("email", e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-xl text-sm 
                                   placeholder-[color:var(--grey,#7E818C)] focus:outline-none 
                                   focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-[14px] font-[700] text-black mb-1.5">
            المدينة <span className="text-red-500">*</span>
          </label>
          <select
            value={memberData.city || ""}
            onChange={(e) => handleChange("city", e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-xl text-[12px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 overflow-y-auto"
            size="1"
            style={{
              maxHeight: "150px", // ارتفاع تقريبي لـ 4 عناصر
              overflowY: "auto",
            }}
          >
            <option value="">اختر المدينة</option>
            <option value="القدس">القدس</option>
            <option value="رام الله">رام الله</option>
            <option value="نابلس">نابلس</option>
            <option value="جنين">جنين</option>
            <option value="طولكرم">طولكرم</option>
            <option value="قلقيلية">قلقيلية</option>
          </select>
        </div>

        {/* العنوان */}
        <div>
          <label className="block text-[14px] font-[700] text-black mb-1.5">
            العنوان <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="أدخل العنوان"
            value={memberData.address || ""}
            onChange={(e) => handleChange("address", e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-xl text-sm 
                                   placeholder-[color:var(--grey,#7E818C)] focus:outline-none 
                                   focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </form>
    </div>
  );
}
