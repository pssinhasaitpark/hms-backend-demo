import Department from "../../../models/departments/deparments.js";
import { handleResponse } from "../../../utils/responseHandler.js";
import { validateObjectId } from "../../../utils/helper.js";
import { getPagination } from "../../../utils/pagination.js";
import Services from "../../../models/departments/services.js";
import { updateStatus } from "../../../utils/updateStatus.js";
import Doctor from "../../../models/user/doctor.js";

/* export const createDepartment = async (req, res) => {
  try {
    const { name, description, services, opdCharge } = req.body;

    const existing = await Department.findOne({ name });
    if (existing) return handleResponse(res, 400, "Department already exists");

    const department = await Department.create({
      name,
      description,
      createdBy: req.user._id,
    });

    if (Array.isArray(services) && services.length > 0) {
      const createdServices = [];

      for (const service of services) {
        const newService = new Services({
          ...service,
          department: department._id,
          createdBy: req.user._id,
        });
        await newService.save();
        createdServices.push(newService);
      }

      department.services = createdServices.map((s) => s._id);
      await department.save();
    }

    const populatedDepartment = await Department.findById(
      department._id
    ).populate({
      path: "services",
      select: "serviceId name description charge",
    });

    return handleResponse(
      res,
      201,
      "Department created successfully",
      populatedDepartment
    );
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, "Server error");
  }
};
 */

export const createDepartment = async (req, res) => {
  try {
    const { name, description, services, opdCharge } = req.body;

    const existing = await Department.findOne({ name });
    if (existing) return handleResponse(res, 400, "Department already exists");

    const department = await Department.create({
      name,
      description,
      opdCharge: opdCharge ?? 0, // ⭐ Added
      createdBy: req.user._id,
    });

    if (Array.isArray(services) && services.length > 0) {
      const createdServices = [];

      for (const service of services) {
        const newService = new Services({
          ...service,
          department: department._id,
          createdBy: req.user._id,
        });
        await newService.save();
        createdServices.push(newService);
      }

      department.services = createdServices.map((s) => s._id);
      await department.save();
    }

    const populatedDepartment = await Department.findById(
      department._id
    ).populate({
      path: "services",
      select: "serviceId name description charge",
    });

    return handleResponse(
      res,
      201,
      "Department created successfully",
      populatedDepartment
    );
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, "Server error");
  }
};

export const getDepartments = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { search } = req.query;

    const query = { status: { $ne: "deleted" } };
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const totalItems = await Department.countDocuments(query);

    const departments = await Department.find(query)
      .populate("createdBy", "firstName lastName email")
      .populate({
        path: "services",
        select: "serviceId name description charge",
      })
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const pagination = {
      totalItems,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
    };

    return handleResponse(res, 200, "Departments fetched successfully", {
      departments,
      pagination,
    });
  } catch (error) {
    console.error("❌ Get departments error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const getDepartmentsWithDoctors = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { search, doctorsIds } = req.query;

    const query = { status: { $ne: "deleted" } };

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    let filteredDoctorIds = [];
    if (doctorsIds) {
      filteredDoctorIds = doctorsIds.split(",").map((id) => id.trim());

      // Get only departments of these doctors
      const departmentsWithDoctors = await Doctor.find({
        _id: { $in: filteredDoctorIds },
      }).distinct("department");

      query._id = { $in: departmentsWithDoctors };
    }

    // Count total matching departments
    const totalItems = await Department.countDocuments(query);

    // Fetch departments (only id and name)
    const departments = await Department.find(query)
      .select("_id name")
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    // Get department IDs
    const departmentIds = departments.map((d) => d._id);

    // Fetch doctors for these departments (only name)
    const doctorsQuery = { department: { $in: departmentIds } };
    if (filteredDoctorIds.length > 0) {
      doctorsQuery._id = { $in: filteredDoctorIds };
    }

    const doctors = await Doctor.find(doctorsQuery).select("_id doctorName department");

    // Attach doctors' names to departments
    const departmentsWithDoctors = departments.map((dep) => {
      const doctorNames = doctors
        .filter((doc) => doc.department.toString() === dep._id.toString())
        .map((doc) => doc.doctorName);

      return {
        _id: dep._id,
        name: dep.name,
        doctors: doctorNames,
      };
    });

    const pagination = {
      totalItems,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
    };

    return handleResponse(res, 200, "Departments fetched successfully", {
      departments: departmentsWithDoctors,
      pagination,
    });
  } catch (error) {
    console.error("❌ Get departments error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id, res, "department ID")) return;

    const department = await Department.findById(id)
      .populate("createdBy", "firstName lastName email")
      .populate({
        path: "services",
        select: "serviceId name description charge",
      });

    if (!department) return handleResponse(res, 404, "Department not found");

    return handleResponse(
      res,
      200,
      "Department fetched successfully",
      department
    );
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, "Server error");
  }
};


