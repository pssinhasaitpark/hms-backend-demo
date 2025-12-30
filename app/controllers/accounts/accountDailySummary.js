import AccountDailySummary from "../../models/frontdesk/accountDailySummary.js";
import { handleResponse } from "../../utils/responseHandler.js";
import Invoice from "../../models/frontdesk/invoiceReciept.js";
import { getPagination } from "../../utils/pagination.js";
import Doctor from "../../models/user/doctor.js";
import DoctorAttendance from "../../models/frontdesk/doctorAttendance.js";
import DoctorAvailability from "../../models/departments/doctorAvailability.js";
import CashDenomination from "../../models/frontdesk/cashDenomination.js";
import Guest from "../../models/guest/guestDetails.js";
import IssuedToken from "../../models/guest/tokenIssues.js";
import PatientVisitRecords from "../../models/frontdesk/patientVisitRecords.js";
import Staff from "../../models/user/staff.js";

const getHospitalFilter = (req) => {
  if (req.user.role === "hospital_admin") {
    return { hospital: req.user._id };
  } else {
    return { hospital: req.user.hospitalId };
  }
};

export const getAllAccountSummaries = async (req, res) => {
  try {
    const { startDate, endDate, frontdeskId, status, search } = req.query;
    const { page, limit, skip } = getPagination(req);

    // const filter = {};
    const filter = { ...getHospitalFilter(req) };
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    } else if (startDate) {
      filter.date = {
        $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
      };
    } else if (endDate) {
      filter.date = {
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    if (frontdeskId) {
      filter.frontdesk = frontdeskId;
    }

    if (search) {
      const staff = await Staff.find({
        name: { $regex: search, $options: "i" },
      }).select("_id");

      const ids = staff.map((s) => s._id);

      filter.frontdesk = { $in: ids };
    }

    if (status) {
      filter.status = status.toLowerCase();
    }

    const summaries = await AccountDailySummary.find(filter)
      .populate({
        path: "frontdesk",
        select: "name email role",
        populate: {
          path: "role",
          select: "name",
        },
      })
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AccountDailySummary.countDocuments(filter);

    return handleResponse(
      res,
      200,
      "Account daily summaries fetched successfully",
      {
        count: summaries.length,
        summaries,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }
    );
  } catch (error) {
    console.error("Error fetching account summaries:", error);
    return handleResponse(res, 500, "Failed to fetch account summaries", {
      error: error.message,
    });
  }
};

export const getAccountSummaryStatus = async (req, res) => {
  try {
    const { summaryId } = req.params;

    if (!summaryId) {
      return handleResponse(res, 400, "summaryId is required");
    }

    const accountSummary = await AccountDailySummary.findById({
      _id: summaryId,
      ...getHospitalFilter(req),
    });
    // const accountSummary = await AccountDailySummary.findById(summaryId);

    if (!accountSummary) {
      return handleResponse(res, 404, "Account summary not found");
    }

    const { totalAmount, transactionStatus } = accountSummary;

    return handleResponse(res, 200, "Account summary fetched successfully", {
      totalAmount,
      transactionStatus,
    });
  } catch (error) {
    console.error("Error fetching account summary details:", error);
    return handleResponse(res, 500, "Failed to fetch account summary details", {
      error: error.message,
    });
  }
};

export const getAccountDetailsByFrontdesk = async (req, res) => {
  try {
    const { frontdeskId, entityType, summaryId, date } = req.query;
    const { page, limit, skip } = getPagination(req);

    if (!frontdeskId)
      return handleResponse(res, 400, "frontdeskId is required");
    if (!summaryId) return handleResponse(res, 400, "summaryId is required");

    const accountSummary = await AccountDailySummary.findById({
      _id: summaryId,
      ...getHospitalFilter(req),
    });
    // const accountSummary = await AccountDailySummary.findById(summaryId);

    if (!accountSummary) {
      return handleResponse(res, 404, "Account summary not found");
    }

    const { createdAt, submittedAt, receivedAt } = accountSummary;

    const endOfDay = submittedAt ? new Date(submittedAt) : new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const effectiveReceivedAt = receivedAt || endOfDay;

    let allEntities = [];
    let totalAmount = 0;

    let dateStart = null;
    let dateEnd = null;
    if (date) {
      const parsedDate = new Date(date);
      dateStart = new Date(parsedDate.setHours(0, 0, 0, 0));
      dateEnd = new Date(parsedDate.setHours(23, 59, 59, 999));
    }

    const test = await Guest.find({
      createdBy: frontdeskId,
    });

    if (entityType === "patient") {
      allEntities = await Invoice.find({
        createdBy: frontdeskId,
        issuedAt: {
          $gte: createdAt,
          $lte: submittedAt || effectiveReceivedAt,
        },
      })
        .populate({ path: "patient", select: "patientName patientType" })
        .sort({ issuedAt: -1 });

      totalAmount = allEntities.reduce(
        (sum, inv) => sum + (inv.totalAmount || 0),
        0
      );
    } else if (entityType === "guest") {
      allEntities = await Guest.find({
        createdBy: frontdeskId,
        createdAt: {
          $gte: createdAt,
          $lte: submittedAt || effectiveReceivedAt,
        },
      })
        .populate({ path: "room", select: "roomNumber" })
        .sort({ startDate: -1 });

      totalAmount = allEntities.reduce(
        (sum, guest) => sum + (guest.totalPrice || 0),
        0
      );
    } else if (entityType === "tokens") {
      allEntities = await IssuedToken.find({
        createdBy: frontdeskId,
        issuedAt: {
          $gte: createdAt,
          $lte: submittedAt || effectiveReceivedAt,
        },
      })
        .populate({ path: "template", select: "templateName" })
        .sort({ issuedAt: -1 });

      totalAmount = allEntities.reduce(
        (sum, token) => sum + (token.totalAmount || 0),
        0
      );
    } else {
      return handleResponse(res, 400, "Invalid entityType provided");
    }

    const entities = allEntities.slice(skip, skip + limit);

    if (!entities.length) {
      return handleResponse(
        res,
        404,
        `No ${entityType} found for this frontdesk on the given date range`
      );
    }

    let entityData = [];

    if (entityType === "patient") {
      entityData = entities.map((inv) => ({
        invoiceNo: inv.invoiceId,
        patientName: inv.patient?.patientName || "No Patient Name",
        amount: inv.totalAmount,
        paymentMode: inv.paymentType,
        patientType: inv.patientType || "No Patient Type",
      }));
    } else if (entityType === "guest") {
      entityData = entities.map((guest) => ({
        guestName: guest.name || "No Guest Name",
        room: guest.room?.roomNumber || "No Room Assigned",
        totalPrice: guest.totalPrice,
        numberOfPeople: guest.numberOfPeople,
        reservationStatus: guest.reservationStatus || "No Status",
      }));
    } else if (entityType === "tokens") {
      entityData = entities.map((token) => ({
        quantity: token.quantity,
        totalAmount: token.totalAmount,
        mealType: token.mealType || "No Meal Type",
        paymentType: token.paymentType,
      }));
    }

    const totalEntities = allEntities.length;

    return handleResponse(res, 200, `${entityType} fetched successfully`, {
      count: entityData.length,
      totalAmount,
      entities: entityData,
      pagination: {
        totalItems: totalEntities,
        page,
        limit,
        totalPages: Math.ceil(totalEntities / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching details by frontdesk:", error);
    return handleResponse(res, 500, "Failed to fetch details", {
      error: error.message,
    });
  }
};

export const getAllDoctors = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);

    const doctors = await Doctor.find({
      status: { $ne: "deleted" },
      hospital: req.user.hospitalId,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("department", "name")
      .lean();

    if (!doctors || doctors.length === 0) {
      return handleResponse(res, 404, "No doctors found");
    }

    const doctorIds = doctors.map((doc) => doc._id);

    const availabilities = await DoctorAvailability.find({
      doctor: { $in: doctorIds },
    }).lean();

    const doctorAvailabilityMap = {};
    for (const av of availabilities) {
      const doctorId = av.doctor.toString();
      if (!doctorAvailabilityMap[doctorId])
        doctorAvailabilityMap[doctorId] = [];
      doctorAvailabilityMap[doctorId].push({
        dayOfWeek: av.dayOfWeek,
        shifts: av.shifts,
      });
    }

    const doctorsWithServicesAndAvailability = doctors.map((doc) => ({
      ...doc,
      availability: doctorAvailabilityMap[doc._id.toString()] || [],
    }));

    const totalDoctors = await Doctor.countDocuments({
      status: { $ne: "deleted" },
    });

    return handleResponse(
      res,
      200,
      "Doctors with active services and availability fetched successfully",
      {
        doctors: doctorsWithServicesAndAvailability,
        pagination: {
          total: totalDoctors,
          page,
          limit,
          totalPages: Math.ceil(totalDoctors / limit),
        },
      }
    );
  } catch (error) {
    console.error("Error in getAllDoctorsWithActiveServices:", error);
    return handleResponse(res, 500, "Something went wrong", {
      error: error.message,
    });
  }
};

const formatTime = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getMonthlyAttendance = async (req, res) => {
  try {
    const doctorId = req.params.doctorId;
    const month = req.query.month;

    if (!month) {
      return handleResponse(res, 400, "Month is required (format: YYYY-MM)");
    }

    const doctor = await Doctor.findById({
      _id: doctorId,
      hospital: req.user.hospitalId, 
    })
      .select(
        "doctorId doctorName phone department qualification createdAt visitChargePerDay fixedCharge"
      )
      .populate("department", "name");

    if (!doctor) {
      return handleResponse(res, 404, "Doctor not found");
    }

    const startDate = new Date(`${month}-01`);
    const endDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      0
    );
    const totalDays = endDate.getDate();

    const registrationDate = new Date(doctor.createdAt);
    const regDateOnly = new Date(registrationDate.toDateString());

    const attendanceDocs = await DoctorAttendance.find({
      doctor: doctorId,
      date: {
        $gte: `${month}-01`,
        $lte: `${month}-${String(totalDays).padStart(2, "0")}`,
      },
    });

    const attendanceMap = {};
    attendanceDocs.forEach((a) => (attendanceMap[a.date] = a));

    const availabilityDocs = await DoctorAvailability.find({
      doctor: doctorId,
    });

    const weekOrder = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const weeklyAvailability = availabilityDocs
      .map((item) => ({
        dayOfWeek: item.dayOfWeek,
        shifts: item.shifts,
      }))
      .sort(
        (a, b) =>
          weekOrder.indexOf(a.dayOfWeek) - weekOrder.indexOf(b.dayOfWeek)
      );

    const availableDays = weeklyAvailability.map((a) =>
      a.dayOfWeek.toLowerCase()
    );

    let totalPresentDays = 0;
    let totalWorkingDays = 0;
    const attendanceObj = {};

    const today = new Date(); // Current date for future check

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${month}-${String(day).padStart(2, "0")}`;
      const d = new Date(dateStr);

      if (d < regDateOnly) continue;

      const dayStr = d
        .toLocaleString("en-US", { weekday: "long" })
        .toLowerCase();

      if (!availableDays.includes(dayStr)) continue;

      totalWorkingDays++;

      const record = attendanceMap[dateStr];

      // Future date handling
      let status, checkIn, checkOut;
      if (d > today) {
        status = null;
        checkIn = null;
        checkOut = null;
      } else {
        status = record?.status || "Absent";
        if (status === "Present") totalPresentDays++;
        checkIn = formatTime(record?.checkInTime);
        checkOut = formatTime(record?.checkOutTime);
      }

      attendanceObj[dateStr] = {
        date: dateStr,
        day: dayStr.charAt(0).toUpperCase() + dayStr.slice(1),
        checkIn,
        checkOut,
        status,
      };
    }

    const visitDocs = await PatientVisitRecords.find({
      doctor: doctorId,
      visitDate: { $gte: startDate, $lte: endDate },
    }).select("serviceCharge opdCharge");

    const opdCharges = visitDocs.reduce(
      (sum, v) => sum + (v.opdCharge || 0),
      0
    );

    const serviceCharges = visitDocs.reduce(
      (sum, v) => sum + (v.serviceCharge || 0),
      0
    );

    const totalRevenue = opdCharges + serviceCharges;

    const invoiceDocs = await Invoice.find({
      issuedAt: { $gte: startDate, $lte: endDate },
      patientType: "FOLLOWUP",
    }).populate({ path: "patient", select: "doctor" });

    const filteredInvoices = invoiceDocs.filter(
      (inv) =>
        inv.patient?.doctor?.toString() === doctorId &&
        inv.serviceType !== "Registration"
    );

    const invoiceRevenue = filteredInvoices.reduce(
      (sum, inv) => sum + (inv.totalAmount || 0),
      0
    );

    const visitChargePerDay = doctor.visitChargePerDay || 0;
    const fixedCharge = doctor.fixedCharge || 0;
    const salary = visitChargePerDay * totalPresentDays + fixedCharge;

    const finalData = {
      ...doctor._doc,
      totalPresentDays,
      totalWorkingDays,
      opdCharges,
      serviceCharges,
      totalRevenue,
      salary,
      weeklyAvailability,
      attendance: attendanceObj,
    };

    return handleResponse(res, 200, "Monthly attendance fetched", finalData);
  } catch (error) {
    return handleResponse(res, 500, "Error fetching monthly attendance", {
      error: error.message,
    });
  }
};

export const submitCashDenominations = async (req, res) => {
  try {
    const {
      note500,
      note200,
      note100,
      note50,
      note20,
      note10,
      coin10,
      coin5,
      coin2,
      coin1,
      pattienAmount,
      guestAmount,
      canteenAmount,
      summaryId,
    } = req.body;

    const accountSummary = await AccountDailySummary.findById({
      _id: summaryId,
      ...getHospitalFilter(req),
    });

    if (!accountSummary) {
      return handleResponse(
        res,
        404,
        "Account summary not found for the given ID."
      );
    }

    // Check if the transaction is already received
    /*     if (accountSummary.transactionStatus === "received") {
      return handleResponse(
        res,
        400,
        "Payment has already been received,cash denominations cannot be submitted."
      );
    } */

    if (accountSummary.transactionStatus === "submitted") {
      return handleResponse(
        res,
        400,
        "Cash denomination  has already been submitted to account department."
      );
    }

    const cashAmount =
      note500 * 500 +
      note200 * 200 +
      note100 * 100 +
      note50 * 50 +
      note20 * 20 +
      note10 * 10 +
      coin10 * 10 +
      coin5 * 5 +
      coin2 * 2 +
      coin1;

    // Calculate total online amount
    const totalOnline =
      (pattienAmount?.online || 0) +
      (guestAmount?.online || 0) +
      (canteenAmount?.online || 0);

    const totalAmount = cashAmount + totalOnline;

    // Check if cash denominations already exist for this summary
    let cashDenomination = await CashDenomination.findOne({
      frontdesk: accountSummary.frontdesk,
      date: accountSummary.date,
    });

    if (cashDenomination) {
      // Update the existing cashDenomination document
      Object.assign(cashDenomination, {
        note500,
        note200,
        note100,
        note50,
        note20,
        note10,
        coin10,
        coin5,
        coin2,
        coin1,
        pattienAmount,
        guestAmount,
        canteenAmount,
        cashAmount,
        totalAmount,
      });
      await cashDenomination.save();
    } else {
      // Create a new cashDenomination document
      cashDenomination = await CashDenomination.create({
        frontdesk: accountSummary.frontdesk,
        date: accountSummary.date,
        note500,
        note200,
        note100,
        note50,
        note20,
        note10,
        coin10,
        coin5,
        coin2,
        coin1,
        pattienAmount,
        guestAmount,
        canteenAmount,
        cashAmount,
        totalAmount,
        createdBy: req.user._id,
      });
    }

    await AccountDailySummary.findByIdAndUpdate(accountSummary._id, {
      $addToSet: { cashDenominations: cashDenomination._id },
      $set: {
        transactionStatus: "submitted",
        submittedAt: new Date(),
      },
    });

    return handleResponse(
      res,
      200,
      "Cash denominations submitted successfully.",
      {
        cashDenomination,
      }
    );
  } catch (error) {
    console.error("Error submitting cash denominations:", error);
    return handleResponse(res, 500, "Failed to submit cash denominations.", {
      error: error.message,
    });
  }
};

export const getCashDenomination = async (req, res) => {
  try {
    const { summaryId } = req.params;

    const summary = await AccountDailySummary.findById({
      _id: summaryId,
      ...getHospitalFilter(req),
    })
      .populate({
        path: "cashDenominations",
        populate: { path: "frontdesk", select: "name" },
      })
      .exec();

    if (!summary) {
      return handleResponse(res, 404, "Account Daily Summary not found");
    }

    if (!summary.cashDenominations || summary.cashDenominations.length === 0) {
      return handleResponse(
        res,
        404,
        "No cash denominations found for this summary"
      );
    }

    return handleResponse(
      res,
      200,
      "Cash Denominations fetched successfully",
      summary
    );
  } catch (error) {
    console.error("Error fetching cash denominations:", error);
    return handleResponse(res, 500, "Internal server error", {
      error: error.message,
    });
  }
};

export const updateTransactionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionStatus } = req.body;

    const allowedStatuses = ["received", "declined"];

    if (!allowedStatuses.includes(transactionStatus)) {
      return handleResponse(
        res,
        400,
        "Invalid status. Allowed: 'received', 'declined'."
      );
    }

    const accountSummary = await AccountDailySummary.findById({
      _id: id,
      ...getHospitalFilter(req),
    });
    // const accountSummary = await AccountDailySummary.findById(id);

    if (!accountSummary) {
      return handleResponse(res, 404, "Account daily summary not found.");
    }

    if (
      accountSummary.transactionStatus === "declined" &&
      transactionStatus === "received"
    ) {
      return handleResponse(
        res,
        400,
        "Cannot change status from 'declined' to 'received'."
      );
    }

    if (
      accountSummary.transactionStatus === "received" &&
      transactionStatus === "declined"
    ) {
      return handleResponse(
        res,
        400,
        "Cannot change status from 'received' to 'declined'."
      );
    }

    if (transactionStatus === "declined") {
      if (accountSummary.cashDenominations?.length > 0) {
        await CashDenomination.deleteMany({
          _id: { $in: accountSummary.cashDenominations },
        });
      }

      accountSummary.cashDenominations = [];
      accountSummary.transactionStatus = "pending";
      accountSummary.receivedAt = null;
    }

    if (transactionStatus === "received") {
      accountSummary.transactionStatus = "received";
      accountSummary.receivedAt = new Date();
    }

    await accountSummary.save();

    return handleResponse(res, 200, "Transaction status updated successfully", {
      accountSummary,
    });
  } catch (error) {
    console.error("Error updating transaction status:", error);
    return handleResponse(res, 500, "Failed to update transaction status", {
      error: error.message,
    });
  }
};
