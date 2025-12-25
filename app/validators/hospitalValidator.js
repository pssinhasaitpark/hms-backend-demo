import Joi from "joi";

export const registerHospitalSchema = Joi.object({
  hospital_name: Joi.string().trim().required().messages({
    "any.required": "Hospital name is required",
    "string.empty": "Hospital name cannot be empty",
  }),

  hospital_type: Joi.string()
    .valid("clinic", "hospital", "diagnostic_center", "nursing_home")
    .required()
    .messages({
      "any.only": "Invalid hospital type",
      "any.required": "Hospital type is required",
    }),

  address: Joi.string().required().messages({
    "any.required": "Address is required",
  }),

  contact_number: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.pattern.base": "Contact number must be 10 digits",
      "any.required": "Contact number is required",
    }),

  contact_person: Joi.string().trim().required().messages({
    "any.required": "Contact person is required",
  }),

  subscription_type: Joi.string()
    .valid("clinic_plan", "small_size_opd", "custom_plan")
    .required()
    .messages({
      "any.only": "Invalid subscription type",
    }),

  valid_upto: Joi.date().required().messages({
    "any.required": "Subscription validity date is required",
  }),

  email: Joi.string().email().required().messages({
    "string.email": "Invalid email format",
    "any.required": "Email is required",
  }),

  password: Joi.string().optional(),

  logo: Joi.string().optional(),
});
