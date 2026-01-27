import Patient from "../../models/frontdesk/patient.js";
import { handleResponse } from "../../utils/responseHandler.js";
import Service from "../../models/departments/services.js";
import OpdRegistrationFee from "../../models/base/opdRegistrationFee.js";
import RegistrationFee from "../../models/base/registrationFees.js";
import MobileNumber from "../../models/frontdesk/mobileRegistration.js";
import Doctor from "../../models/user/doctor.js";
import DoctorService from "../../models/departments/doctorServices.js";
import PrepaidPackage from "../../models/frontdesk/prepaidPackage.js";
import PrepaidServiceUsage from "../../models/frontdesk/prepaidServiceUsage.js";
import Invoice from "../../models/frontdesk/invoiceReciept.js";
import { getPagination, getPaginatedResponse } from "../../utils/pagination.js";
import { updateAccountDailySummary } from "../../utils/accountDailySummary.js";
import { validateObjectId } from "../../utils/helper.js";
import DoctorAvailability from "../../models/departments/doctorAvailability.js";
import DoctorAttendance from "../../models/frontdesk/doctorAttendance.js";
import PatientVisitRecords from "../../models/frontdesk/patientVisitRecords.js";
import registrationFees from "../../models/base/registrationFees.js";
import Guest from "../../models/guest/guestDetails.js";
import IssuedToken from "../../models/guest/tokenIssues.js";
import Package from "../../models/departments/package.js";
import mongoose from "mongoose";
import Department from "../../models/departments/deparments.js";
import { withTransaction } from "../../utils/withTransaction.js";
import { createEMRForVisit } from "../emr/emr.js";

async function calculateServicesTotal(serviceIds, doctorId) {
  let totalFee = 0;
  let serviceEntries = [];
  let serviceSnapshot = [];

  if (!serviceIds?.length) return { totalFee, serviceEntries, serviceSnapshot };

  // Get services offered by the doctor
  const doctorServices = await DoctorService.find({
    doctor: doctorId,
  }).populate("service");
  const doctorServiceIds = doctorServices.map((ds) =>
    ds.service._id.toString()
  );

  // Validate requested services
  const invalidServices = serviceIds.filter(
    (sid) => !doctorServiceIds.includes(sid)
  );
  if (invalidServices.length) {
    throw new Error(
      `Selected services not offered by the doctor: ${invalidServices.join(
        ", "
      )}`
    );
  }

  // Fetch service details
  const serviceDocs = await Service.find({ _id: { $in: serviceIds } });

  serviceDocs.forEach((s) => {
    const totalPrice = s.charge; // Assuming quantity = 1
    totalFee += totalPrice;

    // Build serviceEntries for invoice
    serviceEntries.push({
      service: s._id,
      unitPrice: s.charge,
      quantity: 1,
      totalPrice,
    });

    // Build snapshot for visit record
    serviceSnapshot.push({
      serviceName: s.name,
      servicePrice: totalPrice,
    });
  });

  return { totalFee, serviceEntries, serviceSnapshot };
}

export const getOrCreateMobile = async (phone, frontDeskId) => {
  let mobile = await MobileNumber.findOne({ phone });

  if (!mobile) {
    mobile = new MobileNumber({ phone, createdBy: frontDeskId });
    await mobile.save();
  }

  return mobile;
};

async function handleNewPatient(req, res, frontDeskId, mobile) {
  const {
    patientName,
    doctor: doctorId,
    services: serviceIds,
    notes,
    paymentType,
    aadhar,
    samagra,
    ayushman,
    address,
    gender,
    age,
  } = req.body;

  const hospitalId = req.user.hospitalId;

  const doctorDoc = await Doctor.findById(doctorId).populate("department");
  if (!doctorDoc) throw new Error("Invalid doctor selected");

  const departmentId = doctorDoc.department._id;

  const regFeeDoc = await RegistrationFee.findOne({
    hospital: hospitalId,
  }).sort({ updatedAt: -1 });
  const registrationFee = regFeeDoc?.registrationFee || 0;

  const opdCharge = doctorDoc.department.opdCharge || 0;

  const {
    totalFee: serviceTotal,
    serviceEntries,
    serviceSnapshot,
  } = await calculateServicesTotal(serviceIds, doctorId);

  const totalFee = registrationFee + opdCharge + serviceTotal;

  const patient = new Patient({
    patientName,
    mobile: mobile._id,
    aadhar,
    samagra,
    ayushman,
    currentPatientType: "NEW",
    address,
    gender,
    age,
    paymentType,
    createdBy: frontDeskId,
    visitCount: 1,

    hospital: hospitalId,
  });

  patient.lastDoctor = doctorId;
  patient.lastVisitDate = new Date();

  await patient.save();

  const visitRecord = new PatientVisitRecords({
    patient: patient._id,
    patientSnapshot: {
      patientName,
      mobile: mobile.phone,
      aadhar,
      samagra,
      ayushman,
      address,
      gender,
      age,
    },
    doctor: doctorId,
    department: departmentId,
    service: serviceIds || [],
    doctorSnapshot: {
      doctorName: doctorDoc.doctorName,
      specialization: doctorDoc.specialization,
    },
    departmentSnapshot: { departmentName: doctorDoc.department.name },
    serviceSnapshot,
    registrationFee,
    opdCharge,
    serviceCharge: serviceTotal,
    totalFee,
    paymentType,
    notes,
    opdPaid: true,
    patientType: "NEW",
    createdBy: frontDeskId,
    hospital: hospitalId,
  });

  await visitRecord.save();

  if (paymentType === "CASH") {
    await updateAccountDailySummary(
      frontDeskId,
      totalFee,
      0,
      0,
      0,
      0,
      0,
      hospitalId
    );
  } else {
    await updateAccountDailySummary(
      frontDeskId,
      0,
      totalFee,
      0,
      0,
      0,
      0,
      hospitalId
    );
  }

  const invoice = new Invoice({
    patient: patient._id,
    registrationFee,
    opdCharge,
    items: serviceEntries,
    totalAmount: totalFee,
    paymentType,
    patientType: "NEW",
    createdBy: frontDeskId,
  });

  await invoice.save();

  const emr = await createEMRForVisit(visitRecord);

  return {
    patient,
    visitRecord,
    invoice,
    emr,
  };
}

/* 
transaction manage
async function handleNewPatient(req, res, frontDeskId, mobile) {
  return withTransaction(async (session) => {
    const {
      patientName,
      doctor: doctorId,
      services: serviceIds,
      notes,
      paymentType,
      aadhar,
      samagra,
      ayushman,
      address,
      gender,
      age,
    } = req.body;

    const hospitalId = req.user.hospitalId;

    const doctorDoc = await Doctor.findById(doctorId)
      .populate("department")
      .session(session);

    if (!doctorDoc) throw new Error("Invalid doctor selected");

    const departmentId = doctorDoc.department._id;

    const regFeeDoc = await RegistrationFee.findOne({
      hospital: hospitalId,
    })
      .sort({ updatedAt: -1 })
      .session(session);

    const registrationFee = regFeeDoc?.registrationFee || 0;
    const opdCharge = doctorDoc.department.opdCharge || 0;

    const {
      totalFee: serviceTotal,
      serviceEntries,
      serviceSnapshot,
    } = await calculateServicesTotal(serviceIds, doctorId);

    const totalFee = registrationFee + opdCharge + serviceTotal;

    const patient = new Patient({
      patientName,
      mobile: mobile._id,
      aadhar,
      samagra,
      ayushman,
      address,
      gender,
      age,
      paymentType,
      currentPatientType: "NEW",
      visitCount: 1,
      createdBy: frontDeskId,
      hospital: hospitalId,
      lastDoctor: doctorId,
      lastVisitDate: new Date(),
    });

    await patient.save({ session });

    const visitRecord = new PatientVisitRecords({
      patient: patient._id,
      patientSnapshot: {
        patientName,
        mobile: mobile.phone,
        aadhar,
        samagra,
        ayushman,
        address,
        gender,
        age,
      },
      doctor: doctorId,
      department: departmentId,
      service: serviceIds || [],
      doctorSnapshot: {
        doctorName: doctorDoc.doctorName,
        specialization: doctorDoc.specialization,
      },
      departmentSnapshot: { departmentName: doctorDoc.department.name },
      serviceSnapshot,
      registrationFee,
      opdCharge,
      serviceCharge: serviceTotal,
      totalFee,
      paymentType,
      notes,
      opdPaid: true,
      patientType: "NEW",
      createdBy: frontDeskId,
      hospital: hospitalId,
    });

    await visitRecord.save({ session });

    await updateAccountDailySummary(
      frontDeskId,
      paymentType === "CASH" ? totalFee : 0,
      paymentType === "ONLINE" ? totalFee : 0,
      0,
      0,
      0,
      0,
      hospitalId,
      session
    );

    const invoice = new Invoice({
      patient: patient._id,
      registrationFee,
      opdCharge,
      items: serviceEntries,
      totalAmount: totalFee,
      paymentType,
      patientType: "NEW",
      createdBy: frontDeskId,
    });

    await invoice.save({ session });

    return { patient, visitRecord, invoice };
  });
} */

