import express from "express";
import {
  editAdminProfile,
  superAdminLogin,
} from "../../controllers/super-admin/auth.js";
import { isSuperAdmin, verifyToken } from "../../middlewares/jwtAuth.js";
import { uploadAndConvertImage } from "../../middlewares/upload.js";
const router = express.Router();

router.post("/login", superAdminLogin);

router.put(
  "/profile/edit",
  verifyToken,
  isSuperAdmin,
  uploadAndConvertImage("profile_image"),
  editAdminProfile
);

// router.post("/change-password", verifyToken, changePassword);

// router.get("/profile", verifyToken, getProfile);

export default router;
