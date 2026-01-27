import jwt from "jsonwebtoken";
import Staff from "../models/user/staff.js";
import { handleResponse } from "../utils/responseHandler.js";
import Doctor from "../models/user/doctor.js";
import Compounder from "../models/user/compounder.js";
import Admin from "../models/user/admin.js";
import Hospital from "../models/hospitals/hospitals.js";



export const generateToken = (
  staffId,
  roleName,
  hospitalId,
  expiresIn = process.env.EXPIREIN || "1d"
) => {
  return jwt.sign(
    {
      id: staffId,
      role: roleName,
      hospitalId, // 👈 added
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn }
  );
};

/* export const verifyToken = async (req, res, next) => {
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
    } else if (role === "hospital_admin") {
      user = await Hospital.findById(id).select("_id role");
      if (user) {
        req.user = {
          _id: user._id.toString(),
          role: "hospital_admin",
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
 */

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) return handleResponse(res, 401, "No token provided");

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const { id, role, hospitalId } = decoded;

    let user;
    const staffRoles = ["ADMIN", "FRONTDESK", "ACCOUNTS"];

    if (staffRoles.includes(role)) {
      user = await Staff.findById(id).select("_id role");

      if (user) {
        req.user = {
          _id: user._id.toString(),
          role: user.role?.name || role,
          hospitalId: hospitalId,
        };
      }
    } else if (role === "DOCTOR") {
      user = await Doctor.findById(id).select("_id hospitalId");
      if (user) {
        req.user = {
          _id: user._id.toString(),
          role: "DOCTOR",
          hospitalId: hospitalId,
        };
      }
    } else if (role === "COMPOUNDER") {
      user = await Compounder.findById(id).select("_id hospitalId");
      if (user) {
        req.user = {
          _id: user._id.toString(),
          role: "COMPOUNDER",
          hospitalId: hospitalId,
        };
      }
    } else if (role === "SUPER_ADMIN") {
      user = await Admin.findById(id).select("_id");
      if (user) {
        req.user = {
          _id: user._id.toString(),
          role: "SUPER_ADMIN",
          hospitalId: null,
        };
      }
    } else if (role === "hospital_admin") {
      user = await Hospital.findById(id).select("_id");
      if (user) {
        req.user = {
          _id: user._id.toString(),
          role: "hospital_admin",
          hospitalId: user._id.toString(),
        };
      }
    } else if (role === "NURSE") {
      user = await Staff.findById(id).select("_id hospitalId");
      if (user) {
        req.user = {
          _id: user._id.toString(),
          role: "NURSE",
          hospitalId: hospitalId,
        };
      }
    } else {
      return handleResponse(res, 403, "Invalid user role");
    }

    if (!user) {
      return handleResponse(res, 401, "Invalid or expired token");
    }

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

  if (req.user.role !== "COMPOUNDER") {
    return handleResponse(res, 403, "Access denied: Compounders only");
  }

  next();
};

export const isDoctor = (req, res, next) => {
  if (!req.user)
    return handleResponse(res, 401, "Unauthorized: User not found");

  if (req.user.role !== "DOCTOR") {
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

export const isHospitalAdmin = (req, res, next) => {
  if (!req.user) {
    return handleResponse(res, 401, "Unauthorized: User not found");
  }

  if (req.user.role !== "hospital_admin") {
    return handleResponse(res, 403, "Access denied: Hospital Admins only");
  }

  next();
};
