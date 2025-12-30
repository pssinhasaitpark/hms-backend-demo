import staff from "../../models/user/staff.js";
import { handleResponse } from "../../utils/responseHandler.js";
import { generateToken } from "../../middlewares/jwtAuth.js";
import Admin from "../../models/user/admin.js";

// export const superAdminLogin = async (req, res) => {
//   try {
//     const { identifier, password } = req.body;

//     if (!identifier || !password) {
//       return handleResponse(res, 400, "Email/Phone and password are required");
//     }

//     const superAdmin = await admin
//       .findOne({
//         $or: [{ email: identifier }, { phone: identifier }],
//       })
//       .select("+password")
//       .populate("role", "name");

//     if (!superAdmin) {
//       return handleResponse(res, 404, "Super Admin not found");
//     }

//     if (
//       !superAdmin.role ||
//       superAdmin.role.name.toUpperCase() !== "SUPER_ADMIN"
//     ) {
//       return handleResponse(res, 403, "Only Super Admin is allowed to login");
//     }

//     superAdmin.lastLogin = new Date();
//     await superAdmin.save();

//     const token = generateToken(superAdmin._id, superAdmin.role.name);

//     const {
//       password: _,
//       status,
//       updatedAt,
//       staffId,
//       __v,
//       monthlySalary,
//       weekOffDay,
//       ...superAdminData
//     } = superAdmin.toObject();

//     return handleResponse(res, 200, "Super Admin login successful", {
//       staff: superAdminData,
//       token,
//     });
//   } catch (error) {
//     console.error("❌ Super Admin Login Error:", error);
//     return handleResponse(res, 500, "Server error", {
//       error: error.message,
//     });
//   }
// };

export const superAdminLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return handleResponse(res, 400, "Email/Phone and password are required");
    }

    const superAdmin = await Admin.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    }).select("+password");

    if (!superAdmin) {
      return handleResponse(res, 404, "Super Admin not found");
    }

    if (superAdmin.role !== "SUPER_ADMIN") {
      return handleResponse(res, 403, "Only Super Admin is allowed to login");
    }

    const isMatch = await superAdmin.comparePassword(password);
    if (!isMatch) {
      return handleResponse(res, 401, "Invalid credentials");
    }

    // 🕒 Update last login
    superAdmin.lastLogin = new Date();
    await superAdmin.save();

    // 🎟️ Generate JWT
    const token = generateToken(superAdmin._id, superAdmin.role);

    // 🧹 Clean response
    const { password: _, __v, ...superAdminData } = superAdmin.toObject();

    return handleResponse(res, 200, "Super Admin login successful", {
      staff: superAdminData,
      token,
    });
  } catch (error) {
    console.error("❌ Super Admin Login Error:", error);
    return handleResponse(res, 500, "Server error", {
      error: error.message,
    });
  }
};

export const editAdminProfile = async (req, res) => {
  try {
    const adminId = req.user._id;
 
    const { name } = req.body;

    const profileImageFile = req.convertedFiles?.[0] || null;

    const admin = await Admin.findById({ _id: adminId });
    

    if (!admin) {
      return handleResponse(res, 404, "Admin not found");
    }

    if (name) {
      admin.name = name;
    }

    if (profileImageFile) {
      admin.profile_image = profileImageFile;
    }

    await admin.save();

    const updatedAdmin = await Admin.findById(adminId).select("-password");

    return handleResponse(
      res,
      200,
      "Admin profile updated successfully",
      updatedAdmin
    );
  } catch (error) {
    console.error(error);
    return handleResponse(
      res,
      500,
      "Something went wrong while updating profile"
    );
  }
};
