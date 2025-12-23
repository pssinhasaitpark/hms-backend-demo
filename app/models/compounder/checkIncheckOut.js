import mongoose from "mongoose";

// CheckInCheckout schema definition
const checkInCheckoutSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    compounder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Compounder",
      required: true,
    },
    checkInTime: {
      type: Date,
      required: true,
    },
    checkOutTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['CheckedIn', 'CheckedOut'],
      default: 'CheckedIn',
    },
  },
  { timestamps: true }
);


checkInCheckoutSchema.methods.checkOut = function () {
  this.checkOutTime = new Date();
  this.status = 'CheckedOut';
  return this.save();
};


export default mongoose.model("CheckInCheckout", checkInCheckoutSchema);
