import express from "express";
import {
  createOrUpdateOpdFee,
  getAllOpdFees,
  deleteOpdFee,
} from "../../controllers/admin/departments/opdRegistrationFee.js";

import { isAdmin,verifyToken } from "../../middlewares/jwtAuth.js";

const router = express.Router();

router.use(verifyToken, isAdmin);

router.post("/", createOrUpdateOpdFee); 

router.get("/", getAllOpdFees);

router.delete("/:id", deleteOpdFee);

export default router;
