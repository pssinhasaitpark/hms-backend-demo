import mongoose from "mongoose";
import { createSchema } from "../base/base.js";

const tokenTemplateFields = {
  mealType: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },

  validFrom: {
    type: String,
    required: true,
  },

  validTo: {
    type: String,
    required: true,
  },
  remarks: {
    type: String,
    default: null,
  },

  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    required: true,
    index: true,
  },
};

const tokenTemplateSchema = createSchema(tokenTemplateFields, {}, true);
tokenTemplateSchema.index({ hospital: 1, mealType: 1 }, { unique: true });

export default mongoose.model("TokenTemplate", tokenTemplateSchema);
