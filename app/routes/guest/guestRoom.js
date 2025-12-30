import express from "express";
import {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
} from "../../controllers/guest/guestRoom.js";
import {
  isAdmin,
  isHospitalAdmin,
  verifyToken,
} from "../../middlewares/jwtAuth.js";
import { getAllGuests } from "../../controllers/guest/guestDetails.js";

const router = express.Router();

router.use(verifyToken, isHospitalAdmin);
router.get("/guests", getAllGuests);
router.post("/", createRoom);

router.get("/", getAllRooms);

router.get("/:id", getRoomById);

router.put("/:id", updateRoom);

router.delete("/:id", deleteRoom);

export default router;
