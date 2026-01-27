import mongoose from "mongoose";
import { createSchema } from "../base/base.js";

const bedSchema = new mongoose.Schema({
  bedNumber: { type: String, required: true },
  status: {
    type: String,
    enum: ["AVAILABLE", "OCCUPIED"],
    default: "AVAILABLE",
  },
});


const wardSchemaFields = {
  wardName: { type: String, required: true, unique: true },
  wardType: {   
    type: String,
    enum: ["GENERAL", "SEMI_PRIVATE", "PRIVATE", "ICU"],
    required: true,
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    required: true,
  },
  beds: [bedSchema], 
};

const wardSchema = createSchema(wardSchemaFields, {}, true);

export default mongoose.model("Ward", wardSchema);
