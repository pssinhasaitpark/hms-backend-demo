import Package from "../../../models/departments/package.js";
import { handleResponse } from "../../../utils/responseHandler.js";
import Service from "../../../models/departments/services.js";
import Department from "../../../models/departments/deparments.js";
import { validateObjectId } from "../../../utils/helper.js";
import {
  getPaginatedResponse,
  getPagination,
} from "../../../utils/pagination.js";

export const createPackage = async (req, res) => {
  try {
    const {
      name,
      description,
      noOfDays,
      price,
      expireOn,
      services,
      createdBy,
      department,
    } = req.body;

    const hospitalId = req.user._id;

    if (!validateObjectId(department, res, "Department")) return;
    if (createdBy && !validateObjectId(createdBy, res, "CreatedBy")) return;
    if (services && services.length > 0) {
      for (const serviceId of services) {
        if (!validateObjectId(serviceId, res, "Service")) return;
      }
    }

    const existingPackage = await Package.findOne({
      hospital: hospitalId,
      name: { $regex: `^${name}$`, $options: "i" },
    });
    if (existingPackage) {
      return handleResponse(
        res,
        400,
        "A package with this name already exists for this hospital"
      );
    }

    const dept = await Department.findById(department);
    if (!dept) {
      return handleResponse(
        res,
        400,
        "The specified department does not exist"
      );
    }

    if (services && services.length > 0) {
      const validServices = await Service.find({
        _id: { $in: services },
        department: department,
      });

      if (validServices.length !== services.length) {
        return handleResponse(
          res,
          400,
          "One or more services do not belong to the specified department"
        );
      }
    }

    const newPackage = new Package({
      name,
      description,
      noOfDays,
      price,
      expireOn,
      services,
      hospital: hospitalId,
      department,
    });

    const savedPackage = await newPackage.save();

    const { _id, packageId, createdAt, updatedAt } = savedPackage;
    const formattedPackage = {
      id: _id,
      packageId,
      name: savedPackage.name,
      description: savedPackage.description,
      noOfDays: savedPackage.noOfDays,
      price: savedPackage.price,
      expireOn: savedPackage.expireOn,
      services: savedPackage.services,
      createdBy: savedPackage.createdBy,
      department: savedPackage.department,
      createdAt,
      updatedAt,
    };

    return handleResponse(
      res,
      201,
      "Package created successfully",
      formattedPackage
    );
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.name) {
      return handleResponse(
        res,
        400,
        "A package with this name already exists for this hospital"
      );
    }
    return handleResponse(res, 500, "Failed to create package", {
      error: error.message,
    });
  }
};

/* export const getPackages = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);

    const { search = "", departmentId } = req.query;
    const hospitalId = req.user._id;

    const query = { hospital: hospitalId };

    if (departmentId) {
      query.department = departmentId;
    }

    if (search) {
      query.$or = [{ name: { $regex: search, $options: "i" } }];
    }

    const totalPackages = await Package.countDocuments(query);

    let packages = await Package.find(query)
      .populate({
        path: "services",
        select: "_id name",
      })
      .populate({
        path: "department",
        select: "_id name",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    if (search) {
      const regex = new RegExp(search, "i");
      packages = packages.filter(
        (pkg) =>
          regex.test(pkg.name) ||
          (pkg.department && regex.test(pkg.department.name))
      );
    }

    return handleResponse(
      res,
      200,
      "Packages retrieved successfully",
      getPaginatedResponse(packages, totalPackages, page, limit, "packages")
    );
  } catch (error) {
    return handleResponse(res, 500, "Failed to fetch packages", {
      error: error.message,
    });
  }
}; */

export const getPackages = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { search = "", departmentId } = req.query;

    let hospitalId;
    if (req.user.role === "hospital_admin") {
      hospitalId = req.user._id;
    } else if (req.user.role === "FRONTDESK") {
      hospitalId = req.user.hospitalId;
    } else {
      return handleResponse(res, 403, "Unauthorized");
    }

    const query = { hospital: hospitalId };

    if (departmentId) {
      query.department = departmentId;
    }

    if (search) {
      query.$or = [{ name: { $regex: search, $options: "i" } }];
    }

    const totalPackages = await Package.countDocuments(query);

    let packages = await Package.find(query)
      .populate({
        path: "services",
        select: "_id name",
      })
      .populate({
        path: "department",
        select: "_id name",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    if (search) {
      const regex = new RegExp(search, "i");
      packages = packages.filter(
        (pkg) =>
          regex.test(pkg.name) ||
          (pkg.department && regex.test(pkg.department.name))
      );
    }

    return handleResponse(
      res,
      200,
      "Packages retrieved successfully",
      getPaginatedResponse(packages, totalPackages, page, limit, "packages")
    );
  } catch (error) {
    return handleResponse(res, 500, "Failed to fetch packages", {
      error: error.message,
    });
  }
};

export const getPackageById = async (req, res) => {
  try {
    const { id } = req.params;
    const hospitalId = req.user._id;
    if (!validateObjectId(id, res, "Package")) return;

    const pkg = await Package.findById(id)
      .populate({
        path: "services",
        select: "_id name ",
      })
      .populate({
        path: "department",
        select: "_id name",
      });

    if (!pkg) {
      return handleResponse(res, 404, "Package not found");
    }

    return handleResponse(res, 200, "Package retrieved successfully", pkg);
  } catch (error) {
    return handleResponse(res, 500, "Failed to fetch package", {
      error: error.message,
    });
  }
};

/* export const updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id, res, "package")) return;


    const updatedPackage = await Package.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedPackage) {
      return handleResponse(res, 404, "Package not found");
    }

    return handleResponse(
      res,
      200,
      "Package updated successfully",
      updatedPackage
    );
  } catch (error) {
    return handleResponse(res, 500, "Failed to update package", {
      error: error.message,
    });
  }
}; */

export const updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const hospitalId = req.user._id;

    if (!validateObjectId(id, res, "Package")) return;

    const { name } = req.body;

    if (name) {
      const duplicate = await Package.findOne({
        _id: { $ne: id },
        hospital: hospitalId,
        name: { $regex: `^${name}$`, $options: "i" },
      });

      if (duplicate) {
        return handleResponse(
          res,
          400,
          "A package with this name already exists for this hospital"
        );
      }
    }

    const updatedPackage = await Package.findOneAndUpdate(
      { _id: id, hospital: hospitalId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedPackage) {
      return handleResponse(res, 404, "Package not found");
    }

    return handleResponse(
      res,
      200,
      "Package updated successfully",
      updatedPackage
    );
  } catch (error) {
    return handleResponse(res, 500, "Failed to update package", {
      error: error.message,
    });
  }
};

export const deletePackage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id, res, "package")) return;

    const hospitalId = req.user._id;

    const deletedPackage = await Package.findOneAndDelete({
      _id: id,
      hospital: hospitalId,
    });

    if (!deletedPackage) {
      return handleResponse(res, 404, "Package not found");
    }

    return handleResponse(
      res,
      200,
      "Package deleted successfully",
      deletedPackage
    );
  } catch (error) {
    return handleResponse(res, 500, "Failed to delete package", {
      error: error.message,
    });
  }
};
