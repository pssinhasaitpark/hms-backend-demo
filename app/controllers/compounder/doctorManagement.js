import Compounder from "../../models/user/compounder.js";
import { handleResponse } from "../../utils/responseHandler.js";
import moment from "moment";
import { getPagination } from "../../utils/pagination.js";
import DoctorAvailability from "../../models/departments/doctorAvailability.js";
import Prescription from "../../models/compounder/prescription.js";
import CheckInCheckout from "../../models/compounder/checkIncheckOut.js";
import Doctor from "../../models/user/doctor.js";
import DoctorAttendance from "../../models/frontdesk/doctorAttendance.js";
import PatientVisitRecords from "../../models/frontdesk/patientVisitRecords.js";

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DAY_SHORT = {
  Monday: "mon",
  Tuesday: "tue",
  Wednesday: "wed",
  Thursday: "thu",
  Friday: "fri",
  Saturday: "sat",
  Sunday: "sun",
};

export const getAssignedDoctors = async (req, res) => {
  try {
    const compounderId = req.user?._id;
    const hospitalId = req.user.hospitalId;

    if (!compounderId) {
      return handleResponse(res, 400, "Compounder ID not found in user data");
    }

    const { page, limit, skip } = getPagination(req);
    const { search } = req.query;

    const compounder = await Compounder.findOne({
      _id:compounderId,
      hospital: hospitalId,
    })
      .populate({
        path: "doctors",
        match: { hospital: hospitalId },
        select: "-password",
        populate: {
          path: "department",
          select: "name",
        },
      })
      .lean();
    

    if (!compounder) {
      return handleResponse(res, 404, "Compounder not found");
    }

    let doctors = compounder.doctors || [];

    if (search) {
      const s = search.toLowerCase();
      doctors = doctors.filter((d) => {
        const name = d.doctorName?.toLowerCase() || "";
        const id = d.doctorId?.toLowerCase() || "";
        return name.includes(s) || id.includes(s);
      });
    }

    const totalDoctors = doctors.length;
    const paginatedDoctors = doctors.slice(skip, skip + limit);

    if (!paginatedDoctors.length) {
      return handleResponse(res, 404, "No doctors assigned on this page");
    }

    const totalPages = Math.ceil(totalDoctors / limit);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const doctorsWithDetails = await Promise.all(
      paginatedDoctors.map(async (doctor) => {
        const checkRecords = await CheckInCheckout.find({ doctor: doctor._id })
          .sort({ checkInTime: -1 })
          .lean();

        const currentCheckInCheckout = checkRecords[0] || null;

        const lastCheckInCheckout =
          checkRecords.find(
            (rec, index) => index !== 0 && rec.status === "CheckedOut"
          ) || null;

        const availabilityDocs = await DoctorAvailability.find({
          doctor: doctor._id,
        }).lean();

        const availability = availabilityDocs
          .sort(
            (a, b) =>
              DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)
          )
          .map((a) => ({
            dayOfWeek: DAY_SHORT[a.dayOfWeek],
            shifts: a.shifts,
          }));

        const patientCountToday = await PatientVisitRecords.countDocuments({
          doctor: doctor._id,
          visitDate: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        });

        return {
          ...doctor,

          currentCheckInCheckout: currentCheckInCheckout
            ? {
                checkInTime: currentCheckInCheckout.checkInTime,
                checkOutTime: currentCheckInCheckout.checkOutTime,
                status: currentCheckInCheckout.status,
              }
            : null,

          lastCheckInCheckout: lastCheckInCheckout
            ? {
                checkInTime: lastCheckInCheckout.checkInTime,
                checkOutTime: lastCheckInCheckout.checkOutTime,
                status: lastCheckInCheckout.status,
              }
            : null,

          availability,
          patientCountToday,
        };
      })
    );

    return handleResponse(res, 200, "Doctors fetched successfully", {
      doctors: doctorsWithDetails,
      pagination: {
        currentPage: page,
        totalPages,
        totalDoctors,
        perPage: limit,
      },
    });
  } catch (error) {
    console.error("getAssignedDoctors error:", error);
    return handleResponse(res, 500, "Internal server error");
  }
};

