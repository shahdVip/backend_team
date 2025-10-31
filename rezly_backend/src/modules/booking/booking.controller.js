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

  return `${hour.toString().padStart(2, "0")}:${minute}`;
}

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
    const bookingGroupId = new mongoose.Types.ObjectId(); // Group ID للحجز كله

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
        "schedules.coach": finalCoachId,
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
        "schedules.location": location,
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
  date: currentDate,
  coach: finalCoachId,
  location,
  reminders: reminders || [], // <-- هنا
  members: members || [],     // <-- هنا
  maxMembers,
  groupId: new mongoose.Types.ObjectId().toString(),
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
      startDate: new Date(startDate),
      maxMembers,
      subscriptionDuration,
      schedules: expandedSchedules,
      groupId: bookingGroupId,
    });

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

function parseTimeArabic(t) {
  let [time, meridiem] = t.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (meridiem === "م" && h !== 12) h += 12;
  if (meridiem === "ص" && h === 12) h = 0;
  return { h, m };
}

function conflictExists(allBookings, {
  coach,
  location,
  startDT,
  endDT,
  ignoreScheduleId,
  ignoreBookingId
}) {
  for (const booking of allBookings) {
    // تجاهل الحجز الحالي فقط إذا محدد
    if (ignoreBookingId && booking._id.toString() === ignoreBookingId) continue;

    for (const s of booking.schedules) {
      if (ignoreScheduleId && s._id.toString() === ignoreScheduleId) continue;

      const scheduleStart = new Date(s.date);
      const scheduleEnd = new Date(s.date);
      const ts = parseTimeArabic(s.timeStart);
      const te = parseTimeArabic(s.timeEnd);
      scheduleStart.setHours(ts.h, ts.m);
      scheduleEnd.setHours(te.h, te.m);

      const overlap = startDT < scheduleEnd && endDT > scheduleStart;
      if (!overlap) continue;

      if (coach && s.coach?.toString() === coach.toString())
        return { type: "coach", schedule: s };

      if (location && s.location === location)
        return { type: "location", schedule: s };
    }
  }
  return null;
}

export const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduleId, updateAllSameGroup } = req.query;

    let booking;

    // 🔹 تحديد نوع التعديل
    if (scheduleId) booking = await Booking.findById(id);
    else if (updateAllSameGroup === "true") booking = await Booking.findOne({ groupId: id });
    else booking = await Booking.findById(id);

    if (!booking)
      return res.status(404).json({ status: "error", message: "Booking not found" });

    const today = new Date();
    const allBookings = await Booking.find();

// ================================
// تعديل جدول واحد
// ================================
if (scheduleId) {
  const schedule = booking.schedules.id(scheduleId);
  if (!schedule) return res.status(404).json({ status: "error", message: "Schedule not found" });
  if (new Date(schedule.date) < today) return res.status(400).json({ status: "error", message: "Cannot update past schedule" });

  const newDate = new Date(req.body.date ?? schedule.date);
  const ts = parseTimeArabic(req.body.timeStart ?? schedule.timeStart);
  const te = parseTimeArabic(req.body.timeEnd ?? schedule.timeEnd);

  const startDT = new Date(newDate); startDT.setHours(ts.h, ts.m);
  const endDT = new Date(newDate); endDT.setHours(te.h, te.m);

  // هنا نتجاهل الجدول نفسه فقط
  const conflict = conflictExists(allBookings, {
    coach: req.body.coach ?? schedule.coach,
    location: req.body.location ?? schedule.location,
    startDT,
    endDT,
    ignoreScheduleId: scheduleId,
    ignoreBookingId: null
  });

  if (conflict)
    return res.status(400).json({
      status: "error",
      message: conflict.type === "coach" ? "المدرب لديه حجز آخر في نفس الوقت" : "الغرفة محجوزة في نفس الوقت"
    });

  // تعديل الحقول
  for (const key of ["date","coach","location","reminders","members","maxMembers","dayOfWeek","timeStart","timeEnd"])
    if (req.body[key] !== undefined) schedule[key] = req.body[key];

  await booking.save();
  return res.status(200).json({ status: "success", message: "Schedule updated successfully", data: booking });
}

