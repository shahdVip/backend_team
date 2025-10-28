import Booking from "../../../DB/models/booking.model.js";
import BookingMember from "../../../DB/models/bookingMembers.model.js";
import userModel from "../../../DB/models/user.model.js";
import mongoose from "mongoose";
import { AppError } from "../../Utils/catchError.js";
import { Employee } from "../../../DB/models/employee.model.js";

export const getBookings = async (req, res, next) => {
  try {
    const { userId, user } = req;
    const role = user.role.toLowerCase();

    let bookingsQuery;

    if (role === "admin") {
      bookingsQuery = Booking.find();
    } else if (role === "coach") {
      bookingsQuery = Booking.find({ coach: userId });
    } else {
      const memberBookings = await BookingMember.find({ member: userId })
        .select("booking")
        .lean();
      const bookingIds = memberBookings.map((bm) => bm.booking);
      bookingsQuery = Booking.find({ _id: { $in: bookingIds } });
    }

    const bookings = await bookingsQuery.lean();
    if (bookings.length === 0) {
      return res.status(200).json({
        status: "success",
        data: [],
        metadata: { totalResults: 0, message: "No bookings found" },
        message: "Success",
      });
    }

    // جلب الأعضاء لكل حجز
    const bookingIds = bookings.map((b) => b._id);
    const bookingMembers = await BookingMember.find({
      booking: { $in: bookingIds },
    })
      .select("booking member -_id")
      .lean();

    const bookingMap = {};
    bookingMembers.forEach((bm) => {
      const bid = bm.booking.toString();
      if (!bookingMap[bid]) bookingMap[bid] = [];
      bookingMap[bid].push(bm.member);
    });

    // دمج البيانات
    const result = bookings.map((b) => ({
      ...b,
      members: bookingMap[b._id.toString()] || [],
      membersCount: (bookingMap[b._id.toString()] || []).length,
      groupId: b.groupId || null,
    }));

    return res.status(200).json({
      status: "success",
      data: result,
      metadata: {
        totalResults: result.length,
        message: "Bookings fetched successfully",
      },
      message: "Success",
    });
  } catch (err) {
    return next(new AppError(err.message, 500));
  }
};

function convertArabicTimeTo24Hour(timeStr) {
  if (!timeStr) return null;

  // نظف المسافات
  timeStr = timeStr.trim();

  // استخراج الساعة والدقيقة
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(ص|م)?/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const period = match[3]; // ص أو م

  if (period === "م" && hour < 12) hour += 12;
  if (period === "ص" && hour === 12) hour = 0;

  // صيغة 24 ساعة
  return `${hour.toString().padStart(2, "0")}:${minute}`;
}
function convertSubscriptionToDays(value) {
  const map = {
    "1day": 1,
    "1week": 7,
    "2weeks": 14,
    "3weeks": 21,
    "1month": 30,
    "3months": 90,
    "6months": 180,
    "1year": 365,
  };
  return map[value] || 7; // الافتراضي: أسبوع
}

