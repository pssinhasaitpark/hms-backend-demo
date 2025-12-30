import express from "express";
import {
  getAllAccountSummaries,
  getAccountDetailsByFrontdesk,
  getMonthlyAttendance,
  getAllDoctors,
  submitCashDenominations,
  getCashDenomination,
  updateTransactionStatus,
  getAccountSummaryStatus,
} from "../../controllers/accounts/accountDailySummary.js";
import { verifyToken } from "../../middlewares/jwtAuth.js";

const router = express.Router();

router.get("/summaries", verifyToken, getAllAccountSummaries);

router.get(
  "/account-summary/status/:summaryId",
  verifyToken,
  getAccountSummaryStatus
);

router.get("/doctors/attendance/:doctorId", verifyToken, getMonthlyAttendance);

router.get("/doctors", verifyToken, getAllDoctors);

router.get("/details", verifyToken, getAccountDetailsByFrontdesk);

router.get("/cash-denomination/:summaryId", verifyToken, getCashDenomination);

router.patch(
  "/account-summary/:id/update-status",
  verifyToken,
  updateTransactionStatus
);

router.post("/cash", verifyToken, submitCashDenominations);

export default router;
