import express from "express";
import {
  createHospital,
  deleteHospital,
  getHospitalById,
  getHospitals,
  updateHospital,
  hospitalLogin,
} from "../../controllers/hospitals/hospitals.js";

import { registerHospitalSchema } from "../../validators/hospitalValidator.js";
import { validate } from "../../middlewares/validate.js";

import { uploadGuestFiles } from "../../middlewares/upload.js";
import { isSuperAdmin, verifyToken } from "../../middlewares/jwtAuth.js";

const router = express.Router();

router.post("/login", hospitalLogin);

router.use(verifyToken, isSuperAdmin);

router.post(
  "/register",
  uploadGuestFiles("logo"),
  validate(registerHospitalSchema),
  createHospital
);

router.get("/", getHospitals);
router.get("/:id", getHospitalById);
router.put("/:id", uploadGuestFiles("logo"), updateHospital);
router.delete("/:id", deleteHospital);

export default router;
