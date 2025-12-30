import express from "express";
import {
  createOrUpdateRegistrationFee,
  deleteRegistrationFee,
  getRegistrationFee,
} from "../../controllers/admin/departments/registrationFees.js";

import {
  isHospitalAdmin,
  verifyToken,
} from "../../middlewares/jwtAuth.js";

const router = express.Router();

router.use(verifyToken, isHospitalAdmin);

router.post("/", createOrUpdateRegistrationFee);

router.get("/", getRegistrationFee);

router.delete("/:id", deleteRegistrationFee);

export default router;
