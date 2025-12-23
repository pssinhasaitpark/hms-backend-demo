import express from "express";
import {
  createGuest,
  getAllGuests,
  getGuestById,
  updateGuest,
  deleteGuest,
  getAvailableRooms,
  checkoutGuest,
  getBedsByRoom,
  checkinGuest,
  uploadGuestDocuments,
} from "../../controllers/guest/guestDetails.js";
import { isFrontDesk, verifyToken } from "../../middlewares/jwtAuth.js";

import { guestSchemaValidator } from "../../validators/guestValidator.js";
import { validate } from "../../middlewares/validate.js";
import {
  uploadGuestFiles,
} from "../../middlewares/upload.js";

const router = express.Router();

router.use(verifyToken, isFrontDesk);

router.post(
  "/room/book",
  // validate(guestSchemaValidator),
  uploadGuestFiles("files"),
  createGuest
);

router.post("/room/checkout/:guestId", checkoutGuest);

router.post("/room/checkin", checkinGuest);

router.get("/", getAllGuests);

router.get("/available/rooms", getAvailableRooms);

router.get("/rooms/:roomId/bed", getBedsByRoom);

router.get("/:id", getGuestById);

router.put("/:id", updateGuest);

router.delete("/:id", deleteGuest);

router.put(
  "/:guestId/documents",
  uploadGuestFiles("files"),
  uploadGuestDocuments
);

export default router;
