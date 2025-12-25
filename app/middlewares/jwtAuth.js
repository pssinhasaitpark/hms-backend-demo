import jwt from "jsonwebtoken";
import Staff from "../models/user/staff.js";
import { handleResponse } from "../utils/responseHandler.js";
import Doctor from "../models/user/doctor.js";
import Compounder from "../models/user/compounder.js";
import Admin from "../models/user/admin.js";


export const generateToken = (
  staffId,
  roleName,
  expiresIn = process.env.EXPIREIN || "1d"
) => {
  return jwt.sign(
    { id: staffId, role: roleName },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn }
  );
};

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) return handleResponse(res, 401, "No token provided");

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const { id, role } = decoded;

    let user;
    const staffRoles = ["ADMIN", "FRONTDESK", "ACCOUNTS"];
    if (staffRoles.includes(role)) {
      user = await Staff.findById(id)
        .select("-password")
        .populate("role", "name");
      if (user) {
        req.user = {
          ...user.toObject(),
          role: user.role?.name || role,
        };
      }
    } else if (role === "DOCTOR") {
      user = await Doctor.findById(id).select("-password");
      if (user) {
        req.user = user.toObject();
        req.role = "DOCTOR";
      }
    } else if (role === "COMPOUNDER") {
      user = await Compounder.findById(id).select("-password");
      if (user) {
        req.user = user.toObject();
        req.role = "COMPOUNDER";
      }
    } else if (role === "SUPER_ADMIN") {
      user = await Admin.findById({ _id: id }); 
 
      if (user) {
        req.user = {
          _id: user._id.toString(),
          role: "SUPER_ADMIN",
        };
      }
    } else {
      return handleResponse(res, 403, "Invalid user role");
    }

    if (!user) {
      return handleResponse(res, 401, "Invalid or expired token");
    }
    req.role = req.role || req.user.role;

    next();
  } catch (err) {
    console.error("verifyToken Error:", err);
    return handleResponse(res, 401, "Invalid or expired token");
  }
};

export const requireRole = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

export const isAdmin = (req, res, next) => {
  if (!req.user)
    return handleResponse(res, 401, "Unauthorized: User not found");

  if (req.user.role !== "ADMIN") {
    return handleResponse(res, 403, "Access denied: Admins only");
  }

  next();
};

export const isFrontDesk = (req, res, next) => {
  if (!req.user)
    return handleResponse(res, 401, "Unauthorized: User not found");

  if (req.user.role !== "FRONTDESK") {
    return handleResponse(res, 403, "Access denied: FrontDesk only");
  }

  next();
};

export const isCompounder = (req, res, next) => {
  if (!req.user)
    return handleResponse(res, 401, "Unauthorized: User not found");

  if (req.role !== "COMPOUNDER") {
    return handleResponse(res, 403, "Access denied: Compounders only");
  }

  next();
};

export const isDoctor = (req, res, next) => {
  if (!req.user)
    return handleResponse(res, 401, "Unauthorized: User not found");

  if (req.role !== "DOCTOR") {
    return handleResponse(res, 403, "Access denied: Doctors only");
  }

  next();
};

export const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return handleResponse(res, 401, "Unauthorized: User not found");
  }

  if (req.user.role !== "SUPER_ADMIN") {
    return handleResponse(res, 403, "Access denied: Super Admin only");
  }
  next();
};
