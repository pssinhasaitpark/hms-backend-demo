import Staff from "../../models/user/staff.js";
import { generateToken } from "../../middlewares/jwtAuth.js";
import { handleResponse } from "../../utils/responseHandler.js";
import Compounder from "../../models/user/compounder.js";
import Admin from "../../models/user/admin.js";
import Hospital from "../../models/hospitals/hospitals.js";

export const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return handleResponse(
        res,
        400,
        "Identifier (phone/email) and password are required"
      );
    }

    const staff = await Staff.findOne({ phone: identifier })
      .select("+password")
      .populate("role", "name");

    if (!staff) return handleResponse(res, 401, "Invalid credentials");

    const isMatch = await staff.comparePassword(password);

    if (!isMatch) return handleResponse(res, 401, "Invalid credentials");

    staff.lastLogin = new Date();
    await staff.save();

    const token = generateToken(staff._id, staff.role.name, staff.hospital);
    const { password: _, ...staffData } = staff.toObject();

    return handleResponse(res, 200, "Login successful", {
      staff: staffData,
      token,
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return handleResponse(res, 400, "Phone and password are required");
    }

    const admin = await Staff.findOne({ phone: identifier })
      .select("+password")
      .populate("role", "name");

    if (!admin) {
      return handleResponse(res, 404, "Admin not found");
    }

    if (!admin.role || admin.role.name.toLowerCase() !== "admin") {
      return handleResponse(res, 403, "Only admin is allowed to login");
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return handleResponse(res, 401, "Invalid credentials");
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken(admin._id, admin.role.name);

    const { password: _, ...adminData } = admin.toObject();

    return handleResponse(res, 200, "Admin login successful", {
      staff: adminData,
      token,
    });
  } catch (error) {
    console.error("❌ Admin Login Error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const loginCompounder = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return handleResponse(res, 400, "Phone and password are required");
    }

    const compounder = await Compounder.findOne({ phone: identifier })
      .select("+password")
      .populate("role", "name");

    if (!compounder) {
      return handleResponse(res, 401, "Invalid credentials");
    }

    const isMatch = await compounder.comparePassword(password);
    if (!isMatch) {
      return handleResponse(res, 401, "Invalid credentials");
    }

    compounder.lastLogin = new Date();
    await compounder.save();

    const token = generateToken(
      compounder._id,
      compounder.role.name,
      compounder.hospital
    );

    const { password: _, ...compounderData } = compounder.toObject();

    return handleResponse(res, 200, "Compounder login successful", {
      token,
      compounder: compounderData,
    });
  } catch (error) {
    console.error("❌ Compounder login error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const { _id } = req.user;
    const role = req.user.role;

    let userData;

    switch (role) {
      case "SUPER_ADMIN":
        userData = await Admin.findById(_id).select("-password -__v");
        break;

      case "hospital_admin":
        userData = await Hospital.findById(_id).select(
          "-password -plain_password -__v"
        );
        break;

      case "DOCTOR":
        userData = await Doctor.findById(_id)
          .populate("role", "name")
          .populate("hospital", "hospital_name logo")
          .select("-password");
        break;

      case "COMPOUNDER":
        userData = await Compounder.findById(_id)
          .populate("role", "name")
          .populate("hospital", "hospital_name logo")
          .select("-password -doctors -departments");
        break;

      default:
        userData = await Staff.findById(_id)
          .populate("role", "name")
          .populate("hospital", "hospital_name logo")
          .select("-password");
        break;
    }

    if (!userData) {
      return handleResponse(res, 404, "User not found");
    }

    return handleResponse(
      res,
      200,
      "Profile fetched successfully",
      userData.toObject()
    );
  } catch (error) {
    console.error("❌ Get profile error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

/* export const getProfile = async (req, res) => {
  try {
    const { _id } = req.user;

    const role = req.role;
    let userData;

    switch (role) {
      case "SUPER_ADMIN":
        userData = await Admin.findById(_id).select("-password -__v");
        break;
      case "DOCTOR":
        userData = await Doctor.findById(_id)
          .populate("role", "name")
          .select("-password");
        break;
      case "COMPOUNDER":
        userData = await Compounder.findById(_id)
          .populate("role", "name")
          .select("-password");
        break;
      default:
        userData = await Staff.findById(_id)
          .populate("role", "name")
          .select("-password");
        break;
    }

    if (!userData) {
      return handleResponse(res, 404, "User not found");
    }

    return handleResponse(
      res,
      200,
      "Profile fetched successfully",
      userData.toObject()
    );
  } catch (error) {
    console.error("❌ Get profile error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};
 */
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return handleResponse(
        res,
        400,
        "Old password, new password, and confirm password are required"
      );
    }

    if (newPassword !== confirmPassword) {
      return handleResponse(
        res,
        400,
        "New password and confirm password do not match"
      );
    }

    let userModel;
    if (req.user.role === "DOCTOR") userModel = Doctor;
    else if (req.user.role === "COMPOUNDER") userModel = Compounder;
    else if (req.user.role === "SUPER_ADMIN") userModel = Admin;
    else userModel = Staff;

    const id = req.user._id;

    const user = await userModel.findById(id).select("+password");

    if (!user) return handleResponse(res, 404, "User not found");

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) return handleResponse(res, 401, "Old password is incorrect");

    user.password = newPassword;
    await user.save();

    handleResponse(res, 200, "Password changed successfully");
  } catch (err) {
    console.error("ChangePassword Error:", err);
    handleResponse(res, 500, "Server error");
  }
};

const updateUserProfile = async (userModel, userId, updateFields) => {
  try {
    const user = await userModel.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    Object.keys(updateFields).forEach((field) => {
      if (updateFields[field] !== undefined) {
        user[field] = updateFields[field];
      }
    });
    await user.save();
    return user;
  } catch (error) {
    throw new Error(error.message || "Server error");
  }
};

export const editProfile = async (req, res) => {
  try {
    const { _id, role } = req.user;
    const { name, address } = req.body;

    if (!name && !address) {
      return handleResponse(
        res,
        400,
        "At least one field (name or address) must be provided to update"
      );
    }

    // Build the updateFields object based on the provided fields
    let updateFields = {};
    if (name) updateFields.name = name;
    if (address) updateFields.address = address;

    let userModel;
    switch (role) {
      case "DOCTOR":
        userModel = Doctor;
        break;
      case "COMPOUNDER":
        userModel = Compounder;
        break;
      case "ADMIN":
      case "ACCOUNTS":
      case "FRONTDESK":
        userModel = Staff;
        break;
      default:
        return handleResponse(res, 400, "Invalid user role");
    }

    const updatedUser = await updateUserProfile(userModel, _id, updateFields);

    // Exclude the password field from the response
    const { password, ...userData } = updatedUser.toObject();

    return handleResponse(res, 200, "Profile updated successfully", userData);
  } catch (error) {
    console.error("❌ Profile edit error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};
