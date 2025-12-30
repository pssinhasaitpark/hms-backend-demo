import express from "express";
import { registerStaffSchema } from "../../validators/staffValidator.js";
import { validate } from "../../middlewares/validate.js";
import {
  isAdmin,
  isHospitalAdmin,
  verifyToken,
} from "../../middlewares/jwtAuth.js";
import {
  deleteStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  registerStaff,
} from "../../controllers/admin/user/staff.js";
import { adminLogin } from "../../controllers/user/userAuth.js";

const router = express.Router();

const staffBase = "/staff";

router.use(verifyToken, isHospitalAdmin);

router.post(
  `/auth/staff/register`,
  validate(registerStaffSchema),
  registerStaff
);
router.post("/auth/login", adminLogin);

router.get(staffBase, getAllStaff);
router.get(`${staffBase}/:id`, getStaffById);
router.put(`${staffBase}/:id`, updateStaff);
router.delete(`${staffBase}/:id`, deleteStaff);

export default router;