async function handleFollowupPatient(req, res, frontDeskId, mobile) {
  const {
    patientId,
    doctor: newDoctorId,
    services: serviceIds,
    notes,
    paymentType,
    aadhar,
    samagra,
    ayushman,
    address,
  } = req.body;

  const hospitalId = req.user.hospitalId;

  const patient = await Patient.findById(patientId).populate("mobile");
  if (!patient) throw new Error("Patient not found");
  if (!patient.mobile?.phone) throw new Error("Patient mobile missing");

  let doctor = null;
  let isDoctorChanged = false;

  if (newDoctorId) {
    doctor = await Doctor.findById(newDoctorId).populate("department");
    if (!doctor) throw new Error("Selected doctor not found");

    if (
      !patient.lastDoctor ||
      patient.lastDoctor.toString() !== doctor._id.toString()
    ) {
      isDoctorChanged = true;
    }
  } else {
    doctor = await Doctor.findById(patient.lastDoctor).populate("department");
    if (!doctor) throw new Error("No last doctor record found");
  }

  if (aadhar) patient.aadhar = aadhar;
  if (samagra) patient.samagra = samagra;
  if (ayushman) patient.ayushman = ayushman;
  if (address) patient.address = address;

  const departmentOpdCharge = doctor?.department?.opdCharge ?? 0;

  const lastPaidOpdVisit = await PatientVisitRecords.findOne({
    patient: patient._id,
    doctor: doctor._id,
    opdPaid: true,
  })
    .sort({ visitDate: -1 })
    .limit(1);

  let patientTypeForVisit = "REGULAR";
  let opdCharge = departmentOpdCharge;
  let opdPaid = true;

  if (lastPaidOpdVisit) {
    const diffInDays =
      (new Date() - new Date(lastPaidOpdVisit.visitDate)) /
      (1000 * 60 * 60 * 24);

    if (diffInDays <= 8) {
      patientTypeForVisit = "FOLLOWUP";
      opdCharge = 0;
      opdPaid = false;
    }
  }

  // if (lastPaidOpdVisit) {
  //   const diffInMs = new Date() - new Date(lastPaidOpdVisit.visitDate);

  //   const oneMinuteInMs = 1 * 60 * 1000; // 1 minute

  //   if (diffInMs <= oneMinuteInMs) {
  //     // Within 1 minute → FOLLOWUP, no OPD charge
  //     patientTypeForVisit = "FOLLOWUP";
  //     opdCharge = 0;
  //     opdPaid = false;
  //   }
  // }

  patient.visitCount += 1;
  patient.currentPatientType = patientTypeForVisit;
  await patient.save();

  const {
    totalFee: serviceTotal,
    serviceEntries,
    serviceSnapshot,
  } = await calculateServicesTotal(serviceIds, doctor._id);

  const finalTotal = opdCharge + serviceTotal;

  if (paymentType === "CASH") {
    await updateAccountDailySummary(
      frontDeskId,
      finalTotal,
      0,
      0,
      0,
      0,
      0,
      hospitalId
    );
  } else {
    await updateAccountDailySummary(
      frontDeskId,
      0,
      finalTotal,
      0,
      0,
      0,
      0,
      hospitalId
    );
  }

  const invoice = new Invoice({
    patient: patient._id,
    registrationFee: 0,
    opdCharge,
    items: serviceEntries,
    totalAmount: finalTotal,
    paymentType,
    patientType: patientTypeForVisit,
    createdBy: frontDeskId,
  });
  await invoice.save();

  const visitRecord = new PatientVisitRecords({
    patient: patient._id,
    patientSnapshot: {
      patientName: patient.patientName,
      mobile: patient.mobile.phone,
      aadhar: patient.aadhar,
      samagra: patient.samagra,
      ayushman: patient.ayushman,
      address: patient.address,
      gender: patient.gender,
    },
    doctor: doctor._id,
    department: doctor.department._id,
    service: serviceIds || [],
    doctorSnapshot: {
      doctorName: doctor.doctorName,
      specialization: doctor.specialization,
    },
    departmentSnapshot: {
      departmentName: doctor.department.name,
    },
    serviceSnapshot,
    registrationFee: 0,
    opdCharge,
    opdPaid,
    serviceCharge: serviceTotal,
    totalFee: finalTotal,
    paymentType,
    notes,
    patientType: patientTypeForVisit,
    createdBy: frontDeskId,
    hospital: hospitalId,
  });

  await visitRecord.save();

  patient.lastDoctor = doctor._id;
  patient.lastVisitDate = new Date();
  await patient.save();
  const emr = await createEMRForVisit(visitRecord);

  return { patient, visitRecord, invoice, emr };
}

