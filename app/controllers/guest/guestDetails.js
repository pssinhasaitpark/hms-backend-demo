import Guest from "./../../models/guest/guestDetails.js";
import { handleResponse } from "../../utils/responseHandler.js";
import GuestRoom from "../../models/guest/guestRoom.js";
import { validateObjectId } from "../../utils/helper.js";
import { getPagination, getPaginatedResponse } from "../../utils/pagination.js";
import { updateAccountDailySummary } from "../../utils/accountDailySummary.js";
import Bed from "../../models/guest/bed.js";
import GuestPatient from "../../models/guest/guestPatients.js";


export const createGuest = async (req, res) => {
  try {
    const {
      name,
      age,
      gender,
      mobile,
      aadhar_no,
      address,
      referredBy,
      startDate,
      endDate,
      paymentType,
      role,
    } = req.body;
    // console.log("req.body==",req.body);

    let additionalPersons = [];
    if (req.body.additionalPersons) {
      try {
        additionalPersons = JSON.parse(req.body.additionalPersons);
      } catch (err) {
        return handleResponse(res, 400, "Invalid additionalPersons format");
      }
    }

    let patientDetails = null;
    if (req.body.patientDetails) {
      try {
        patientDetails = JSON.parse(req.body.patientDetails);
      } catch (err) {
        return handleResponse(res, 400, "Invalid patientDetails format");
      }
    }

    let patientData;

    if (role === "patient" || (role === "attendant" && !patientDetails)) {
      patientData = { name, age, gender, aadhar_no };
    } else if (role === "attendant" && patientDetails) {
      patientData = patientDetails;
    }

    if (!patientData) {
      return handleResponse(res, 400, "Patient details are required");
    }

    let patient = await GuestPatient.findOne({
      aadhar_no: patientData.aadhar_no,
    });

    if (!patient) {
      patient = await GuestPatient.create(patientData);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(10, 0, 0, 0);

    const startMidnight = new Date(start);
    startMidnight.setHours(0, 0, 0, 0);

    const endMidnight = new Date(end);
    endMidnight.setHours(0, 0, 0, 0);

    let numberOfNights = Math.ceil(
      (endMidnight - startMidnight) / (1000 * 60 * 60 * 24)
    );

    if (numberOfNights <= 0) numberOfNights = 1;
    if (numberOfNights > 10) {
      return handleResponse(res, 400, "Booking cannot exceed 10 nights");
    }

    const totalGuests = 1 + additionalPersons.length;

    const pricePerBed = Number(process.env.DEFAULT_PRICE_PER_BED);
    if (!pricePerBed || pricePerBed <= 0) {
      return handleResponse(
        res,
        500,
        "DEFAULT_PRICE_PER_BED not configured properly"
      );
    }

    const totalPrice = (pricePerBed * totalGuests * numberOfNights).toFixed(2);

    const guest = new Guest({
      name,
      age,
      gender,
      mobile,
      aadhar_no,
      address,
      referredBy,
      role,
      patient: patient._id,
      numberOfPeople: totalGuests,
      additionalPersons,
      startDate,
      endDate,
      totalBedsBooked: totalGuests,
      totalPrice: parseFloat(totalPrice),
      paymentType,
      reservationStatus: "booked",
      uploadedFiles: req.convertedFiles || [],
      createdBy: req.user._id,
    });

    await guest.save();

    await updateAccountDailySummary(
      req.user._id,
      0,
      0,
      paymentType === "cash" ? parseFloat(totalPrice) : 0,
      paymentType === "online" ? parseFloat(totalPrice) : 0,
      0,
      0
    );

    return handleResponse(res, 201, "Guest booked successfully", guest);
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, "Error creating guest", error.message);
  }
};



