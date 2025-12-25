import express from "express";
import {
 superAdminLogin
} from "../../controllers/super-admin/auth.js"
import { verifyToken } from "../../middlewares/jwtAuth.js";
const router = express.Router();

router.post("/login", superAdminLogin);

// router.post("/change-password", verifyToken, changePassword);

// router.get("/profile", verifyToken, getProfile);

// router.put("/profile/edit", verifyToken, editProfile);

export default router;
