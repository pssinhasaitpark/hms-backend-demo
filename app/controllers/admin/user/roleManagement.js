import Role from "../../../models/user/role.js";
import { validateObjectId } from "../../../utils/helper.js";
import { getPagination } from "../../../utils/pagination.js";
import { handleResponse } from "../../../utils/responseHandler.js";

export const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    let existingRole = await Role.findOne({ name: name.trim() });

    if (existingRole) {
      if (existingRole.status === "deleted") {
        existingRole.status = "active";
        existingRole.description = description;
        existingRole.permissions = permissions;
        await existingRole.save();

        return handleResponse(res, 200, "Deleted role reactivated", {
          role: existingRole,
        });
      } else {
        return handleResponse(res, 400, "Role with this name already exists");
      }
    }

    const role = await Role.create({
      name: name.trim(),
      description,
      permissions,
      status: "active",
    });

    return handleResponse(res, 201, "Role created successfully", { role });
  } catch (error) {
    console.error("❌ Role creation error:", error);

    if (error.code === 11000) {
      return handleResponse(res, 400, "Role with this name already exists");
    }

    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const getRoles = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const { search } = req.query; 


    const query = {
      status: { $ne: "deleted" },
      name: { $ne: "ADMIN" },
    };

  
    if (search) {
      query.name = { $regex: search, $options: "i" }; 
    }

    const totalItems = await Role.countDocuments(query); 
    const roles = await Role.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const pagination = {
      totalItems,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
    };

    return handleResponse(res, 200, "Roles fetched successfully", {
      roles,
      pagination,
    });
  } catch (error) {
    console.error("❌ Get roles error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const getRoleById = async (req, res) => {
  const { id } = req.params;

  if (!validateObjectId(id, res, "role ID")) return;

  const role = await Role.findById(id);
  if (!role) return handleResponse(res, 404, "Role not found");

  return handleResponse(res, 200, "Role fetched successfully", { role });
};

export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id, res, "role ID")) return;

    const { name, description, permissions } = req.body;

    const role = await Role.findById(id);
    if (!role) return handleResponse(res, 404, "Role not found");

    if (name) {
      const existing = await Role.findOne({
        name: name.trim().toUpperCase(),
        _id: { $ne: id },
      });

      if (existing) {
        return handleResponse(res, 400, `Role name '${name}' already exists`);
      }

      role.name = name.trim().toUpperCase();
    }

    if (description) role.description = description.trim();
    if (permissions) role.permissions = permissions;

    await role.save();

    return handleResponse(res, 200, "Role updated successfully", { role });
  } catch (error) {
    console.error("❌ Update role error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id, res, "role ID")) return;

    const role = await Role.findById(id);

    if (!role || role.status === "deleted") {
      return handleResponse(res, 404, "Role not found");
    }

    role.status = "deleted";
    await role.save();

    return handleResponse(res, 200, "Role deleted successfully");
  } catch (error) {
    console.error("❌ Delete role error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};
