import express from "express";
import {
  registerDoctor,
  loginDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
} from "../../controllers/admin/user/doctor.js";
import { isAdmin, verifyToken } from "../../middlewares/jwtAuth.js";
import { registerDoctorSchema } from "../../validators/doctorValidator.js";
import { validate } from "../../middlewares/validate.js";
const router = express.Router();
router.use(verifyToken, isAdmin);

router.post("/register", validate(registerDoctorSchema), registerDoctor);

router.post("/login", loginDoctor);


router.get("/", getAllDoctors);
router.get("/:id", getDoctorById);
router.put("/:id", updateDoctor);
router.delete("/:id", deleteDoctor);

export default router;
