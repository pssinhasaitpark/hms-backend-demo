import mongoose from "mongoose";
import { createSchema } from "../base/base.js";

const bedSchema = createSchema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GuestRoom",
      required: true,
    },
    bedNumber: { type: String, required: true },
    isOccupied: { type: Boolean, default: false },
    occupant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      default: null,
    },
    occupiedBy: {
      type: String,
      enum: ["male", "female", null],
      default: null,
    },
  },
  {},
  true
);

export default mongoose.model("Bed", bedSchema);
