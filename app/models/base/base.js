import mongoose from "mongoose";


export const baseFields = {
  status: {
    type: String,
    enum: ["ACTIVE", "INACTIVE", "DELETED"],
    default: "active",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
    required: false,
  },
};


export const createSchema = (fields, options = {}, includeCreatedBy = true) => {
  const base = {
    status: { type: String, enum: ["active", "inactive", "deleted"], default: "active" },
    ...(includeCreatedBy
      ? { createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" } }
      : {}),
  };

  return new mongoose.Schema({ ...fields, ...base }, { timestamps: true, ...options });
};
