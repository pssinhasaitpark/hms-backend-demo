import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { createSchema } from "../base/base.js";
import { generateAutoId } from "../../utils/helper.js";

const compounderFields = {
  name: { type: String, required: true, trim: true },

  phone: { type: String, required: true, unique: true, trim: true },
  monthlySalary: { type: Number, default: 0 },
  password: { type: String, required: true, select: false },
  role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
  compounderId: { type: String, unique: true, trim: true },
  lastLogin: { type: Date },

  weekOffDay: {
    type: String,
    enum: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    default: "Sunday",
  },

  doctors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Doctor" }],
  departments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Department" }],
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    required: true,
    index: true,
  },
};

const compounderSchema = createSchema(compounderFields, {}, true);

compounderSchema.pre("save", async function () {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  if (!this.compounderId) {
    this.compounderId = await generateAutoId("compounderId", "CMP");
  }

  // next();
});
// compounderSchema.pre("save", async function (next) {
//   if (this.isModified("password")) {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//   }

//   if (!this.compounderId) {
//     this.compounderId = await generateAutoId("compounderId", "CMP");
//   }

//   next();
// });

compounderSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("Compounder", compounderSchema);
