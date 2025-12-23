import mongoose from "mongoose";
import { createSchema } from "../base/base.js";

const roleFields = {
  name: {
    type: String,
    required: true,
    // unique: true,
    uppercase: true,
    trim: true,
  },
  description: { type: String, trim: true },
  permissions: [{ type: String }],
};

const roleSchema = createSchema(roleFields, {}, true);

export default mongoose.model("Role", roleSchema);
