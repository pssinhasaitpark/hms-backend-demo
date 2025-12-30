import Doctor from "../../../models/user/doctor.js";
import Department from "../../../models/departments/deparments.js";
import Service from "../../../models/departments/services.js";
import { generateToken } from "../../../middlewares/jwtAuth.js";
import { handleResponse } from "../../../utils/responseHandler.js";
import DoctorService from "../../../models/departments/doctorServices.js";
import DoctorAvailability from "../../../models/departments/doctorAvailability.js";
import { getPagination } from "../../../utils/pagination.js";
import { validateObjectId } from "../../../utils/helper.js";


export const registerDoctor = async (req, res) => {
  try {
    const {
      doctorName,
      phone,
      password,
      departmentId,
      qualification,
      visitChargePerDay,
      fixedCharge,
      availability,
    } = req.body || {};

    const hospitalId = req.user._id;
  
    const existingDoctor = await Doctor.findOne({
      phone,
      hospital: hospitalId,
    });
    if (existingDoctor) {
      return handleResponse(
        res,
        400,
        "Doctor with this phone already exists in your hospital"
      );
    }

    const department = await Department.findOne({
      _id: departmentId,
      hospital: hospitalId,
    });
    if (!department) {
      return handleResponse(res, 404, "Department not found");
    }
    const doctor = new Doctor({
      doctorName,
      phone,
      password,
      department: department._id,
      hospital: hospitalId,
      qualification,
      visitChargePerDay,
      fixedCharge,
    });
    await doctor.save();

    if (availability && availability.length > 0) {
      const availabilityDocs = availability.map((a) => ({
        doctor: doctor._id,
        dayOfWeek: a.dayOfWeek,
        shifts: a.shifts,
      }));
      await DoctorAvailability.insertMany(availabilityDocs);
    }

    const departmentServices = await Service.find({
      department: department._id,
    });
    if (departmentServices.length > 0) {
      const doctorServiceDocs = departmentServices.map((s) => ({
        doctor: doctor._id,
        service: s._id,
      }));
      await DoctorService.insertMany(doctorServiceDocs);
    }

    const doctorServices = await DoctorService.find({
      doctor: doctor._id,
    }).populate("service", "serviceId name description charge");

    const doctorAvailability = await DoctorAvailability.find({
      doctor: doctor._id,
    });

    const { password: _, ...doctorData } = doctor.toObject();
    doctorData.services = doctorServices.map((ds) => ({
      serviceId: ds.service.serviceId,
      name: ds.service.name,
      description: ds.service.description,
      charge: ds.service.charge,
    }));
    doctorData.availability = doctorAvailability.map((a) => ({
      dayOfWeek: a.dayOfWeek,
      shifts: a.shifts,
    }));

    return handleResponse(
      res,
      201,
      "Doctor registered successfully",
      doctorData
    );
  } catch (error) {
    console.error("❌ Doctor registration error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const loginDoctor = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return handleResponse(res, 400, "Phone and password are required");
    }

    const doctor = await Doctor.findOne({ phone: identifier })
      .select("+password")
      .populate("department", "name");

    if (!doctor) {
      return handleResponse(res, 401, "Invalid phone or password");
    }

    const isMatch = await doctor.comparePassword(password);
    if (!isMatch) {
      return handleResponse(res, 401, "Invalid phone or password");
    }

    doctor.lastLogin = new Date();
    await doctor.save();

    const token = generateToken(doctor._id, "doctor");
    const { password: _, ...doctorData } = doctor.toObject();

    return handleResponse(res, 200, "Doctor login successful", {
      doctor: doctorData,
      token,
    });
  } catch (error) {
    console.error("❌ Doctor login error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const getAllDoctors = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    let { search, departmentId } = req.query;
    const hospitalId = req.user._id;
    const query = { hospital: hospitalId };

    if (departmentId) {
      let departmentIdsArray = [];

      if (Array.isArray(departmentId)) {
        departmentIdsArray = departmentId;
      } else if (departmentId.includes(",")) {
        departmentIdsArray = departmentId.split(",");
      } else {
        try {
          const parsed = JSON.parse(departmentId);
          if (Array.isArray(parsed)) {
            departmentIdsArray = parsed;
          } else {
            departmentIdsArray = [departmentId];
          }
        } catch {
          departmentIdsArray = [departmentId];
        }
      }

      query.department = { $in: departmentIdsArray };
    }

    if (search) {
      query.doctorName = { $regex: search, $options: "i" };
    }

    const doctors = await Doctor.find(query)
      .populate("department", "name description")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean()
      .select("-password");

    const doctorIds = doctors.map((d) => d._id);

    const services = await DoctorService.find({ doctor: { $in: doctorIds } })
      .populate("service", "name description")
      .lean();

    const availability = await DoctorAvailability.find({
      doctor: { $in: doctorIds },
    }).lean();

    const doctorData = doctors.map((doc) => {
      const docServices = services
        .filter((s) => s.doctor.toString() === doc._id.toString())
        .map((s) => ({ service: s.service }));

      const docAvailability = availability
        .filter((a) => a.doctor.toString() === doc._id.toString())
        .map((a) => ({
          dayOfWeek: a.dayOfWeek,
          shifts: a.shifts,
        }));

      return {
        ...doc,
        services: docServices,
        availability: docAvailability,
      };
    });

    const totalItems = await Doctor.countDocuments(query);

    return handleResponse(res, 200, "Doctors fetched successfully", {
      doctors: doctorData,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
    });
  } catch (error) {
    console.error("❌ Get all doctors error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id, res, "doctor ID")) return;
    const hospitalId = req.user._id;
    const doctor = await Doctor.findOne({
      _id: id,
      hospital: hospitalId,
    })
      .select("-password")
      .populate("department", "name description")
      .lean();

    if (!doctor) {
      return handleResponse(res, 404, "Doctor not found");
    }

    const services = await DoctorService.find({ doctor: doctor._id })
      .populate("service", "name description")
      .lean();

    const availability = await DoctorAvailability.find({
      doctor: doctor._id,
    }).lean();

    const doctorData = {
      ...doctor,
      services: services.map((s) => ({ service: s.service })),
      availability: availability.map((a) => ({
        dayOfWeek: a.dayOfWeek,
        shifts: a.shifts,
      })),
    };

    return handleResponse(res, 200, "Doctor fetched successfully", doctorData);
  } catch (error) {
    console.error("❌ Get doctor by ID error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      doctorName,
      phone,
      password,
      departmentId,
      qualification,
      visitChargePerDay,
      fixedCharge,
      services,
      availability,
    } = req.body || {};

    const DAYS_OF_WEEK = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const hospitalId = req.user._id;

    const doctor = await Doctor.findOne({ _id: id, hospital: hospitalId });

    if (!doctor) {
      return handleResponse(res, 404, "Doctor not found in your hospital");
    }

    if (phone && phone !== doctor.phone) {
      const existing = await Doctor.findOne({ phone });
      if (existing) {
        return handleResponse(res, 400, "Phone already in use");
      }
      doctor.phone = phone;
    }

    if (doctorName) doctor.doctorName = doctorName;
    if (password) doctor.password = password;
    if (qualification) doctor.qualification = qualification;
    if (visitChargePerDay !== undefined)
      doctor.visitChargePerDay = visitChargePerDay;
    if (fixedCharge !== undefined) doctor.fixedCharge = fixedCharge;

    let oldDepartmentId = doctor.department;


    if (departmentId && departmentId !== oldDepartmentId.toString()) {
   
      const newDepartment = await Department.findOne({
        _id: departmentId,
        hospital: hospitalId,
      });

      if (!newDepartment) {
        return handleResponse(
          res,
          404,
          "Department not found in your hospital"
        );
      }
    }

    if (departmentId && departmentId !== oldDepartmentId.toString()) {
      const newDepartment = await Department.findById(departmentId);
      if (!newDepartment) {
        return handleResponse(res, 404, "New department not found");
      }

      const oldDeptServices = await Service.find({
        department: oldDepartmentId,
      }).select("_id");

      const oldServiceIds = oldDeptServices.map((s) => s._id);

      const deleted = await DoctorService.deleteMany({
        doctor: doctor._id,
        service: { $in: oldServiceIds },
      });

      console.log("Deleted Old Services Count =", deleted.deletedCount);

      const newDeptServices = await Service.find({
        department: newDepartment._id,
      });

      const docServiceDocs = newDeptServices.map((s) => ({
        doctor: doctor._id,
        service: s._id,
      }));

      if (docServiceDocs.length > 0) {
        await DoctorService.insertMany(docServiceDocs);
      }

      doctor.department = newDepartment._id;
    }

    await doctor.save();

    // if (availability && Array.isArray(availability)) {
    //   for (const a of availability) {
    //     if (!DAYS_OF_WEEK.includes(a.dayOfWeek)) {
    //       return handleResponse(res, 400, `Invalid dayOfWeek: ${a.dayOfWeek}`);
    //     }

    //     const existing = await DoctorAvailability.findOne({
    //       doctor: doctor._id,
    //       dayOfWeek: a.dayOfWeek,
    //     });

    //     if (existing) {
    //       existing.shifts = a.shifts;
    //       await existing.save();
    //     } else {
    //       await DoctorAvailability.create({
    //         doctor: doctor._id,
    //         dayOfWeek: a.dayOfWeek,
    //         shifts: a.shifts,
    //       });
    //     }
    //   }
    // }

    if (availability && Array.isArray(availability)) {
      await DoctorAvailability.deleteMany({ doctor: doctor._id });

      for (const a of availability) {
        if (!DAYS_OF_WEEK.includes(a.dayOfWeek)) {
          return handleResponse(res, 400, `Invalid dayOfWeek: ${a.dayOfWeek}`);
        }

        await DoctorAvailability.create({
          doctor: doctor._id,
          dayOfWeek: a.dayOfWeek,
          shifts: a.shifts,
        });
      }
    }

    const doctorServices = await DoctorService.find({ doctor: doctor._id })
      .populate("service", "name description")
      .lean();

    const doctorAvailability = await DoctorAvailability.find({
      doctor: doctor._id,
    }).lean();

    const { password: _, ...doctorData } = doctor.toObject();

    doctorData.services = doctorServices.map((ds) => ({
      service: ds.service,
    }));

    doctorData.availability = doctorAvailability.map((a) => ({
      dayOfWeek: a.dayOfWeek,
      shifts: a.shifts,
    }));

    return handleResponse(res, 200, "Doctor updated successfully", doctorData);
  } catch (error) {
    console.error("❌ Update doctor error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

/* export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return handleResponse(res, 404, "Doctor not found");
    }

    doctor.status = "deleted";
    await doctor.save();

    return handleResponse(res, 200, "Doctor deleted successfully", doctor);
  } catch (error) {
    console.error("❌ Delete doctor error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};
 */

export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const hospitalId = req.user._id;

    const doctor = await Doctor.findOne({ _id: id, hospital: hospitalId }).select("-password");

    if (!doctor) {
      return handleResponse(res, 404, "Doctor not found in your hospital");
    }

    await Doctor.findByIdAndDelete(id);

    await DoctorService.deleteMany({ doctor: id });
    await DoctorAvailability.deleteMany({ doctor: id });

    return handleResponse(
      res,
      200,
      "Doctor and all related data deleted successfully",
      doctor
    );
  } catch (error) {
    console.error("❌ Delete doctor error:", error);
    return handleResponse(res, 500, "Server error", { error: error.message });
  }
};

