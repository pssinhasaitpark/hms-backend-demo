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

router.use(verifyToken, isCompounder);

router.get("/doctors", getAssignedDoctors);

router.post(
  "/doctors/checkin/:doctorId",
  checkInDoctor
);
router.post(
  "/doctors/checkout/:doctorId",
  checkOutDoctor
);

router.put(
  "/patients/appointment/status/:patientId",
  updatePatientAppointmentStatus
);

router.get("/patients/appointment/completed", getCompletedPatients);

router.get(
  "/patients/assigned/all",
  getCompounderAssignedPatients
);

router.get("/patients", getPatientsByDoctorAndDate);

router.get("/patients/:patientId/details", getPatientDetails);

export default router;
