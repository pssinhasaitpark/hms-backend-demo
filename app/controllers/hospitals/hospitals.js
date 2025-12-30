import Hospital from "../../models/hospitals/hospitals.js";
import { handleResponse } from "../../utils/responseHandler.js";
import { validateObjectId } from "../../utils/helper.js";
import { getPaginatedResponse, getPagination } from "../../utils/pagination.js";
import { sendHospitalRegistrationMail } from "../../utils/emailHandler.js";
import { generateToken } from "../../middlewares/jwtAuth.js";
import crypto from "crypto";

export const createHospital = async (req, res) => {
  try {
    const {
      hospital_name,
      email,
      hospital_type,
      address,
      contact_number,
      logo,
      contact_person,
      subscription_type,
      valid_upto,
    } = req.body;

    const logoFile = req.convertedFiles?.[0] || null;
    const password = crypto.randomBytes(6).toString("hex");

    const hospital = await Hospital.create({
      hospital_name,
      logo,
      hospital_type,
      address,
      contact_number,
      contact_person,
      subscription_type,
      valid_upto,
      email,
      password,
      plain_password: password,
      logo: logoFile,
      createdBy: req.user._id,
    });

    sendHospitalRegistrationMail({
      to: hospital.email,
      hospital_name: hospital.hospital_name,
      email: hospital.email,
      password: password,
    }).catch((err) => {
      console.error("Email send failed:", err.message);
    });

    const safeHospital = {
      id: hospital._id,
      hospital_name: hospital.hospital_name,
      email: hospital.email,
      logo: hospital.logo,
      hospital_type: hospital.hospital_type,
      address: hospital.address,
      contact_number: hospital.contact_number,
      contact_person: hospital.contact_person,
      subscription_type: hospital.subscription_type,
      valid_upto: hospital.valid_upto,
      createdBy: hospital.createdBy,
      logo: hospital.logo,
      role: hospital.role,
    };

    return handleResponse(
      res,
      201,
      "Hospital registered successfully",
      safeHospital
    );
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return handleResponse(
        res,
        400,
        `${field.replace("_", " ")} already exists`
      );
    }
    return handleResponse(res, 500, error.message);
  }
};

/* export const hospitalLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return handleResponse(res, 400, "Identifier and password are required");
    }

    const hospital = await Hospital.findOne({
      email: identifier,
      password: password,
    }).select("+password +role");

    if (!hospital) {
      return handleResponse(res, 401, "Invalid email or password");
    }

    const token = generateToken(hospital.id, hospital.role);

    const safeHospital = {
      id: hospital._id,
      hospital_name: hospital.hospital_name,
      email: hospital.email,
      hospital_type: hospital.hospital_type,
      address: hospital.address,
      contact_number: hospital.contact_number,
      contact_person: hospital.contact_person,
      subscription_type: hospital.subscription_type,
      valid_upto: hospital.valid_upto,
      role: hospital.role,
    };

    return handleResponse(res, 200, "Hospital login successful", {
      token,
      hospital: safeHospital,
    });
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, error.message);
  }
};
 */

export const hospitalLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return handleResponse(res, 400, "Identifier and password are required");
    }

    const hospital = await Hospital.findOne({
      $or: [{ email: identifier }],
    }).select("+password +role");

    if (!hospital) {
      return handleResponse(res, 401, "Invalid email or password");
    }

    const isMatch = await hospital.comparePassword(password);
    if (!isMatch) {
      return handleResponse(res, 401, "Invalid email or password");
    }

    const token = generateToken(hospital.id, hospital.role);

    const safeHospital = {
      id: hospital._id,
      hospital_name: hospital.hospital_name,
      email: hospital.email,
      hospital_type: hospital.hospital_type,
      address: hospital.address,
      contact_number: hospital.contact_number,
      contact_person: hospital.contact_person,
      subscription_type: hospital.subscription_type,
      valid_upto: hospital.valid_upto,
      role: hospital.role,
    };

    return handleResponse(res, 200, "Hospital login successful", {
      token,
      hospital: safeHospital,
    });
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, error.message);
  }
};

/* export const getHospitals = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const [hospitals, total] = await Promise.all([
      Hospital.find()
        .select("-password -plain_password -role")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Hospital.countDocuments(),
    ]);

    const response = getPaginatedResponse(
      hospitals,
      total,
      page,
      limit,
      "hospitals"
    );

    return handleResponse(res, 200, "Hospitals fetched successfully", response);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
 */

export const getHospitals = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { search } = req.query; 


    let filter = {};
    if (search) {
      filter = {
        $or: [
          { hospital_name: { $regex: search, $options: "i" } },
          { address: { $regex: search, $options: "i" } },
          { contact_person: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
    }

    const [hospitals, total] = await Promise.all([
      Hospital.find(filter)
        .select("-password -plain_password -role")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Hospital.countDocuments(filter),
    ]);

    const response = getPaginatedResponse(
      hospitals,
      total,
      page,
      limit,
      "hospitals"
    );

    return handleResponse(res, 200, "Hospitals fetched successfully", response);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};


export const getHospitalById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id, res, "Hospital ID")) return;

    const hospital = await Hospital.findById(id).select(
      "-password -plain_password"
    );

    if (!hospital) {
      return handleResponse(res, 404, "Hospital not found");
    }

    return handleResponse(res, 200, "Hospital fetched successfully", hospital);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const updateHospital = async (req, res) => {
  try {
    const hospitalId = req.params.id;

    if (!validateObjectId(hospitalId, res, "Hospital ID")) return;

    const {
      hospital_name,
      hospital_type,
      address,
      contact_number,
      contact_person,
      subscription_type,
      valid_upto,
      status,
    } = req.body;

    const logoFile = req.convertedFiles?.[0];

    if (status && !["active", "inactive"].includes(status)) {
      return handleResponse(
        res,
        400,
        "Status can only be 'active' or 'inactive'"
      );
    }

    const updateData = {
      ...(hospital_name && { hospital_name }),
      ...(hospital_type && { hospital_type }),
      ...(address && { address }),
      ...(contact_number && { contact_number }),
      ...(contact_person && { contact_person }),
      ...(subscription_type && { subscription_type }),
      ...(valid_upto && { valid_upto }),
      ...(status && { status }),
      ...(logoFile && { logo: logoFile }),
    };

    const updatedHospital = await Hospital.findByIdAndUpdate(
      hospitalId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password -plain_password");

    if (!updatedHospital) {
      return handleResponse(res, 404, "Hospital not found");
    }

    return handleResponse(
      res,
      200,
      "Hospital updated successfully",
      updatedHospital
    );
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return handleResponse(
        res,
        400,
        `${field.replace("_", " ")} already exists`
      );
    }
    return handleResponse(res, 500, error.message);
  }
};

export const deleteHospital = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id, res, "Hospital ID")) return;

    const hospital = await Hospital.findByIdAndDelete(id);

    if (!hospital) {
      return handleResponse(res, 404, "Hospital not found");
    }

    return handleResponse(res, 200, "Hospital deleted successfully");
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
