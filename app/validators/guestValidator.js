import Joi from "joi";

export const guestSchemaValidator = Joi.object({
  name: Joi.string().trim().required().messages({
    "any.required": "Guest name is required",
    "string.empty": "Guest name cannot be empty",
  }),

  age: Joi.number().min(1).required().messages({
    "any.required": "Age is required",
  }),

  gender: Joi.string().valid("male", "female", "other").required().messages({
    "any.only": "Gender must be male, female, or other",
    "any.required": "Gender is required",
  }),

  mobile: Joi.string().trim().required().messages({
    "any.required": "Mobile number is required",
  }),

  aadhar_no: Joi.string().trim().required().messages({
    "any.required": "Aadhar number is required",
  }),

  address: Joi.string().trim().required().messages({
    "any.required": "Address is required",
  }),

  referredBy: Joi.string().trim().optional(),

  startDate: Joi.date().required().messages({
    "any.required": "Start date is required",
  }),

  endDate: Joi.date().required().messages({
    "any.required": "End date is required",
  }),

  role: Joi.string().valid("patient", "attendant").required().messages({
    "any.only": "Role must be either 'patient' or 'attendant'",
    "any.required": "Role is required",
  }),

  patientDetails: Joi.object({
    name: Joi.string().trim().required(),
    age: Joi.number().min(1).required(),
    gender: Joi.string().valid("male", "female", "other").required(),
    aadhar_no: Joi.string().trim(),
  }).optional(),

  paymentType: Joi.string().valid("cash", "online").required().messages({
    "any.required": "Payment type is required",
    "any.only": "Payment must be cash or online",
  }),

  additionalPersons: Joi.array()
    .items(
      Joi.object({
        role: Joi.string().valid("attendant").required(),
        name: Joi.string().trim().required(),
        age: Joi.number().min(1).required(),
        aadhar_no: Joi.string().trim().required(),
        gender: Joi.string().valid("male", "female", "other").required(),
      })
    )
    .optional(),
});
