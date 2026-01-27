import express from "express";
import {
  createWard,
  getAllWards,
  getWardById,
  updateWard,
  deleteWard,
} from "../../controllers/ipd/ward.js";
import { isHospitalAdmin, verifyToken } from "../../middlewares/jwtAuth.js";

const router = express.Router();
router.use(verifyToken, isHospitalAdmin);

router.post("/", createWard);
router.get("/", getAllWards);
router.get("/:id", getWardById);
router.put("/:id", updateWard);
router.delete("/:id", deleteWard);

export default router;
