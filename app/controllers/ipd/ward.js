import Ward from "../../models/ipd/ward.js";
import { handleResponse } from "../../utils/responseHandler.js";


const generateBedNumbers = (wardType, startIndex, count) => {
    const prefix = wardType.substring(0, 3).toUpperCase(); 
    const beds = [];
    for (let i = startIndex; i < startIndex + count; i++) {
      const number = (i + 1).toString().padStart(3, "0"); 
      beds.push({ bedNumber: `${prefix}${number}`, status: "AVAILABLE" });
    }
    return beds;
};
  
  export const createWard = async (req, res) => {
    try {
      const { wardName, wardType,  numberOfBeds } = req.body;
        const hospital = req.user.hospitalId;
      if (!numberOfBeds || numberOfBeds <= 0) {
        return handleResponse(res, 400, "Please provide a valid number of beds");
      }
  
      const existingWard = await Ward.findOne({ wardName, hospital });
      if (existingWard) {
        return handleResponse(
          res,
          400,
          "Ward with this name already exists in this hospital"
        );
      }
  
      const beds = generateBedNumbers(wardType, 0, numberOfBeds);
  
      const ward = await Ward.create({
        wardName,
        wardType,
        hospital,
        beds,
      });
  
      return handleResponse(res, 201, "Ward created successfully", ward);
    } catch (error) {
      console.error(error);
      return handleResponse(res, 500, "Something went wrong", {
        error: error.message,
      });
    }
  };



export const getAllWards = async (req, res) => {
    try {
      const hospitalId = req.user.hospitalId;
  
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;
  
      const filter = { hospital: hospitalId };
  
      const [wards, total] = await Promise.all([
        Ward.find(filter)
          .populate("hospital", "hospital_name")
          .skip(skip)
          .limit(Number(limit))
          .sort({ createdAt: -1 }),
  
        Ward.countDocuments(filter),
      ]);
  
      const totalPages = Math.ceil(total / limit);
  
      return handleResponse(res, 200, "Wards fetched successfully", {
        wards,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages,
        },
      });
    } catch (error) {
      console.error(error);
      return handleResponse(res, 500, "Something went wrong", {
        error: error.message,
      });
    }
};
  


export const getWardById = async (req, res) => {
  try {
    const { id } = req.params;
    const ward = await Ward.findById(id).populate("hospital","hospital_name");
    if (!ward) return handleResponse(res, 404, "Ward not found");
    return handleResponse(res, 200, "Ward fetched successfully", ward);
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, "Something went wrong", {
      error: error.message,
    });
  }
};

export const updateWard = async (req, res) => {
    try {
      const { id } = req.params;
      const { wardName, wardType, numberOfBeds } = req.body;
  
      const ward = await Ward.findById(id);
      if (!ward) return handleResponse(res, 404, "Ward not found");
  
      if (wardName) ward.wardName = wardName;
      if (wardType) ward.wardType = wardType;
  
      if (numberOfBeds !== undefined) {
        const currentBedCount = ward.beds.length;
        const occupiedBeds = ward.beds.filter(b => b.status === "OCCUPIED").length;
  
        if (numberOfBeds < occupiedBeds) {
          return handleResponse(
            res,
            400,
            `Cannot reduce beds below occupied beds (${occupiedBeds})`
          );
        }
  
        if (numberOfBeds > currentBedCount) {

          const bedsToAdd = numberOfBeds - currentBedCount;
          const newBeds = generateBedNumbers(ward.wardType, currentBedCount, bedsToAdd);
          ward.beds.push(...newBeds);
        } else if (numberOfBeds < currentBedCount) {
      
          let bedsToRemove = currentBedCount - numberOfBeds;
 
          for (let i = ward.beds.length - 1; i >= 0 && bedsToRemove > 0; i--) {
            if (ward.beds[i].status === "AVAILABLE") {
              ward.beds.splice(i, 1);
              bedsToRemove--;
            }
          }
        }
      }
  
      await ward.save();
  
      return handleResponse(res, 200, "Ward updated successfully", ward);
    } catch (error) {
      console.error(error);
      return handleResponse(res, 500, "Something went wrong", {
        error: error.message,
      });
    }
};
  
export const deleteWard = async (req, res) => {
  try {
    const { id } = req.params;

    const ward = await Ward.findByIdAndDelete(id);
    if (!ward) return handleResponse(res, 404, "Ward not found");

    return handleResponse(res, 200, "Ward deleted successfully");
  } catch (error) {
    console.error(error);
    return handleResponse(res, 500, "Something went wrong", {
      error: error.message,
    });
  }
};
