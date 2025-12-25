import Prescription from "../../models/compounder/prescription.js";
import { handleResponse } from "../../utils/responseHandler.js";
import PatientVisitRecords from "../../models/frontdesk/patientVisitRecords.js";
import mongoose from "mongoose";


export const createPrescription = async (req, res) => {
  try {
    const { patient, prescriptionNotes } = req.body || {};

    if (!req.user) {
      return handleResponse(res, 401, "You must be logged in as a compounder!");
    }

    const compounderId = req.user._id;

    if (!patient || !mongoose.Types.ObjectId.isValid(patient)) {
      return handleResponse(res, 400, "Invalid patient ID!");
    }

    let prescriptionFiles = [];

    if (Array.isArray(req.convertedFiles)) {
      prescriptionFiles = req.convertedFiles;
    } else if (req.convertedFiles && req.convertedFiles.images) {
      prescriptionFiles = req.convertedFiles.images;
    }

    if (req.convertedFiles && req.convertedFiles.audio_section_audio) {
      prescriptionFiles = [
        ...prescriptionFiles,
        ...req.convertedFiles.audio_section_audio,
      ];
    }

    // Create the prescription object
    const prescription = new Prescription({
      compounder: compounderId,
      patient, // Ensure patient is a valid ObjectId
      prescriptionNotes,
      prescriptionFile: prescriptionFiles.length > 0 ? prescriptionFiles : null,
      createdBy: req.user._id,
    });

    await prescription.save();

    const patientVisitRecord = await PatientVisitRecords.findOne({
      _id: patient,
    });
    if (
      patientVisitRecord &&
      patientVisitRecord.appointmentStatus !== "COMPLETED"
    ) {
      patientVisitRecord.appointmentStatus = "COMPLETED";
      await patientVisitRecord.save();
    }
    return handleResponse(res, 201, "Prescription created successfully!", {
      prescription,
    });
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, "Error creating prescription");
  }
};

export const getAllPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find()
      .populate("compounder", "name")
      .populate("patient", "patientName")
      .populate("createdBy", "name")
      .sort({ createdDate: -1 });

    return handleResponse(res, 200, "Prescriptions fetched successfully", {
      prescriptions,
    });
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, "Error fetching prescriptions");
  }
};

export const getPrescriptionById = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate("compounder", "name")
      .populate("patient", "patientName")
      .populate("createdBy", "name");

    if (!prescription) {
      return handleResponse(res, 404, "Prescription not found");
    }

    return handleResponse(res, 200, "Prescription fetched successfully", {
      prescription,
    });
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, "Error fetching prescription");
  }
};

export const updatePrescription = async (req, res) => {
  try {
    const { prescriptionNotes, prescriptionFile } = req.body;
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return handleResponse(res, 404, "Prescription not found");
    }

    if (prescription.createdBy.toString() !== req.user._id.toString()) {
      return handleResponse(
        res,
        403,
        "You do not have permission to update this prescription"
      );
    }

    prescription.prescriptionNotes =
      prescriptionNotes || prescription.prescriptionNotes;
    prescription.prescriptionFile =
      prescriptionFile || prescription.prescriptionFile;

    await prescription.save();

    return handleResponse(res, 200, "Prescription updated successfully", {
      prescription,
    });
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, "Error updating prescription");
  }
};

export const deletePrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return handleResponse(res, 404, "Prescription not found");
    }

    // Ensure the logged-in user is the creator
    if (
      !req.user?._id ||
      prescription.createdBy.toString() !== req.user._id.toString()
    ) {
      return handleResponse(
        res,
        403,
        "You do not have permission to delete this prescription"
      );
    }

    await Prescription.findByIdAndDelete(req.params.id);

    return handleResponse(res, 200, "Prescription deleted successfully");
  } catch (error) {
    console.error("Error deleting prescription:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};
