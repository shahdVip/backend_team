import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, required: true },
    timeStart: { type: String, required: true },
    timeEnd: { type: String, required: true },
    date: { type: Date, required: true }, // <-- هنا أضفنا التاريخ الفعلي
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema({
  service: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  coach: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },

  location: {
    type: String,
    required: true,
  },
  schedules: [scheduleSchema], // Array of schedules
  startDate: { type: Date, required: true }, // إضافة startDate

  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled"],
    default: "pending",
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  maxMembers: {
    type: Number,
    default: 1,
  },
  reminders: [{ type: String }],
  subscriptionDuration: { type: String },
  groupId: {
    type: String,
    index: true, // لتحسين البحث
  },
});

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
