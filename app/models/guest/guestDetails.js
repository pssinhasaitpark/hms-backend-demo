import mongoose from "mongoose";
import { createSchema } from "../base/base.js";

const guestFields = {
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  age: { type: Number, required: true },
  aadhar_no: { type: String, required: true },
  gender: {
    type: String,
    enum: ["male", "female", "other"],
    required: true,
  },
  address: { type: String, required: true },
  referredBy: { type: String },
  numberOfPeople: { type: Number },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GuestRoom",
    required: false,
  },
  totalBedsBooked: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  reservationStatus: {
    type: String,
    enum: ["booked", "checked-in", "checked-out"],
    default: "booked",
  },
  paymentType: {
    type: String,
    enum: ["cash", "online"],
    required: true,
  },
  beds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bed",
      required: true,
    },
  ],
  role: {
    type: String,
    enum: ["patient", "attendant"],
    required: true,
  },

  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GuestPatient",
    required: true,
  },

  additionalPersons: [
    {
      name: { type: String, required: true },
      age: { type: Number, required: true },
      aadhar_no: { type: String, required: true },
      gender: {
        type: String,
        enum: ["male", "female", "other"],
        required: true,
      },
      bed: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Bed",
        required: false,
      },

      role: {
        type: String,
        enum: ["attendant"],
        default: "attendant",
      },
    },
  ],

  checkoutTime: { type: Date },
  checkinTime: { type: Date },
  uploadedFiles: [String], 
};

const guestSchema = createSchema(guestFields, {}, true);
export default mongoose.model("Guest", guestSchema);
