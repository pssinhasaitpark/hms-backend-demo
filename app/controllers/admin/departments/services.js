import Service from "../../../models/departments/services.js";
import { validateObjectId } from "../../../utils/helper.js";
import { getPagination } from "../../../utils/pagination.js";
import { handleResponse } from "../../../utils/responseHandler.js";
import Department from "../../../models/departments/deparments.js";
import { updateStatus } from "../../../utils/updateStatus.js";
import Doctor from "../../../models/user/doctor.js";
import DoctorService from "../../../models/departments/doctorServices.js";

export const createService = async (req, res) => {
  try {
    const { name, description, department, charge } = req.body || {};
    const hospital = req.user._id;
    if (charge === undefined || charge < 0) {
      return handleResponse(res, 400, "Charge is required and must be >= 0");
    }

    const deptExists = await Department.findById(department);
    if (!deptExists) return handleResponse(res, 404, "Department not found");

    const existing = await Service.findOne({
      name: name.trim(),
      department,
      hospital,
    });
    if (existing) {
      return handleResponse(
        res,
        400,
        `Service with the name '${name}' already exists in this department`
      );
    }

    const service = await Service.create({
      name: name.trim(),
      description,
      department,
      charge,
      hospital: hospital,
    });

    const doctorsInDepartment = await Doctor.find({ department, hospital });
    if (doctorsInDepartment.length > 0) {
      const doctorServiceDocs = doctorsInDepartment.map((d) => ({
        doctor: d._id,
        service: service._id,
      }));
      await DoctorService.insertMany(doctorServiceDocs);
    }

    return handleResponse(res, 201, "Service created successfully", {
      service,
    });
  } catch (error) {
    console.error("❌ Service creation error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

/* export const getServices = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { search, departmentId } = req.query;
    const hospital = req.user._id;
    const query = { hospital };

    if (search) {
      try {
        const sanitizedSearch = search.replace(
          /[\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,
          "\\$&"
        );
        query.name = { $regex: sanitizedSearch, $options: "i" };
      } catch (regexError) {
        return handleResponse(res, 400, "Invalid search query", {
          error: "Invalid regular expression in search query",
        });
      }
    }

    if (departmentId) {
      query.department = departmentId;
    }

    const totalItems = await Service.countDocuments(query);
    const servicesData = await Service.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("department");
    // .populate("createdBy");

    const services = servicesData.map((service) => {
      const obj = service.toObject();

      if (obj.createdBy) {
        obj.createdBy = {
          _id: obj.createdBy._id,
          name: `${obj.createdBy.fullName}`,
        };
      }

      if (obj.department) {
        obj.department = {
          _id: obj.department._id,
          name: obj.department.name,
        };
      }

      return obj;
    });

    const pagination = {
      totalItems,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
    };

    return handleResponse(res, 200, "Services fetched successfully", {
      services,
      pagination,
    });
  } catch (error) {
    console.error("❌ Get services error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
}; */


export const getServices = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { search, departmentId } = req.query;

    let hospitalId;
    if (req.user.role === "hospital_admin") {
      hospitalId = req.user._id;
    } else {
      hospitalId = req.user.hospitalId;
    }

    const query = { hospital: hospitalId };

    if (search) {
      try {
        const sanitizedSearch = search.replace(
          /[\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,
          "\\$&"
        );
        query.name = { $regex: sanitizedSearch, $options: "i" };
      } catch (regexError) {
        return handleResponse(res, 400, "Invalid search query", {
          error: "Invalid regular expression in search query",
        });
      }
    }

    if (departmentId) {
      query.department = departmentId;
    }

    const totalItems = await Service.countDocuments(query);
    const servicesData = await Service.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("department");

    const services = servicesData.map((service) => {
      const obj = service.toObject();

      if (obj.createdBy) {
        obj.createdBy = {
          _id: obj.createdBy._id,
          name: `${obj.createdBy.fullName}`,
        };
      }

      if (obj.department) {
        obj.department = {
          _id: obj.department._id,
          name: obj.department.name,
        };
      }

      return obj;
    });

    const pagination = {
      totalItems,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
    };

    return handleResponse(res, 200, "Services fetched successfully", {
      services,
      pagination,
    });
  } catch (error) {
    console.error("❌ Get services error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const getServiceById = async (req, res) => {
  const { id } = req.params;

  if (!validateObjectId(id, res, "service ID")) return;

  const service = await Service.findById({
    _id: id,
    hospital: req.user._id,
  })
    .populate("department")
    .populate("createdBy");

  if (!service) return handleResponse(res, 404, "Service not found");

  const serviceObj = service.toObject();
  if (serviceObj.createdBy) {
    serviceObj.createdBy = {
      _id: serviceObj.createdBy._id,
      name: `${serviceObj.createdBy.firstName} ${serviceObj.createdBy.lastName}`,
    };
  }

  return handleResponse(res, 200, "Service fetched successfully", {
    service: serviceObj,
  });
};

export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id, res, "service ID")) return;

    const { name, description, department, charge } = req.body;

    if (charge !== undefined && charge < 0) {
      return handleResponse(res, 400, "Charge must be >= 0");
    }

    const service = await Service.findById({
      _id: id,
      hospital: req.user._id,
    });
    if (!service) return handleResponse(res, 404, "Service not found");

    const newDepartment = department || service.department;
    const newName = name ? name.trim() : service.name;

    const existing = await Service.findOne({
      name: newName,
      department: newDepartment,
      _id: { $ne: id },
    });

    if (existing) {
      return handleResponse(
        res,
        400,
        `Service name '${newName}' already exists in this department`
      );
    }

    if (name) service.name = newName;
    if (description) service.description = description.trim();
    if (department) service.department = department;
    if (charge !== undefined) service.charge = charge;

    await service.save();

    return handleResponse(res, 200, "Service updated successfully", {
      service,
    });
  } catch (error) {
    console.error("❌ Update service error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

/* export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id, res, "service ID")) return;

    const service = await Service.findById(id)
      .populate("department", "_id name")
      .populate("createdBy");

    if (!service) {
      return handleResponse(res, 404, "Service not found");
    }

    await Service.findByIdAndDelete({
      _id: id,
      hospital: req.user._id,
    });

    const serviceObj = service.toObject();
    if (serviceObj.createdBy) {
      serviceObj.createdBy = {
        _id: serviceObj.createdBy._id,
        name: `${serviceObj.createdBy.firstName} ${serviceObj.createdBy.lastName}`,
      };
    }

    return handleResponse(res, 200, "Service deleted successfully", {
      service: serviceObj,
    });
  } catch (error) {
    console.error("❌ Delete service error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};
 */

export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id, res, "service ID")) return;

    const service = await Service.findOne({
      _id: id,
      hospital: req.user._id,
    })
      .populate("department", "_id name")
      .populate("createdBy");

    if (!service) {
      return handleResponse(res, 404, "Service not found");
    }

    await DoctorService.deleteMany({ service: id });

    await Service.deleteOne({
      _id: id,
      hospital: req.user._id,
    });

    return handleResponse(res, 200, "Service deleted successfully", {
      service,
    });
  } catch (error) {
    console.error("❌ Delete service error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const updateServiceStatus = (req, res) => {
  return updateStatus(req, res, Service, []);
};
