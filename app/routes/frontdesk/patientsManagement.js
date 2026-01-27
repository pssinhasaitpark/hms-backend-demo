import express from "express";
import {
  createOrAddVisit,
  getAllPatients,
  getAllDoctorsWithActiveServices,
  usePrepaidPackage,
  getPatientById,
  getPatientVisitsByMobileId,
  getTodayFrontdeskReport,
  getAllFees,
  getPrepaidPackagesByPatient,
  getAllPatientVisits,
  getPatientVisitById,
} from "../../controllers/frontdesk/patients.js";
import { isFrontDesk, verifyToken } from "../../middlewares/jwtAuth.js";
import { getServices } from "../../controllers/admin/departments/services.js";
import { getPackages } from "../../controllers/admin/departments/package.js";
const router = express.Router();

router.get("/services", verifyToken, getServices);

router.use(verifyToken, isFrontDesk);

router.get("/patients/details/:id", getPatientById);

router.get(
  "/patients/prepaid-packages/:patientId",
  getPrepaidPackagesByPatient
);
router.get("/patients/visits", getAllPatientVisits);

router.get("/patients/visits/:id", getPatientVisitById);

router.get("/patients/visitis/:mobileId", getPatientVisitsByMobileId);

router.get("/packages", getPackages);

router.get("/patients", getAllPatients);

router.get("/doctors", getAllDoctorsWithActiveServices);

router.get("/charges", getAllFees);

// router.use(verifyToken, isFrontDesk);

router.get("/today-report", getTodayFrontdeskReport);

router.post("/patients", createOrAddVisit);

router.post("/patients/prepaid/use", usePrepaidPackage);

export default router;
