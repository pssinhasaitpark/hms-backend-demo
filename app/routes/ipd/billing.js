import express from "express";
import {
  addBillingItem,
  makePayment,
  getBillingSummary,
  addAdvancePayment,
} from "../../controllers/ipd/billing.js";
import {
  verifyToken,
  isHospitalAdmin,
  isFrontDesk,
} from "../../middlewares/jwtAuth.js";

const router = express.Router();
router.use(verifyToken, isFrontDesk);

router.post("/add", addBillingItem);

router.post("/:ipdId/pay/:itemId", makePayment);

router.post("advance/:ipdId", addAdvancePayment);

router.get("/:ipdId/summary", getBillingSummary);

export default router;
