import GuestRoom from "../../models/guest/guestRoom.js";
import { handleResponse } from "../../utils/responseHandler.js";
import { getPagination, getPaginatedResponse } from "../../utils/pagination.js";
import Bed from "../../models/guest/bed.js";

/* export const createRoom = async (req, res) => {
  try {
    const { roomNumber, totalBeds, description } = req.body;
    const hospitalId = req.user._id;

    const existingRoom = await GuestRoom.findOne({
      roomNumber,
      hospital: hospitalId,
    });
    if (existingRoom) {
      return handleResponse(res, 400, "Room with this number already exists.");
    }

    const newRoom = new GuestRoom({
      roomNumber,
      totalBeds,
      description,
      availableBeds: totalBeds,
      hospital: req.user._id,
    });

    await newRoom.save();

    const beds = Array.from({ length: totalBeds }, (_, index) => ({
      room: newRoom._id,
      bedNumber: `${roomNumber}_${index + 1}`,
      occupiedBy: null,
    }));

    await Bed.insertMany(beds);
      console.log("beds===",beds);

    return handleResponse(
      res,
      201,
      "Room and beds created successfully",
      newRoom
    );
  } catch (error) {
    return handleResponse(
      res,
      500,
      "An error occurred while creating the room.",
      error
    );
  }
}; */

export const createRoom = async (req, res) => {
  try {
    const { roomNumber, totalBeds, description } = req.body;
    const hospitalId = req.user._id;


    if (!Number.isInteger(totalBeds) || totalBeds <= 0) {
      return handleResponse(res, 400, "Total beds must be a positive integer.");
    }

    const MAX_BEDS = 1000; 
    if (totalBeds > MAX_BEDS) {
      return handleResponse(
        res,
        400,
        `Cannot create more than ${MAX_BEDS} beds per room.`
      );
    }

    const existingRoom = await GuestRoom.findOne({
      roomNumber,
      hospital: hospitalId,
    });
    if (existingRoom) {
      return handleResponse(res, 400, "Room with this number already exists.");
    }

    const newRoom = new GuestRoom({
      roomNumber,
      totalBeds,
      description,
      availableBeds: totalBeds,
      hospital: hospitalId,
    });

    await newRoom.save();

    const beds = Array.from({ length: totalBeds }, (_, index) => ({
      room: newRoom._id,
      bedNumber: `${roomNumber}_${index + 1}`,
      occupiedBy: null,
    }));

    await Bed.insertMany(beds);


    return handleResponse(
      res,
      201,
      "Room and beds created successfully",
      newRoom
    );
  } catch (error) {
    return handleResponse(
      res,
      500,
      "An error occurred while creating the room.",
      error
    );
  }
};

export const updateRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const { roomNumber, totalBeds, description } = req.body;

    const room = await GuestRoom.findById({
      _id: roomId,
      hospital: req.user._id,
    });
    if (!room) {
      return handleResponse(res, 404, "Room not found.");
    }

    room.roomNumber = roomNumber || room.roomNumber;
    room.totalBeds = totalBeds || room.totalBeds;
    // room.pricePerBed = pricePerBed || room.pricePerBed;
    room.description = description || room.description;

    await room.save();

    const currentBeds = await Bed.find({ room: roomId });

    if (totalBeds > currentBeds.length) {
      const bedsToCreate = Array.from(
        { length: totalBeds - currentBeds.length },
        (_, index) => ({
          room: roomId,
          bedNumber: `${roomNumber}_${currentBeds.length + index + 1}`,
        })
      );
      await Bed.insertMany(bedsToCreate);
    } else if (totalBeds < currentBeds.length) {
      const excessBeds = currentBeds.slice(totalBeds);
      const bedIdsToDelete = excessBeds.map((bed) => bed._id);
      await Bed.deleteMany({ _id: { $in: bedIdsToDelete } });
    }

    return handleResponse(res, 200, "Room and beds updated successfully", room);
  } catch (error) {
    return handleResponse(
      res,
      500,
      "An error occurred while updating the room.",
      error
    );
  }
};

export const getAllRooms = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);

    const { search } = req.query;
    const hospitalId = req.user._id;

    let filter = { hospital: hospitalId };

    if (search) {
      filter = {
        $or: [{ roomNumber: { $regex: search, $options: "i" } }],
      };
    }

    const rooms = await GuestRoom.find(filter)
      // .sort({ createdAt: -1 })
      .sort({ roomNumber: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalRooms = await GuestRoom.countDocuments(filter);

    const paginatedResponse = getPaginatedResponse(
      rooms,
      totalRooms,
      page,
      limit
    );

    return handleResponse(
      res,
      200,
      "Rooms fetched successfully",
      paginatedResponse
    );
  } catch (error) {
    console.error("❌ Get all rooms error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const getRoomById = async (req, res) => {
  try {
    const roomId = req.params.id;
    const hospitalId = req.user._id;
    const room = await GuestRoom.findById({
      _id: roomId,
      hospital: hospitalId,
    }).lean();

    if (!room) {
      return handleResponse(res, 404, "Room not found.");
    }

    const beds = await Bed.find({ room: roomId }).sort({ bedNumber: 1 }).lean();

    const roomWithBeds = {
      ...room,
      beds,
    };

    return handleResponse(res, 200, "Room fetched successfully", roomWithBeds);
  } catch (error) {
    console.error("❌ getRoomById error:", error);
    return handleResponse(
      res,
      500,
      "An error occurred while fetching the room.",
      { error: error.message }
    );
  }
};

/* export const deleteRoom = async (req, res) => {
  try {
    const roomId = req.params.id;

    const room = await GuestRoom.findById({
      _id: roomId,
      hospital: req.user._id,
    });

    if (!room) {
      return handleResponse(res, 404, "Room not found.");
    }

    await room.deleteOne();

    return handleResponse(res, 200, "Room deleted successfully", room);
  } catch (error) {
    return handleResponse(res, 500, "Internal server error", error);
  }
};
 */

export const deleteRoom = async (req, res) => {
  try {
    const roomId = req.params.id;

    const room = await GuestRoom.findOne({
      _id: roomId,
      hospital: req.user._id,
    });

    if (!room) {
      return handleResponse(res, 404, "Room not found.");
    }

    // Delete all beds associated with this room
    await Bed.deleteMany({ room: room._id });

    // Delete the room itself
    await room.deleteOne();

    return handleResponse(
      res,
      200,
      "Room and associated beds deleted successfully",
      room
    );
  } catch (error) {
    return handleResponse(res, 500, "Internal server error", error);
  }
};
