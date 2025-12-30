import mongoose from "mongoose";
import { createSchema } from "../base/base.js";

const roleFields = {
  name: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  description: { type: String, trim: true },
  permissions: [{ type: String }],
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    required: true,
  },
};

const roleSchema = createSchema(roleFields, {});
roleSchema.index({ hospital: 1, name: 1 }, { unique: true });

export default mongoose.model("Role", roleSchema);
