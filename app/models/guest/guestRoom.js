import mongoose from "mongoose";
import { createSchema } from "../base/base.js";

const roomFields = {
  roomNumber: { type: String, unique: true },
  totalBeds: { type: Number, required: true },
  // pricePerBed: { type: Number, required: true },
  availableBeds: { type: Number, required: true },
  description: String,
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    required: true,
    index: true,
  },
};

const roomSchema = createSchema(roomFields, {}, true);
roomSchema.index({ hospital: 1, roomNumber: 1 }, { unique: true });
export default mongoose.model("GuestRoom", roomSchema);
