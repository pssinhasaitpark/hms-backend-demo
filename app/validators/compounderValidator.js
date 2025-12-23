import Joi from "joi";
import mongoose from "mongoose";

// Custom ObjectId validation
const objectId = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.message(`"${helpers.state.path}" must be a valid ObjectId`);
  }
  return value;
};

export const registerCompounderSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    "any.required": "Name is required",
    "string.empty": "Name cannot be empty",
  }),

  phone: Joi.string().trim().required(),
  password: Joi.string().min(6).required().messages({
    "any.required": "Password is required",
    "string.min": "Password must be at least 6 characters long",
  }),

  roleId: Joi.string().custom(objectId).required().messages({
    "any.required": "Role ID is required",
  }),

  monthlySalary: Joi.number().min(0).optional(),

  doctors: Joi.array()
    .items(Joi.string().custom(objectId))
    .optional()
    .messages({
      "array.base": "Doctors must be an array of IDs",
      "string.pattern.name": "Each doctor must be a valid ObjectId",
    }),

  departments: Joi.array()
    .items(Joi.string().custom(objectId))
    .optional()
    .messages({
      "array.base": "Departments must be an array of IDs",
      "string.pattern.name": "Each department must be a valid ObjectId",
    }),

  weekOffDay: Joi.string()
    .valid(
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    )
    .optional()
    .messages({
      "any.only": "Week off day must be a valid day of the week",
    }),

  createdBy: Joi.string().custom(objectId).optional(),
});
