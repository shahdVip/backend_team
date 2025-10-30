import React, { useState, useEffect } from "react";
import SubscribersTab from "../components/Tabs/SubscribersTab";
import BookingsPage from "../components/Tabs/BookingsTab.jsx";
import AddParticipantModel from "../components/AddParticipantModel/AddParticipantModel.jsx";
import { useBookings } from "../Bookings/BookingsContext.jsx";
import { getBookingsCountAPI } from "../api/bookingsApi.js";
import BookingIcon from "../icons/booking.svg?react";
import MembersIcon from "../icons/addpeople.svg?react";
import BookingNumberIcon from "../icons/bookingNumber.svg?react";
import MembersNumberIcon from "../icons/people.svg?react";
import { getAllMembers } from "../api.js";

const tabs = ["الحجوزات", "المشتركين", "سجل الحضور", "التقارير", "الإعدادات"];

export default function ClientsPage() {
  const [activeTab, setActiveTab] = useState("المشتركين");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 🧩 جلب البيانات من الكونتكست (فقط للوصول وليس لاستدعاء fetch)
  const { bookings, loading } = useBookings();

  const [totalMembers, setTotalMembers] = useState(0);

  useEffect(() => {
    const fetchTotalMembers = async () => {
      try {
        const members = await getAllMembers(); // هذا يرجع array
        console.log("عدد المشتركين من API:", members.length);
        setTotalMembers(members.length); // طول المصفوفة هو العدد الكلي
      } catch (err) {
        console.error("❌ خطأ أثناء جلب عدد المشتركين:", err);
      }
    };
    fetchTotalMembers();
  }, []);

  // 🔹 لما نكبس زر "إضافة حجز"
  const handleAddBookingClick = () => {
    if (activeTab === "الحجوزات") {
      window.dispatchEvent(new CustomEvent("openAddBooking"));
    } else if (activeTab === "المشتركين") {
      setIsModalOpen(true);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "المشتركين":
        return <SubscribersTab />;
      case "الحجوزات":
        return <BookingsPage />;
      default:
        return (
          <div className="p-4 bg-white rounded-2xl shadow">
            محتوى {activeTab}
          </div>
        );
    }
  };

  const [totalBookings, setTotalBookings] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const count = await getBookingsCountAPI();
        setTotalBookings(count);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCount();
  }, []);

  return (
    <div className="flex flex-col gap-3 flex-1 w-full">
      {/* Navbar */}
      <div className="flex">
        <div className="flex w-full bg-white">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2.5 text-base cursor-pointer relative pb-1 text-[12px] font-[600] font-Cairo leading-[150%] text-center transition ${
                activeTab === tab ? "" : "text-[var(--grey,#7E818C)]"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-15 h-[2px] bg-[var(--color-purple)] rounded-full"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 🔹 شريط الأدوات */}
      {/* 🔹 شريط الأدوات */}
      <div className="flex justify-between items-center p-2">
        <div className="flex flex-2 items-center gap-3">
          {/* زر الإضافة */}
          {(activeTab === "المشتركين" || activeTab === "الحجوزات") && (
            <button
              onClick={handleAddBookingClick}
              className="flex items-center gap-2 bg-[var(--color-purple)] text-white px-2 py-1 rounded-lg transition"
            >
              {activeTab === "المشتركين" ? (
                <MembersIcon className="w-4 h-4" />
              ) : (
                <BookingIcon className="w-4 h-4" />
              )}
              <span className="text-[12px] font-[600] font-Cairo leading-[150%]">
                {activeTab === "المشتركين" ? "إضافة مشترك" : "إضافة حجز"}
              </span>
            </button>
          )}

          {/* 🔹 زر الفلترة (للحجوزات والمشتركين) */}
          {(activeTab === "الحجوزات" || activeTab === "المشتركين") && (
            <div
              className="w-8 h-8 flex items-center justify-center bg-white rounded-md  cursor-pointer hover:bg-gray-50"
              onClick={() => {
                if (activeTab === "الحجوزات") {
                  window.dispatchEvent(new CustomEvent("openBookingsFilter"));
                } else if (activeTab === "المشتركين") {
                  window.dispatchEvent(
                    new CustomEvent("openSubscribersFilter")
                  );
                }
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M0.5 1.66667C0.5 1.02233 1.02234 0.5 1.66667 0.5H12.3333C12.9777 0.5 13.5 1.02233 13.5 1.66667V3.35442C13.5 3.70066 13.3462 4.02902 13.0802 4.25067L9.51659 7.22037C9.48496 7.24672 9.46421 7.28385 9.45833 7.32459L8.87068 11.3954C8.81609 11.7735 8.57982 12.101 8.23818 12.272L6.74583 13.019C6.01978 13.3824 5.15376 12.9115 5.06409 12.1045L4.53269 7.32194C4.52794 7.27915 4.50682 7.23987 4.47374 7.21231L0.919785 4.25067C0.653793 4.02902 0.5 3.70066 0.5 3.35442V1.66667Z"
                  fill="#6A0EAD"
                />
              </svg>
            </div>
          )}

          {/* العدادات */}
          {/* العدادات */}
          <div className="flex items-center gap-1 px-3 py-1">
            {activeTab === "المشتركين" ? (
              <>
                {/* أيقونة وعدد المشتركين */}
                <MembersNumberIcon className="w-5 h-5 text-[var(--color-purple)]" />
                <span className="text-[12px]">{totalMembers}</span>
                {/* 👆 مؤقتًا ثابت، لاحقًا نحطه من API تبع المشتركين */}
              </>
            ) : activeTab === "الحجوزات" ? (
              <>
                {/* أيقونة وعدد الحجوزات */}
                <BookingNumberIcon className="w-5 h-5 text-[var(--color-purple)]" />
                <span className="text-[12px]">{totalBookings}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* المحتوى */}
      {renderContent()}

      {/* مودال المشتركين فقط */}
      {isModalOpen && activeTab === "المشتركين" && (
        <AddParticipantModel
          onClose={() => setIsModalOpen(false)}
          onSave={(data) => console.log("تم إضافة مشترك:", data)}
        />
      )}
    </div>
  );
}