async function handlePrepaidPatient(req, res, frontDeskId, mobile) {
  try {
    const {
      patientType,
      patientId,
      patientName,
      doctor: doctorId,
      prepaidPackageId,
      paymentType,
      aadhar,
      samagra,
      ayushman,
      age,
      address,
      gender,
    } = req.body;
    const hospitalId = req.user.hospitalId;

    if (!prepaidPackageId) {
      return { error: true, message: "Prepaid package ID is required" };
    }

    if (!validateObjectId(prepaidPackageId)) {
      return { error: true, message: "Invalid package ID" };
    }

    const packageDoc = await Package.findById(prepaidPackageId).populate(
      "services department"
    );
    if (!packageDoc) {
      return { error: true, message: "Invalid package selected" };
    }

    const doctorDoc = await Doctor.findById(doctorId).populate("department");
    if (!doctorDoc) {
      return { error: true, message: "Invalid doctor selected" };
    }

    const departmentId = doctorDoc.department._id;

    let patient;
    let isNewPatient = false;

    if (patientId) {
      patient = await Patient.findById(patientId);
    }

    if (patient) {
      const existingPackage = await PrepaidPackage.findOne({
        patient: patient._id,
        department: departmentId,
        isFullyUsed: false,
        expireOn: { $gte: new Date() },
      });

      if (existingPackage) {
        return {
          error: true,
          message:
            "The patient already has an active prepaid package from this department. Complete it before purchasing a new one.",
        };
      }
    }

    // CHARGES
    let registrationFee = 0;
    let opdCharge = doctorDoc.department.opdCharge || 0;
    let totalFee = packageDoc.price;
    let opdPaid = true; // default assume OPD will be paid

    // NEW PATIENT CASE
    if (!patient) {
      isNewPatient = true;

      const regFeeDoc = await RegistrationFee.findOne({
        hospital: hospitalId,
      }).sort({ updatedAt: -1 });
      registrationFee = regFeeDoc?.registrationFee || 0;

      totalFee += registrationFee + opdCharge;

      patient = new Patient({
        patientName,
        mobile: mobile._id,
        currentPatientType: "PREPAID",
        visitCount: 1,
        lastDoctor: doctorId,
        lastVisitDate: new Date(),
        aadhar,
        samagra,
        ayushman,
        age,
        address,
        gender,
        createdBy: frontDeskId,
        hospital: hospitalId,
      });

      await patient.save();
    } else {
      patient.currentPatientType = "PREPAID";

      registrationFee = 0;

      const lastPaidOpdVisit = await PatientVisitRecords.findOne({
        patient: patient._id,
        doctor: doctorId,
        opdPaid: true,
      }).sort({ visitDate: -1 });

      const now = new Date();
      let addOpdFee = true;

      if (lastPaidOpdVisit) {
        const daysSinceLastVisit =
          (now - lastPaidOpdVisit.visitDate) / (1000 * 60 * 60 * 24);

        if (daysSinceLastVisit <= 8) {
          addOpdFee = false;
          opdCharge = 0;
          opdPaid = false;
        }
      }

      // if (lastPaidOpdVisit) {
      //   const diffInMs = now - new Date(lastPaidOpdVisit.visitDate);
      //   const oneMinuteInMs = 1 * 60 * 1000; // 1 minute

      //   if (diffInMs <= oneMinuteInMs) {
      //     addOpdFee = false;
      //     opdCharge = 0;
      //     opdPaid = false; // OPD not charged because within 1 minute
      //   }
      // }

      if (addOpdFee) totalFee += opdCharge;

      patient.lastVisitDate = now;
      patient.lastDoctor = doctorId;

      await patient.save();
    }

    const prepaidPackage = new PrepaidPackage({
      patient: patient._id,
      package: packageDoc._id,
      totalVisits: packageDoc.noOfDays,
      usedVisits: 0,
      doctor: doctorId,
      department: departmentId,
      totalFee,
      paymentType,
      doctorSnapshot: {
        doctorName: doctorDoc.doctorName,
        specialization: doctorDoc.specialization,
        departmentName: doctorDoc.department.name,
      },
      createdBy: frontDeskId,
    });

    await prepaidPackage.save();

    const patientCash = paymentType === "CASH" ? totalFee : 0;
    const patientOnline = paymentType === "ONLINE" ? totalFee : 0;

    // await updateAccountDailySummary(
    //   frontDeskId,
    //   patientCash,
    //   patientOnline,
    //   hospitalId
    // );

    await updateAccountDailySummary(
      frontDeskId,
      patientCash,
      patientOnline,
      0,
      0,
      0,
      0,
      hospitalId
    );

    const invoice = new Invoice({
      patient: patient._id,
      prepaidPackage: prepaidPackage._id,
      patientType: "PREPAID",
      registrationFee,
      opdCharge,
      totalAmount: totalFee,
      paymentType,
      createdBy: frontDeskId,
    });

    await invoice.save();

    const visitRecord = new PatientVisitRecords({
      patient: patient._id,
      patientSnapshot: {
        patientName,
        mobile: mobile.phone,
        aadhar,
        samagra,
        ayushman,
      },
      doctor: doctorId,
      department: departmentId,
      service: packageDoc.services.map((s) => s._id),
      doctorSnapshot: {
        doctorName: doctorDoc.doctorName,
        specialization: doctorDoc.specialization,
      },
      departmentSnapshot: { departmentName: doctorDoc.department.name },
      serviceSnapshot: packageDoc.services.map((s) => ({
        serviceName: s.name,
        servicePrice: s.charge,
      })),
      registrationFee,
      opdCharge,
      opdPaid,
      serviceCharge: packageDoc.price,
      totalFee,
      paymentType,
      notes: "Prepaid package created",
      patientType: isNewPatient ? "NEW" : "PREPAID",
      createdBy: frontDeskId,
      hospital: hospitalId,
    });

    await visitRecord.save();
    const emr = await createEMRForVisit(visitRecord);

    return { patient, prepaidPackage, invoice, visitRecord, emr };
  } catch (error) {
    return { error: true, message: error.message };
  }
}

export const createOrAddVisit = async (req, res) => {
  try {
    const frontDeskId = req.user._id;
    const { patientType: requestedPatientType, phone } = req.body;

    let mobile;

    if (requestedPatientType !== "FOLLOWUP") {
      if (!phone) return handleResponse(res, 400, "Phone number is required");

      const existingPatient = await Patient.findOne().populate({
        path: "mobile",
        match: { phone },
      });

      if (existingPatient && existingPatient.mobile) {
        mobile = existingPatient.mobile;
      } else {
        mobile = await getOrCreateMobile(phone, frontDeskId);
      }
    }

    let result;
    switch (requestedPatientType) {
      case "NEW":
        result = await handleNewPatient(req, res, frontDeskId, mobile);
        break;
      case "FOLLOWUP":
        result = await handleFollowupPatient(req, res, frontDeskId, mobile);
        break;
      case "PREPAID":
        result = await handlePrepaidPatient(req, res, frontDeskId, mobile);
        if (result?.error) {
          return handleResponse(res, 400, result.message);
        }
        break;
      default:
        return handleResponse(res, 400, "Invalid patientType");
    }

    return handleResponse(
      res,
      201,
      `${requestedPatientType} patient processed successfully`,
      result
    );
  } catch (error) {
    console.error("Error in createOrAddVisit:", error);
    return handleResponse(res, 500, "Something went wrong", {
      error: error.message,
    });
  }
};

export const usePrepaidPackage = async (req, res) => {
  try {
    const frontDeskId = req.user._id;
    const {
      prepaidPackageId,
      aadhar,
      samagra,
      ayushman,
      doctorId,
      paymentType = "CASH",
    } = req.body;

    if (!prepaidPackageId)
      return handleResponse(res, 400, "prepaidPackageId is required");

    const prepaidPkg = await PrepaidPackage.findById(prepaidPackageId)
      .populate("package")
      .populate("patient");

    if (!prepaidPkg)
      return handleResponse(res, 404, "Prepaid package not found");

    const patient = prepaidPkg.patient;
    if (!patient) return handleResponse(res, 404, "Patient not found");

    const currentDate = new Date();
    if (prepaidPkg.expireOn && currentDate > prepaidPkg.expireOn) {
      return handleResponse(
        res,
        400,
        "The prepaid package has expired, services cannot be used"
      );
    }

    let updated = false;
    if (aadhar !== undefined) (patient.aadhar = aadhar), (updated = true);
    if (samagra !== undefined) (patient.samagra = samagra), (updated = true);
    if (ayushman !== undefined) (patient.ayushman = ayushman), (updated = true);
    if (updated) await patient.save();

    if (prepaidPkg.usedVisits >= prepaidPkg.totalVisits) {
      return handleResponse(
        res,
        400,
        "All visits of this prepaid package have been used"
      );
    }

    prepaidPkg.usedVisits += 1;
    await prepaidPkg.save();

    const packageServices = prepaidPkg.package.services || [];

    const servicesUsed = packageServices.map((serviceId) => ({
      service: serviceId,
      quantity: 1,
    }));

    const usageRecord = await PrepaidServiceUsage.create({
      patient: prepaidPkg.patient._id,
      prepaidPackage: prepaidPkg._id,
      package: prepaidPkg.package._id,
      doctor: prepaidPkg.doctor._id,
      servicesUsed,
      notes: "Prepaid service used",
      createdBy: frontDeskId,
    });

    const invoiceItems = servicesUsed.map((s) => ({
      service: s.service,
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    }));

    const invoice = await Invoice.create({
      patient: prepaidPkg.patient._id,
      prepaidPackage: prepaidPkg._id,
      patientType: "PREPAID",
      items: invoiceItems,
      registrationFee: 0,
      opdCharge: 0,
      totalAmount: 0,
      paymentType,
      createdBy: frontDeskId,
    });

    return handleResponse(res, 200, "Prepaid services used successfully", {
      usageRecord,
      invoice,
      remainingVisits: prepaidPkg.totalVisits - prepaidPkg.usedVisits,
    });
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, "Something went wrong", {
      error: error.message,
    });
  }
};

