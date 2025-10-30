import React, { useState, useEffect } from "react";
import downarrowIcon from "../../icons/downarrow.svg";
import SearchIcon from "../../icons/search.svg?react";
import AddcircleIcon from "../../icons/addcircle.svg?react";
import trainerIcon from "../../icons/trainer.svg";
import { getAllEmployees } from "../../api"; // تأكد المسار صح

export default function CoachSelector({
  selectedCoach,
  setSelectedCoach,
  showIcon = true,
  placeholderColor = "text-black",
  borderStyle = "#7E818C",
  variant = "add",
}) {
  const [openCoach, setOpenCoach] = useState(false);
  const [coachSearch, setCoachSearch] = useState("");
  const [coaches, setCoaches] = useState([]);

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const res = await getAllEmployees();
        const employees = Array.isArray(res.employees) ? res.employees : [];
        const filteredCoaches = employees
          .filter((emp) => emp.role === "Coach")
          .map((c) => ({
            ...c,
            name:
              `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
              c.username ||
              "مدرب بدون اسم",
          }));
        setCoaches(filteredCoaches);
      } catch (err) {
        console.error("❌ خطأ أثناء جلب المدربين:", err);
      }
    };
    fetchCoaches();
  }, []);

  const filteredCoaches = Array.isArray(coaches)
    ? coaches.filter((c) =>
        c?.name.toLowerCase().includes(coachSearch.toLowerCase())
      )
    : [];

  return (
    <div className="relative">
      <label className="block font-bold text-sm mb-2">اسم المدرب</label>
      <div
        className="w-full h-10 rounded-md flex items-center justify-between cursor-pointer relative"
        onClick={() => setOpenCoach(!openCoach)}
        style={{ border: `1px solid ${borderStyle}` }}
      >
        {showIcon && (
          <img src={trainerIcon} alt="trainer" className="absolute right-2" />
        )}
        <span
          className={`h-10 w-full flex items-center ${
            showIcon ? "pr-8" : "pr-2"
          } pl-2 font-normal ${
            selectedCoach
              ? variant === "event"
                ? "text-black font-bold"
                : "text-gray-800"
              : placeholderColor
          }`}
        >
          {selectedCoach?.name || "اختر المدرب"}
        </span>
        <img src={downarrowIcon} alt="downarrow" className="absolute left-2" />
      </div>

      {openCoach && (
        <div className="absolute top-full left-0 w-full bg-white rounded-[16px] border border-gray-500/40 mt-1 shadow-[0_4px_12px_rgba(0,0,0,0.25)] z-50 text-[#000000]">
          <div className="w-full h-full p-4 box-border max-h-[250px] overflow-y-auto">
            {/* البحث */}
            <div className="relative w-full h-[30px] mb-2">
              <input
                type="text"
                placeholder="ابحث عن مدرب..."
                value={coachSearch}
                onChange={(e) => setCoachSearch(e.target.value)}
                className="w-full h-full rounded-[8px] border border-gray-500 px-3 pr-10 focus:outline-none placeholder-gray-400 text-gray-800"
              />
              <SearchIcon className="absolute top-1/2 right-2 -translate-y-1/2 w-5 h-5 text-[var(--color-purple)]" />
            </div>

            {/* إضافة جديد */}
            <div className="flex items-center gap-2 mb-2 cursor-pointer px-3 py-2 hover:bg-gray-100">
              <AddcircleIcon className="w-4 h-4 text-[var(--color-purple)]" />
              <span
                className={`font-normal ${
                  variant === "event" ? "text-black font-bold" : "text-gray-800"
                }`}
              >
                إضافة جديد
              </span>
            </div>

            {/* قائمة المدربين */}
            {filteredCoaches.length > 0 ? (
              filteredCoaches.map((coach) => {
                const isSelected =
                  String(selectedCoach?.id || selectedCoach?._id) ===
                  String(coach.id || coach._id);

                return (
                  <div
                    key={coach._id || coach.id}
                    className="flex items-center justify-between h-[32px] px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-[rgba(126,129,140,0.4)] last:border-b-0"
                    onClick={() => {
                      setSelectedCoach(coach);
                      setOpenCoach(false);
                      setCoachSearch("");
                    }}
                  >
                    <span
                      className={
                        isSelected
                          ? "font-bold text-black"
                          : "font-normal text-gray-800"
                      }
                    >
                      {coach.name}
                    </span>
                    <div className="w-5 h-5 rounded-full border-2 border-[var(--color-purple)] flex items-center justify-center">
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-purple)]"></div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-2 text-gray-400 font-normal">
                لا يوجد مدربين
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
