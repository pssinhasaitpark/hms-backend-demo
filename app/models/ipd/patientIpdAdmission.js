import mongoose from "mongoose";
import { createSchema } from "../base/base.js";
import { generateAutoId } from "../../utils/helper.js";

const patientIPDSchemaFields = {
  ipdId: { type: String, unique: true, trim: true },

  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: false,
  },

  // patientSnapshot: {
  //   patientName: String,
  //   mobile: String,
  //   aadhar: String,
  //   age: Number,
  //   gender: String,
  //   address: String,
  // },
  patientSnapshot: {
    patientName: String,
    sdwoName: String,
    dob: Date,
    age: Number,
    gender: String,

    mobile: String,
    aadhar: String,

    maritalStatus: {
      type: String,
      enum: ["SINGLE", "MARRIED", "WIDOW", "DIVORCED"],
    },
  },
  occupation: String,

  address: String,
  country: String,
  state: String,
  city: String,
  pinCode: String,

  bloodGroup: {
    type: String,
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  },

  guardian: {
    name: { type: String, required: true },
    relation: { type: String, required: true },
    mobile: { type: String, required: true },
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

  provisionalDiagnosis: {
    type: String,
    required: false,
  },

  procedureTreatment: {
    type: String,
  },

  remarks: {
    type: String,
  },

  wardType: {
    type: String,
    enum: ["GENERAL", "SEMI_PRIVATE", "PRIVATE", "ICU"],
    required: false,
  },

  admissionDate: {
    type: Date,
    default: Date.now,
  },

  dischargeDate: {
    type: Date,
    default: null,
  },

  admissionStatus: {
    type: String,
    enum: ["ADMITTED", "DISCHARGED"],
    default: "ADMITTED",
  },

  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    required: true,
  },

  ward: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ward",
    required: false,
  },

  bedNumber: {
    type: String,
    required: false,
  },
};

const patientIPDSchema = createSchema(patientIPDSchemaFields, {}, true);

patientIPDSchema.pre("save", async function () {
  if (!this.ipdId) {
    this.ipdId = await generateAutoId("ipdId", "IPD");
  }
});

export default mongoose.model("PatientIPDAdmission", patientIPDSchema);
