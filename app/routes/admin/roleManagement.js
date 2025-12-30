import express from "express";
import {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
} from "../../controllers/admin/user/roleManagement.js";
import { verifyToken, isHospitalAdmin } from "../../middlewares/jwtAuth.js";

const router = express.Router();

router.use(verifyToken, isHospitalAdmin);

router.post("/", createRole);
router.get("/", getRoles);
router.get("/:id", getRoleById);
router.put("/:id", updateRole);
router.delete("/:id", deleteRole);

export default router;
