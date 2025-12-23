import OpdRegistrationFee from "../../../models/base/opdRegistrationFee.js";
import { handleResponse } from "../../../utils/responseHandler.js";

export const createOrUpdateOpdFee = async (req, res) => {
  try {
    const { registrationFee } = req.body;
    const updatedBy = req.user?._id;

    let feeDoc = await OpdRegistrationFee.findOne({});

    if (feeDoc) {
      feeDoc.registrationFee = registrationFee;
      feeDoc.updatedBy = updatedBy;
      await feeDoc.save();

      return handleResponse(
        res,
        200,
        "OPD registration fee updated successfully",
        feeDoc
      );
    } else {
      feeDoc = await OpdRegistrationFee.create({
        registrationFee,
        updatedBy,
      });

      return handleResponse(
        res,
        201,
        "OPD registration fee created successfully",
        feeDoc
      );
    }
  } catch (error) {
    handleResponse(res, 500, error.message);
  }
};

export const getAllOpdFees = async (req, res) => {
  try {
    const fees = await OpdRegistrationFee.find().populate(
      "updatedBy",
      "firstName lastName "
    );
    handleResponse(res, 200, "OPD fees fetched successfully", fees);
  } catch (error) {
    handleResponse(res, 500, error.message);
  }
};

export const deleteOpdFee = async (req, res) => {
  try {
    const fee = await OpdRegistrationFee.findByIdAndDelete(req.params.id);
    if (!fee) return handleResponse(res, 404, "OPD registration fee not found");

    handleResponse(res, 200, "OPD registration fee deleted successfully");
  } catch (error) {
    handleResponse(res, 500, error.message);
  }
};
