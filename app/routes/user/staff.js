import express from "express";
import {
  changePassword,
  editProfile,
  getProfile,
  loginCompounder,
  loginUser,
} from "../../controllers/user/userAuth.js";
import { verifyToken } from "../../middlewares/jwtAuth.js";
const router = express.Router();

router.post("/staff/login", loginUser);

router.post("/change-password", verifyToken, changePassword);

router.post("/compounder/login", loginCompounder);

router.get("/profile", verifyToken, getProfile);

router.put("/profile/edit", verifyToken, editProfile);

export default router;
