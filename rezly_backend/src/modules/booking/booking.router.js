import express from "express";
import {
  getBookings,
  createBooking,
  deleteBooking,
  updateBooking,
  filterBookings,
  getBookingDetails,
  calendarView,
  cancelBooking,
} from "./booking.controller.js";
import { auth, roles } from "../../Middleware/auth.js";
import {
  createBookingSchema,
  updateBookingSchema,
  validateObjectId,
} from "./booking.validation.js";
import { validateBody } from "../../Middleware/validation.js";
import { asyncHandler } from "../../Utils/catchError.js";

const router = express.Router();

// جلب كل الحجوزات (Admin & Coach)
router.get(
  "/all_booking",
  auth([roles.Admin, roles.Coach]),
  asyncHandler(getBookings)
);

// فلترة الحجوزات (Admin, Coach, Member)
router.get(
  "/filter",
  auth([roles.Admin, roles.Coach, roles.Member]),
  asyncHandler(filterBookings)
);

// عرض الحجوزات في Calendar (Admin & Coach)
router.get(
  "/calendar",
  auth([roles.Admin, roles.Coach]),
  asyncHandler(calendarView)
);

// إنشاء حجز جديد (Admin فقط)
router.post(
  "/addBooking",
  auth([roles.Admin, roles.Coach]),
  validateBody(createBookingSchema),
  asyncHandler(createBooking)
);

router.get(
  "/:id",
  auth([roles.Admin, roles.Coach, roles.Member]),
  validateObjectId("id"),
  asyncHandler(getBookingDetails)
);

// تحديث حجز حسب ID (Admin & Coach)
router.put(
  "/:bookingId",
  auth([roles.Admin, roles.Coach]),
  validateBody(updateBookingSchema),
  asyncHandler(updateBooking)
);

// حذف حجز حسب ID (Admin فقط)
router.delete(
  "/:id",
  auth([roles.Admin]),
  validateObjectId("id"),
  asyncHandler(deleteBooking)
);
router.patch(
  "/cancel/:bookingId",
  auth([roles.Admin, roles.Coach]),
  asyncHandler(cancelBooking)
);
export default router;