export const getAllPatients = async (req, res) => {
  try {
    const { search, date, department, doctorId } = req.query;
    const { page, limit, skip } = getPagination(req);

    const hospitalId = req.user.hospitalId; // Hospital filter

    let mobileFilter = {};
    let nameFilter = {};

    if (search) {
      mobileFilter = { phone: { $regex: search, $options: "i" } };
      nameFilter = { patientName: { $regex: search, $options: "i" } };
    }

    const mobiles = await MobileNumber.find(mobileFilter);

    const patientsByName = await Patient.find({
      hospital: hospitalId,
      ...nameFilter,
    });

    let patientsByMobile = [];
    if (mobiles.length) {
      const mobileIds = mobiles.map((m) => m._id);
      patientsByMobile = await Patient.find({
        hospital: hospitalId,
        mobile: { $in: mobileIds },
      });
    }

    const allPatients = [...patientsByName, ...patientsByMobile];
    const uniquePatientIds = [
      ...new Set(allPatients.map((p) => p._id.toString())),
    ];

    if (!uniquePatientIds.length) {
      return handleResponse(res, 200, "No patients found", {
        patients: [],
        page,
        limit,
        totalPages: 0,
        totalItems: 0,
      });
    }

    let dateFilter = {};
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      dateFilter.createdAt = { $gte: start, $lte: end };
    }

    let departmentFilteredPatientIds = uniquePatientIds;

    if (department) {
      const visits = await PatientVisitRecords.find({
        hospital: hospitalId,
        patient: { $in: uniquePatientIds },
        department,
      }).select("patient");

      const filtered = [...new Set(visits.map((v) => v.patient.toString()))];
      departmentFilteredPatientIds = filtered;

      if (!filtered.length) {
        return handleResponse(res, 200, "No patients found", {
          patients: [],
          page,
          limit,
          totalPages: 0,
          totalItems: 0,
        });
      }
    }

    let doctorFilteredPatientIds = departmentFilteredPatientIds;

    if (doctorId) {
      const visits = await PatientVisitRecords.find({
        hospital: hospitalId,
        patient: { $in: departmentFilteredPatientIds },
        doctor: doctorId,
      }).select("patient");

      const filteredByDoctor = [
        ...new Set(visits.map((v) => v.patient.toString())),
      ];
      doctorFilteredPatientIds = filteredByDoctor;

      if (!filteredByDoctor.length) {
        return handleResponse(res, 200, "No patients found", {
          patients: [],
          page,
          limit,
          totalPages: 0,
          totalItems: 0,
        });
      }
    }

    const totalItems = await Patient.countDocuments({
      _id: { $in: doctorFilteredPatientIds },
      hospital: hospitalId,
      ...dateFilter,
    });

    const patients = await Patient.find({
      _id: { $in: doctorFilteredPatientIds },
      hospital: hospitalId,
      ...dateFilter,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("mobile", "phone _id")
      .populate("lastDoctor", "doctorName");

    const patientIds = patients.map((p) => p._id);

    const prepaidPackages = await PrepaidPackage.find({
      hospital: hospitalId,
      patient: { $in: patientIds },
    }).populate("package", "name price noOfDays expireOn");

    const prepaidMap = {};
    prepaidPackages.forEach((pkg) => {
      prepaidMap[pkg.patient._id.toString()] = pkg;
    });

    const invoices = await Invoice.find({
      // hospital: hospitalId,
      patient: { $in: patientIds },
    })
      .sort({ issuedAt: -1 })
      .select("patient totalAmount paymentType issuedAt");

    const latestInvoiceMap = {};
    const latestPaymentMap = {};

    invoices.forEach((inv) => {
      const pid = inv.patient.toString();
      if (!latestInvoiceMap[pid]) {
        latestInvoiceMap[pid] = inv.totalAmount;
        latestPaymentMap[pid] = inv.paymentType || "N/A";
      }
    });

    const grouped = {};
    for (let patient of patients) {
      const mobilePhone = patient.mobile?.phone || "N/A";
      if (!grouped[mobilePhone]) grouped[mobilePhone] = [];

      const prepaid = prepaidMap[patient._id.toString()] || null;
      const latestInvoiceAmount = latestInvoiceMap[patient._id.toString()] || 0;
      const latestPaymentMethod =
        latestPaymentMap[patient._id.toString()] || "N/A";

      const latestVisit = await PatientVisitRecords.findOne({
        hospital: hospitalId,
        patient: patient._id,
      })
        .sort({ visitDate: -1 })
        .populate("department", "departmentName");

      const latestDepartment =
        latestVisit?.departmentSnapshot?.departmentName || "N/A";

      grouped[mobilePhone].push({
        ...patient.toObject(),
        mobileId: patient.mobile?._id,
        prepaidPackage: prepaid
          ? {
              id: prepaid._id,
              packageId: prepaid.packageId,
              packageName: prepaid.package?.name,
              totalVisits: prepaid.totalVisits,
              usedVisits: prepaid.usedVisits,
              totalFee: prepaid.totalFee,
              paymentType: prepaid.paymentType,
              startDate: prepaid.startDate,
              expireOn: prepaid.expireOn,
            }
          : null,
        latestInvoiceAmount,
        latestPaymentMethod,
        latestDepartment,
      });
    }

    Object.keys(grouped).forEach((phone) => {
      grouped[phone].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    });

    let result = Object.keys(grouped)
      .map((phone) => ({
        mobile: phone,
        mobileId: grouped[phone][0].mobileId,
        patients: grouped[phone],
        latestDate: grouped[phone][0].createdAt,
      }))
      .sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate));

    result = result.map((item) => {
      delete item.latestDate;
      return item;
    });

    return handleResponse(res, 200, "Patients fetched successfully", {
      patients: result,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
    });
  } catch (error) {
    console.error("❌ Error in getAllPatients:", error);
    return handleResponse(res, 500, "Something went wrong", {
      error: error.message,
    });
  }
};