export const getGuestById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id, res, "guest ID")) return;

    const guest = await Guest.findOne({ _id: id })
      .populate({
        path: "room",
        select: "roomNumber roomType pricePerBed",
      })
      .populate({
        path: "patient",
        select: "name age gender aadhar_no",
      })
      .populate({
        path: "beds",
        select: "bedNumber isOccupied",
      });

    if (!guest) {
      return handleResponse(res, 404, "Guest not found");
    }

    const bedMap = guest.beds.reduce((acc, bed) => {
      acc[bed._id.toString()] = bed.bedNumber;
      return acc;
    }, {});

    const additionalPersonsWithBedNumbers = guest.additionalPersons.map(
      (person) => {
        const bedId = person.bed ? person.bed.toString() : null;
        return {
          ...person.toObject(),
          bed: bedId ? bedMap[bedId] || null : null,
        };
      }
    );

    const responseData = {
      ...guest.toObject(),
      mainBedNumber: guest.beds.length > 0 ? guest.beds[0].bedNumber : null,
      additionalPersons: additionalPersonsWithBedNumbers,
      assignedBeds: guest.beds.map((b) => b.bedNumber),
    };

    handleResponse(
      res,
      200,
      "Guest details with assigned beds fetched successfully",
      responseData
    );
  } catch (error) {
    console.error(error);
    handleResponse(res, 500, "Error fetching guest", error.message);
  }
};


export const getAllGuests = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { search, date, status } = req.query;

    let matchStage = {};

    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: "i" } },
        { aadhar_no: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      matchStage.reservationStatus = status;
    }

    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      matchStage.createdAt = { $gte: start, $lte: end };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const pipeline = [
      { $match: matchStage },

      // 🔢 Assign sorting rank
      {
        $addFields: {
          sortRank: {
            $switch: {
              branches: [
                {
                  case: {
                    $and: [
                      { $eq: ["$reservationStatus", "booked"] },
                      { $gte: ["$startDate", todayStart] },
                      { $lte: ["$startDate", todayEnd] },
                    ],
                  },
                  then: 1,
                },
                {
                  case: {
                    $and: [
                      { $eq: ["$reservationStatus", "checked-in"] },
                      { $gte: ["$endDate", todayStart] },
                      { $lte: ["$endDate", todayEnd] },
                    ],
                  },
                  then: 2,
                },
                {
                  case: { $eq: ["$reservationStatus", "checked-in"] },
                  then: 3,
                },
                { case: { $eq: ["$reservationStatus", "booked"] }, then: 4 },
                {
                  case: { $eq: ["$reservationStatus", "checked-out"] },
                  then: 5,
                },
              ],
              default: 99,
            },
          },
        },
      },

      // 🧾 Sorting logic
      { $sort: { sortRank: 1, endDate: 1, startDate: 1 } },

      { $skip: skip },
      { $limit: limit },

      // 🔗 Populate equivalents
      {
        $lookup: {
          from: "guestrooms",
          localField: "room",
          foreignField: "_id",
          as: "room",
        },
      },
      { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "guestpatients",
          localField: "patient",
          foreignField: "_id",
          as: "patient",
        },
      },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "beds",
          localField: "beds",
          foreignField: "_id",
          as: "beds",
        },
      },

      // ❌ Exclude unwanted fields
      {
        $project: {
          additionalPersons: 0,
          uploadedFiles: 0,
          patient: 0,
          beds: 0,
          role: 0,
          room: 0,  
        },
      },
    ];

    const guests = await Guest.aggregate(pipeline);
    const total = await Guest.countDocuments(matchStage);

    const response = getPaginatedResponse(guests, total, page, limit, "guests");
    handleResponse(res, 200, "Guests fetched successfully", response);
  } catch (error) {
    console.error(error);
    handleResponse(res, 500, "Error fetching guests", error.message);
  }
};


export const updateGuest = async (req, res) => {
  try {
    const { aadhar } = req.params;
    const updatedData = req.body;

    const guest = await Guest.findOneAndUpdate({ aadhar }, updatedData, {
      new: true,
    });

    if (!guest) {
      return handleResponse(res, 404, "Guest not found");
    }

    handleResponse(res, 200, "Guest updated successfully", guest);
  } catch (error) {
    console.error(error);
    handleResponse(res, 500, "Error updating guest", error.message);
  }
};

