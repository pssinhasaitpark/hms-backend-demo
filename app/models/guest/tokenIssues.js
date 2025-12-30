import mongoose from "mongoose";
import { createSchema } from "../base/base.js";
import { generateAutoId } from "../../utils/helper.js";

const issuedTokenFields = {
  tokenId: {
    type: String,
    unique: true,
    trim: true,
  },

  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TokenTemplate",
    required: true,
  },

  quantity: {
    type: Number,
    required: true,
    min: 1,
  },

  unitPrice: {
    type: Number,
    required: true,
  },

  totalAmount: {
    type: Number,
    required: true,
    default: function () {
      return this.unitPrice * this.quantity;
    },
  },

  mealType: {
    type: String,
    required: true,
  },

  issuedAt: {
    type: Date,
    default: Date.now,
  },

  remarks: {
    type: String,
    default: null,
  },
  paymentType: {
    type: String,
    required: true,
    enum: ["cash", "online"],
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    required: true, 
  },
};

const issuedTokenSchema = createSchema(issuedTokenFields, {}, true);

issuedTokenSchema.pre("save", async function () {
  if (!this.tokenId) {
    this.tokenId = await generateAutoId("tokenId", "TOKEN");
  }
  // next();
});
// issuedTokenSchema.pre("save", async function (next) {
//   if (!this.tokenId) {
//     this.tokenId = await generateAutoId("tokenId", "TOKEN");
//   }
//   next();
// });

export default mongoose.model("IssuedToken", issuedTokenSchema);