export const getAllPatientsForAdmin = async (req, res) => {
  try {
    const { search, date } = req.query;
    const { page, limit, skip } = getPagination(req);

    const hospitalId = req.user._id;

    let mobileFilter = {};
    let nameFilter = {};
    let dateFilter = {};

    if (search) {
      mobileFilter = { phone: { $regex: search, $options: "i" } };
      nameFilter = { patientName: { $regex: search, $options: "i" } };
    }

    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        dateFilter = {
          createdAt: {
            $gte: new Date(parsedDate.setHours(0, 0, 0, 0)),
            $lt: new Date(parsedDate.setHours(23, 59, 59, 999)),
          },
        };
      } else {
        return handleResponse(res, 400, "Invalid date format");
      }
    }

    const mobiles = await MobileNumber.find(mobileFilter);
    const patientsByName = await Patient.find({
      hospital: hospitalId,
      ...nameFilter,
      ...dateFilter,
    });

    let patientsByMobile = [];
    if (mobiles.length) {
      const mobileIds = mobiles.map((m) => m._id);
      patientsByMobile = await Patient.find({
        hospital: hospitalId,
        mobile: { $in: mobileIds },
        ...dateFilter,
      });
    }

    const allPatients = [...patientsByName, ...patientsByMobile];
    const uniquePatientIds = [
      ...new Set(allPatients.map((p) => p._id.toString())),
    ];

    if (!uniquePatientIds.length) {
      return handleResponse(res, 200, "No patients found", {
        patients: [],
        page,
        limit,
        totalPages: 0,
        totalItems: 0,
      });
    }

    const totalItems = await Patient.countDocuments({
      _id: { $in: uniquePatientIds },
      hospital: hospitalId,
    });

    const patients = await Patient.find({
      _id: { $in: uniquePatientIds },
      hospital: hospitalId,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("mobile", "phone _id")
      .populate("lastDoctor", "doctorName");

    const patientIds = patients.map((p) => p._id);

    const prepaidPackages = await PrepaidPackage.find({
      hospital: hospitalId,
      patient: { $in: patientIds },
    }).populate("package", "name price noOfDays expireOn");

    const prepaidMap = {};
    prepaidPackages.forEach((pkg) => {
      prepaidMap[pkg.patient._id.toString()] = pkg;
    });

    const invoices = await Invoice.find({
      hospital: hospitalId,
      patient: { $in: patientIds },
    })
      .sort({ issuedAt: -1 })
      .select("patient totalAmount paymentType issuedAt");

    const latestInvoiceMap = {};
    const latestPaymentMap = {};
    invoices.forEach((inv) => {
      const pid = inv.patient.toString();
      if (!latestInvoiceMap[pid]) {
        latestInvoiceMap[pid] = inv.totalAmount;
        latestPaymentMap[pid] = inv.paymentType || "N/A";
      }
    });

    const grouped = {};
    for (let patient of patients) {
      const mobilePhone = patient.mobile?.phone || "N/A";
      if (!grouped[mobilePhone]) grouped[mobilePhone] = [];

      const prepaid = prepaidMap[patient._id.toString()] || null;
      const latestInvoiceAmount = latestInvoiceMap[patient._id.toString()] || 0;
      const latestPaymentMethod =
        latestPaymentMap[patient._id.toString()] || "N/A";

      const latestVisit = await PatientVisitRecords.findOne({
        hospital: hospitalId,
        patient: patient._id,
      })
        .sort({ visitDate: -1 })
        .populate("department", "departmentName");

      const latestDepartment = latestVisit?.department?.departmentName || "N/A";

      grouped[mobilePhone].push({
        ...patient.toObject(),
        mobileId: patient.mobile?._id,
        prepaidPackage: prepaid
          ? {
              id: prepaid._id,
              packageId: prepaid.packageId,
              packageName: prepaid.package?.name,
              totalVisits: prepaid.totalVisits,
              usedVisits: prepaid.usedVisits,
              totalFee: prepaid.totalFee,
              paymentType: prepaid.paymentType,
              startDate: prepaid.startDate,
              expireOn: prepaid.expireOn,
            }
          : null,
        latestInvoiceAmount,
        latestPaymentMethod,
        latestDepartment,
      });
    }

    Object.keys(grouped).forEach((phone) => {
      grouped[phone].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    });

    let result = Object.keys(grouped)
      .map((phone) => ({
        mobile: phone,
        mobileId: grouped[phone][0].mobileId,
        patients: grouped[phone],
        latestDate: grouped[phone][0].createdAt,
      }))
      .sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate));

    result = result.map((item) => {
      delete item.latestDate;
      return item;
    });

    return handleResponse(res, 200, "Patients fetched successfully", {
      patients: result,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
    });
  } catch (error) {
    console.error("❌ Error in getAllPatientsForAdmin:", error);
    return handleResponse(res, 500, "Something went wrong", {
      error: error.message,
    });
  }
};

export const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return handleResponse(res, 400, "Patient ID is required");
    const hospitalId = req.user.hospitalId;

    const patient = await Patient.findOne({
      $or: [{ _id: id }, { patientId: id }],
      hospital: hospitalId,
    })
      .populate("mobile", "phone")
      .populate("lastDoctor", "doctorName");

    if (!patient) return handleResponse(res, 404, "Patient not found");

    const patientObj = patient.toObject();
    const lastDoctorSnapshot = patientObj.lastDoctor
      ? {
          id: patientObj.lastDoctor._id,
          doctorName: patientObj.lastDoctor.doctorName,
        }
      : null;

    const invoices = await Invoice.find({ patient: patient._id })
      .sort({ createdAt: -1 })
      .populate("items.service", "name charge")
      .populate(
        "prepaidPackage",
        "packageId totalFee totalVisits usedVisits doctorSnapshot doctor expireOn package"
      )
      .select(
        "invoiceId transactionId totalAmount paymentType registrationFee status issuedAt patientType items prepaidPackage opdCharge"
      );

    const formattedInvoices = await Promise.all(
      invoices.map(async (inv) => {
        const createdAt = inv.issuedAt || inv.createdAt;
        const expiresAt = new Date(createdAt);
        expiresAt.setDate(expiresAt.getDate() + 7);

        const now = new Date();
        let remainingDays = Math.ceil(
          (expiresAt - now) / (1000 * 60 * 60 * 24)
        );
        let expiryMessage = "";

        if (remainingDays > 7)
          (remainingDays = 7), (expiryMessage = "7 days left");
        else if (remainingDays > 1)
          expiryMessage = `${remainingDays} days left`;
        else if (remainingDays === 1) expiryMessage = "1 day left";
        else if (remainingDays === 0) expiryMessage = "Expires today";
        else expiryMessage = "Expired";

        let packageDetails = null;
        if (inv.prepaidPackage) {
          packageDetails = await mongoose
            .model("Package")
            .findById(inv.prepaidPackage.package)
            .select("name");
        }

        return {
          id: inv._id,
          invoiceId: inv.invoiceId,
          transactionId: inv.transactionId,
          patientType: inv.patientType,
          totalAmount: inv.totalAmount,
          opdCharge: inv.opdCharge,
          paymentType: inv.paymentType,
          registrationFee: inv.registrationFee,
          status: inv.status,
          issuedAt: inv.issuedAt,
          expiresAt,
          remainingDays,
          expiryMessage,

          prepaidPackage: inv.prepaidPackage
            ? {
                id: inv.prepaidPackage._id,
                packageId: inv.prepaidPackage.packageId,
                totalFee: inv.prepaidPackage.totalFee,
                totalVisits: inv.prepaidPackage.totalVisits,
                usedVisits: inv.prepaidPackage.usedVisits,
                doctorId: inv.prepaidPackage.doctor,

                doctorSnapshot: inv.prepaidPackage.doctorSnapshot
                  ? {
                      doctorName: inv.prepaidPackage.doctorSnapshot.doctorName,
                      specialization:
                        inv.prepaidPackage.doctorSnapshot.specialization,
                      departmentName:
                        inv.prepaidPackage.doctorSnapshot.departmentName,
                    }
                  : null,
                expireOn: inv.prepaidPackage.expireOn,
                packageName: packageDetails ? packageDetails.name : null,
              }
            : null,

          items: inv.items.map((item) => ({
            id: item.service?._id,
            serviceName: item.service?.name,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
          })),
        };
      })
    );

    const visitRecords = await PatientVisitRecords.find({
      patient: patient._id,
      hospital: hospitalId,
    })
      .sort({ visitDate: -1 })
      .populate("doctor", "doctorName specialization")
      .populate("department", "name")
      .populate("service", "name");

    const formattedVisits = visitRecords.map((visit) => ({
      visitId: visit.visitId,
      visitDate: visit.visitDate,
      patientSnapshot: visit.patientSnapshot,
      doctorSnapshot: visit.doctorSnapshot,
      departmentSnapshot: visit.departmentSnapshot,
      serviceSnapshot: visit.serviceSnapshot,
      registrationFee: visit.registrationFee,
      opdCharge: visit.opdCharge,
      serviceCharge: visit.serviceCharge,
      totalFee: visit.totalFee,
      paymentType: visit.paymentType,
      notes: visit.notes,
      appointmentStatus: visit.appointmentStatus,
      patientType: visit.patientType,
    }));

    return handleResponse(res, 200, "Patient details fetched successfully", {
      ...patientObj,
      lastDoctor: lastDoctorSnapshot,
      invoices: formattedInvoices,
      visits: formattedVisits,
    });
  } catch (error) {
    console.error("Error in getPatientById:", error);
    return handleResponse(res, 500, "Something went wrong", {
      error: error.message,
    });
  }
};

