import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["ADVANCE", "BILLING_ITEM"],
      required: true,
    },
    ipdBilling: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatientIPDBilling",
      required: true,
    },
    billingItem: {
      type: mongoose.Schema.Types.ObjectId,
    },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
    paymentMode: {
      type: String,
      enum: ["CASH", "CARD", "ONLINE", "CHEQUE"],
      default: "CASH",
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
    paidAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("IPDTransaction", transactionSchema);
