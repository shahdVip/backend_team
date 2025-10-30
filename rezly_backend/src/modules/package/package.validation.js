import Joi from 'joi';

// ====== CREATE PACKAGE ======
export const createPackageSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'Name is required and cannot be empty',
    'any.required': 'Name is required',
  }),
  description: Joi.string().allow('', null).optional(),
  price_cents: Joi.number().integer().min(1).required().messages({
    'number.base': 'Price cents must be a number',
    'number.min': 'Price cents must be at least 1', 
    'any.required': 'Price cents is required',
  }),
  currency: Joi.string().length(3).uppercase().required().messages({ 
    'string.length': 'Currency must be exactly 3 characters',
    'string.uppercase': 'Currency must be uppercase',
    'any.required': 'Currency is required',
  }),
  price_type: Joi.string().valid('OneTime', 'Recurring').required().messages({
    'any.only': 'Price type must be either OneTime or Recurring',
    'any.required': 'Price type is required',
  }),
  duration_value: Joi.number().integer().min(1).required().messages({
    'number.base': 'Duration value must be a number',
    'number.min': 'Duration value must be at least 1', 
    'any.required': 'Duration value is required',
  }),
  duration_unit: Joi.string().required().messages({
  'any.only': 'Duration unit must be one of Days, Weeks, Months, or Years',
  'any.required': 'Duration unit is required',
}),
 startDate: Joi.date().greater('now').required().messages({
    'date.base': 'Start date must be a valid date',
    'date.greater': 'Start date must be in the future',
    'any.required': 'Start date is required',
  }),
  auto_renew: Joi.boolean().optional(),
  trial_days: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Trial days must be a number', 
    'number.min': 'Trial days cannot be negative',
  }),
  active: Joi.boolean().optional(),
});

// ====== UPDATE PACKAGE ======
export const updatePackageSchema = Joi.object({
  name: Joi.string().min(3).optional().messages({
    'string.min': 'Name must be at least 3 characters long'
  }),
  description: Joi.string().optional(),
  price_cents: Joi.number().integer().min(1).optional().messages({
    'number.min': 'Price must be at least 1'
  }),
  currency: Joi.string().length(3).uppercase().optional(),
  price_type: Joi.string().valid('OneTime', 'Recurring').optional(),
  duration_value: Joi.number().integer().min(1).optional(),
  duration_unit: Joi.string().valid('Days', 'Weeks', 'Months', 'Years').optional(),
  auto_renew: Joi.boolean().optional(),
  trial_days: Joi.number().integer().min(0).optional(),
  active: Joi.boolean().optional(),
}).unknown(true);

// ====== PARAMS ID ======
export const idParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid ID format',
    'string.length': 'ID must be 24 characters',
    'any.required': 'ID is required'
  }),
});