import EMR from "../../models/emr/emr.js";
import { handleResponse } from "../../utils/responseHandler.js";
import Vitals from "../../models/emr/vitals.js";
import patientVisitRecords from "../../models/frontdesk/patientVisitRecords.js";

export async function createEMRForVisit(visitDoc) {
  if (!visitDoc) throw new Error("Visit document is required for EMR");

  const existingEMR = await EMR.findOne({ visit: visitDoc._id });
  if (existingEMR) return existingEMR;

  const emr = new EMR({
    visit: visitDoc._id,
    patient: visitDoc.patient,
    encounterType: visitDoc.patientType === "PREPAID" ? "OPD" : "OPD",
    hospital: visitDoc.hospital,
    // status: "OPEN",
    latestVitalsSnapshot: {},
    investigations: [],
    diagnosis: [],
    prescription: [],
    clinicalNotes: "",
    audit: [],
  });

  emr.audit.push({
    section: "EMR",
    // action: isNew ? "CREATED" : "UPDATED",
    user: visitDoc.createdBy || userId,
    at: new Date(),
  });

  await emr.save();
  return emr;
}

export const getAllEMRs = async (req, res) => {
  try {
    const { encounterType, status } = req.query;
    const hospitalId = req.user.hospitalId;
    const query = {};
    if (hospitalId) query.hospital = hospitalId;
    if (encounterType) query.encounterType = encounterType;
    if (status) query.status = status;

    const emrs = await EMR.find(query)
      .populate({
        path: "patient",
        select: "patientName patientId mobile",
      })
      .populate({
        path: "visit",
        select: "visitId visitDate doctor department patient",
        populate: [
          { path: "doctor", select: "doctorName" },
          { path: "department", select: "name" },
          { path: "patient", select: "patientName mobile" }, // include patient info in visit
        ],
      })
      .populate("hospital", "hospital_name")
      .populate({
        path: "audit.user",
        select: "name role",
        populate: {
          path: "role",
          select: "name",
        },
      });

    // Optional: map visits to include patient info at top-level of visit
    const formattedEMRs = emrs.map((emr) => {
      const visit = emr.visit.toObject();
      visit.patientName = visit.patient?.patientName;
      visit.patientMobile = visit.patient?.mobile;
      delete visit.patient;
      delete visit.audit;

      return {
        ...emr.toObject(),
        visit,
      };
    });

    return handleResponse(res, 200, "All EMRs fetched successfully", {
      count: emrs.length,
      emrs: formattedEMRs,
    });
  } catch (error) {
    console.error("Error fetching all EMRs:", error);
    return handleResponse(res, 500, "Something went wrong", {
      error: error.message,
    });
  }
};

export const getEMRsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!patientId) return handleResponse(res, 400, "Patient ID is required");

    const emrs = await EMR.find({ patient: patientId })
      .populate("patient", "patientName patientId mobile")
      .populate("visit", "visitId visitDate doctor department")
      .populate("hospital", "name")
      .populate("audit.user", "name role");

    return handleResponse(res, 200, "EMRs fetched successfully", {
      count: emrs.length,
      emrs,
    });
  } catch (error) {
    console.error("Error fetching EMRs by patient:", error);
    return handleResponse(res, 500, "Something went wrong", {
      error: error.message,
    });
  }
};

export const getEMRByVisit = async (req, res) => {
  try {
    const { visitId } = req.params;
    if (!visitId) return handleResponse(res, 400, "Visit ID is required");

    const emr = await EMR.findOne({ visit: visitId })
      .populate("patient", "patientName patientId mobile")
      .populate("visit", "visitId visitDate doctor department")
      .populate("hospital", "name")
      .populate("audit.user", "name role");

    if (!emr) return handleResponse(res, 404, "EMR not found");

    return handleResponse(res, 200, "EMR fetched successfully", { emr });
  } catch (error) {
    console.error("Error fetching EMR by visit:", error);
    return handleResponse(res, 500, "Something went wrong", {
      error: error.message,
    });
  }
};

export const addVitals = async (req, res) => {
  try {
    const { visit, height, weight, pulse, spo2, temperature } = req.body;

    if (!visit) {
      return handleResponse(res, 400, "Visit ID is required");
    }

    const visitDoc = await patientVisitRecords.findById(visit);

    if (!visitDoc) {
      return handleResponse(res, 404, "Visit not found");
    }

    const emr = await EMR.findOne({ visit: visitDoc._id });

    if (!emr) {
      return handleResponse(res, 404, "EMR not found for this visit");
    }

    const vitals = await Vitals.create({
      visit: visitDoc._id,
      patient: visitDoc.patient,
      encounterType: emr.encounterType,
      height,
      weight,
      pulse,
      spo2,
      temperature,
      recordedBy: req.user._id,
      hospital: visitDoc.hospital,
    });

    emr.latestVitalsSnapshot = {
      height,
      weight,
      pulse,
      spo2,
      temperature,
      recordedAt: new Date(),
    };

    emr.audit.push({
      section: "VITALS",
      action: "VITALS_ADDED",
      user: req.user._id,
    });

    await emr.save();

    return handleResponse(res, 201, "Vitals added successfully", vitals);
  } catch (error) {
    console.error("Add vitals error:", error);
    return handleResponse(res, 500, "Internal server error", {
      error: error.message,
    });
  }
};

export const addInvestigation = async (req, res) => {
  try {
    const { visitId } = req.params;
    const { testName, department } = req.body;

    const emr = await EMR.findOneAndUpdate(
      { visit: visitId },
      {
        $push: {
          investigations: {
            testName,
            department,
            status: "ORDERED",
            updatedAt: new Date(),
            updatedBy: req.user._id,
          },
          audit: {
            section: "LAB",
            action: "INVESTIGATION_ORDERED",
            user: req.user._id,
          },
        },
      },
      { new: true }
    );

    return handleResponse(res, 200, "Investigation added", emr);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const addDiagnosis = async (req, res) => {
  const { visitId } = req.params;
  const { diagnosis } = req.body;

  const emr = await EMR.findOneAndUpdate(
    { visit: visitId },
    {
      $push: {
        diagnosis: {
          $each: Array.isArray(diagnosis) ? diagnosis : [diagnosis],
        },
        audit: {
          section: "DOCTOR",
          action: "DIAGNOSIS_ADDED",
          user: req.user._id,
        },
      },
    },
    { new: true }
  );

  return handleResponse(res, 200, "Diagnosis added", emr);
};

export const addPrescription = async (req, res) => {
  const { visitId } = req.params;
  const prescription = req.body;

  const emr = await EMR.findOneAndUpdate(
    { visit: visitId },
    {
      $push: {
        prescription: { $each: prescription },
        audit: {
          section: "DOCTOR",
          action: "PRESCRIPTION_ADDED",
          user: req.user._id,
        },
      },
    },
    { new: true }
  );

  return handleResponse(res, 200, "Prescription added", emr);
};

export const updateClinicalNotes = async (req, res) => {
  const { visitId } = req.params;
  const { clinicalNotes } = req.body;

  const emr = await EMR.findOneAndUpdate(
    { visit: visitId },
    {
      clinicalNotes,
      $push: {
        audit: {
          section: "DOCTOR",
          action: "NOTES_UPDATED",
          user: req.user._id,
        },
      },
    },
    { new: true }
  );

  return handleResponse(res, 200, "Clinical notes updated", emr);
};
