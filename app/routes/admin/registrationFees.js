import express from "express";
import {
  createOrUpdateRegistrationFee,
  deleteRegistrationFee,
  getRegistrationFee,
} from "../../controllers/admin/departments/registrationFees.js";

import { isAdmin, verifyToken } from "../../middlewares/jwtAuth.js";

const router = express.Router();

router.use(verifyToken, isAdmin);

router.post("/", createOrUpdateRegistrationFee);

router.get("/", getRegistrationFee);

router.delete("/:id", deleteRegistrationFee);

export default router;
