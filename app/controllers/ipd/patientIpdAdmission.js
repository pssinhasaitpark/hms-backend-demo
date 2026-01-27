import Patient from "../../models/frontdesk/patient.js";
import Doctor from "../../models/user/doctor.js";
import PatientIPDAdmission from "../../models/ipd/patientIpdAdmission.js";
import { handleResponse } from "../../utils/responseHandler.js";
import { getOrCreateMobile } from "../frontdesk/patients.js";
import { getPagination } from "../../utils/pagination.js";
import Ward from "../../models/ipd/ward.js";
import mongoose from "mongoose";
import bed from "../../models/guest/bed.js";

/* export const admitIPDPatient = async (req, res) => {
  try {
    const frontDeskId = req.user._id;
    const hospitalId = req.user.hospitalId;

    const {
      patientId,
      patientName,
      phone,
      aadhar,
      age,
      gender,
      address,

      guardianName,
      guardianRelation,
      guardianMobile,

      doctor: doctorId,
      provisionalDiagnosis,
      procedureTreatment,
      remarks,
      wardType,
    } = req.body;

    // Handle mobile
    const mobile = await getOrCreateMobile(phone, frontDeskId);

    // Find or create patient
    let patient;
    if (patientId) {
      patient = await Patient.findById(patientId);
    }
    if (!patient) {
      patient = new Patient({
        patientName,
        mobile: mobile._id,
        aadhar,
        age,
        gender,
        address,
        visitCount: 0,
        currentPatientType: "REGULAR",
        hospital: hospitalId,
        createdBy: frontDeskId,
      });
      await patient.save();
    }

    // Validate doctor
    const doctor = await Doctor.findById(doctorId).populate("department");
    if (!doctor) throw new Error("Invalid doctor");

    // Assign ward and bed
    const { wardId, bedNumber } = await assignBed(wardType, hospitalId);

    // Create IPD Admission
    const ipdAdmission = new PatientIPDAdmission({
      patient: patient._id,
      patientSnapshot: {
        patientName: patient.patientName,
        mobile: mobile.phone,
        aadhar,
        age,
        gender,
        address,
      },
      guardian: {
        name: guardianName,
        relation: guardianRelation,
        mobile: guardianMobile,
      },
      doctor: doctor._id,
      department: doctor.department._id,
      provisionalDiagnosis,
      procedureTreatment,
      remarks,
      ward: wardId,
      bedNumber,
      wardType,
      hospital: hospitalId,
      createdBy: frontDeskId,
    });

    await ipdAdmission.save();

    return handleResponse(res, 201, "IPD patient admitted successfully", {
      patient,
      ipdAdmission,
    });
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, error.message);
  }
};  */

/* const assignBed = async (wardType, hospitalId) => {
  const ward = await Ward.findOne({
    wardType,
    hospital: hospitalId,
    "beds.status": "AVAILABLE",
  });

  if (!ward) throw new Error(`No available bed in ${wardType} ward`);

  const bed = ward.beds.find((b) => b.status === "AVAILABLE");
  if (!bed) throw new Error("No available bed found");

  // Mark bed as OCCUPIED
  bed.status = "OCCUPIED";
  await ward.save();

  return { wardId: ward._id, bedNumber: bed.bedNumber };
}; */

const occupyBed = async (wardId, bedId, hospitalId) => {
  const ward = await Ward.findOne({
    _id: wardId,
    hospital: hospitalId,
  });

  if (!ward) {
    throw new Error("Ward not found in this hospital");
  }

  const bed = ward.beds.id(bedId);

  if (!bed) {
    throw new Error(`Bed with ID ${bedId} does not exist in this ward`);
  }

  if (bed.status !== "AVAILABLE") {
    throw new Error(`Bed with ID ${bedId} is already occupied`);
  }

  bed.status = "OCCUPIED";
  await ward.save();

  return {
    wardId: ward._id,
    bedId: bed._id,
    wardType: ward.wardType,
  };
};

export const admitIPDPatient = async (req, res) => {
  try {
    const frontDeskId = req.user._id;
    const hospitalId = req.user.hospitalId;

    const {
      patientName,
      sdwoName,
      dob,
      age,
      gender,
      phone,
      aadhar,
      maritalStatus,
      occupation,
      address,
      country,
      state,
      city,
      pinCode,
      bloodGroup,

      guardianName,
      guardianRelation,
      guardianMobile,
      doctor: doctorId,
      provisionalDiagnosis,
      procedureTreatment,
      remarks,

      wardType,
      wardId,
      bedNumber,
    } = req.body;

    const doctor = await Doctor.findById(doctorId).populate("department");
    if (!doctor) throw new Error("Invalid doctor");

    let finalWardId;
    let finalBedNumber;

    if (wardId && bedNumber) {
      const occupied = await occupyBed(wardId, bedNumber, hospitalId);

      finalWardId = occupied.wardId;
      finalBedNumber = occupied.bedId;
    }

    const ipdAdmission = new PatientIPDAdmission({
      patientSnapshot: {
        patientName,
        sdwoName,
        dob,
        age,
        gender,
        mobile: phone,
        aadhar,
        maritalStatus,
        occupation,
        address,
        country,
        state,
        city,
        pinCode,
        bloodGroup,
        createdBy: req.user._id,
      },

      guardian: {
        name: guardianName,
        relation: guardianRelation,
        mobile: guardianMobile,
      },

      doctor: doctor._id,
      department: doctor.department._id,

      provisionalDiagnosis,
      procedureTreatment,
      remarks,

      ward: finalWardId,
      bedNumber: finalBedNumber,
      wardType,

      hospital: hospitalId,
      createdBy: frontDeskId,
    });

    await ipdAdmission.save();

    return handleResponse(
      res,
      201,
      "IPD patient admitted successfully",
      ipdAdmission
    );
  } catch (error) {
    console.error(error);
    return handleResponse(res, 400, error.message);
  }
};

