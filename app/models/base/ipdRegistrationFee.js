import mongoose from "mongoose";
import { createSchema } from "../base/base.js";

const ipdRegistrationFeeFields = {
  ipdRegistrationFee: {
    type: Number,
    required: true,
    default: 50,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    required: true,
    unique: true,
  },
};

const ipdRegistrationFeeSchema = createSchema(
  ipdRegistrationFeeFields,
  {},
  true
);

// old
// registrationFeeSchema.pre("save", function () {
//   this.updatedAt = Date.now();
//   next();
// });

// 12 Dec 2025
ipdRegistrationFeeSchema.pre("save", async function () {
  this.updatedAt = Date.now();
});

export default mongoose.model("ipdRegistrationFee", ipdRegistrationFeeSchema);
