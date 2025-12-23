import mongoose from "mongoose";
import { createSchema } from "../base/base.js";

const prepaidServiceUsageFields = {
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true,
  },

  prepaidPackage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PrepaidPackage",
    required: true,
  },

  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true,
  },

  servicesUsed: [
    {
      service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true,
      },
      quantity: { type: Number, default: 1 },
    },
  ],

  visitDate: { type: Date, default: Date.now },
  notes: { type: String },
};

const prepaidServiceUsageSchema = createSchema(
  prepaidServiceUsageFields,
  {},
  true
);

export default mongoose.model("PrepaidServiceUsage", prepaidServiceUsageSchema);