// ================================
// تعديل الجروب كامل
// ================================
if (updateAllSameGroup === "true") {
  const { service, description, coachId, location, schedules, reminders, members, maxMembers, subscriptionDuration, startDate } = req.body;

  // حذف الجداول المستقبلية للحجز نفسه فقط
  booking.schedules = booking.schedules.filter(s => new Date(s.date) < today);

  const subscriptionMap = { "1day":1,"1week":7,"2weeks":14,"3weeks":21,"1month":30,"3months":90,"6months":180,"1year":365 };
  const totalDays = subscriptionMap[subscriptionDuration] || 7;
  const start = new Date(startDate);

  // فلترة كل الجداول الأخرى لتجنب conflict مع نفس الحجز
  const otherBookings = allBookings.map(b => {
    if (b._id.toString() === booking._id.toString()) {
      return { ...b._doc, schedules: [] }; // تجاهل جميع جداول هذا الحجز نفسه
    }
    return b;
  });

  const newSchedules = [];

  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    const dayOfWeek = currentDate.getDay();
    const match = schedules.find(s => s.dayOfWeek === dayOfWeek);
    if (!match) continue;

    const ts = parseTimeArabic(match.timeStart);
    const te = parseTimeArabic(match.timeEnd);
    const startDT = new Date(currentDate); startDT.setHours(ts.h, ts.m);
    const endDT = new Date(currentDate); endDT.setHours(te.h, te.m);

    const conflict = conflictExists(otherBookings, {
      coach: coachId,
      location,
      startDT,
      endDT,
      ignoreScheduleId: null,
      ignoreBookingId: null
    });

    if (conflict)
      return res.status(400).json({
        status: "error",
        message: conflict.type === "coach" ? "المدرب لديه حجز آخر في نفس الوقت" : "الغرفة محجوزة في نفس الوقت",
        conflictDate: currentDate
      });

    newSchedules.push({
      _id: new mongoose.Types.ObjectId(),
      dayOfWeek,
      timeStart: match.timeStart,
      timeEnd: match.timeEnd,
      date: currentDate,
      coach: coachId,
      location,
      reminders,
      members,
      maxMembers,
      groupId: booking.groupId
    });
  }

  booking.schedules.push(...newSchedules);
  booking.service = service ?? booking.service;
  booking.description = description ?? booking.description;
  booking.startDate = new Date(startDate);
  booking.subscriptionDuration = subscriptionDuration;
  booking.maxMembers = maxMembers;

  await booking.save();
  return res.status(200).json({ status: "success", message: "Group updated successfully", data: booking });
}


    // ================================
    // (C) تعديل بيانات booking نفسه
    // ================================
    if (req.body.service) booking.service = req.body.service;
    if (req.body.description) booking.description = req.body.description;

    await booking.save();
    return res.status(200).json({ status: "success", message: "Booking updated", data: booking });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};


//typescript//singlton and design principles
export const deleteBooking = async (req, res, next) => {
  try {
    const { user } = req;
    const role = user.role.toLowerCase();
    const { id } = req.params; // ممكن يكون bookingId أو groupId
    const { type, scheduleId } = req.query; // type=group, type=single, أو scheduleId لحذف جدول واحد

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: "error", message: "Invalid ID" });
    }

if (scheduleId) {
  const booking = await Booking.findById(id); // بدون .lean()
  if (!booking)
    return res.status(404).json({ status: "error", message: "Booking not found" });

  const schedule = booking.schedules.find(s => s._id.toString() === scheduleId);
  if (!schedule)
    return res.status(404).json({ status: "error", message: "Schedule not found" });

  // صلاحيات الكوتش
  if (role === "coach" && schedule.coach.toString() !== user._id.toString()) {
    return res.status(403).json({ status: "error", message: "Not authorized to delete this schedule" });
  }

  // حذف الميمبرز المرتبطين بالجدول
  await BookingMember.deleteMany({ booking: booking._id, schedule: schedule._id });

  // حذف الجدول نفسه
  booking.schedules = booking.schedules.filter(s => s._id.toString() !== scheduleId);
  await booking.save();

  return res.status(200).json({
    status: "success",
    message: "Schedule deleted successfully",
    data: booking
  });
}


    // ====== حذف مجموعة كاملة ======
    if (type === "group") {
      const groupBookings = await Booking.find({ groupId: id }).lean();
      if (!groupBookings.length) {
        return res.status(404).json({
          status: "error",
          message: "No bookings found for this groupId",
        });
      }

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

      await BookingMember.deleteMany({ booking: { $in: groupBookingIds } });
      const result = await Booking.deleteMany({ _id: { $in: groupBookingIds } });
      return res.status(200).json({
        status: "success",
        message: `Deleted ${result.deletedCount} bookings and all related members from the group successfully`,
      });
    }

    // ====== حذف حجز واحد ======
    else {
      const booking = await Booking.findById(id).lean();
      if (!booking) {
        return res.status(404).json({ status: "error", message: "Booking not found" });
      }

      if (role === "coach" && booking.coach.toString() !== user._id.toString()) {
        return res.status(403).json({ status: "error", message: "Not authorized to delete this booking" });
      }

      await BookingMember.deleteMany({ booking: booking._id });
      await Booking.findByIdAndDelete(booking._id);

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
