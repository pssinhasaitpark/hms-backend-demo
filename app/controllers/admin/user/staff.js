import Staff from "../../../models/user/staff.js";
import Role from "../../../models/user/role.js";
import { handleResponse } from "../../../utils/responseHandler.js";
import { validateObjectId } from "../../../utils/helper.js";
import { getPagination } from "../../../utils/pagination.js";
import Compounder from "../../../models/user/compounder.js";


export const registerStaff = async (req, res) => {
  try {
    const {
      name,
      phone,
      password,
      roleId,
      monthlySalary,
      weekOffDay,
      username,
      email,
      serviceCharge,
      doctors = [],
      departments = [],
    } = req.body;

    const role = await Role.findById(roleId);
    if (!role) return handleResponse(res, 404, "Role not found");

    if (role.name.toUpperCase() === "COMPOUNDER") {
      const existingCompounder = await Compounder.findOne({
        $or: [{ phone }],
      });
      if (existingCompounder) {
        return handleResponse(
          res,
          400,
          "Compounder with this phone number already exists"
        );
      }

      if (departments.length > 0) {
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
      }

      // Validate doctors
      if (doctors.length > 0) {
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
      }

      const compounder = new Compounder({
        name,
        username,
        email,
        phone,
        password,
        serviceCharge,
        role: role._id,
        doctors,
        departments,
        createdBy: req.user?._id || null,
      });

      await compounder.save();

      const populatedCompounder = await Compounder.findById(compounder._id)
        .populate("role", "name description")
        .populate("doctors", "doctorName doctorId")
        .populate("departments", "name departmentId")
        .lean();

      if (populatedCompounder) delete populatedCompounder.password;

      return handleResponse(
        res,
        201,
        "Compounder registered successfully",
        populatedCompounder
      );
    } else {
      // Regular staff
      const existingStaff = await Staff.findOne({ phone });
      if (existingStaff) {
        return handleResponse(
          res,
          400,
          "Staff with this phone number already exists"
        );
      }

      const staff = new Staff({
        name,
        phone,
        password,
        monthlySalary,
        weekOffDay,
        role: role._id,
        createdBy: req.user?._id || null,
      });

      await staff.save();
      const { password: _, ...staffData } = staff.toObject();

      return handleResponse(
        res,
        201,
        "Staff registered successfully",
        staffData
      );
    }
  } catch (error) {
    console.error("❌ Registration error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

// old
// export const getAllStaff = async (req, res) => {
//   try {
//     const { page, limit, skip } = getPagination(req);
//     const { search } = req.query; 


//     const queryStaff = { status: { $ne: "deleted" } };
//     const queryCompounder = { status: { $ne: "deleted" } };

//     if (search) {
     
//       queryStaff.name = { $regex: search, $options: "i" }; 
//       queryCompounder.name = { $regex: search, $options: "i" };
//     }

 
//     const staffList = await Staff.find(queryStaff)
//       .populate("role", "name description")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     const filteredStaffList = staffList.filter(
//       (staff) => staff.role.name !== "ADMIN"
//     );

//     const compounderList = await Compounder.find(queryCompounder)
//       .populate("role", "name description")
//       .populate("doctors", "doctorName doctorId")
//       .populate("departments", "name departmentId")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();

   
//     const combinedList = [...filteredStaffList, ...compounderList];

//     const totalStaff = await Staff.countDocuments(queryStaff);
//     const totalCompounders = await Compounder.countDocuments(queryCompounder);
//     const totalItems = totalStaff + totalCompounders;

//     return handleResponse(
//       res,
//       200,
//       "Staff and compounders fetched successfully",
//       {
//         staff: combinedList,
//         page,
//         limit,
//         totalPages: Math.ceil(totalItems / limit),
//         totalItems,
//       }
//     );
//   } catch (error) {
//     console.error("❌ Get all staff error:", error);
//     return handleResponse(res, 500, "Server error", { error: error.message });
//   }
// };

// 12 dec 2025
export const getAllStaff = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { search } = req.query;

    const adminRole = await Role.findOne({ name: "ADMIN" }).lean();
    const adminRoleId = adminRole?._id;

    const queryStaff = {
      status: { $ne: "deleted" },
      role: { $ne: adminRoleId }
    };

    const queryCompounder = {
      status: { $ne: "deleted" }
    };

    if (search) {
      queryStaff.name = { $regex: search, $options: "i" };
      queryCompounder.name = { $regex: search, $options: "i" };
    }

    const staffList = await Staff.find(queryStaff)
      .populate("role", "name description")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const compounderList = await Compounder.find(queryCompounder)
      .populate("role", "name description")
      .populate("doctors", "doctorName doctorId")
      .populate("departments", "name departmentId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const combinedList = [...staffList, ...compounderList];

    const totalStaff = await Staff.countDocuments(queryStaff);
    const totalCompounders = await Compounder.countDocuments(queryCompounder);

    const totalItems = totalStaff + totalCompounders;

    return handleResponse(res, 200, "Staff and compounders fetched successfully", {
      staff: combinedList,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
    });

  } catch (error) {
    console.error("❌ Get all staff error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};


export const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id, res, "staff ID")) return;

    const staff = await Staff.findOne({ _id: id, status: { $ne: "deleted" } })
      .populate("role", "name description")
      .lean();

    if (!staff) return handleResponse(res, 404, "Staff not found");

    return handleResponse(res, 200, "Staff fetched successfully", staff);
  } catch (error) {
    console.error("❌ Get staff by ID error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

/* export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id, res, "staff ID")) return;

    const { name, phone, password, monthlySalary, roleId, weekOffDay } =
      req.body || {};

    const staff = await Staff.findOne({ _id: id, status: { $ne: "deleted" } });
    if (!staff) return handleResponse(res, 404, "Staff not found");

    if (phone) {
      const existing = await Staff.findOne({ _id: { $ne: id }, phone });
      if (existing)
        return handleResponse(res, 400, "Phone number already in use");
    }

    if (name) staff.name = name;
    if (phone) staff.phone = phone;
    if (password) staff.password = password;
    if (monthlySalary !== undefined) staff.monthlySalary = monthlySalary;
    if (weekOffDay) staff.weekOffDay = weekOffDay;

    if (roleId) {
      const role = await Role.findById(roleId);
      if (!role) return handleResponse(res, 404, "Role not found");
      staff.role = role._id;
    }

    await staff.save();
    const { password: _, ...staffData } = staff.toObject();

    return handleResponse(res, 200, "Staff updated successfully", staffData);
  } catch (error) {
    console.error("❌ Update staff error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
}; */

export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id, res, "ID")) return;

    const { name, phone, password, monthlySalary, roleId, weekOffDay } =
      req.body || {};


    let staff = await Staff.findOne({ _id: id, status: { $ne: "deleted" } });

    if (staff) {

      if (phone) {
        const existing = await Staff.findOne({ _id: { $ne: id }, phone });
        if (existing)
          return handleResponse(res, 400, "Phone number already in use");
      }

      if (name) staff.name = name;
      if (phone) staff.phone = phone;
      if (password) staff.password = password;
      if (monthlySalary !== undefined) staff.monthlySalary = monthlySalary;
      if (weekOffDay) staff.weekOffDay = weekOffDay;

      if (roleId) {
        const role = await Role.findById(roleId);
        if (!role) return handleResponse(res, 404, "Role not found");
        staff.role = role._id;
      }

      await staff.save();
      const { password: _, ...staffData } = staff.toObject();

      return handleResponse(res, 200, "Staff updated successfully", staffData);
    }

    let compounder = await Compounder.findById(id);
    if (compounder) {
      if (name) compounder.name = name;
      if (phone) compounder.phone = phone;
      if (password) compounder.password = password;
      if (monthlySalary !== undefined) compounder.monthlySalary = monthlySalary;
      if (weekOffDay) compounder.weekOffDay = weekOffDay;

      await compounder.save();
      const { password: _, ...compounderData } = compounder.toObject();

      return handleResponse(
        res,
        200,
        "Compounder updated successfully",
        compounderData
      );
    }

    return handleResponse(
      res,
      404,
      "No Staff or Compounder found with this ID"
    );
  } catch (error) {
    console.error("❌ Update error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id, res, "ID")) return;

    let staff = await Staff.findById(id);

    if (staff) {
      const deletedStaff = await Staff.findByIdAndDelete(id);
      return handleResponse(
        res,
        200,
        "Staff deleted successfully",
        deletedStaff
      );
    }

    let compounder = await Compounder.findById(id);

    if (compounder) {
      const deletedCompounder = await Compounder.findByIdAndDelete(id);
      return handleResponse(
        res,
        200,
        "Compounder deleted successfully",
        deletedCompounder
      );
    }

    return handleResponse(
      res,
      404,
      "No Staff or Compounder found with this ID"
    );
  } catch (error) {
    console.error("❌ Delete error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};