export const getAllIPDAdmissions = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;
    const { wardType, doctorId, fromDate, toDate } = req.query;

    const filter = { hospital: hospitalId };

    if (wardType)
      filter.wardType = { $regex: new RegExp(`^${wardType}$`, "i") };
    if (doctorId) filter.doctor = doctorId;
    if (fromDate && toDate) {
      filter.admissionDate = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    }

    const { page, limit, skip } = getPagination(req);

    const [admissions, total] = await Promise.all([
      PatientIPDAdmission.find(filter)
        .populate({ path: "doctor", select: "doctorName" })
        .populate({ path: "department", select: "name" })
        .populate({ path: "ward", select: "wardName wardType" })
        .sort({ admissionDate: -1 })
        .skip(skip)
        .limit(limit),
      PatientIPDAdmission.countDocuments(filter),
    ]);
    const formattedAdmissions = admissions.map((admission) => {
      let wardInfo = null;

      if (admission.ward) {
        wardInfo = {
          wardName: admission.ward.wardName,
          wardType: admission.ward.wardType,
          assignedBedNumber: admission.bedNumber,
          // assignedBedStatus: admission.ward.beds
          //   ? admission.ward.beds.find(b => b._id.toString() === admission.bedId?.toString())?.status || "UNKNOWN"
          //   : "UNKNOWN",
        };
      }

      const obj = admission.toObject();
      delete obj.ward; // Remove full ward object
      return {
        ...obj,
        wardInfo,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return handleResponse(res, 200, "IPD admissions fetched", {
      admissions: formattedAdmissions,
      pagination: {
        total,
        page,
        totalPages,
        limit,
      },
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getIPDByPatientId = async (req, res) => {
  try {
    const { patientId } = req.params;
    const hospitalId = req.user.hospitalId;

    if (!patientId) return handleResponse(res, 400, "Patient ID is required");

    const ipdAdmissions = await PatientIPDAdmission.find({
      patient: patientId,
      hospital: hospitalId,
    })
      .populate({ path: "patient", select: "patientName patientId hospital" })
      .populate({ path: "doctor", select: "doctorName" })
      .populate({ path: "department", select: "name" })
      .populate({ path: "ward", select: "wardName wardType" })
      .sort({ admissionDate: -1 });

    if (!ipdAdmissions.length)
      return handleResponse(res, 404, "No IPD records found for this patient");

    const formattedAdmissions = ipdAdmissions.map((admission) => {
      let wardInfo = null;

      if (admission.ward) {
        wardInfo = {
          wardName: admission.ward.wardName,
          wardType: admission.ward.wardType,
          assignedBedNumber: admission.bedNumber,
          // assignedBedStatus: admission.ward.beds
          //   ? admission.ward.beds.find(b => b._id.toString() === admission.bedId?.toString())?.status || "UNKNOWN"
          //   : "UNKNOWN",
        };
      }

      const obj = admission.toObject();
      delete obj.ward;
      return {
        ...obj,
        wardInfo,
      };
    });

    return handleResponse(
      res,
      200,
      "IPD records fetched successfully",
      formattedAdmissions
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getIPDByIPDId = async (req, res) => {
  try {
    const { ipdId } = req.params;
    const hospitalId = req.user.hospitalId;

    if (!ipdId || !mongoose.Types.ObjectId.isValid(ipdId)) {
      return handleResponse(res, 400, "Valid IPD ID is required");
    }

    const ipdRecord = await PatientIPDAdmission.findOne({
      _id: ipdId,
      hospital: hospitalId,
    })
      .populate("patient", "patientName patientId mobile hospital")
      .populate("doctor", "doctorName")
      .populate("department", "name")
      .populate("ward", "wardName wardType");

    if (!ipdRecord) {
      return handleResponse(res, 404, "IPD record not found");
    }

    const obj = ipdRecord.toObject();

    const wardInfo = obj.ward
      ? {
          wardName: obj.ward.wardName,
          wardType: obj.ward.wardType,
          assignedBedNumber: obj.bedNumber,
        }
      : null;

    delete obj.ward;

    return handleResponse(res, 200, "IPD records fetched successfully", [
      {
        ...obj,
        wardInfo,
      },
    ]);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