/* export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id, res, "department ID")) return;

    const { name, description, status, services } = req.body;

    const department = await Department.findById(id).populate({
      path: "services",
      select: "serviceId name description charge",
    });

    if (!department) {
      return handleResponse(res, 404, "Department not found");
    }

    if (name) {
      const existingDept = await Department.findOne({
        name: name.trim(),
        _id: { $ne: id },
      });
      if (existingDept) {
        return handleResponse(
          res,
          400,
          `Department name '${name}' already exists`
        );
      }
      department.name = name.trim();
    }

    if (description) department.description = description.trim();
    if (status) department.status = status;

    if (Array.isArray(services) && services.length > 0) {
      for (const serviceData of services) {
        if (serviceData._id) {
          const existingService = await Services.findOne({
            _id: serviceData._id,
            department: department._id,
          });

          if (existingService) {
            if (serviceData.name)
              existingService.name = serviceData.name.trim();
            if (serviceData.description)
              existingService.description = serviceData.description.trim();
            if (serviceData.charge !== undefined)
              existingService.charge = serviceData.charge;

            await existingService.save();
            continue;
          }
        }

        const duplicateService = await Services.findOne({
          name: serviceData.name.trim(),
          department: department._id,
        });

        if (duplicateService) continue;

        const newService = new Services({
          ...serviceData,
          department: department._id,
          createdBy: req.user._id,
        });
        await newService.save();
        department.services.push(newService._id);
      }
    }

    await department.save();

    const populatedDepartment = await Department.findById(department._id)
      .populate({
        path: "services",
        select: "serviceId name description charge",
      })
      .populate("createdBy", "firstName lastName email");

    return handleResponse(
      res,
      200,
      "Department updated successfully",
      populatedDepartment
    );
  } catch (error) {
    console.error("❌ Update department error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
}; */

export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id, res, "department ID")) return;

    const { name, description, status, services, opdCharge } = req.body;

    const department = await Department.findById(id).populate({
      path: "services",
      select: "serviceId name description charge",
    });

    if (!department) {
      return handleResponse(res, 404, "Department not found");
    }

    if (name) {
      const existingDept = await Department.findOne({
        name: name.trim(),
        _id: { $ne: id },
      });
      if (existingDept) {
        return handleResponse(
          res,
          400,
          `Department name '${name}' already exists`
        );
      }
      department.name = name.trim();
    }

    if (description) department.description = description.trim();

    if (status) department.status = status;

    if (opdCharge !== undefined) {
      department.opdCharge = opdCharge;
    }

    if (Array.isArray(services) && services.length > 0) {
      for (const serviceData of services) {
        if (serviceData._id) {
          const existingService = await Services.findOne({
            _id: serviceData._id,
            department: department._id,
          });

          if (existingService) {
            if (serviceData.name)
              existingService.name = serviceData.name.trim();
            if (serviceData.description)
              existingService.description = serviceData.description.trim();
            if (serviceData.charge !== undefined)
              existingService.charge = serviceData.charge;

            await existingService.save();
            continue;
          }
        }

        const duplicateService = await Services.findOne({
          name: serviceData.name.trim(),
          department: department._id,
        });

        if (duplicateService) continue;

        const newService = new Services({
          ...serviceData,
          department: department._id,
          createdBy: req.user._id,
        });
        await newService.save();
        department.services.push(newService._id);
      }
    }

    await department.save();

    const populatedDepartment = await Department.findById(department._id)
      .populate({
        path: "services",
        select: "serviceId name description charge",
      })
      .populate("createdBy", "firstName lastName email");

    return handleResponse(
      res,
      200,
      "Department updated successfully",
      populatedDepartment
    );
  } catch (error) {
    console.error("❌ Update department error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id, res, "department ID")) return;

    const department = await Department.findById(id);

    if (!department || department.status === "deleted") {
      return handleResponse(res, 404, "Department not found");
    }

    department.status = "deleted";
    await department.save();

    return handleResponse(res, 200, "Department deleted successfully");
  } catch (error) {
    console.error("❌ Delete department error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const updateDepartmentStatus = (req, res) => {
  return updateStatus(req, res, Department, [
    { model: Services, field: "department" },
  ]);
};
