import React, { useState, useEffect } from "react";
import axios from "axios";
import CoachSelector from "../../../components/common/CoachSelector";
import LocationSelector from "../../../components/common/LocationSelector";
import MaxParticipantsSelector from "../../../components/common/MaxParticipantsSelector";
import downarrowIcon from "../../../icons/downarrow.svg";
import SearchIcon from "../../../icons/search.svg?react";
import AddcircleIcon from "../../../icons/addcircle.svg?react";
import { getAllPackages, getAllEmployees } from "../../../api";

export default function Step1Booking({
  formData,
  setFormData,
  errors,
  setErrors,
  isIndividual = false,
  isCoach = false,
}) {
  const [openClass, setOpenClass] = useState(false);
  const [classSearch, setClassSearch] = useState("");
  const [classes, setClasses] = useState(["يوغا", "كارديو", "ملاكمة"]);
  const [rooms] = useState(["قاعة 1", "قاعة 2", "قاعة 3"]);

  const isReadOnly = !!isIndividual; // 🟣 قفل الحقول لو تعديل فردي
  const [coaches, setCoaches] = useState([]);

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const res = await getAllEmployees(); // نداء الـ API
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
  // جلب قائمة المدربين
  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        // ✅ استخدم التوكن الحقيقي من localStorage
        const token =
          localStorage.getItem("authToken") ||
          import.meta.env.VITE_API_TOKEN ||
          "";

        const res = await axios.get(
          "https://rezly-ddms-rifd-2025y-01p.onrender.com/auth/getAllEmployees",
          {
            headers: {
              Authorization: token.startsWith("Bearer")
                ? token
                : `Bearer ${token}`,
            },
          }
        );

        // ✅ فلترة فقط المدربين
        const coachList =
          res.data?.employees
            ?.filter((emp) => emp.role === "Coach")
            .map((emp) => ({
              id: emp._id,
              name: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
            })) || [];

        setCoaches(coachList);
        console.log(
          "✅ أسماء المدربين:",
          coachList.map((c) => c.name)
        );
      } catch (err) {
        console.error(
          "❌ خطأ في جلب المدربين:",
          err.response?.data || err.message
        );
      }
    };

    fetchCoaches();
  }, []);

  const handleClassSelect = (cls) => {
    if (isReadOnly) return;

    setFormData((prev) => ({
      ...prev,
      title: cls,
      service: cls, // 🟣 ضروري للباك (هو اللي بنبعت بـ PUT)
    }));

    setOpenClass(false);
    setClassSearch("");
    if (errors?.title) setErrors((prev) => ({ ...prev, title: null }));
  };

  const handleAddNewClass = () => {
    if (isReadOnly) return;
    const newClass = classSearch.trim();
    if (newClass && !classes.includes(newClass)) {
      setClasses([...classes, newClass]);
      handleClassSelect(newClass);
    }
  };

  // 🟣 إغلاق القوائم عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (e) => {
      // إذا العنصر المفتوح مو جزء من العنصر اللي تم الضغط عليه
      if (!e.target.closest(".dropdown-step1")) {
        setOpenClass(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex justify-center bg-white w-full text-black text-[14px]">
      <form className="w-[343px] flex flex-col gap-3 font-[Cairo]">
        {/* اسم الحصة */}
        <div className="relative dropdown-step1">
          <label className="block font-bold text-sm mb-1">
            اسم الحصة <span className="text-red-500">*</span>
          </label>
          <div
            className={`w-full h-10 rounded-[8px] flex items-center justify-between relative border ${
              errors?.title ? "border-red-500" : "border-gray-300"
            } ${
              isReadOnly
                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                : "cursor-pointer"
            }`}
            onClick={() => !isReadOnly && setOpenClass(!openClass)}
          >
            <span
              className={`h-10 pr-3 pl-2 w-full flex items-center ${
                formData.title ? "text-black" : "text-gray-400"
              }`}
            >
              {formData.title || "اختر اسم الحصة"}
            </span>
            <img
              src={downarrowIcon}
              alt="downarrow"
              className="absolute left-2"
            />
          </div>
          {errors?.title && (
            <p className="text-red-500 text-xs mt-1">{errors.title}</p>
          )}

          {openClass && !isReadOnly && (
            <div className="absolute top-full left-0 w-full bg-white rounded-[16px] border border-gray-300 mt-1 shadow-lg z-50">
              <div className="p-3 max-h-[240px] overflow-y-auto">
                <div className="relative mb-2">
                  <input
                    type="text"
                    placeholder="ابحث عن حصة..."
                    value={classSearch}
                    onChange={(e) => setClassSearch(e.target.value)}
                    className="w-full h-8 rounded-md pr-8 pl-3 border border-gray-200 focus:outline-none text-gray-800 placeholder-gray-400"
                  />
                  <SearchIcon className="absolute top-1/2 right-2 -translate-y-1/2 w-4 h-4 text-[var(--color-purple)]" />
                </div>

                {classSearch && !classes.includes(classSearch) && (
                  <div
                    onClick={handleAddNewClass}
                    className="flex items-center gap-2 mb-2 cursor-pointer px-2 py-1 hover:bg-gray-100 rounded-md"
                  >
                    <AddcircleIcon className="w-4 h-4 text-[var(--color-purple)]" />
                    <span className="text-gray-800 font-normal">
                      إضافة "{classSearch}"
                    </span>
                  </div>
                )}

                {classes
                  .filter((c) =>
                    c.toLowerCase().includes(classSearch.toLowerCase())
                  )
                  .map((cls, idx) => {
                    const isSelected = formData.title === cls;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleClassSelect(cls)}
                        className={`flex items-center justify-between h-[32px] px-3 py-1 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${
                          isSelected
                            ? "font-semibold text-black"
                            : "text-gray-700"
                        }`}
                      >
                        {cls}
                        <div
                          className={`w-4 h-4 flex items-center justify-center rounded-full border-2 ${
                            isSelected
                              ? "border-[var(--color-purple)]"
                              : "border-[var(--color-purple)]"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-[var(--color-purple)]"></div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {classes.filter((c) =>
                  c.toLowerCase().includes(classSearch.toLowerCase())
                ).length === 0 && (
                  <div className="text-gray-400 text-center py-2">
                    لا يوجد حصص مطابقة
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* الوصف */}
        <div>
          <label className="block font-bold text-sm mb-1">
            الوصف <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="أدخل الوصف"
            value={formData.description || ""}
            onChange={(e) => {
              if (isReadOnly) return;
              setFormData({ ...formData, description: e.target.value });
              if (errors?.description)
                setErrors((prev) => ({ ...prev, description: null }));
            }}
            readOnly={isReadOnly}
            disabled={isReadOnly}
            className={`w-full h-10 border rounded-md px-3 focus:outline-none placeholder-gray-400 ${
              errors?.description ? "border-red-500" : "border-gray-300"
            } ${
              isReadOnly
                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                : "bg-white"
            }`}
          />
          {errors?.description && (
            <p className="text-red-500 text-xs mt-1">{errors.description}</p>
          )}
        </div>

        {/* المدرب */}
        {!isCoach && (
          <>
            <div
              className={`${
                isReadOnly ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <CoachSelector
                selectedCoach={formData.coach}
                setSelectedCoach={(coach) => {
                  setFormData({
                    ...formData,
                    coach: { id: coach._id || coach.id, name: coach.name },
                    coachId: coach._id || coach.id,
                  });
                }}
                coachesList={coaches}
              />
            </div>
            {errors?.coach && (
              <p className="text-red-500 text-xs mt-1">{errors.coach}</p>
            )}
          </>
        )}

        {/* القاعة */}
        <div
          className={`${isReadOnly ? "opacity-50 pointer-events-none" : ""}`}
        >
          <LocationSelector
            selectedLocation={formData.room}
            setSelectedLocation={(loc) => {
              if (isReadOnly) return;
              setFormData((prev) => ({
                ...prev,
                room: loc,
                location: loc, // 🟣 هذا الحقل اللي الباك بيستخدمه
              }));

              if (errors?.room) setErrors((prev) => ({ ...prev, room: null }));
            }}
            locationsList={rooms}
            placeholderColor="text-gray-400"
            borderColor={errors?.room ? "red" : "#D1D5DB"}
            showIcon={false}
          />
        </div>
        {errors?.room && (
          <p className="text-red-500 text-xs mt-1">{errors.room}</p>
        )}

        {/* عدد المشتركين */}
        <div
          className={`${isReadOnly ? "opacity-50 pointer-events-none" : ""}`}
        >
          <MaxParticipantsSelector
            selectedMax={formData.maxMembers}
            setSelectedMax={(value) => {
              if (isReadOnly) return;
              setFormData((prev) => ({
                ...prev,
                maxMembers: Number(value), // 🟣 تأكيد إنه دايمًا رقم
              }));

              if (errors?.maxMembers)
                setErrors((prev) => ({ ...prev, maxMembers: null }));
            }}
            options={[
              { label: "1 مشترك", value: 1 },
              { label: "5 مشتركين", value: 5 },
              { label: "10 مشتركين", value: 10 },
              { label: "20 مشتركاً", value: 20 },
              { label: "إدخال مخصص", value: "custom" },
              { label: "غير محدود", value: Infinity },
            ]}
            borderColor={errors?.maxMembers ? "red" : "#D1D5DB"}
          />
        </div>
        {errors?.maxMembers && (
          <p className="text-red-500 text-xs mt-1">{errors.maxMembers}</p>
        )}
      </form>
    </div>
  );
}
