import express from "express";
import {
  checkInDoctor,
  checkOutDoctor,
  getAssignedDoctors,
  getPatientDetails,
  getPatientsByDoctorAndDate,
  getCompounderAssignedPatients,
} from "../../controllers/compounder/doctorManagement.js";
import {
  getCompletedPatients,
  updatePatientAppointmentStatus,
} from "../../controllers/compounder/patientAppointment.js";
import { isCompounder, verifyToken } from "../../middlewares/jwtAuth.js";

const router = express.Router();

router.get("/doctors", verifyToken, isCompounder, getAssignedDoctors);

router.post(
  "/doctors/checkin/:doctorId",
  verifyToken,
  isCompounder,
  checkInDoctor
);
router.post(
  "/doctors/checkout/:doctorId",
  verifyToken,
  isCompounder,
  checkOutDoctor
);

router.put(
  "/patients/appointment/status/:patientId",
  verifyToken,
  updatePatientAppointmentStatus
);

router.get("/patients/appointment/completed", getCompletedPatients);

router.get(
  "/patients/assigned/all",
  verifyToken,
  isCompounder,
  getCompounderAssignedPatients
);

router.get("/patients", getPatientsByDoctorAndDate);

router.get("/patients/:patientId/details", getPatientDetails);

export default router;
