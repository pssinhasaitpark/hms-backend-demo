import mongoose from "mongoose";
import { createSchema } from "../base/base.js";

const emrSchemaFields = {
  visit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PatientVisitRecords",
    unique: true,
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    index: true,
  },

  encounterType: { type: String, enum: ["OPD", "IPD"], default: "OPD" },

  latestVitalsSnapshot: {
    height: Number,
    weight: Number,
    pulse: Number,
    spo2: Number,
    temperature: Number,
    recordedAt: Date,
  },

  investigations: [
    {
      testName: String,
      department: String,
      status: {
        type: String,
        enum: ["ORDERED", "SAMPLE_COLLECTED", "COMPLETED"],
      },
      result: String,
      updatedAt: Date,
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
  ],

  diagnosis: [String],

  prescription: [
    {
      medicine: String,
      dosage: String,
      frequency: String,
      duration: String,
    },
  ],

  clinicalNotes: String,

  audit: [
    {
      section: {
        type: String,
        enum: ["EMR", "VITALS", "LAB", "DOCTOR"],
      },

      action: String,
      user: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
      at: { type: Date, default: Date.now },
    },
  ],

  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    index: true,
  },
};

const emrSchema = createSchema(emrSchemaFields, {}, true);

export default mongoose.model("EMR", emrSchema);
