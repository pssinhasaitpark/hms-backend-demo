import Compounder from "../../../models/user/compounder.js";
import Role from "../../../models/user/role.js";
import { handleResponse } from "../../../utils/responseHandler.js";
import { validateObjectId } from "../../../utils/helper.js";
import { getPagination } from "../../../utils/pagination.js";
import Department from "../../../models/departments/deparments.js";
import Doctor from "../../../models/user/doctor.js";


export const getAllCompounders = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { search } = req.query; 

 
    const query = { status: { $ne: "deleted" } };
    if (search) {
      query.name = { $regex: search, $options: "i" }; 
    }

    const compounders = await Compounder.find(query)
      .populate("role", "name description")
      .populate("doctors", "doctorName doctorId")
      .populate("departments", "name departmentId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalItems = await Compounder.countDocuments(query);

    return handleResponse(res, 200, "Compounders fetched successfully", {
      compounders,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
    });
  } catch (error) {
    console.error("❌ Get all compounders error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const getCompounderById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id, res, "compounder ID")) return;

    const compounder = await Compounder.findOne({
      _id: id,
      status: { $ne: "deleted" },
    })
      .populate("role", "name description")
      .populate("doctors", "doctorName doctorId")
      .populate("departments", "name departmentId")
      .lean();

    if (!compounder) return handleResponse(res, 404, "Compounder not found");

    return handleResponse(
      res,
      200,
      "Compounder fetched successfully",
      compounder
    );
  } catch (error) {
    console.error("❌ Get compounder by ID error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const updateCompounder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id, res, "compounder ID")) return;

    const {
      name,
      phone,
      monthlySalary,
      roleId,
      doctors,
      departments,
      weekOffDay,
    } = req.body || {};

    const compounder = await Compounder.findOne({
      _id: id,
      status: { $ne: "deleted" },
    });

    if (!compounder) return handleResponse(res, 404, "Compounder not found");

    if (roleId) {
      const role = await Role.findById(roleId);
      if (!role) return handleResponse(res, 404, "Role not found");

      if (role.name.toUpperCase() !== "COMPOUNDER") {
        return handleResponse(
          res,
          403,
          "You can only assign the Compounder role to this user"
        );
      }

      compounder.role = role._id;
    }

    if (departments && departments.length > 0) {
      const validDepartments = await Department.find({
        _id: { $in: departments },
        status: "active",
      });

      if (validDepartments.length !== departments.length) {
        const validIds = validDepartments.map((d) => d._id.toString());
        const invalidDeptIds = departments.filter(
          (id) => !validIds.includes(id.toString())
        );

        return handleResponse(
          res,
          400,
          `Some departments are invalid or inactive: ${invalidDeptIds.join(
            ", "
          )}`
        );
      }

      compounder.departments = departments;
    }

    if (doctors && doctors.length > 0) {
      const validDoctors = await Doctor.find({
        _id: { $in: doctors },
        status: "active",
      });

      if (validDoctors.length !== doctors.length) {
        const validIds = validDoctors.map((d) => d._id.toString());
        const invalidDocIds = doctors.filter(
          (id) => !validIds.includes(id.toString())
        );

        return handleResponse(
          res,
          400,
          `Some doctors are invalid or inactive: ${invalidDocIds.join(", ")}`
        );
      }

      compounder.doctors = doctors;
    }

    if (name) compounder.name = name;
    if (phone) compounder.phone = phone;
    // if (password) {
    //   const salt = await bcrypt.genSalt(10);
    //   compounder.password = await bcrypt.hash(password, salt);
    // }
    if (monthlySalary !== undefined) compounder.monthlySalary = monthlySalary;
    if (weekOffDay) compounder.weekOffDay = weekOffDay; // Update weekOffDay if provided

    // Save the updated compounder
    await compounder.save();

    const populatedCompounder = await Compounder.findById(compounder._id)
      .populate("role", "name description")
      .populate("doctors", "doctorName doctorId")
      .populate("departments", "name departmentId")
      .lean();

    if (populatedCompounder) delete populatedCompounder.password;

    return handleResponse(
      res,
      200,
      "Compounder updated successfully",
      populatedCompounder
    );
  } catch (error) {
    console.error("❌ Update compounder error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const deleteCompounder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id, res, "compounder ID")) return;

    const compounder = await Compounder.findOne({ _id: id });
    if (!compounder) return handleResponse(res, 404, "Compounder not found");

    const deleteCompounder = await Compounder.findByIdAndDelete(id);

    return handleResponse(
      res,
      200,
      "Compounder deleted successfully",
      deleteCompounder
    );
  } catch (error) {
    console.error("❌ Delete compounder error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};
