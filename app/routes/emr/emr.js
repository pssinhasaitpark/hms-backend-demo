import express from "express";
import {
  getAllEMRs,
  getEMRsByPatient,
  getEMRByVisit,
  addVitals,
} from "../../controllers/emr/emr.js";
import { isFrontDesk, verifyToken } from "../../middlewares/jwtAuth.js";

const router = express.Router();

router.post("/vitals", verifyToken, addVitals);

router.use(verifyToken, isFrontDesk);

router.get("/", getAllEMRs);
router.get("/patient/:patientId", getEMRsByPatient);
router.get("/visit/:visitId", getEMRByVisit);

export default router;
