import express from "express";
import {
  getAllDoctorsWithActiveServices,
  getPatientById,
  getPatientVisitsByMobileId,
  getAllPatientsForAdmin,
  updatePatientDetails,
  getAllPatients,
} from "../../controllers/frontdesk/patients.js";
import {
  verifyToken,
  isAdmin,
  isHospitalAdmin,
} from "../../middlewares/jwtAuth.js";
const router = express.Router();
router.use(verifyToken, isHospitalAdmin);

router.get("/details/:id", getPatientById);

router.get("/visitis/:mobileId", getPatientVisitsByMobileId);

router.get("/", getAllPatientsForAdmin);

router.get("/doctors", getAllDoctorsWithActiveServices);

router.put("/:id/update-details", updatePatientDetails);

export default router;
