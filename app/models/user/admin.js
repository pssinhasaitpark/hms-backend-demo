import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { createSchema } from "../base/base.js";
import { generateAutoId } from "../../utils/helper.js";

const adminFields = {
  name: {
    type: String,
    required: true,
    trim: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  password: {
    type: String,
    required: true,
    select: false,
  },
  adminId: {
    type: String,
    unique: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ["SUPER_ADMIN"],
  },
  profile_image: {
    type: String,
    trim: true,
    default: null,
  },
  lastLogin: {
    type: Date,
  },
};

const adminSchema = createSchema(adminFields, {}, true);

adminSchema.pre("save", async function () {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  if (!this.adminId) {
    this.adminId = await generateAutoId("adminId", "ADM");
  }
});

adminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("Admin", adminSchema);