// --- CREATE BOOKING ---
export const createBooking = async (req, res) => {
  try {
    const {
      service,
      description,
      coachId,
      location,
      schedules, // [{dayOfWeek, timeStart, timeEnd}]
      reminders = [],
      maxMembers,
      members = [],
      subscriptionDuration = "1week",
      startDate,
    } = req.body;

    if (!startDate)
      return res.status(400).json({ message: "startDate is required" });

    // تحديد الكوتش
    let finalCoachId = coachId;
    if (req.user.role === "Coach") finalCoachId = req.user._id;
    else if (req.user.role !== "Admin")
      return res.status(403).json({ message: "Not authorized" });

    const coach = await Employee.findById(finalCoachId);
    if (!coach) return res.status(400).json({ message: "Coach not found" });

    // تحويل مدة الاشتراك إلى عدد الأيام
    const subscriptionMap = {
      "1day": 1,
      "1week": 7,
      "2weeks": 14,
      "3weeks": 21,
      "1month": 30,
      "3months": 90,
      "6months": 180,
      "1year": 365,
    };
    const totalDays = subscriptionMap[subscriptionDuration] || 7;

    const start = new Date(startDate);
    const expandedSchedules = [];
    const conflictedDays = [];

    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dayOfWeek = currentDate.getDay();

      const daySchedule = schedules.find((s) => s.dayOfWeek === dayOfWeek);
      if (!daySchedule) continue;

      const dateString = currentDate.toISOString().split("T")[0];
      const timeStart24 = convertArabicTimeTo24Hour(daySchedule.timeStart);
      const timeEnd24 = convertArabicTimeTo24Hour(daySchedule.timeEnd);

      const startDateTime = new Date(`${dateString}T${timeStart24}`);
      const endDateTime = new Date(`${dateString}T${timeEnd24}`);

      // تحقق من التعارضات (coach)
      const existingCoachBookings = await Booking.find({
        coach: finalCoachId,
      }).lean();

      let conflictCoach = false;

      for (const b of existingCoachBookings) {
        for (const s of b.schedules) {
          const sStart = new Date(
            `${s.date.toISOString().split("T")[0]}T${convertArabicTimeTo24Hour(
              s.timeStart
            )}`
          );
          const sEnd = new Date(
            `${s.date.toISOString().split("T")[0]}T${convertArabicTimeTo24Hour(
              s.timeEnd
            )}`
          );

          if (startDateTime < sEnd && endDateTime > sStart) {
            conflictCoach = true;
            break;
          }
        }
        if (conflictCoach) break;
      }

      // تحقق من تعارض الغرفة
      const existingRoomBookings = await Booking.find({
        location,
        "schedules.date": { $gte: startDateTime, $lte: endDateTime },
      }).lean();

      const conflictRoom = existingRoomBookings.some((b) =>
        b.schedules?.some((s) => {
          const sStart = new Date(
            `${s.date.toISOString().split("T")[0]}T${convertArabicTimeTo24Hour(
              s.timeStart
            )}`
          );
          const sEnd = new Date(
            `${s.date.toISOString().split("T")[0]}T${convertArabicTimeTo24Hour(
              s.timeEnd
            )}`
          );
          return startDateTime < sEnd && endDateTime > sStart;
        })
      );

      if (conflictCoach || conflictRoom) {
        conflictedDays.push({
          date: dateString,
          reason: conflictCoach ? "Coach busy" : "Room busy",
        });
        continue;
      }

      expandedSchedules.push({
        dayOfWeek,
        timeStart: daySchedule.timeStart,
        timeEnd: daySchedule.timeEnd,
        date: currentDate, // نحسب التاريخ بناءً على startDate وdayOfWeek
      });
    }

    if (expandedSchedules.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "All selected days conflicted — no bookings created",
        conflictedDays,
      });
    }

    const booking = await Booking.create({
      service,
      description,
      coach: finalCoachId,
      location,
      startDate: new Date(startDate),
      schedules: expandedSchedules.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        timeStart: s.timeStart,
        timeEnd: s.timeEnd,
        date: s.date,
      })),
      maxMembers,
      reminders,
      subscriptionDuration,
      groupId: new mongoose.Types.ObjectId(),
    });

    if (members.length > 0) {
      const bookingMembers = members.map((memberId) => ({
        booking: booking._id,
        member: memberId,
        joinedAt: new Date(),
      }));
      await BookingMember.insertMany(bookingMembers);
    }

    res.status(201).json({
      status: "success",
      data: booking,
      conflictedDays,
      message:
        conflictedDays.length > 0
          ? "Booking created partially — some days conflicted"
          : "Booking created successfully",
    });
  } catch (err) {
    console.error("Booking creation error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
};

// --- UPDATE BOOKING ---
export const updateBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.bookingId;
    const { updateAllSameDay } = req.query;
    const {
      scheduleId,
      dayOfWeek,
      updateByDate,
      date,
      timeStart,
      timeEnd,
      ...rest
    } = req.body;

    // 1️⃣ جلب الحجز
    const booking = await Booking.findById(bookingId);
    if (!booking)
      return res
        .status(404)
        .json({ status: "error", message: "Booking not found" });

    // 2️⃣ تحديد الكوتش (لو المستخدم كوتش نفسه)
    let finalCoachId = rest.coach || booking.coach;
    if (req.user.role === "Coach") finalCoachId = req.user._id;

    // 3️⃣ تعديل الخصائص العامة
    Object.keys(rest).forEach((key) => {
      if (rest[key] !== undefined) booking[key] = rest[key];
    });

    // 1️⃣ إذا لم يتم تمرير أي schedule-related field، عدل الخصائص العامة فقط
    if (!scheduleId && !updateByDate && !dayOfWeek) {
      await booking.save();
      return res.status(200).json({
        status: "success",
        message: "Booking updated successfully (general properties only)",
        data: booking,
      });
    }

    // 4️⃣ تحديد الأيام المتأثرة (affectedSchedules)
    let affectedSchedules = [];

    if (updateAllSameDay === "true") {
      if (dayOfWeek === undefined) {
        return res.status(400).json({
          status: "error",
          message: "dayOfWeek is required for updateAllSameDay",
        });
      }

      booking.schedules = booking.schedules.map((sch) => {
        if (sch.dayOfWeek === dayOfWeek) {
          const updated = {
            ...sch.toObject(),
            timeStart: timeStart ?? sch.timeStart,
            timeEnd: timeEnd ?? sch.timeEnd,
            date: date ? new Date(date) : sch.date,
          };
          affectedSchedules.push(updated);
          return updated;
        }
        return sch;
      });
    } else if (updateByDate) {
      // تعديل يوم حسب التاريخ
      const targetDate = new Date(updateByDate).toISOString().split("T")[0];
      booking.schedules = booking.schedules.map((sch) => {
        const schDate = new Date(sch.date).toISOString().split("T")[0];
        if (schDate === targetDate) {
          const updated = {
            ...sch.toObject(),
            timeStart: timeStart ?? sch.timeStart,
            timeEnd: timeEnd ?? sch.timeEnd,
            date: date ? new Date(date) : sch.date,
          };
          affectedSchedules.push(updated);
          return updated;
        }
        return sch;
      });
    } else if (scheduleId) {
      // تعديل يوم حسب الـ scheduleId
      booking.schedules = booking.schedules.map((sch) => {
        if (sch._id.toString() === scheduleId) {
          const updated = {
            ...sch.toObject(),
            timeStart: timeStart ?? sch.timeStart,
            timeEnd: timeEnd ?? sch.timeEnd,
            date: date ? new Date(date) : sch.date,
          };
          affectedSchedules.push(updated);
          return updated;
        }
        return sch;
      });
    } else {
      return res.status(400).json({
        status: "error",
        message:
          "Must provide scheduleId or dayOfWeek (with updateAllSameDay=true) or updateByDate",
      });
    }

    // 5️⃣ دالة تحويل الوقت العربي
    const toHM = (timeStr) => {
      if (!timeStr) return [0, 0];
      const [t, meridiem] = timeStr.split(" ");
      let [h, m] = t.split(":").map(Number);
      if (meridiem === "م" && h !== 12) h += 12;
      if (meridiem === "ص" && h === 12) h = 0;
      return [h, m];
    };
    const makeDT = (dateStr, h, m) => {
      const d = new Date(dateStr);
      d.setHours(h, m, 0, 0);
      return d;
    };

    // 6️⃣ التحقق من التعارض
    const conflict = async (field, checkDate, startStr, endStr) => {
      const [startH, startM] = toHM(startStr);
      const [endH, endM] = toHM(endStr);
      const firstStart = makeDT(checkDate, startH, startM);
      const firstEnd = makeDT(checkDate, endH, endM);

      const items = await Booking.find({
        _id: { $ne: bookingId },
        [field]: field === "coach" ? finalCoachId : booking.location,
        "schedules.date": checkDate,
      }).lean();

      for (const item of items) {
        for (const sch of item.schedules) {
          const schDate = new Date(sch.date).toISOString().split("T")[0];
          if (schDate !== new Date(checkDate).toISOString().split("T")[0])
            continue;

          const [sH, sM] = toHM(sch.timeStart);
          const [eH, eM] = toHM(sch.timeEnd);
          const s = makeDT(sch.date, sH, sM);
          const e = makeDT(sch.date, eH, eM);
          if (firstStart < e && firstEnd > s) return true;
        }
      }
      return false;
    };

    for (const sch of affectedSchedules) {
      const checkDate = new Date(sch.date).toISOString().split("T")[0];
      if (await conflict("coach", checkDate, sch.timeStart, sch.timeEnd)) {
        return res
          .status(400)
          .json({ status: "error", message: `Coach busy on ${checkDate}` });
      }
      if (await conflict("location", checkDate, sch.timeStart, sch.timeEnd)) {
        return res
          .status(400)
          .json({ status: "error", message: `Room busy on ${checkDate}` });
      }
    }

    // 7️⃣ حفظ التعديلات
    await booking.save();

    return res.status(200).json({
      status: "success",
      message: "Booking updated successfully",
      data: booking,
    });
  } catch (err) {
    console.error("Update booking error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
};

//typescript//singlton and design principles
export const deleteBooking = async (req, res, next) => {
  try {
    const { user } = req;
    const role = user.role.toLowerCase();
    const { id } = req.params; // ممكن يكون bookingId أو groupId
    const { type } = req.query; // type=group أو type=single

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: "error", message: "Invalid ID" });
    }

    let deletedCount = 0;

    // ====== حذف مجموعة كاملة ======
    if (type === "group") {
      const groupBookings = await Booking.find({ groupId: id }).lean();
      if (!groupBookings.length) {
        return res.status(404).json({
          status: "error",
          message: "No bookings found for this groupId",
        });
      }

      // تحقق من صلاحية الكوتش
      if (role === "coach") {
        const isOwner = groupBookings.every(
          (b) => b.coach.toString() === user._id.toString()
        );
        if (!isOwner) {
          return res.status(403).json({
            status: "error",
            message: "Not authorized to delete this group",
          });
        }
      }

      const groupBookingIds = groupBookings.map((b) => b._id);

      // حذف جميع الميمبرز المرتبطين بالجروب
      await BookingMember.deleteMany({ booking: { $in: groupBookingIds } });

      // حذف جميع الحجوزات
      const result = await Booking.deleteMany({
        _id: { $in: groupBookingIds },
      });
      deletedCount = result.deletedCount;

      return res.status(200).json({
        status: "success",
        message: `Deleted ${deletedCount} bookings and all related members from the group successfully`,
      });
    }

    // ====== حذف حجز واحد ======
    else {
      const booking = await Booking.findById(id).lean();
      if (!booking) {
        return res
          .status(404)
          .json({ status: "error", message: "Booking not found" });
      }

      // تحقق من صلاحيات الكوتش
      if (
        role === "coach" &&
        booking.coach.toString() !== user._id.toString()
      ) {
        return res.status(403).json({
          status: "error",
          message: "Not authorized to delete this booking",
        });
      }

      // حذف جميع الميمبرز المرتبطين بهذا الحجز
      await BookingMember.deleteMany({ booking: booking._id });

      // حذف الحجز نفسه
      await Booking.findByIdAndDelete(booking._id);
      deletedCount = 1;

      return res.status(200).json({
        status: "success",
        message: "Booking and all related members deleted successfully",
      });
    }
  } catch (err) {
    next(err);
  }
};
export const filterBookings = async (req, res) => {
  try {
    const { userId, user } = req; // userId من JWT
    const role = user.role.toLowerCase();
    const { location, date, coachId } = req.query;

    console.log("UserId:", userId);
    console.log("Role:", role);

    let query = {};

    // ===== صلاحيات المستخدم =====
    if (role === "coach") {
      query.coach = new mongoose.Types.ObjectId(userId); // الكوتش يشوف حجوزاته فقط
    } else if (role === "admin" && coachId) {
      query.coach = new mongoose.Types.ObjectId(coachId); // الادمن يفلتر حسب الكوتش
    } else if (role !== "admin" && role !== "coach") {
      query.members = {
        $elemMatch: { member: new mongoose.Types.ObjectId(userId) },
      };
    }

    // ===== فلترة الموقع =====
    if (location) {
      query.location = { $regex: new RegExp(location.trim(), "i") };
    }

    // ===== فلترة التاريخ ليوم محدد =====
    if (date) {
      const start = new Date(date);
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setUTCHours(23, 59, 59, 999);

      query.date = { $gte: start, $lte: end };
    }

    console.log("Final query:", query);

    // ===== جلب الحجوزات مع أعضاء الحجز + بيانات الكوتش من Employee =====
    const bookings = await Booking.find(query)
      .populate("coach", "-password -refreshToken") // جلب بيانات الكوتش بدون الحقول الحساسة
      .lean();

    console.log("Bookings fetched:", bookings.length);

    return res.json({
      status: "success",
      data: bookings,
      metadata: {
        totalResults: bookings.length,
        message: "Bookings fetched successfully",
      },
      message: "Success",
    });
  } catch (err) {
    console.error("Error filtering bookings:", err);
    return res.status(500).json({
      status: "error",
      data: [],
      metadata: { totalResults: 0, message: err.message },
      message: "Error",
    });
  }
};

