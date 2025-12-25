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


export const getTotalRevenueForAdmin = async (req, res) => {
  try {
  
    const totalRevenueResult = await AccountDailySummary.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;

    const totalPatients = await Patient.countDocuments();
    const totalDoctors = await Doctor.countDocuments();

    const adminRole = await Role.findOne({ name: "admin" });

    if (!adminRole) {
      return handleResponse(res, 500, "Admin role not found");
    }

    const totalStaff = await Staff.countDocuments({
      role: { $ne: adminRole._id },
    });

    const totalCompounders = await Compounder.countDocuments();

    const totalStaffAndCompounders = totalStaff + totalCompounders;

    const responseData = {
      totalRevenue, // <-- ab ye AccountDailySummary se aa raha hai
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
    if (!summaryId) return handleResponse(res, 400, "summaryId is required");

    const accountSummary = await AccountDailySummary.findById(summaryId);
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
          patientType: { $in: ["NEW", "FOLLOWUP", "REGULAR","PREPAID"] },
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

    const filter = {
      frontdesk: frontdeskId,
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
