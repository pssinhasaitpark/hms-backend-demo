import mongoose from "mongoose";
import { createSchema } from "../base/base.js";

const doctorServiceFields = {
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true,
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: true,
  },
};

const doctorServiceSchema = createSchema(doctorServiceFields, {}, true);

export default mongoose.model("DoctorService", doctorServiceSchema);