export const calendarView = async (req, res) => {
  try {
    const filter = {};

    // إذا المستخدم دوره "coach" رجّع حجوزاته فقط
    if (req.user.role?.toLowerCase() === "coach") {
      filter.coach = req.user._id;
    }
    console.log(filter);
    const bookings = await Booking.find(filter)
      .select("date timeStart timeEnd coach")
      .lean();

    const calendarEvents = bookings.map((b) => ({
      start: `${b.date.toISOString().split("T")[0]}T${b.timeStart}`,
      end: `${b.date.toISOString().split("T")[0]}T${b.timeEnd}`,
      date: b.date.toISOString().split("T")[0],
      coachId: b.coach, // ممكن تحتاجه بالفرونت
    }));

    res.json({
      status: "success",
      data: calendarEvents,
      message: "Calendar bookings fetched successfully",
    });
  } catch (err) {
    console.error("Calendar fetch error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch calendar bookings",
      error: err.message,
    });
  }
};

export const getBookingDetails = async (req, res, next) => {
  try {
    const { userId, user } = req; // موجود من middleware auth
    const role = user.role.toLowerCase();
    const bookingId = req.params.id;
    console.log(role);
    console.log(bookingId);
    // تحقق من صحة الـ ObjectId
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid booking ID",
      });
    }
    console.log(userId);
    // جلب الحجز المطلوب فقط
    const booking = await Booking.findById(bookingId).lean();
    if (!booking) {
      return res.status(404).json({
        status: "error",
        message: "Booking not found",
      });
    }

    if (role === "coach" && booking.coach.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ status: "error", message: "Not authorized" });
    }

    if (role === "member") {
      const memberBooking = await BookingMember.findOne({
        booking: bookingId,
        member: userId,
      });
      if (!memberBooking) {
        return res
          .status(403)
          .json({ status: "error", message: "Not authorized" });
      }
    }

    if (!["admin", "coach", "member"].includes(role)) {
      return res
        .status(403)
        .json({ status: "error", message: "Not authorized" });
    }

    // جلب الأعضاء المرتبطين بالحجز
    const bookingMembers = await BookingMember.find({ booking: bookingId })
      .select("member")
      .lean();

    booking.members = bookingMembers.map((bm) => bm.member);

    return res.status(200).json({
      status: "success",
      data: booking,
      message: "Booking details fetched successfully",
    });
  } catch (err) {
    return next(new AppError(err.message, 500));
  }
};
export const cancelBooking = async (req, res, next) => {
  try {
    const { userId, user } = req; // من الـ middleware
    const role = user.role.toLowerCase();
    const bookingId = req.params.bookingId;
    console.log(bookingId);
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid booking ID",
      });
    }

    // جلب الحجز
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        status: "error",
        message: "Booking not found",
      });
    }

    // تحقق من الصلاحيات
    if (role === "coach") {
      if (booking.coach.toString() !== userId.toString()) {
        return res.status(403).json({
          status: "error",
          message: "Not authorized to cancel this booking",
        });
      }
    } else if (role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "Not authorized to cancel bookings",
      });
    }

    // تحقق إذا الحجز ملغي أصلاً
    if (booking.status === "cancelled") {
      return res.status(400).json({
        status: "error",
        message: "Booking is already cancelled",
      });
    }

    // تحديث حالة الحجز
    booking.status = "cancelled";
    await booking.save();

    return res.status(200).json({
      status: "success",
      message: "Booking cancelled successfully",
      data: booking,
    });
  } catch (err) {
    return next(new AppError(err.message, 500));
  }
};

export default {
  createBooking,
  getBookings,
  getBookingDetails,
  updateBooking,
  deleteBooking,
};
