import mongoose from "mongoose";
import { createSchema } from "../base/base.js";
import { generateAutoId } from "../../utils/helper.js";

const serviceFields = {
  serviceId: { type: String, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  charge: { type: Number, required: true, min: 0 },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
    required: true,
  },

  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    required: true,
    index: true,
  },
};

const serviceSchema = createSchema(serviceFields, {}, true);

serviceSchema.pre("save", async function () {
  if (!this.serviceId) {
    this.serviceId = await generateAutoId("serviceId", "SER");
  }
  // next();
});
// serviceSchema.pre("save", async function (next) {
//   if (!this.serviceId) {
//     this.serviceId = await generateAutoId("serviceId", "SER");
//   }
//   next();
// });

export default mongoose.model("Service", serviceSchema);
