import Invoice from "../../models/frontdesk/invoiceReciept.js";
import Staff from "../../models/user/staff.js";
import Doctor from "../../models/user/doctor.js";
import Patient from "../../models/frontdesk/patient.js";
import { handleResponse } from "../../utils/responseHandler.js";
import Compounder from "../../models/user/compounder.js";
import Role from "../../models/user/role.js";
import Guest from "../../models/guest/guestDetails.js";
import IssuedToken from "../../models/guest/tokenIssues.js";
import { getPagination } from "../../utils/pagination.js";
import AccountDailySummary from "../../models/frontdesk/accountDailySummary.js";
import mongoose from "mongoose";
import Hospital from "../../models/hospitals/hospitals.js";


export const getTotalRevenueForAdmin = async (req, res) => {
  try {
    const hospitalId = req.user._id;
    // const totalRevenueResult = await AccountDailySummary.aggregate([
    //   {
    //     $group: {
    //       _id: null,
    //       totalRevenue: { $sum: "$totalAmount" },
    //     },
    //   },
    // ]);

    const totalRevenueResult = await AccountDailySummary.aggregate([
      {
        $match: { hospital: hospitalId },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;

    const totalPatients = await Patient.countDocuments({
      hospital: hospitalId,
    });
    const totalDoctors = await Doctor.countDocuments({ hospital: hospitalId });

    // const adminRole = await Role.findOne({ name: "admin" });

    // if (!adminRole) {
    //   return handleResponse(res, 500, "Admin role not found");
    // }

    const totalStaff = await Staff.countDocuments({
      hospital: hospitalId,
      // role: { $ne: adminRole._id },
    });

    const totalCompounders = await Compounder.countDocuments({
      hospital: hospitalId,
    });

    const totalStaffAndCompounders = totalStaff + totalCompounders;

    const responseData = {
      totalRevenue,
      totalPatients,
      totalDoctors,
      totalStaffAndCompounders,
    };

    return handleResponse(
      res,
      200,
      "Revenue and counts fetched successfully",
      responseData
    );
  } catch (err) {
    console.error(err);
    return handleResponse(res, 500, "Internal server error");
  }
};

export const getFrontdeskSummaryForDenomination = async (req, res) => {
  try {
    const { summaryId } = req.query;
    const hospitalId = req.user.hospitalId;

    if (!summaryId) return handleResponse(res, 400, "summaryId is required");

    const accountSummary = await AccountDailySummary.findById({
      _id: summaryId,
      hospitalId: hospitalId,
    });
    // const accountSummary = await AccountDailySummary.findById(summaryId);

    if (!accountSummary) {
      return handleResponse(res, 404, "Account summary not found");
    }

    const { createdAt, submittedAt, receivedAt } = accountSummary;

    const endOfDay = new Date(submittedAt || new Date());
    endOfDay.setHours(23, 59, 59, 999);

    const effectiveReceivedAt = receivedAt || endOfDay;

    const startDate = createdAt;
    const endDate = submittedAt || effectiveReceivedAt;

    const patientPayments = await Invoice.aggregate([
      {
        $match: {
          patientType: { $in: ["NEW", "FOLLOWUP", "REGULAR", "PREPAID"] },
          issuedAt: {
            $gte: createdAt,
            $lte: submittedAt || effectiveReceivedAt,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalCash: {
            $sum: {
              $cond: [{ $eq: ["$paymentType", "CASH"] }, "$totalAmount", 0],
            },
          },
          totalOnline: {
            $sum: {
              $cond: [{ $eq: ["$paymentType", "ONLINE"] }, "$totalAmount", 0],
            },
          },
        },
      },
    ]);

    const totalPatientCash = patientPayments.length
      ? patientPayments[0].totalCash
      : 0;
    const totalPatientOnline = patientPayments.length
      ? patientPayments[0].totalOnline
      : 0;

    const guestPayments = await Guest.aggregate([
      {
        $match: {
          hospital: new mongoose.Types.ObjectId(req.user.hospitalId),
          createdAt: {
            $gte: createdAt,
            $lte: submittedAt || effectiveReceivedAt,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalCash: {
            $sum: {
              $cond: [
                { $eq: [{ $toLower: "$paymentType" }, "cash"] },
                "$totalPrice",
                0,
              ],
            },
          },
          totalOnline: {
            $sum: {
              $cond: [
                { $eq: [{ $toLower: "$paymentType" }, "online"] },
                "$totalPrice",
                0,
              ],
            },
          },
        },
      },
    ]);

    const totalGuestCash = guestPayments.length
      ? guestPayments[0].totalCash
      : 0;
    const totalGuestOnline = guestPayments.length
      ? guestPayments[0].totalOnline
      : 0;


    const canteenPayments = await IssuedToken.aggregate([
      {
        $match: {
          hospital: hospitalId,
          issuedAt: {
            $gte: createdAt,
            $lte: submittedAt || effectiveReceivedAt,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalCash: {
            $sum: {
              $cond: [
                { $eq: [{ $toLower: "$paymentType" }, "cash"] },
                "$totalAmount",
                0,
              ],
            },
          },
          totalOnline: {
            $sum: {
              $cond: [
                { $eq: [{ $toLower: "$paymentType" }, "online"] },
                "$totalAmount",
                0,
              ],
            },
          },
        },
      },
    ]);

    const totalCanteenCash = canteenPayments.length
      ? canteenPayments[0].totalCash
      : 0;
    const totalCanteenOnline = canteenPayments.length
      ? canteenPayments[0].totalOnline
      : 0;

    const totalCashCollected =
      totalPatientCash + totalGuestCash + totalCanteenCash;

    const totalOnlineCollected =
      totalPatientOnline + totalGuestOnline + totalCanteenOnline;

    const grandTotal = totalCashCollected + totalOnlineCollected;

    return handleResponse(res, 200, "Front desk summary fetched successfully", {
      totalCashCollected,
      totalOnlineCollected,
      grandTotal,
      totalPatientCash,
      totalPatientOnline,
      totalGuestCash,
      totalGuestOnline,
      totalCanteenCash,
      totalCanteenOnline,
    });
  } catch (err) {
    console.error(err);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

export const getFrontdeskAccountSummary = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    const { page, limit, skip } = getPagination(req);

    const frontdeskId = req.user._id;
    const hospitalId = req.user.hospitalId;
    const filter = {
      frontdesk: frontdeskId,
      hospital: hospitalId,
    };

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

    if (status) filter.status = status.toLowerCase();

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

export const superAdminDashboardReport = async (req, res) => {
  try {
    const superAdminId = req.user._id;

 
    const hospitals = await Hospital.find(
      { createdBy: superAdminId },
      { _id: 1 }
    );

    const hospitalIds = hospitals.map(h => h._id);


    const totalPatients = await Patient.countDocuments({
      hospital: { $in: hospitalIds },
    });


    const staffCount = await Staff.countDocuments({
      hospital: { $in: hospitalIds },
    });

    const doctorCount = await Doctor.countDocuments({
      hospital: { $in: hospitalIds },
    });

    const compounderCount = await Compounder.countDocuments({
      hospital: { $in: hospitalIds },
    });

    const totalStaff =
      staffCount + doctorCount + compounderCount;

    return handleResponse(res, 200, "Super admin dashboard data", {
      totalHospitals: hospitals.length,
      totalPatients,
      totalStaff,
      totalRevenue: 0,
      breakdown: {
        staff: staffCount,
        doctors: doctorCount,
        compounders: compounderCount,
      },
    });

  } catch (error) {
    console.error(error);
    return handleResponse(
      res,
      500,
      "Failed to fetch dashboard data"
    );
  }
};
