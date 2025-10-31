import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    role: { type: String, enum: ["User", "Employee"], required: true },
    date: { type: String, required: true }, // مثلاً "2025-10-29"
    checkIn: { type: Date },
    checkOut: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Attendance", attendanceSchema);
