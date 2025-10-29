import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  dayOfWeek: { type: Number, required: true },
  timeStart: { type: String, required: true },
  timeEnd: { type: String, required: true },
  date: { type: Date, required: true },
  coach: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  location: { type: String, required: true },
  reminders: [{ type: String }],
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],
  maxMembers: { type: Number, default: 1 },
});


const bookingSchema = new mongoose.Schema({
  service: { type: String, required: true },
  description: { type: String },
  schedules: [scheduleSchema], // كل schedule مستقل
  startDate: { type: Date, required: true },
  status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
  subscriptionDuration: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  createdAt: { type: Date, default: Date.now },
  groupId: { type: mongoose.Schema.Types.ObjectId, index: true }, // groupId للحجز كامل
});

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
