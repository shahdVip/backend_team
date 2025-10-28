import Joi from "joi";

export const generalFeilds = {
  email: Joi.string().email().required().messages({
    "string.email": "Email must be in this form: youremail@gmail.com",
    "string.empty": "Email is required",
  }),

  password: Joi.string().min(6).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters",
  }),

  phone: Joi.string()
    .length(10)
    .pattern(/^(056|059|052)[0-9]{7}$/)
    .required()
    .messages({
      "string.length": "Phone number must be exactly 10 digits",
      "string.pattern.base":
        "Phone number must start with 056, 059, or 052 followed by 7 digits",
      "string.empty": "Phone number is required",
    }),
};

const validation = (schema) => {
  return (req, res, next) => {
    let filterData = {};

    if (req.file) {
      if (req.file.mimetype.startsWith("image/")) {
        filterData = {
          image: req.file,
          ...req.body,
          ...req.params,
          ...req.query,
        };
      } else if (req.file.mimetype.startsWith("video/")) {
        filterData = {
          video: req.file,
          ...req.body,
          ...req.params,
          ...req.query,
        };
      } else {
        filterData = { ...req.body, ...req.params, ...req.query };
      }
    } else if (req.files) {
      filterData = { ...req.files, ...req.body, ...req.params, ...req.query };
    } else {
      filterData = { ...req.body, ...req.params, ...req.query };
    }

    const { error } = schema.validate(filterData, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((err) => ({
        [err.context.key]: err.message,
      }));

      return res.status(400).json({
        status: "error",
        message: "Validation error",
        errors: errorMessages,
      });
    }

    next();
  };
};
export const validateBookingUpdate = (schema) => (req, res, next) => {
  const merged = { ...req.body, ...req.query }; // نجمعهم
  const { error } = schema.validate(merged, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      status: "error",
      message: "Validation error",
      details: error.details.map((d) => d.message),
    });
  }

  next();
};

export const validateBody = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      status: "error",
      message: "Validation error",
      errors: error.details.map((err) => err.message),
    });
  }

  next();
};

export default validation;
