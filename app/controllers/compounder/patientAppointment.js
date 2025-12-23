import Patient from "../../models/frontdesk/patient.js";
import { handleResponse } from "../../utils/responseHandler.js";
import { getPagination } from "../../utils/pagination.js";
import PatientVisitRecords from "../../models/frontdesk/patientVisitRecords.js";

export const updatePatientAppointmentStatus = async (req, res) => {
  try {
    let { newStatus } = req.body;
    const { patientId } = req.params;

    newStatus = newStatus.toUpperCase().trim();

    const validStatuses = ["PENDING", "ONGOING", "COMPLETED"];

    if (!validStatuses.includes(newStatus)) {
      return handleResponse(res, 400, "Invalid status value");
    }

    const patientVisit = await PatientVisitRecords.findOne({ _id: patientId })
      .sort({ visitDate: -1 })
      .lean();

    if (!patientVisit) {
      return handleResponse(res, 404, "Patient visit record not found");
    }

    if (
      newStatus === "ONGOING" &&
      patientVisit.appointmentStatus !== "PENDING"
    ) {
      return handleResponse(
        res,
        400,
        "Status transition invalid: Can only move to 'ONGOING' from 'PENDING'"
      );
    }

    if (
      newStatus === "COMPLETED" &&
      patientVisit.appointmentStatus !== "ONGOING"
    ) {
      return handleResponse(
        res,
        400,
        "Status transition invalid: Can only move to 'COMPLETED' from 'ONGOING'"
      );
    }

    const updatedVisit = await PatientVisitRecords.findOneAndUpdate(
      { _id: patientVisit._id },
      { appointmentStatus: newStatus },
      { new: true }
    );

    return handleResponse(res, 200, "Status updated successfully", {
      visitId: updatedVisit.visitId,
      patientId: updatedVisit.patient.patientId,
      patientName: updatedVisit.patient.patientName,
      appointmentStatus: updatedVisit.appointmentStatus,
      visitDate: updatedVisit.visitDate,
    });
  } catch (error) {
    console.error("Error updating appointment status:", error);
    return handleResponse(res, 500, "Internal server error");
  }
};

/* export const getCompletedPatients = async (req, res) => {
  try {
    const { doctorId, search, date, page = 1, limit = 10 } = req.query;

    if (!doctorId) {
      return handleResponse(res, 400, "Doctor ID is required");
    }

    const { skip } = getPagination(req);

    let filterQuery = {
      doctor: doctorId,
      appointmentStatus: "COMPLETED",
    };

    if (search) {
      filterQuery.$or = [
        { patientName: { $regex: search, $options: "i" } },
        { patientId: { $regex: search, $options: "i" } },
      ];
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      filterQuery.visitDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const patients = await Patient.find(filterQuery)
      .populate("department", "name")
      .populate("mobile", "phone")
      .select(
        "patientName mobile appointmentStatus address gender age patientType patientId visitDate department"
      )
      .sort({ visitDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPatients = await Patient.countDocuments(filterQuery);

    if (patients.length === 0) {
      return handleResponse(
        res,
        200,
        "No completed patients found for this doctor"
      );
    }

    return handleResponse(res, 200, "Completed patients fetched successfully", {
      patients,
      pagination: {
        total: totalPatients,
        page,
        limit,
        totalPages: Math.ceil(totalPatients / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching completed patients:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
}; */

export const getCompletedPatients = async (req, res) => {
  try {
    const { doctorId, search, date, page = 1, limit = 10 } = req.query;

    if (!doctorId) {
      return handleResponse(res, 400, "Doctor ID is required");
    }

    const { skip } = getPagination(req);

    // Filter query for completed patient visits
    let filterQuery = {
      doctor: doctorId,
      appointmentStatus: "COMPLETED",
    };

    if (search) {
      filterQuery.$or = [
        { "patientSnapshot.patientName": { $regex: search, $options: "i" } },
        { "patientSnapshot.patientId": { $regex: search, $options: "i" } },
      ];
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      filterQuery.visitDate = { $gte: startOfDay, $lte: endOfDay };
    }

  
    const patients = await PatientVisitRecords.find(filterQuery)
      .populate("patient", "patientName patientId address gender age mobile") 
      .populate("doctor", "doctorName") 
      .populate("department", "name") 
      .select(
        "patientSnapshot doctorSnapshot departmentSnapshot visitDate appointmentStatus patientType"
      )
      .sort({ visitDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPatients = await PatientVisitRecords.countDocuments(filterQuery);

    if (patients.length === 0) {
      return handleResponse(
        res,
        200,
        "No completed patients found for this doctor"
      );
    }

    return handleResponse(res, 200, "Completed patients fetched successfully", {
      patients,
      pagination: {
        total: totalPatients,
        page,
        limit,
        totalPages: Math.ceil(totalPatients / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching completed patients:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};
