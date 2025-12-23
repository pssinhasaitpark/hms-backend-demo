import Joi from "joi";
import mongoose from "mongoose";

const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const registerDoctorSchema = Joi.object({
  doctorName: Joi.string().trim().required().messages({
    "any.required": "Doctor name is required",
    "string.empty": "Doctor name cannot be empty",
  }),
  phone: Joi.string().trim().required(),
  password: Joi.string().allow('').optional(),
  departmentId: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error("any.invalid");
      }
      return value;
    }),
  qualification: Joi.string().trim().optional(),
  visitChargePerDay: Joi.number().min(0).required(),
  fixedCharge: Joi.number().min(0).optional(),

  services: Joi.array()
    .items(
      Joi.object({
        service: Joi.string()
          .required()
          .custom((value, helpers) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
              return helpers.error("any.invalid");
            }
            return value;
          }),
      })
    )
    .optional(),

  availability: Joi.array()
    .items(
      Joi.object({
        dayOfWeek: Joi.string()
          .valid(...daysOfWeek)
          .required(),
        shifts: Joi.array()
          .items(
            Joi.object({
              startTime: Joi.string().required(),
              endTime: Joi.string().required(),
            })
          )
          .min(1)
          .optional()
          .messages({
            "array.min": "At least one shift is required per day",
          }),
      })
    )
    .optional(),
});
