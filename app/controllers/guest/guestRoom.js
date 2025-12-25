import GuestRoom from "../../models/guest/guestRoom.js";
import { handleResponse } from "../../utils/responseHandler.js";
import { getPagination, getPaginatedResponse } from "../../utils/pagination.js";
import Bed from "../../models/guest/bed.js";


export const createRoom = async (req, res) => {
  try {
    const { roomNumber, totalBeds, description } = req.body;

    const existingRoom = await GuestRoom.findOne({ roomNumber });
    if (existingRoom) {
      return handleResponse(res, 400, "Room with this number already exists.");
    }

    const newRoom = new GuestRoom({
      roomNumber,
      totalBeds,
      description,
      availableBeds: totalBeds,
      createdBy: req.user._id,
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

    const room = await GuestRoom.findById(roomId);
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

    let filter = {};

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

    const room = await GuestRoom.findById(roomId).lean();

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

export const deleteRoom = async (req, res) => {
  try {
    const roomId = req.params.id;

    const room = await GuestRoom.findById(roomId);

    if (!room) {
      return handleResponse(res, 404, "Room not found.");
    }

    await room.deleteOne();

    return handleResponse(res, 200, "Room deleted successfully", room);
  } catch (error) {
    return handleResponse(res, 500, "Internal server error", error);
  }
};
