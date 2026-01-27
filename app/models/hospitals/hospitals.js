import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { createSchema } from "../base/base.js";

const hospitalFields = {
  hospital_name: {
    type: String,
    required: true,
    trim: true,
  },

  logo: {
    type: String,
  },

  hospital_type: {
    type: String,
    enum: ["clinic", "hospital", "diagnostic_center", "nursing_home"],
    required: true,
  },

  address: {
    type: String,
    required: true,
  },

  contact_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  contact_person: {
    type: String,
    required: true,
    trim: true,
  },

  subscription_type: {
    type: String,
    enum: ["clinic_plan", "small_size_opd", "custom_plan"],
    required: true,
  },

  valid_upto: {
    type: Date,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  password: {
    type: String,
    required: true,
    select: false,
  },

  plain_password: {
    type: String,
    required: true,
    select: true,
  },

  role: {
    type: String,
    default: "hospital_admin",
    immutable: true,
    select: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
    required: true,
  },
};

const hospitalSchema = createSchema(hospitalFields, {}, true);

hospitalSchema.pre("save", async function () {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

hospitalSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("Hospital", hospitalSchema);
