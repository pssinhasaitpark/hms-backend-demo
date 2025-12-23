import mongoose from "mongoose";
import { createSchema } from "../base/base.js";

const doctorAvailabilityFields = {
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true,
  },
  dayOfWeek: {
    type: String,
    enum: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    required: true,
  },
  shifts: [
    {
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
    },
  ],
};


const doctorAvailabilitySchema = createSchema(doctorAvailabilityFields, {}, true);
doctorAvailabilitySchema.index({ doctor: 1, dayOfWeek: 1 }, { unique: true });

export default mongoose.model("DoctorAvailability", doctorAvailabilitySchema);
