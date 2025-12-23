import mongoose from "mongoose";
import { createSchema } from "../base/base.js";
import { generateAutoId } from "../../utils/helper.js";

const invoiceFields = {
  invoiceId: { type: String, unique: true, trim: true },
  transactionId: { type: String, unique: true, trim: true },

  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true,
  },
  prepaidPackage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PrepaidPackage",
  },

  items: [
    {
      service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
      quantity: { type: Number, default: 1 },
      unitPrice: { type: Number, required: true },
      totalPrice: { type: Number, required: true },
    },
  ],

  registrationFee: { type: Number, default: 0 },
  opdCharge: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },

  paymentType: { type: String, enum: ["CASH", "ONLINE"], required: true },

  status: {
    type: String,
    enum: ["PAID", "PENDING", "REFUNDED"],
    default: "PAID",
  },

  patientType: {
    type: String,
    enum: ["NEW", "FOLLOWUP", "PREPAID", "REGULAR"],
    required: true,
  },

  issuedAt: { type: Date, default: Date.now },
};

const invoiceSchema = createSchema(invoiceFields, {}, true);

invoiceSchema.pre("save", async function () {
  if (!this.invoiceId) {
    this.invoiceId = await generateAutoId("invoiceId", "INV");
  }
  if (!this.transactionId) {
    this.transactionId = await generateAutoId("transactionId", "TXN");
  }
  // next();
});
// invoiceSchema.pre("save", async function (next) {
//   if (!this.invoiceId) {
//     this.invoiceId = await generateAutoId("invoiceId", "INV");
//   }
//   if (!this.transactionId) {
//     this.transactionId = await generateAutoId("transactionId", "TXN");
//   }
//   next();
// });

export default mongoose.model("Invoice", invoiceSchema);
