import express from "express";
import {
  createService,
  getServices,
  getServiceById,
  updateService,
    deleteService,
  updateServiceStatus
} from "../../controllers/admin/departments/services.js"; 
import {  isHospitalAdmin, verifyToken } from "../../middlewares/jwtAuth.js";

const router = express.Router();


router.use(verifyToken, isHospitalAdmin);


router.post("/", createService);


router.get("/", getServices);


router.get("/:id", getServiceById);


router.patch("/:id/status", updateServiceStatus);


router.put("/:id", updateService);


router.delete("/:id", deleteService);

export default router;
