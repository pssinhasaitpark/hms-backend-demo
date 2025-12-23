import express from "express";
import {
  createPackage,
  getPackages,
  getPackageById,
  updatePackage,
  deletePackage,
} from "../../controllers/admin/departments/package.js";

import { isAdmin, verifyToken } from "../../middlewares/jwtAuth.js";


const router = express.Router();

router.use(verifyToken, isAdmin);


router.post("/", createPackage);

router.get("/", getPackages);

router.get("/:id", getPackageById);

router.put("/:id", updatePackage);

router.delete("/:id", deletePackage);

export default router;
