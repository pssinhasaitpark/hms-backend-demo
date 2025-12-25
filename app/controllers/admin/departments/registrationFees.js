import registrationFees from "../../../models/base/registrationFees.js";
import { handleResponse } from "../../../utils/responseHandler.js";

export const createOrUpdateRegistrationFee = async (req, res) => {
  try {
    const { registrationFee } = req.body;
    const updatedBy = req.user?._id;

    if (!updatedBy) {
      return handleResponse(res, 401, "Unauthorized: User not found");
    }

    let feeDoc = await registrationFees.findOne({});


    
    if (feeDoc) {
      feeDoc.registrationFee = registrationFee;
      feeDoc.updatedBy = updatedBy;
      await feeDoc.save();

      return handleResponse(
        res,
        200,
        "Registration fee updated successfully",
        feeDoc
      );
    }

    feeDoc = await registrationFees.create({
      registrationFee,
      updatedBy,
    });

    return handleResponse(
      res,
      201,
      "Registration fee created successfully",
      feeDoc
    );
  } catch (error) {
    console.error("❌ Registration Fee Error:", error);
    
    return handleResponse(res, 500, "Internal Server error. Rajjjj", {
      error: error.message,
    });
  }
};

export const getRegistrationFee = async (req, res) => {
  try {
    const fees = await registrationFees
      .find()
      .populate("updatedBy", "fullName");
    handleResponse(res, 200, "Registration fees fetched successfully", fees);
  } catch (error) {
    return handleResponse(res, 500, "Internal Server error.");
  }
};

export const deleteRegistrationFee = async (req, res) => {
  try {
    const fee = await registrationFees.findByIdAndDelete(req.params.id);
    if (!fee) return handleResponse(res, 404, "Registration fee not found");

    return handleResponse(res, 200, "Registration fee deleted successfully");
  } catch (error) {
    return handleResponse(res, 500, "Internal Server error.");
  }
};
