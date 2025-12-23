import express from "express";
import { isAdmin, verifyToken } from "../../middlewares/jwtAuth.js";
import {
    getFrontdeskAccountSummary,
  getFrontdeskSummaryForDenomination,
  getTotalRevenueForAdmin,
} from "../../controllers/reports/reports.js";

const router = express.Router();

router.get("/admin/revenue", verifyToken, isAdmin, getTotalRevenueForAdmin);

router.get(
  "/frontdesk/today/collection",
  verifyToken,
  getFrontdeskSummaryForDenomination
);

router.get(
  "/frontdesk/account-summaries",
  verifyToken,
  getFrontdeskAccountSummary
);

export default router;