export const getPatientVisitsByMobileId = async (req, res) => {
  try {
    const { mobileId } = req.params;

    if (!mobileId) {
      return handleResponse(res, 400, "Mobile ID is required");
    }

    if (!validateObjectId(mobileId, res, "mobile ID")) return;

    const { page, limit, skip } = getPagination(req);

    const { patientName, mobileNo, department } = req.query;

    const filters = {
      mobile: mobileId,
    };

    if (patientName) {
      filters.patientName = { $regex: patientName, $options: "i" };
    }

    if (mobileNo) {
      filters["mobile.number"] = { $regex: mobileNo, $options: "i" };
    }

    if (department) {
      filters.department = department;
    }

    const mobile = await MobileNumber.findById(mobileId);
    if (!mobile) {
      return handleResponse(res, 404, "Mobile number not found");
    }

    const totalItems = await Patient.countDocuments(filters);

    const patients = await Patient.find(filters)
      .skip(skip)
      .limit(limit)
      .populate("department", "name")
      .populate("service", "name")
      .populate("doctor", "doctorName");

    if (!patients.length) {
      return handleResponse(
        res,
        404,
        "No patients found for this mobile number"
      );
    }

    const patientDetails = await Promise.all(
      patients.map(async (patient) => {
        const prepaidPackages = await PrepaidPackage.find({
          patient: patient._id,
        })
          .populate("services.service", "name charge")
          .populate("patient", "patientName");

        const usageHistory = await PrepaidServiceUsage.find({
          patient: patient._id,
        })
          .populate("servicesUsed.service", "name charge")
          .populate("doctor", "doctorName")
          .sort({ visitDate: -1 });

        return {
          patient,
          prepaidPackages,
          usageHistory,
        };
      })
    );

    const pagination = {
      totalItems,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
    };

    return handleResponse(res, 200, "Patient details fetched successfully", {
      patients: patientDetails,
      pagination,
    });
  } catch (error) {
    console.error("Error in getPatientDetailsByMobileId:", error);
    return handleResponse(res, 500, "Something went wrong", {
      error: error.message,
    });
  }
};

export const getAllDoctorsWithActiveServices = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const hospitalId = req.user.hospitalId;
    const today = new Date();
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const todayDay = dayNames[today.getDay()];
    const todayDateStr = today.toISOString().split("T")[0];

    const todayAvailabilities = await DoctorAvailability.find({
      dayOfWeek: todayDay,
    }).lean();

    const availableTodayDoctorIds = todayAvailabilities.map((a) => a.doctor);

    if (availableTodayDoctorIds.length === 0) {
      return handleResponse(res, 200, "No doctors available today", {
        doctors: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      });
    }

    const doctors = await Doctor.find({
      _id: { $in: availableTodayDoctorIds },
      hospital: hospitalId,
      status: { $ne: "deleted" },
    })
      .sort({ isAvailable: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("department", "name")
      .select("-password")
      .lean();

    const doctorIds = doctors.map((doc) => doc._id.toString());

    const services = await DoctorService.find({
      doctor: { $in: doctorIds },
      // hospital: hospitalId,
    })
      .populate("service", "name description charge")
      .lean();

    const doctorServiceMap = {};
    services.forEach((s) => {
      const id = s.doctor.toString();
      if (!doctorServiceMap[id]) doctorServiceMap[id] = [];
      doctorServiceMap[id].push(s.service);
    });

    const attendance = await DoctorAttendance.find({
      doctor: { $in: doctorIds },
      date: todayDateStr,
    }).lean();

    const attendanceMap = {};
    attendance.forEach((a) => {
      attendanceMap[a.doctor.toString()] = a;
    });

    const fullWeekAvailability = await DoctorAvailability.find({
      doctor: { $in: doctorIds },
    }).lean();

    const availabilityMap = {};
    fullWeekAvailability.forEach((a) => {
      const id = a.doctor.toString();
      if (!availabilityMap[id]) availabilityMap[id] = [];
      availabilityMap[id].push({
        dayOfWeek: a.dayOfWeek,
        shifts: a.shifts,
      });
    });

    const finalDoctors = doctors.map((doc) => {
      const id = doc._id.toString();
      const att = attendanceMap[id];

      if (att) {
        const checkIn = new Date(att.checkInTime);
        const checkOut = att.checkOutTime ? new Date(att.checkOutTime) : null;
      }

      return {
        ...doc,
        availability: availabilityMap[id] || [],
        services: doctorServiceMap[id] || [],
        checkInTime: att?.checkInTime || null,
        checkOutTime: att?.checkOutTime || null,
      };
    });

    const totalDoctors = await Doctor.countDocuments({
      _id: { $in: availableTodayDoctorIds },
      status: { $ne: "deleted" },
    });

    return handleResponse(res, 200, "Doctors fetched successfully", {
      doctors: finalDoctors,
      pagination: {
        total: totalDoctors,
        page,
        limit,
        totalPages: Math.ceil(totalDoctors / limit),
      },
    });
  } catch (error) {
    console.error("Error in getAllDoctorsWithActiveServices:", error);
    return handleResponse(res, 500, "Something went wrong", {
      error: error.message,
    });
  }
};

