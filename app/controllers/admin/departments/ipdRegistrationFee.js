import ipdRegistrationFees from "../../../models/base/ipdRegistrationFee.js";
import { handleResponse } from "../../../utils/responseHandler.js";

export const createOrUpdateIpdRegistrationFee = async (req, res) => {
  try {
    const { ipdRegistrationFee } = req.body;
    const hospitalId = req.user?._id;

    if (!hospitalId) {
      return handleResponse(res, 401, "Unauthorized: Hospital not found");
    }

    let feeDoc = await ipdRegistrationFees.findOne({ hospital: hospitalId });

    if (feeDoc) {
      feeDoc.ipdRegistrationFee = ipdRegistrationFee;
      feeDoc.updatedBy = hospitalId;
      await feeDoc.save();

      return handleResponse(
        res,
        200,
        "Registration fee updated successfully",
        feeDoc
      );
    }

    feeDoc = await ipdRegistrationFees.create({
      hospital: hospitalId,
      ipdRegistrationFee,
      updatedBy: hospitalId,
    });

    return handleResponse(
      res,
      201,
      "Registration fee created successfully",
      feeDoc
    );
  } catch (error) {
    console.error("❌ Registration Fee Error:", error);
    return handleResponse(res, 500, "Internal Server error", {
      error: error.message,
    });
  }
};

export const getIpdRegistrationFee = async (req, res) => {
  try {
    const fees = await ipdRegistrationFees
      .find({ hospital: req.user._id })
      .populate("updatedBy", "fullName");
    handleResponse(
      res,
      200,
      "Ipd Registration fees fetched successfully",
      fees
    );
  } catch (error) {
    return handleResponse(res, 500, "Internal Server error.");
  }
};

export const deleteIpdRegistrationFee = async (req, res) => {
  try {
    const hospitalId = req.user?._id;

    const fee = await ipdRegistrationFees.findOneAndDelete({
      hospital: hospitalId,
    });

    if (!fee) {
      return handleResponse(res, 404, "Registration fee not found");
    }

    return handleResponse(res, 200, "Registration fee deleted successfully");
  } catch (error) {
    return handleResponse(res, 500, "Internal Server error");
  }
};