export const deleteGuest = async (req, res) => {
  try {
    const { id } = req.params;
    const guest = await Guest.findOneAndDelete({ id });

    if (!guest) {
      return handleResponse(res, 404, "Guest not found");
    }

    handleResponse(res, 200, "Guest deleted successfully", guest);
  } catch (error) {
    console.error(error);
    handleResponse(res, 500, "Error deleting guest", error.message);
  }
};



export const getAvailableRooms = async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 20;
    if (page < 1) page = 1;
    if (limit < 1) limit = 20;

    const skip = (page - 1) * limit;

    const rooms = await GuestRoom.find()

      .skip(skip)
      .limit(limit)
      .lean();

    const roomsWithBeds = await Promise.all(
      rooms.map(async (room) => {
        const beds = await Bed.find({ room: room._id })
          .sort({ bedNumber: 1 })
          .select("bedNumber isOccupied occupiedBy")
          .lean();

        const guestsInRoom = await Guest.aggregate([
          { $match: { room: room._id } },
          {
            $group: { _id: "$room", totalBooked: { $sum: "$totalBedsBooked" } },
          },
        ]);

        const bookedBeds = guestsInRoom[0]?.totalBooked || 0;
        const availableBeds = room.totalBeds - bookedBeds;

        return {
          ...room,
          beds,
          // bookedBeds,
          availableBeds: availableBeds < 0 ? 0 : availableBeds,
        };
      })
    );

    const totalRooms = await GuestRoom.countDocuments();

    const paginatedResponse = getPaginatedResponse(
      roomsWithBeds,
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
    console.error("❌ Get available rooms error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const getBedsByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await GuestRoom.findById(roomId).lean();
    if (!room) {
      return handleResponse(res, 404, "Room not found");
    }

    const beds = await Bed.find({ room: roomId })
      .sort({ bedNumber: 1 })
      .select("bedNumber isOccupied occupiedBy")
      .lean();

    return handleResponse(res, 200, "Beds fetched successfully", {
      roomId: room._id,
      roomNumber: room.roomNumber,
      beds,
    });
  } catch (error) {
    console.error("❌ Get beds by room error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const checkoutGuest = async (req, res) => {
  try {
    const id = req.params.guestId;

    const guest = await Guest.findById(id).populate("beds");

    if (!guest) {
      return handleResponse(res, 404, "Guest not found.");
    }

    guest.reservationStatus = "checked-out";
    guest.checkoutTime = new Date();
    await guest.save();

    for (const bed of guest.beds) {
      bed.isOccupied = false;
      bed.occupant = null;
      bed.occupiedBy = null;
      await bed.save();
    }

    for (const person of guest.additionalPersons) {
      const bed = await Bed.findById(person.bed);
      if (bed) {
        bed.isOccupied = false;
        bed.occupant = null;
        bed.occupiedBy = null;
        await bed.save();
      }
    }

    const room = await GuestRoom.findById(guest.room);
    if (room) {
      const newAvailableBeds = room.availableBeds + guest.totalBedsBooked;

      if (newAvailableBeds > room.totalBeds) {
        return handleResponse(
          res,
          400,
          "Available beds cannot exceed total beds."
        );
      }

      room.availableBeds = newAvailableBeds;
      await room.save();
    }

    return handleResponse(res, 200, "Guest checked out successfully", guest);
  } catch (error) {
    console.error("Checkout error:", error);
    return handleResponse(
      res,
      500,
      "Error during guest checkout",
      error.message
    );
  }
};


export const checkinGuest = async (req, res) => {
  try {
    // const guestId = req.params.guestId;
    const { roomId, mainBedId, guestId, additionalBeds = [] } = req.body;

    // 1️⃣ Fetch guest
    const guest = await Guest.findById(guestId);
    if (!guest) return handleResponse(res, 404, "Guest not found.");

    if (guest.reservationStatus !== "booked") {
      return handleResponse(res, 400, "Guest is not in a booked state.");
    }

    // 2️⃣ Fetch room
    const room = await GuestRoom.findById(roomId);
    if (!room) return handleResponse(res, 404, "Room not found.");

    // 3️⃣ Validate main bed
    const mainBed = await Bed.findOne({ _id: mainBedId, room: room._id });
    if (!mainBed) {
      return handleResponse(res, 400, "Main bed not found in this room.");
    }
    if (mainBed.isOccupied) {
      return handleResponse(res, 400, "Main bed is already occupied.");
    }

    // 4️⃣ Validate additional beds
    const beds = await Bed.find({
      _id: { $in: additionalBeds },
      room: room._id,
    });
    const occupiedBeds = beds.filter((b) => b.isOccupied);
    if (occupiedBeds.length > 0) {
      return handleResponse(
        res,
        400,
        `These additional beds are already occupied: ${occupiedBeds
          .map((b) => b._id)
          .join(", ")}`
      );
    }

    // 5️⃣ Assign beds to guest
    guest.room = room._id;
    guest.beds = [mainBedId, ...additionalBeds];
    guest.reservationStatus = "checked-in";
    guest.checkinTime = new Date();

    // Assign beds to additional persons
    if (guest.additionalPersons && guest.additionalPersons.length > 0) {
      guest.additionalPersons = guest.additionalPersons.map(
        (person, index) => ({
          ...person.toObject(),
          bed: additionalBeds[index] || person.bed, // fallback to existing bed if any
        })
      );
    }

    await guest.save();

    // 6️⃣ Update Bed documents
    await Bed.findByIdAndUpdate(mainBedId, {
      isOccupied: true,
      occupant: guest._id,
      occupiedBy: guest.gender,
    });

    for (const bedId of additionalBeds) {
      const person = guest.additionalPersons.find(
        (p) => p.bed.toString() === bedId.toString()
      );
      await Bed.findByIdAndUpdate(bedId, {
        isOccupied: true,
        occupant: guest._id,
        occupiedBy: person?.gender || "other",
      });
    }

    // 7️⃣ Update room available beds
    room.availableBeds -= guest.beds.length;
    await room.save();

    // 8️⃣ Prepare response
    const populatedBeds = await Bed.find({ _id: { $in: guest.beds } });

    const responseData = {
      _id: guest._id,
      name: guest.name,
      mobile: guest.mobile,
      age: guest.age,
      aadhar_no: guest.aadhar_no,
      gender: guest.gender,
      numberOfPeople: guest.numberOfPeople,
      totalBedsBooked: guest.totalBedsBooked,
      totalPrice: guest.totalPrice,
      reservationStatus: guest.reservationStatus,
      paymentType: guest.paymentType,
      beds: populatedBeds.map((b) => b.bedNumber),
      checkinTime: guest.checkinTime,
      checkoutTime: guest.checkoutTime || null,
      room: room.roomNumber || room._id,
    };

    return handleResponse(
      res,
      200,
      "Guest checked in successfully",
      responseData
    );
  } catch (error) {
    console.error("Check-in error:", error);
    return handleResponse(
      res,
      500,
      "Error during guest check-in",
      error.message
    );
  }
};

export const uploadGuestDocuments = async (req, res) => {
  try {
    const { guestId } = req.params;

    if (!guestId) {
      return handleResponse(res, 400, "Guest ID is required");
    }

    const guest = await Guest.findById(guestId);

    if (!guest) {
      return handleResponse(res, 404, "Guest not found");
    }

    if (!req.convertedFiles || req.convertedFiles.length === 0) {
      return handleResponse(res, 400, "No files uploaded");
    }

    guest.uploadedFiles = req.convertedFiles;

    await guest.save();

    handleResponse(res, 200, "Documents replaced successfully", {
      uploadedFiles: guest.uploadedFiles,
    });
  } catch (error) {
    console.error(error);
    handleResponse(res, 500, "Error uploading documents", error.message);
  }
};
