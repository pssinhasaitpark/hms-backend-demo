import mongoose from "mongoose";
import { createSchema } from "../base/base.js";
import { generateAutoId } from "../../utils/helper.js";

const prepaidPackageFields = {
  packageId: { type: String, unique: true, trim: true },

  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true,
  },

  totalVisits: { type: Number, required: true },
  usedVisits: { type: Number, default: 0 },
  totalFee: { type: Number, required: true },

  paymentType: {
    type: String,
    enum: ["CASH", "ONLINE"],
    required: true,
  },

  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true,
  },

  doctorSnapshot: {
    doctorName: { type: String },
    specialization: { type: String },
    departmentName: { type: String },
  },

  startDate: { type: Date, default: Date.now },

  package: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Package",
    required: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
  },

  isFullyUsed: { type: Boolean, default: false },
  expireOn: { type: Date },
};

const prepaidPackageSchema = createSchema(prepaidPackageFields, {}, true);

// Hook to calculate expireOn and fully used
prepaidPackageSchema.pre("save", async function () {
  // Generate packageId if not exists
  if (!this.packageId) {
    this.packageId = await generateAutoId("packageId", "PPK");
  }

  if (!this.expireOn && this.package) {
    const pkg = await mongoose.model("Package").findById(this.package);
    if (pkg && pkg.noOfDays) {
      this.expireOn = new Date(
        this.startDate.getTime() + pkg.noOfDays * 24 * 60 * 60 * 1000
      );
    }
  }

  // Update isFullyUsed
  if (this.usedVisits >= this.totalVisits) {
    this.isFullyUsed = true;
  } else {
    this.isFullyUsed = false;
  }

  // next();
});
// prepaidPackageSchema.pre("save", async function (next) {
//   // Generate packageId if not exists
//   if (!this.packageId) {
//     this.packageId = await generateAutoId("packageId", "PPK");
//   }

//   if (!this.expireOn && this.package) {
//     const pkg = await mongoose.model("Package").findById(this.package);
//     if (pkg && pkg.noOfDays) {
//       this.expireOn = new Date(
//         this.startDate.getTime() + pkg.noOfDays * 24 * 60 * 60 * 1000
//       );
//     }
//   }

//   // Update isFullyUsed
//   if (this.usedVisits >= this.totalVisits) {
//     this.isFullyUsed = true;
//   } else {
//     this.isFullyUsed = false;
//   }

//   next();
// });

export default mongoose.model("PrepaidPackage", prepaidPackageSchema);
