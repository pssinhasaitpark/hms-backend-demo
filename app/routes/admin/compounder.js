import express from "express";
import {
  isAdmin,
  isHospitalAdmin,
  verifyToken,
} from "../../middlewares/jwtAuth.js";
import {
  deleteCompounder,
  getAllCompounders,
  getCompounderById,
  updateCompounder,
} from "../../controllers/admin/user/compounder.js";

const router = express.Router();

router.use(verifyToken, isHospitalAdmin);

router.get("/", getAllCompounders);
router.get(`/:id`, getCompounderById);
router.put(`/:id`, updateCompounder);
router.delete(`/:id`, deleteCompounder);

export default router;
