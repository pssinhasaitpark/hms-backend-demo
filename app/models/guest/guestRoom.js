import mongoose from "mongoose";
import { createSchema } from "../base/base.js";

const roomFields = {
  roomNumber: { type: String, unique: true, required: true },
  totalBeds: { type: Number, required: true },
  // pricePerBed: { type: Number, required: true },
  availableBeds: { type: Number, required: true },
  description: String,
};

const roomSchema = createSchema(roomFields, {}, true);
export default mongoose.model("GuestRoom", roomSchema);
