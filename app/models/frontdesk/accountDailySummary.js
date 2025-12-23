import mongoose from "mongoose";
import { createSchema } from "../base/base.js";

const accountDailySummaryFields = {
  frontdesk: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
    required: true,
  },
  date: { type: Date, required: true },

  totalAmount: { type: Number, default: 0 },

  totalCashAmount: { type: Number, default: 0 },
  totalOnlineAmount: { type: Number, default: 0 },

  totalGuestAmount: { type: Number, default: 0 },
  totalCanteenAmount: { type: Number, default: 0 },
  totalPatientAmount: { type: Number, default: 0 },

  transactionStatus: {
    type: String,
    enum: ["pending", "received", "submitted", "declined"],
    default: "pending",
  },

  patientCashAmount: { type: Number, default: 0 },
  patientOnlineAmount: { type: Number, default: 0 },

  guestCashAmount: { type: Number, default: 0 },
  guestOnlineAmount: { type: Number, default: 0 },

  canteenCashAmount: { type: Number, default: 0 },
  canteenOnlineAmount: { type: Number, default: 0 },

  cashDenominations: [
    { type: mongoose.Schema.Types.ObjectId, ref: "CashDenomination" },
  ],
  receivedAt: { type: Date },
  remarks: { type: String },

  submittedAt: { type: Date },
};

const accountDailySummarySchema = createSchema(
  accountDailySummaryFields,
  {},
  true
);

export default mongoose.model("AccountDailySummary", accountDailySummarySchema);
