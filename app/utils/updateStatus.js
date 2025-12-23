import { handleResponse } from "./responseHandler.js";
import { validateObjectId } from "./helper.js";


export const updateStatus = async (req, res, Model, relatedModels = []) => {
    try {
      const { id } = req.params;
      let { status } = req.body;
  
      if (!validateObjectId(id, res, "ID")) return;
  
      status = status?.toLowerCase();
      const validStatuses = ["active", "inactive", "deleted"];
      if (!validStatuses.includes(status)) {
        return handleResponse(
          res,
          400,
          `Invalid status. Allowed values are: ${validStatuses.join(", ")}`
        );
      }
  
      const item = await Model.findById(id);
      if (!item) return handleResponse(res, 404, "Item not found");
  
      item.status = status;
      await item.save();
  
      const updateResults = {};
  
      for (const { model: RelatedModel, field } of relatedModels) {
        const result = await RelatedModel.updateMany(
          { [field]: item._id },
          { status }
        );
        updateResults[RelatedModel.modelName] = result.modifiedCount;
      }
  
      return handleResponse(
        res,
        200,
        `${Model.modelName} and related statuses updated successfully`,
        { id, status, updateResults }
      );
    } catch (error) {
      console.error(`❌ Update ${Model.modelName} status error:`, error);
      return handleResponse(res, 500, "Server error", { error: error.message });
    }
};
  