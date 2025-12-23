import Joi from "joi";

export const registerStaffSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    "any.required": "Name is required",
    "string.empty": "Name cannot be empty",
  }),
  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.pattern.base": "Phone number must be exactly 10 digits",
      "any.required": "Phone number is required",
    }),
  password: Joi.string().min(6).required().messages({
    "any.required": "Password is required",
    "string.min": "Password should be at least 6 characters long",
  }),
  roleId: Joi.string().required().messages({
    "any.required": "Role ID is required",
  }),
  createdBy: Joi.string().optional(),
  monthlySalary: Joi.number().optional(),
  address: Joi.string().optional(),
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
});
