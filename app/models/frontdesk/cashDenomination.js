import mongoose from "mongoose";
import { createSchema } from "../base/base.js";

const cashDenominationFields = {
  frontdesk: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
    required: true,
  },
  date: { type: Date, required: true },

  // Cash Notes
  note500: { type: Number, default: 0 },
  note200: { type: Number, default: 0 },
  note100: { type: Number, default: 0 },
  note50: { type: Number, default: 0 },
  note20: { type: Number, default: 0 },
  note10: { type: Number, default: 0 },

  // Coins
  coin10: { type: Number, default: 0 },
  coin5: { type: Number, default: 0 },
  coin2: { type: Number, default: 0 },
  coin1: { type: Number, default: 0 },

  // New: Separate category amounts
  pattienAmount: {
    cash: { type: Number, default: 0 },
    online: { type: Number, default: 0 },
  },
  guestAmount: {
    cash: { type: Number, default: 0 },
    online: { type: Number, default: 0 },
  },
  canteenAmount: {
    cash: { type: Number, default: 0 },
    online: { type: Number, default: 0 },
  },

  // Totals
  cashAmount: {
    type: Number,
    default: function () {
      return (
        this.note500 * 500 +
        this.note200 * 200 +
        this.note100 * 100 +
        this.note50 * 50 +
        this.note20 * 20 +
        this.note10 * 10 +
        this.coin10 * 10 +
        this.coin5 * 5 +
        this.coin2 * 2 +
        this.coin1 * 1
      );
    },
  },
  onlineAmount: {
    type: Number,
    default: 0,
    // default: function () {
    //   return (
    //     this.pattienAmount.online +
    //     this.guestAmount.online +
    //     this.canteenAmount.online
    //   );
    // },
  },
  totalAmount: {
    type: Number,
    default: function () {
      return (
        this.cashAmount +
        this.pattienAmount.online +
        this.guestAmount.online +
        this.canteenAmount.online
      );
    },
  },
};

const cashDenominationSchema = createSchema(cashDenominationFields, {}, true);

export default mongoose.model("CashDenomination", cashDenominationSchema);
