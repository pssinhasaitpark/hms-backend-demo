import mongoose from "mongoose";
import { createSchema } from "../base/base.js";

const vitalsSchemaFields = {
  visit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PatientVisitRecords",
    required: true,
    index: true,
  },

  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true,
    index: true,
  },

  encounterType: {
    type: String,
    enum: ["OPD", "IPD"],
    default: "OPD",
    index: true,
  },

  height: Number,
  weight: Number,

  pulse: Number,
  spo2: Number,
  temperature: Number,

  recordedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },

  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
    required: true,
  },

  source: {
    type: String,
    enum: ["NURSE", "DOCTOR", "DEVICE"],
    default: "NURSE",
  },

  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    required: true,
    index: true,
  },
};

const vitalsSchema = createSchema(vitalsSchemaFields, {}, true);

export default mongoose.model("Vitals", vitalsSchema);