export const getPatientsByDoctorAndDate = async (req, res) => {
  try {
    const { doctorId, date, search } = req.query;
    
    const hospitalId = req.user.hospitalId;
    if (!doctorId || !date) {
      return handleResponse(res, 400, "Doctor ID and date are required");
    }

    const formattedDate = moment(date).startOf("day").toDate();
    const { page, limit, skip } = getPagination(req);

    // Filter query for patient visits
    let filterQuery = {
      doctor: doctorId,
      hospital: hospitalId,
      visitDate: {
        $gte: formattedDate,
        $lt: moment(formattedDate).endOf("day").toDate(),
      },
      appointmentStatus: { $ne: "COMPLETED" },
    };

    if (search) {
      filterQuery.$or = [
        { "patientSnapshot.patientName": { $regex: search, $options: "i" } },
        { "patientSnapshot.patientId": { $regex: search, $options: "i" } },
      ];
    }

    // Query to get all patient visits (not completed)
    const patients = await PatientVisitRecords.find(filterQuery)
      .populate("patient", "patientName patientId address gender age") // Populating patient fields
      .populate("department", "name") // Populating department name
      .populate("doctor", "doctorName") // Populating doctor name
      .select(
        "patientSnapshot doctorSnapshot departmentSnapshot visitDate appointmentStatus patientType visitId"
      )
      .lean();

    // Add status priority and sorting logic
    patients.forEach((patient) => {
      const statusPriority = {
        ONGOING: 1,
        PENDING: 2,
      };
      patient.statusPriority = statusPriority[patient.appointmentStatus] || 3;
    });

    // Sorting by visit date and priority
    const latestPending = patients
      .filter((p) => p.appointmentStatus === "PENDING")
      .sort((a, b) => moment(a.visitDate).diff(moment(b.visitDate)))[0];

    patients.sort((a, b) => {
      if (a._id === latestPending?._id) return -1;
      if (b._id === latestPending?._id) return 1;

      if (
        a.appointmentStatus === "ONGOING" &&
        b.appointmentStatus !== "ONGOING"
      )
        return -1;
      if (
        b.appointmentStatus === "ONGOING" &&
        a.appointmentStatus !== "ONGOING"
      )
        return 1;

      if (a.statusPriority !== b.statusPriority)
        return a.statusPriority - b.statusPriority;

      return moment(a.visitDate).diff(moment(b.visitDate)); // Sorting by visit date (oldest first)
    });

    const Patients = await PatientVisitRecords.countDocuments(filterQuery);

    const completedFilterQuery = {
      ...filterQuery,
      appointmentStatus: "COMPLETED",
    };

    const completedPatients = await PatientVisitRecords.countDocuments(
      completedFilterQuery
    );

    const paginatedPatients = patients.slice(skip, skip + limit);

    if (!patients.length) {
      return handleResponse(
        res,
        200,
        "No patients found for this doctor on the given date"
      );
    }
    const totalPatients = Patients + completedPatients;
    const doctor = await Doctor.findById(doctorId).select("doctorName").lean();
    const doctorDetails = {
      doctorName: doctor ? doctor.doctorName : "Unknown",
      totalPatients,
    };

    return handleResponse(res, 200, "Patients fetched successfully", {
      doctorDetails,
      patients: paginatedPatients,
      pagination: {
        total: Patients,
        page,
        limit,
        totalPages: Math.ceil(totalPatients / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching patients:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

export const getPatientDetails = async (req, res) => {
  try {
    const { patientId } = req.params;
    const hospitalId = req.user.hospitalId;
    if (!patientId) {
      return handleResponse(res, 400, "Patient ID is required");
    }

    const patientVisit = await PatientVisitRecords.findOne({
      _id: patientId,
      hospital: hospitalId,
    })
      .populate("doctor", "doctorName")
      .populate("department", "name")
      .populate("patient", "patientName mobile patientId address gender age")
      .populate("patient.mobile", "phone")
      .lean();

    if (!patientVisit) {
      return handleResponse(res, 404, "Patient visit record not found");
    }

    const prescriptions = await Prescription.find({ patient: patientId })
      .select(
        "_id prescriptionId prescriptionNotes prescriptionFile status createdBy createdDate"
      )
      .populate("createdBy", "name")
      .lean();

    patientVisit.prescriptions = prescriptions;

    // Fetch doctor details
    let doctorDetails = null;
    if (patientVisit.doctor) {
      const doctorId = patientVisit.doctor._id;

      // Fetch the active (non-completed) patients for the doctor
      const doctorPatients = await PatientVisitRecords.find({
        doctor: doctorId,
        appointmentStatus: { $ne: "COMPLETED" },
      }).lean();

      doctorDetails = {
        doctorName: patientVisit.doctor.doctorName || "Unknown",
        totalPatients: doctorPatients.length,
      };
    }

    return handleResponse(res, 200, "Patient details fetched successfully", {
      patient: patientVisit,
      doctorDetails,
    });
  } catch (error) {
    console.error("Error fetching patient details:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

export const checkInDoctor = async (req, res) => {
  try {
    const doctorId = req.params.doctorId;
    const compounderId = req.user._id;
    const hospitalId = req.user.hospitalId;

    const doctor = await Doctor.findOne({
      _id: doctorId,
      hospital: hospitalId,
    });
    if (!doctor) {
      return handleResponse(res, 404, "Doctor not found");
    }

    doctor.isAvailable = true;
    await doctor.save();

    const checkInRecord = new CheckInCheckout({
      doctor: doctor._id,
      compounder: compounderId,
      checkInTime: new Date(),
      status: "CheckedIn",
    });
    await checkInRecord.save();

    const today = new Date().toISOString().slice(0, 10);

    const attendance = await DoctorAttendance.findOneAndUpdate(
      { doctor: doctor._id, date: today },
      {
        $set: {
          checkInTime: new Date(),
          status: "Present",
        },
      },
      { new: true, upsert: true }
    );

    return handleResponse(res, 200, "Doctor checked in successfully", {
      checkInRecord,
      attendance,
    });
  } catch (error) {
    return handleResponse(res, 500, "Error checking in doctor", {
      error: error.message,
    });
  }
};

export const checkOutDoctor = async (req, res) => {
  try {
    const doctorId = req.params.doctorId;
    const compounderId = req.user._id;
    const hospitalId = req.user.hospitalId;

    const doctor = await Doctor.findOne({
      _id: doctorId,
      hospital: hospitalId,
    });
    if (!doctor) {
      return handleResponse(res, 404, "Doctor not found");
    }

    const checkInRecord = await CheckInCheckout.findOne({
      doctor: doctor._id,
      compounder: compounderId,
      status: "CheckedIn",
    }).sort({ createdAt: -1 });

    if (!checkInRecord) {
      return handleResponse(res, 400, "Doctor is not checked in");
    }

    await checkInRecord.checkOut();

    doctor.isAvailable = false;
    await doctor.save();

    const today = new Date().toISOString().slice(0, 10);

    const attendance = await DoctorAttendance.findOneAndUpdate(
      { doctor: doctor._id, date: today },
      {
        $set: {
          checkOutTime: new Date(),
          status: "Present",
        },
      },
      { new: true }
    );

    return handleResponse(res, 200, "Doctor checked out successfully", {
      checkInRecord,
      attendance,
    });
  } catch (error) {
    return handleResponse(res, 500, "Error checking out doctor", {
      error: error.message,
    });
  }
};

export const getCompounderAssignedPatients = async (req, res) => {
  try {
    const compounderId = req.user?._id;

    if (!compounderId)
      return handleResponse(res, 401, "Unauthorized: Compounder not found");

    const { date, search } = req.query;

    const hospitalId = req.user.hospitalId;
    if (!date) return handleResponse(res, 400, "Date is required");

    const { page, limit, skip } = getPagination(req);

    const compounder = await Compounder.findById(compounderId)
      .select("doctors")
      .lean();

    if (!compounder || !compounder.doctors.length) {
      return handleResponse(res, 200, "No doctors assigned to this compounder");
    }

    const doctorIds = compounder.doctors;

    const formattedDate = moment(date).startOf("day").toDate();

    let filterQuery = {
      doctor: { $in: doctorIds },
      hospital: hospitalId,
      visitDate: {
        $gte: formattedDate,
        $lt: moment(formattedDate).endOf("day").toDate(),
      },
      appointmentStatus: { $in: ["PENDING", "ONGOING", "COMPLETED"] },
    };

    if (search) {
      filterQuery.$or = [
        { "patientSnapshot.patientName": { $regex: search, $options: "i" } },
        { "patientSnapshot.patientId": { $regex: search, $options: "i" } },
      ];
    }

    const patients = await PatientVisitRecords.find(filterQuery)
      .populate("patient", "patientName patientId address gender age")
      .populate("department", "name")
      .populate("doctor", "doctorName")
      .select(
        "patientSnapshot doctorSnapshot departmentSnapshot visitDate appointmentStatus patientType visitId"
      )
      .lean();

    patients.forEach((p) => {
      const priority = { ONGOING: 1, PENDING: 2, COMPLETED: 3 };
      p.statusPriority = priority[p.appointmentStatus] || 4;
    });

    patients.sort((a, b) => {
      if (a.statusPriority !== b.statusPriority)
        return a.statusPriority - b.statusPriority;

      return moment(a.visitDate).diff(moment(b.visitDate));
    });

    const totalPatients = await PatientVisitRecords.countDocuments(filterQuery);
    const paginatedPatients = patients.slice(skip, skip + limit);

    if (!patients.length) {
      return handleResponse(res, 200, "No patients found for assigned doctors");
    }

    // Fetch doctor names for compounder
    const doctorList = await Doctor.find({ _id: { $in: doctorIds } })
      .select("doctorName")
      .lean();

    return handleResponse(res, 200, "Patients fetched successfully", {
      doctorDetails: {
        doctors: doctorList,
        totalPatients,
      },
      patients: paginatedPatients,
      pagination: {
        total: totalPatients,
        page,
        limit,
        totalPages: Math.ceil(totalPatients / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching patients:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};
