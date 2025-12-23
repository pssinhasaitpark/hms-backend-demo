import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { createSchema } from "../base/base.js";
import { generateAutoId } from "../../utils/helper.js";

const staffFields = {
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  monthlySalary: { type: Number, default: 0 },
  password: { type: String, required: true, select: false },
  role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
  staffId: { type: String, unique: true, trim: true },

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
};

const staffSchema = createSchema(staffFields, {}, true);

// staffSchema.pre("save", async function (next) {
//   if (this.isModified("password")) {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//   }

//   if (!this.staffId) {
//     this.staffId = await generateAutoId("staffId", "STF");
//   }

//   next();
// });

staffSchema.pre("save", async function () {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  if (!this.staffId) {
    this.staffId = await generateAutoId("staffId", "STF");
  }
});

staffSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("Staff", staffSchema);
