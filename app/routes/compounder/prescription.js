import express from "express";
import { verifyToken } from "../../middlewares/jwtAuth.js";
import { uploadAndConvertImage } from "../../middlewares/upload.js";
import {
  createPrescription,
  getAllPrescriptions,
  getPrescriptionById,
  updatePrescription,
  deletePrescription,
} from "../../controllers/compounder/prescription.js";

const router = express.Router();

router.post(
  "/",
  verifyToken,
  uploadAndConvertImage("prescriptionFile"),
  createPrescription
);

router.get("/", getAllPrescriptions);

router.get("/:id", getPrescriptionById);

router.put(
  "/:id",
  verifyToken,
  uploadAndConvertImage("prescriptionFile"),
  updatePrescription
);

router.delete("/:id", verifyToken, deletePrescription);

export default router;
