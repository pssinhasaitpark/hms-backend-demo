import PatientIPDBilling from "../../models/ipd/billing.js";
import { handleResponse } from "../../utils/responseHandler.js";
import { getPagination } from "../..//utils/pagination.js";
import IPDTransaction from "../../models/ipd/transaction.js";

export const addBillingItem = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;
    const { ipdId, description, category, amount } = req.body;
    const frontDeskId = req.user._id;

    let billing = await PatientIPDBilling.findOne({
      ipdAdmission: ipdId,
      hospital: hospitalId,
    });

    if (!billing) {
      billing = new PatientIPDBilling({
        ipdAdmission: ipdId,
        hospital: hospitalId,
        billingItems: [],
      });
    }

    billing.billingItems.push({
      description,
      category,
      amount,
      createdBy: frontDeskId,
    });
    await billing.save();

    return handleResponse(res, 201, "Billing item added successfully", billing);
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, error.message);
  }
};

export const makePayment = async (req, res) => {
  try {
    const { ipdId, itemId } = req.params;
    const hospitalId = req.user.hospitalId;
    const { paidAmount } = req.body;

    if (!paidAmount || paidAmount <= 0) {
      return handleResponse(res, 400, "Paid amount must be greater than 0");
    }

    const billing = await PatientIPDBilling.findOne({
      ipdAdmission: ipdId,
      hospital: hospitalId,
    });
    if (!billing) return handleResponse(res, 404, "Billing record not found");

    const item = billing.billingItems.id(itemId);
    if (!item) return handleResponse(res, 404, "Billing item not found");

    item.paidAmount += paidAmount;
    if (item.paidAmount >= item.amount) {
      item.paidAmount = item.amount;
      item.paymentStatus = "PAID";
    } else {
      item.paymentStatus = "PARTIAL";
    }

    await billing.save();
    return handleResponse(res, 200, "Payment recorded successfully", item);
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, error.message);
  }
};

export const getBillingSummary = async (req, res) => {
  try {
    const { ipdId } = req.params;
    const hospitalId = req.user.hospitalId;
    const { page, limit, skip } = getPagination(req);

    const billing = await PatientIPDBilling.findOne({
      ipdAdmission: ipdId,
      hospital: hospitalId,
    });

    if (!billing) return handleResponse(res, 404, "Billing record not found");

    const totalItems = billing.billingItems.length;

    // Apply pagination manually on the array
    const paginatedItems = billing.billingItems.slice(skip, skip + limit);

    let totalCharges = 0;
    let totalPaid = 0;

    billing.billingItems.forEach((item) => {
      totalCharges += item.amount;
      totalPaid += item.paidAmount;
    });

    const balance = totalCharges - totalPaid;
    const totalPages = Math.ceil(totalItems / limit);

    return handleResponse(res, 200, "Billing summary fetched successfully", {
      totalCharges,
      totalPaid,
      balance,
      pagination: {
        totalItems,
        page,
        totalPages,
        limit,
      },
      items: paginatedItems,
    });
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, error.message);
  }
};



export const addAdvancePayment = async (req, res) => {
    try {
      const { ipdId, amount, paymentMode } = req.body;
      const hospitalId = req.user.hospitalId;
      const staffId = req.user._id;
  
      if (!amount || amount <= 0) {
        return handleResponse(res, 400, "Advance amount must be greater than 0");
      }
  
      // Find or create billing record
      let billing = await PatientIPDBilling.findOne({
        ipdAdmission: ipdId,
        hospital: hospitalId,
      });
  
      if (!billing) {
        billing = new PatientIPDBilling({
          ipdAdmission: ipdId,
          hospital: hospitalId,
          billingItems: [],
        });
      }
  
      // Update advance payment
      billing.advancePayment += amount;
  
      // Create transaction
      const transaction = new IPDTransaction({
        type: "ADVANCE",
        ipdBilling: billing._id,
        amount,
        paymentMode: paymentMode || "CASH",
        paidBy: staffId,
      });
  
      await transaction.save();
  
      // Link transaction to billing
      billing.transactions.push(transaction._id);
  
      await billing.save();
  
      return handleResponse(res, 201, "Advance payment recorded successfully", {
        advancePayment: billing.advancePayment,
        transaction,
      });
    } catch (error) {
      console.error(error);
      return handleResponse(res, 500, error.message);
    }
  };