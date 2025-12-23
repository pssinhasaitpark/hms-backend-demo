import express from "express";
import { exportAccountSummariesExcel, exportPatientsExcel } from "../../controllers/exporter/exporter.js";
import { isAdmin, verifyToken } from "../../middlewares/jwtAuth.js";

const router = express.Router();

router.get("/patients", exportPatientsExcel);

router.get("/accounts", exportAccountSummariesExcel);

export default router;
