import mongoose from "mongoose";
import { createSchema } from "../base/base.js";

const billingItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ["ROOM", "LAB", "MEDICINE", "PROCEDURE", "MISC"],
    required: true,
  },
  amount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ["PENDING", "PARTIAL", "PAID"],
    default: "PENDING",
  },
  date: { type: Date, default: Date.now },
});

const patientIPDBillingSchemaFields = {
  ipdAdmission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PatientIPDAdmission",
    required: true,
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    required: true,
  },
  advancePayment: {
    type: Number,
    default: 0,
  },
  billingItems: [billingItemSchema],
  transactions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IPDTransaction",
    },
  ],
  paidAt: { type: Date }, 
};

const patientIPDBillingSchema = createSchema(
  patientIPDBillingSchemaFields,
  {},
  true
);

export default mongoose.model("PatientIPDBilling", patientIPDBillingSchema);
