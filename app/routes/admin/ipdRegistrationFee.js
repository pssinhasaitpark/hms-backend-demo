import express from "express";
import {
  createOrUpdateIpdRegistrationFee,
  deleteIpdRegistrationFee,
  getIpdRegistrationFee,
} from "../../controllers/admin/departments/ipdRegistrationFee.js";

import { isHospitalAdmin, verifyToken } from "../../middlewares/jwtAuth.js";

const router = express.Router();

router.use(verifyToken, isHospitalAdmin);

router.post("/", createOrUpdateIpdRegistrationFee);

router.get("/", getIpdRegistrationFee);

router.delete("/:id", deleteIpdRegistrationFee);

export default router;
