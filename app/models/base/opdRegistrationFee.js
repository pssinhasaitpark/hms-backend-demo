import mongoose from "mongoose";
import { createSchema } from "../base/base.js";

const opdRegistrationFeeFields = {
  registrationFee: {
    type: Number,
    required: true,
    default: 50,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
};

const opdRegistrationFeeSchema = createSchema(
  opdRegistrationFeeFields,
  {},
  true
);

opdRegistrationFeeSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("OpdRegistrationFee", opdRegistrationFeeSchema);
