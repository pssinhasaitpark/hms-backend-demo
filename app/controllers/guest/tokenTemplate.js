import TokenTemplate from "../../models/guest/tokenTemplate.js";
import { getPagination, getPaginatedResponse } from "../../utils/pagination.js";
import { handleResponse } from "../../utils/responseHandler.js";
import IssuedToken from "../../models/guest/tokenIssues.js";
import { updateAccountDailySummary } from "../../utils/accountDailySummary.js";


function timeStringToMinutes(timeStr) {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);

  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export const createTokenTemplate = async (req, res) => {
  try {
    const { mealType, amount, validFrom, validTo, remarks } = req.body;

    if (!mealType || !amount || !validFrom || !validTo) {
      return handleResponse(
        res,
        400,
        "Meal Type, Amount, ValidFrom and ValidTo are required."
      );
    }

    const tokenTemplate = new TokenTemplate({
      mealType,
      amount,
      validFrom,
      validTo,
      remarks: remarks || null,
      createdBy: req.user._id,
    });

    await tokenTemplate.save();

    return handleResponse(
      res,
      201,
      "Token Template created successfully",
      tokenTemplate
    );
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, "Internal server error");
  }
};


export const getTokenTemplates = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { search } = req.query;

    let query = {};

    if (search) {
      query.mealType = { $regex: search, $options: "i" };
    }

    const tokenTemplates = await TokenTemplate.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalTemplates = await TokenTemplate.countDocuments(query);

    const response = getPaginatedResponse(
      tokenTemplates,
      totalTemplates,
      page,
      limit
    );

    return handleResponse(
      res,
      200,
      "Token Templates fetched successfully",
      response
    );
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, "Server error, please try again.");
  }
};

export const getTokenTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const tokenTemplate = await TokenTemplate.findById(id);

    if (!tokenTemplate) {
      return handleResponse(res, 404, "Token Template not found.");
    }

    return handleResponse(
      res,
      200,
      "Token Template fetched successfully",
      tokenTemplate
    );
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, "Server error, please try again.");
  }
};


export const updateTokenTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { mealType, amount, validFrom, validTo, remarks } = req.body;

 
    if (
      !mealType &&
      !amount &&
      !validFrom &&
      !validTo &&
      remarks === undefined
    ) {
      return handleResponse(
        res,
        400,
        "At least one field is required to update."
      );
    }

    const updateData = {};

    if (mealType) updateData.mealType = mealType;
    if (amount !== undefined) updateData.amount = amount;
    if (validFrom) updateData.validFrom = validFrom;
    if (validTo) updateData.validTo = validTo;
    if (remarks !== undefined) updateData.remarks = remarks;

    const updatedTokenTemplate = await TokenTemplate.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedTokenTemplate) {
      return handleResponse(res, 404, "Token Template not found.");
    }

    return handleResponse(
      res,
      200,
      "Token Template updated successfully",
      updatedTokenTemplate
    );
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, "Server error, please try again.");
  }
};

export const deleteTokenTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedTokenTemplate = await TokenTemplate.findByIdAndDelete(id);
    if (!deletedTokenTemplate) {
      return handleResponse(res, 404, "Token Template not found.");
    }

    return handleResponse(res, 200, "Token Template deleted successfully");
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, "Server error, please try again.");
  }
};

export const issueToken = async (req, res) => {
  try {
    const { template, quantity, paymentType } = req.body;

    if (!template || !quantity || !paymentType) {
      return handleResponse(
        res,
        400,
        "Template, quantity, and paymentType are required"
      );
    }

    if (!["cash", "online"].includes(paymentType)) {
      return handleResponse(res, 400, "paymentType must be 'cash' or 'online'");
    }

    const tokenTemplate = await TokenTemplate.findById(template);
    if (!tokenTemplate) {
      return handleResponse(res, 404, "TokenTemplate not found");
    }

 
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const validFromMinutes = timeStringToMinutes(tokenTemplate.validFrom);
    const validToMinutes = timeStringToMinutes(tokenTemplate.validTo);

    if (currentMinutes < validFromMinutes || currentMinutes > validToMinutes) {
      return handleResponse(
        res,
        400,
        `Token can only be issued between ${tokenTemplate.validFrom} and ${tokenTemplate.validTo}`
      );
    }


    const unitPrice = tokenTemplate.amount;
    const totalAmount = unitPrice * quantity;

    await updateAccountDailySummary(
      req.user._id,
      0,
      0,
      0,
      0,
      paymentType === "cash" ? totalAmount : 0,
      paymentType === "online" ? totalAmount : 0
    );

    const newIssuedToken = new IssuedToken({
      template: tokenTemplate._id,
      quantity,
      unitPrice,
      totalAmount,
      mealType: tokenTemplate.mealType,
      paymentType,
      remarks: tokenTemplate.remarks, 
      createdBy: req.user._id,
    });

    await newIssuedToken.save();

    return handleResponse(
      res,
      201,
      "Token issued successfully",
      newIssuedToken
    );
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, "Server error");
  }
};


export const getAllIssuedTokens = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { search } = req.query;

    let filter = {};
    if (search) {
      filter = {
        $or: [{ mealType: { $regex: search, $options: "i" } }],
      };
    }

    const total = await IssuedToken.countDocuments(filter);

    const tokens = await IssuedToken.find(filter)
      .populate("template", "mealType amount")
      .skip(skip)
      .limit(limit)
      .sort({ issuedAt: -1 });

    const response = getPaginatedResponse(tokens, total, page, limit, "tokens");

    return handleResponse(res, 200, "All issued tokens retrieved", response);
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, "Server error");
  }
};

export const getIssuedTokenById = async (req, res) => {
  try {
    const { id } = req.params;

    const token = await IssuedToken.findById(id).populate(
      "template",
      "mealType amount"
    );

    if (!token) {
      return handleResponse(res, 404, "Issued token not found");
    }

    return handleResponse(res, 200, "Issued token retrieved", token);
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, "Server error");
  }
};
