import express from "express";
import {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  updateDepartmentStatus,
  getDepartmentsWithDoctors
} from "../../controllers/admin/departments/departments.js";

import { isAdmin, verifyToken } from "../../middlewares/jwtAuth.js";

const router = express.Router();


router.use(verifyToken, isAdmin);

router.post("/",  createDepartment);
router.get("/doctors",  getDepartmentsWithDoctors);
router.get("/",  getDepartments);
router.get("/:id", getDepartmentById);
router.patch("/:id/status", updateDepartmentStatus );
router.put("/:id", updateDepartment);
router.delete("/:id", deleteDepartment);

export default router;