export const getTodayFrontdeskReport = async (req, res) => {
  try {
    const frontdeskId = req.user._id;
    const hospitalId = req.user.hospitalId;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const visits = await PatientVisitRecords.aggregate([
      {
        $match: {
          // createdBy: frontdeskId,
          createdBy: new mongoose.Types.ObjectId(frontdeskId),
          visitDate: { $gte: todayStart, $lte: todayEnd },
        },
      },
      {
        $group: {
          _id: "$createdBy",
          totalPatients: { $sum: 1 },
          newPatients: {
            $sum: {
              $cond: [{ $eq: ["$patientType", "NEW"] }, 1, 0],
            },
          },
          followupPatients: {
            $sum: {
              $cond: [{ $eq: ["$patientType", "FOLLOWUP"] }, 1, 0],
            },
          },
          prepaidPatients: {
            $sum: {
              $cond: [{ $eq: ["$patientType", "PREPAID"] }, 1, 0],
            },
          },
          regularPatients: {
            $sum: {
              $cond: [{ $eq: ["$patientType", "REGULAR"] }, 1, 0],
            },
          },
          totalRevenue: { $sum: "$totalFee" },
        },
      },
      {
        $project: {
          frontdeskId: "$_id",
          totalPatients: 1,
          newPatients: 1,
          followupPatients: 1,
          prepaidPatients: 1,
          regularPatients: 1,
          totalRevenue: 1,
        },
      },
    ]);

    const newPatientsToday = await Patient.aggregate([
      {
        $match: { createdAt: { $gte: todayStart, $lte: todayEnd } },
      },
      {
        $group: {
          _id: "$createdBy",
          newPatientsCount: { $sum: 1 },
        },
      },
    ]);

    const guestRevenue = await Guest.aggregate([
      {
        $match: {
          hospital: new mongoose.Types.ObjectId(hospitalId),
          createdAt: { $gte: todayStart, $lte: todayEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalGuestRevenue: { $sum: "$totalPrice" },
        },
      },
    ]);

    const totalGuestRevenue =
      guestRevenue.length > 0 ? guestRevenue[0].totalGuestRevenue : 0;

    const canteenRevenue = await IssuedToken.aggregate([
      {
        $match: {
          issuedAt: { $gte: todayStart, $lte: todayEnd },
          hospital: new mongoose.Types.ObjectId(hospitalId),
        },
      },
      {
        $group: {
          _id: null,
          totalCanteenRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    const totalCanteenRevenue =
      canteenRevenue.length > 0 ? canteenRevenue[0].totalCanteenRevenue : 0;

    if (visits.length === 0) {
      return handleResponse(
        res,
        200,
        "No visits found for today, but here's the revenue.",
        [
          {
            frontdeskId: null,
            totalPatients: 0,
            newPatients: 0,
            followupPatients: 0,
            prepaidPatients: 0,
            regularPatients: 0,
            totalRevenue: totalGuestRevenue + totalCanteenRevenue,
            guestRevenue: totalGuestRevenue,
            canteenRevenue: totalCanteenRevenue,
            TotalPatientsCreatedToday: 0,
          },
        ]
      );
    }

    const report = visits.map((visit) => {
      const newPatientToday = newPatientsToday.find(
        (p) => p._id.toString() === visit.frontdeskId.toString()
      );

      const newPatientsCountToday = newPatientToday
        ? newPatientToday.newPatientsCount
        : 0;

      return {
        frontdeskId: visit.frontdeskId,
        totalPatients: visit.totalPatients,
        newPatients: visit.newPatients,
        followupPatients: visit.followupPatients,
        prepaidPatients: visit.prepaidPatients,
        regularPatients: visit.regularPatients,

        totalRevenue:
          visit.totalRevenue + totalGuestRevenue + totalCanteenRevenue,

        guestRevenue: totalGuestRevenue,
        canteenRevenue: totalCanteenRevenue,

        TotalPatientsCreatedToday: newPatientsCountToday,
      };
    });

    return handleResponse(
      res,
      200,
      "Today's frontdesk report generated",
      report
    );
  } catch (error) {
    console.error("Error generating report:", error);
    return handleResponse(
      res,
      500,
      "Internal server error while generating report."
    );
  }
};


export const updatePatientDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      patientName,
      gender,
      address,
      age,
      aadhar,
      samagra,
      ayushman,
      doctor,
    } = req.body || {};

    const userId = req.user._id;

    const patient = await Patient.findById(id);
    if (!patient) {
      return handleResponse(res, 404, "Patient not found");
    }

    if (doctor) {
      const doctorExists = await Doctor.findById(doctor);
      if (!doctorExists) {
        return handleResponse(res, 404, "Doctor not found");
      }
      patient.doctor = doctor;
    }

    if (patientName) patient.patientName = patientName;
    if (gender) patient.gender = gender;
    if (address) patient.address = address;
    if (age) patient.age = age;
    if (aadhar) patient.aadhar = aadhar;
    if (samagra) patient.samagra = samagra;
    if (ayushman) patient.ayushman = ayushman;

    patient.updatedBy = userId;

    await patient.save();

    const updatedPatient = patient.toObject();
    delete updatedPatient.service;

    return handleResponse(
      res,
      200,
      "Patient updated successfully",
      updatedPatient
    );
  } catch (error) {
    console.error("❌ Update patient error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const getAllFees = async (req, res) => {
  try {
    const { departmentId, doctorId, patientId } = req.query;
    const hospitalId = req.user?.hospitalId;

    if (!validateObjectId(departmentId, res, "department id")) return;

    const registrationFeeData = await RegistrationFee.findOne({
      hospital: hospitalId,
    }).sort({
      updatedAt: -1,
    });

    const registrationFee = registrationFeeData
      ? registrationFeeData.registrationFee
      : 0;

    // Fetch department OPD charge
    let opdCharge = 0;
    const department = await Department.findById({
      _id: departmentId,
      hospital: hospitalId,
    });
    if (department) opdCharge = department.opdCharge || 0;

    // If both doctorId and patientId are provided → check last paid OPD visit
    if (
      doctorId &&
      patientId &&
      validateObjectId(doctorId) &&
      validateObjectId(patientId)
    ) {
      const lastPaidOpdVisit = await PatientVisitRecords.findOne({
        patient: patientId,
        doctor: doctorId,
        hospital: hospitalId,
        opdPaid: true,
      }).sort({ visitDate: -1 });

      if (lastPaidOpdVisit) {
        const lastVisitDate = new Date(lastPaidOpdVisit.visitDate);
        const today = new Date();
        const diffInDays =
          (today.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24);

        // OPD charge waived if last paid visit was within 8 days
        if (diffInDays <= 8) {
          opdCharge = 0;
        }
      }

      // if (lastPaidOpdVisit) {
      //   const lastVisitDate = new Date(lastPaidOpdVisit.visitDate);
      //   const now = new Date();

      //   const diffInMs = now.getTime() - lastVisitDate.getTime();
      //   const oneMinuteInMs = 1 * 60 * 1000; // 1 minute

      //   // OPD charge waived if last paid visit was within 1 minute
      //   if (diffInMs <= oneMinuteInMs) {
      //     opdCharge = 0;
      //   }
      // }
    }

    const response = {
      registrationFee,
      opdCharge,
    };

    return handleResponse(res, 200, "Fees fetched successfully", response);
  } catch (error) {
    console.error("Error in getAllFees:", error);
    return handleResponse(res, 500, error.message || "Internal Server Error");
  }
};

export const getPrepaidPackagesByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { departmentId, prepaidPackageId } = req.query;
    const { page, limit, skip } = getPagination(req);

    if (!patientId) {
      return handleResponse(res, 400, "Patient ID is required");
    }

    const patient = await Patient.findOne({
      $or: [{ _id: patientId }, { patientId }],
    });

    if (!patient) {
      return handleResponse(res, 404, "Patient not found");
    }

    const filter = { patient: patient._id };

    // Department-based filtering
    if (departmentId) {
      const doctorIds = await Doctor.find({
        department: departmentId,
      }).distinct("_id");

      filter.$or = [
        { "doctorSnapshot.departmentName": departmentId },
        { doctor: { $in: doctorIds } },
      ];
    }

    // Specific prepaid package filter
    if (prepaidPackageId) {
      filter.$or = [{ _id: prepaidPackageId }, { packageId: prepaidPackageId }];
    }

    const totalPackages = await PrepaidPackage.countDocuments(filter);

    const packages = await PrepaidPackage.find(filter)
      .skip(prepaidPackageId ? 0 : skip)
      .limit(prepaidPackageId ? 1 : limit)
      .populate("doctor", "doctorName specialization department")
      .populate("package", "name") // ⭐ Package name added
      .sort({ createdAt: -1 });

    const formatted = await Promise.all(
      packages.map(async (pkg) => {
        // usageRecords code commented, you can enable if needed
        // const usageRecords = await PrepaidServiceUsage.find({
        //   prepaidPackage: pkg._id,
        // })
        //   .populate("doctor", "doctorName")
        //   .populate("servicesUsed.service", "name")
        //   .sort({ visitDate: -1 });

        return {
          id: pkg._id,
          packageId: pkg.packageId,
          packageName: pkg.package?.name, // ⭐ Added package name
          totalFee: pkg.totalFee,
          totalVisits: pkg.totalVisits,
          usedVisits: pkg.usedVisits,
          remainingVisits: pkg.totalVisits - pkg.usedVisits,
          paymentType: pkg.paymentType,
          startDate: pkg.startDate,
          doctorName: pkg.doctor?.doctorName,
        };
      })
    );

    return handleResponse(
      res,
      200,
      prepaidPackageId
        ? "Prepaid package fetched successfully"
        : "Prepaid packages fetched successfully",
      getPaginatedResponse(
        formatted,
        totalPackages,
        page,
        limit,
        "prepaid_packages"
      )
    );
  } catch (error) {
    console.error("Error in getPrepaidPackagesByPatient:", error);
    return handleResponse(res, 500, "Something went wrong", {
      error: error.message,
    });
  }
};

export const getAllPatientVisits = async (req, res) => {
  try {
    const { search, date, department, doctorId } = req.query;
    const { page, limit, skip } = getPagination(req);

    let patientFilter = { hospital: req.user.hospitalId };

    if (search) {
      const mobiles = await MobileNumber.find({
        phone: { $regex: search, $options: "i" },
      });

      const patientsByName = await Patient.find({
        patientName: { $regex: search, $options: "i" },
      }).select("_id");

      const patientIds = [
        ...patientsByName.map((p) => p._id),
        ...mobiles.map((m) => m._id),
      ];

      patientFilter.patient = { $in: patientIds };
    }

    // ===============================
    // DATE FILTER
    // ===============================
    let dateFilter = {};
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      dateFilter.visitDate = { $gte: start, $lte: end };
    }

    // ===============================
    // DEPARTMENT FILTER
    // ===============================
    if (department) {
      patientFilter.department = department;
    }

    // ===============================
    // DOCTOR FILTER
    // ===============================
    if (doctorId) {
      patientFilter.doctor = doctorId;
    }

    // ===============================
    // FETCH VISITS
    // ===============================
    const totalItems = await PatientVisitRecords.countDocuments({
      ...patientFilter,
      ...dateFilter,
    });

    const visits = await PatientVisitRecords.find({
      ...patientFilter,
      ...dateFilter,
    })
      .sort({ visitDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate("patient", "patientName mobile")
      .populate("doctor", "doctorName")
      .populate("department", "departmentName");

    // ===============================
    // GROUP BY MOBILE
    // ===============================
    const grouped = {};

    for (let visit of visits) {
      const mobilePhone =
        visit.patient?.mobile?.phone || visit.patientSnapshot?.mobile || "N/A";

      if (!grouped[mobilePhone]) grouped[mobilePhone] = [];

      grouped[mobilePhone].push({
        _id: visit._id,
        visitId: visit.visitId,
        patientName:
          visit.patient?.patientName || visit.patientSnapshot?.patientName,
        department:
          visit.department?.departmentName ||
          visit.departmentSnapshot?.departmentName ||
          "N/A",
        doctor:
          visit.doctor?.doctorName || visit.doctorSnapshot?.doctorName || "N/A",
        visitDate: visit.visitDate,
        totalFee: visit.totalFee,
        paymentType: visit.paymentType,
        patientType: visit.patientType,
        appointmentStatus: visit.appointmentStatus,
      });
    }

    // ===============================
    // FINAL RESPONSE FORMAT
    // ===============================
    const result = Object.keys(grouped).map((phone) => ({
      mobile: phone,
      patients: grouped[phone],
    }));

    return handleResponse(res, 200, "Patient visits fetched successfully", {
      patients: result,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
    });
  } catch (error) {
    console.error("❌ Error in getAllPatientVisits:", error);
    return handleResponse(res, 500, "Something went wrong", {
      error: error.message,
    });
  }
};

export const getPatientVisitById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return handleResponse(res, 400, "Visit ID is required");

    const visit = await PatientVisitRecords.findOne({
      $or: [{ _id: id }],
    })
      .populate("patient")
      .populate("doctor", "doctorName specialization")
      .populate("department", "departmentName");

    if (!visit) {
      return handleResponse(res, 404, "Patient visit not found");
    }

    const patient = await Patient.findById(visit.patient._id)
      .populate("mobile", "phone")
      .populate("lastDoctor", "doctorName");

    const patientObj = patient.toObject();

    const lastDoctorSnapshot = patientObj.lastDoctor
      ? {
          id: patientObj.lastDoctor._id,
          doctorName: patientObj.lastDoctor.doctorName,
        }
      : null;

    const invoices = await Invoice.find({ patient: patient._id })
      .sort({ createdAt: -1 })
      .populate("items.service", "name charge")
      .populate(
        "prepaidPackage",
        "packageId totalFee totalVisits usedVisits doctorSnapshot doctor expireOn package"
      )
      .select(
        "invoiceId transactionId totalAmount paymentType registrationFee status issuedAt patientType items prepaidPackage opdCharge"
      );

    const formattedInvoices = await Promise.all(
      invoices.map(async (inv) => {
        const createdAt = inv.issuedAt || inv.createdAt;
        const expiresAt = new Date(createdAt);
        expiresAt.setDate(expiresAt.getDate() + 7);

        const now = new Date();
        let remainingDays = Math.ceil(
          (expiresAt - now) / (1000 * 60 * 60 * 24)
        );

        let expiryMessage = "";
        if (remainingDays > 7) {
          remainingDays = 7;
          expiryMessage = "7 days left";
        } else if (remainingDays > 1) {
          expiryMessage = `${remainingDays} days left`;
        } else if (remainingDays === 1) {
          expiryMessage = "1 day left";
        } else if (remainingDays === 0) {
          expiryMessage = "Expires today";
        } else {
          expiryMessage = "Expired";
        }

        let packageDetails = null;
        if (inv.prepaidPackage) {
          packageDetails = await mongoose
            .model("Package")
            .findById(inv.prepaidPackage.package)
            .select("name");
        }

        return {
          id: inv._id,
          invoiceId: inv.invoiceId,
          transactionId: inv.transactionId,
          patientType: inv.patientType,
          totalAmount: inv.totalAmount,
          opdCharge: inv.opdCharge,
          paymentType: inv.paymentType,
          registrationFee: inv.registrationFee,
          status: inv.status,
          issuedAt: inv.issuedAt,
          expiresAt,
          remainingDays,
          expiryMessage,

          prepaidPackage: inv.prepaidPackage
            ? {
                id: inv.prepaidPackage._id,
                packageId: inv.prepaidPackage.packageId,
                totalFee: inv.prepaidPackage.totalFee,
                totalVisits: inv.prepaidPackage.totalVisits,
                usedVisits: inv.prepaidPackage.usedVisits,
                doctorId: inv.prepaidPackage.doctor,
                doctorSnapshot: inv.prepaidPackage.doctorSnapshot || null,
                expireOn: inv.prepaidPackage.expireOn,
                packageName: packageDetails?.name || null,
              }
            : null,

          items: inv.items.map((item) => ({
            id: item.service?._id,
            serviceName: item.service?.name,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
          })),
        };
      })
    );

    const visitRecords = await PatientVisitRecords.find({
      patient: patient._id,
    }).sort({ visitDate: -1 });

    const formattedVisits = visitRecords.map((v) => ({
      visitId: v.visitId,
      visitDate: v.visitDate,
      patientSnapshot: v.patientSnapshot,
      doctorSnapshot: v.doctorSnapshot,
      departmentSnapshot: v.departmentSnapshot,
      serviceSnapshot: v.serviceSnapshot,
      registrationFee: v.registrationFee,
      opdCharge: v.opdCharge,
      serviceCharge: v.serviceCharge,
      totalFee: v.totalFee,
      paymentType: v.paymentType,
      notes: v.notes,
      appointmentStatus: v.appointmentStatus,
      patientType: v.patientType,
    }));

    return handleResponse(
      res,
      200,
      "Patient visit details fetched successfully",
      {
        ...patientObj,
        lastDoctor: lastDoctorSnapshot,
        invoices: formattedInvoices,
        visits: formattedVisits,
        currentVisit: {
          visitId: visit.visitId,
          visitDate: visit.visitDate,
          patientSnapshot: visit.patientSnapshot,
          doctorSnapshot: visit.doctorSnapshot,
          departmentSnapshot: visit.departmentSnapshot,
          serviceSnapshot: visit.serviceSnapshot,
          registrationFee: visit.registrationFee,
          opdCharge: visit.opdCharge,
          serviceCharge: visit.serviceCharge,
          totalFee: visit.totalFee,
          paymentType: visit.paymentType,
          appointmentStatus: visit.appointmentStatus,
          patientType: visit.patientType,
        },
      }
    );
  } catch (error) {
    console.error("❌ Error in getPatientVisitById:", error);
    return handleResponse(res, 500, "Something went wrong", {
      error: error.message,
    });
  }
};
