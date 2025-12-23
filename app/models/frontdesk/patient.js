import mongoose from "mongoose";
import { createSchema } from "../base/base.js";
import { generateAutoId } from "../../utils/helper.js";

const patientFields = {
  patientId: { type: String, unique: true, trim: true },

  patientName: { type: String, required: true, trim: true },

  mobile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MobileNumber",
  },

  address: { type: String, trim: true },

  gender: { type: String, enum: ["Male", "Female", "Other"] },

  age: { type: Number },

  aadhar: {
    type: String,
    trim: true,
    sparse: true,
    default: null,
  },

  samagra: {
    type: String,
    trim: true,
    sparse: true,
    default: null,
  },

  ayushman: {
    type: String,
    trim: true,
    sparse: true,
    default: null,
  },

  currentPatientType: {
    type: String,
    enum: ["NEW", "FOLLOWUP", "PREPAID", "REGULAR"],
    default: "NEW",
  },
  visitCount: { type: Number, default: 0 },
  lastDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    default: null,
  },

  lastVisitDate: {
    type: Date,
    default: null,
  },
};

const patientSchema = createSchema(patientFields, {}, true);

patientSchema.pre("save", async function () {
  if (!this.patientId) {
    this.patientId = await generateAutoId("patientId", "PAT");
  }
  // next();
});
// patientSchema.pre("save", async function (next) {
//   if (!this.patientId) {
//     this.patientId = await generateAutoId("patientId", "PAT");
//   }
//   next();
// });

export default mongoose.model("Patient", patientSchema);
