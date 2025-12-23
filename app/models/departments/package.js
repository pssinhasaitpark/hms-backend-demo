import mongoose from "mongoose";
import { createSchema } from "../base/base.js";
import { generateAutoId } from "../../utils/helper.js";

const packageFields = {
  packageId: { type: String, unique: true, trim: true },
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true },
  noOfDays: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  expireOn: { type: Number, trim: true },
  services: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true,
  },
};

const packageSchema = createSchema(packageFields, {}, true);

packageSchema.pre("save", async function () {
  if (!this.packageId) {
    this.packageId = await generateAutoId("packageId", "PAC");
  }
  // next();
});
// packageSchema.pre("save", async function (next) {
//   if (!this.packageId) {
//     this.packageId = await generateAutoId("packageId", "PAC");
//   }
//   next();
// });

export default mongoose.model("Package", packageSchema);
