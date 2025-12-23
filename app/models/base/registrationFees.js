import mongoose from "mongoose";
import { createSchema } from "../base/base.js";

const registrationFeeFields = {
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

const registrationFeeSchema = createSchema(
    registrationFeeFields,
  {},
  true
);

// old
// registrationFeeSchema.pre("save", function () {
//   this.updatedAt = Date.now();
//   next();
// });

// 12 Dec 2025
registrationFeeSchema.pre("save", async function () {
  this.updatedAt = Date.now();
});


export default mongoose.model("registrationFee", registrationFeeSchema);
