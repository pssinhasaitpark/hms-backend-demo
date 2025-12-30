import express from "express";
import { isAdmin, isHospitalAdmin, isSuperAdmin, verifyToken } from "../../middlewares/jwtAuth.js";
import {
    getFrontdeskAccountSummary,
  getFrontdeskSummaryForDenomination,
  getTotalRevenueForAdmin,
  superAdminDashboardReport,
} from "../../controllers/reports/reports.js";

const router = express.Router();

router.get("/admin/revenue", verifyToken, isHospitalAdmin, getTotalRevenueForAdmin);
router.get("/super-admin/dashboard", verifyToken, isSuperAdmin, superAdminDashboardReport);

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
