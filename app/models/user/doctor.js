import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { createSchema } from "../base/base.js";
import { generateAutoId } from "../../utils/helper.js";

const doctorFields = {
  doctorId: { type: String, unique: true, trim: true },
  doctorName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  password: { type: String, default: null },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true,
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    required: true,
  },

  qualification: { type: String, trim: true },

  visitChargePerDay: { type: Number, default: 0 },
  fixedCharge: { type: Number, default: 0 },

  lastLogin: { type: Date },
  isAvailable: { type: Boolean, default: false },
};

const doctorSchema = createSchema(doctorFields, {}, true);
doctorSchema.index({ hospital: 1, phone: 1 }, { unique: true });

doctorSchema.pre("save", async function () {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  if (!this.doctorId) {
    this.doctorId = await generateAutoId("doctorId", "DOC");
  }

  // next();
});
// doctorSchema.pre("save", async function (next) {
//   if (this.isModified("password")) {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//   }

//   if (!this.doctorId) {
//     this.doctorId = await generateAutoId("doctorId", "DOC");
//   }

//   next();
// });

doctorSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("Doctor", doctorSchema);
