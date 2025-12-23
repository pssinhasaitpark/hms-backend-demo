import mongoose from "mongoose";
import { handleResponse } from "./responseHandler.js"; 
import Counter from "../models/base/counter.js";


export const validateObjectId = (id, res, name = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    handleResponse(res, 400, `Invalid ${name} format`);
    return false;
  }
  return true;
};



export const generateAutoId = async (counterName, prefix, padLength = 4) => {
  const counter = await Counter.findOneAndUpdate(
    { name: counterName },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  return `${prefix}${String(counter.value).padStart(padLength, "0")}`;
};
