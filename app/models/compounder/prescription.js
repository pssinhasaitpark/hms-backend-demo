import mongoose from "mongoose";
import { createSchema } from "../base/base.js";
import { generateAutoId } from "../../utils/helper.js";

const prescriptionFields = {
  prescriptionId: { type: String, unique: true, trim: true },

  compounder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Compounder",
    required: true,
  },

  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true,
  },

  prescriptionNotes: {
    type: String,
    trim: true,
  },

  prescriptionFile: {
    type: [String], 
    trim: true,
    required: false,
  },

  createdDate: {
    type: Date,
    default: Date.now,
  },
};

const prescriptionSchema = createSchema(prescriptionFields, {}, true);

prescriptionSchema.pre("save", async function () {
  if (!this.prescriptionId) {
    this.prescriptionId = await generateAutoId(
      "prescriptionId",
      "PRISCRIPTION"
    );
  }
  // next();
});
// prescriptionSchema.pre("save", async function (next) {
//   if (!this.prescriptionId) {
//     this.prescriptionId = await generateAutoId(
//       "prescriptionId",
//       "PRISCRIPTION"
//     );
//   }
//   next();
// });

export default mongoose.model("Prescription", prescriptionSchema);
