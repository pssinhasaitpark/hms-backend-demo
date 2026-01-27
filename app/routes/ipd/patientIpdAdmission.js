import express from "express";
const router = express.Router();
import { isFrontDesk, verifyToken } from "../../middlewares/jwtAuth.js";
import {
  admitIPDPatient,
  getAllIPDAdmissions,
  getIPDByIPDId,
  getIPDByPatientId,
} from "../../controllers/ipd/patientIpdAdmission.js";
import { getAllWards } from "../../controllers/ipd/ward.js";
router.use(verifyToken, isFrontDesk);

router.post("/patients/admit", admitIPDPatient);
router.get("/patients", getAllIPDAdmissions);
router.get("/wards", getAllWards);
router.get("/patients/:patientId", getIPDByPatientId);
router.get("/:ipdId", getIPDByIPDId);

export default router;
