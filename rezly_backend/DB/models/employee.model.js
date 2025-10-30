import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    birthDate: { type: Date, required: true },
    image: {
      data: { type: Buffer, required: false },
      iv: { type: String, required: false },
      mimetype: { type: String, required: false },
    },
    nationalId: { type: String, required: true, unique: true },
    gender: { type: String, enum: ["ذكر", "أنثى"], required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    jobTitle: { type: String, required: true },
    department: { type: String, required: true },
    contractType: {
      type: String,
      enum: ["كامل", "جزئي", "مؤقت"],
      required: true,
    }, // نوع العقد
    startDate: { type: Date, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["Admin", "Coach", "Accountant", "Receptionist"],
      required: true,
    },
    notes: { type: String },
    confirmEmail: { type: Boolean, default: false },
    refreshToken: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Employee = mongoose.model("employee", employeeSchema);
