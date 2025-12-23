import express from "express";
import { registerStaffSchema } from "../../validators/staffValidator.js";
import { validate } from "../../middlewares/validate.js";
import { isAdmin, verifyToken } from "../../middlewares/jwtAuth.js";
import {
  deleteStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  registerStaff,
} from "../../controllers/admin/user/staff.js";
import { adminLogin, loginUser } from "../../controllers/user/userAuth.js";

const router = express.Router();

const staffBase = "/staff";

router.post(
  `/auth/staff/register`,
  verifyToken,
  isAdmin,
  validate(registerStaffSchema),
  registerStaff
);
router.post("/auth/login", adminLogin);
router.get(staffBase, getAllStaff);
router.get(`${staffBase}/:id`, getStaffById);
router.put(`${staffBase}/:id`, updateStaff);
router.delete(`${staffBase}/:id`, deleteStaff);

export default router;
