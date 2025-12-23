import mongoose from "mongoose";
import { createSchema } from "../base/base.js";

const mobileNumberFields = {
  phone: { type: String, unique: true, required: true, trim: true },
  registeredAt: { type: Date, default: Date.now },
};

const mobileNumberSchema = createSchema(mobileNumberFields, {}, true);

export default mongoose.model("MobileNumber", mobileNumberSchema);
