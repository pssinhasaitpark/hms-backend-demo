import mongoose from "mongoose";

const doctorAttendanceSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },

    date: {
      type: String,
      required: true,
    },

    checkInTime: { type: Date, default: null },
    checkOutTime: { type: Date, default: null },

    status: {
      type: String,
      enum: ["present", "absent"],
      default: "absent",
    },
  },
  { timestamps: true }
);

doctorAttendanceSchema.index({ doctor: 1, date: 1 }, { unique: true });

export default mongoose.model("DoctorAttendance", doctorAttendanceSchema);
