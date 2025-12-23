import mongoose from "mongoose";
import { createSchema } from "../base/base.js";
import { generateAutoId } from "../../utils/helper.js";

const departmentFields = {
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true },
  departmentId: { type: String, unique: true, trim: true },
  services: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
  opdCharge: { type: Number, default: 0 },   
};

const departmentSchema = createSchema(departmentFields, {}, true);

departmentSchema.pre("save", async function () {
  if (!this.departmentId) {
    this.departmentId = await generateAutoId("departmentId", "DEPT");
  }
  // next();
});

// departmentSchema.pre("save", async function (next) {
//   if (!this.departmentId) {
//     this.departmentId = await generateAutoId("departmentId", "DEPT");
//   }
//   next();
// });

export default mongoose.model("Department", departmentSchema);
