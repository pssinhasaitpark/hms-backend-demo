import mongoose from "mongoose";
import { createSchema } from "../base/base.js";
import { generateAutoId } from "../../utils/helper.js";

const patientVisitRecordsSchemaFields = {
  visitId: { type: String, unique: true, trim: true },

  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true,
  },

  patientSnapshot: {
    patientName: { type: String, required: true },
    mobile: { type: String, required: true },
    aadhar: { type: String },
    samagra: { type: String },
    ayushman: { type: String },
    address: { type: String },
    gender: { type: String },
    age: { type: String },
  },

  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true,
  },

  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true,
  },

  service: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
    },
  ],

  doctorSnapshot: {
    doctorName: String,
    specialization: String,
  },

  departmentSnapshot: {
    departmentName: String,
  },

  serviceSnapshot: [
    {
      serviceName: String,
      servicePrice: Number,
    },
  ],

  registrationFee: { type: Number, default: 50 },
  opdCharge: { type: Number, default: 50 },
  serviceCharge: { type: Number, default: 0 },
  totalFee: { type: Number, required: true },

  paymentType: {
    type: String,
    enum: ["CASH", "ONLINE"],
    default: "CASH",
  },

  visitDate: { type: Date, default: Date.now },
  notes: { type: String },

  appointmentStatus: {
    type: String,
    enum: ["PENDING", "ONGOING", "COMPLETED"],
    default: "PENDING",
  },

  patientType: {
    type: String,
    enum: ["NEW", "FOLLOWUP", "PREPAID", "REGULAR"],
    required: true,
  },
  opdPaid: { type: Boolean, default: true },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    required: true,
  },
};

const patientVisitRecordsSchema = createSchema(
  patientVisitRecordsSchemaFields,
  {},
  true
);

patientVisitRecordsSchema.pre("save", async function () {
  if (!this.visitId) {
    this.visitId = await generateAutoId("visitId", "PAT_VISIT");
  }
  // next();
});
// patientVisitRecordsSchema.pre("save", async function (next) {
//   if (!this.visitId) {
//     this.visitId = await generateAutoId("visitId", "PAT_VISIT");
//   }
//   next();
// });

export default mongoose.model("PatientVisitRecords", patientVisitRecordsSchema);
