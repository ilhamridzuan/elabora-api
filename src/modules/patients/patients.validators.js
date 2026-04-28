/**
 * Patient Search Validation Middleware
 * 
 * Provides validation for advanced patient search endpoint.
 * Validates search filters, date ranges, pagination, and sorting parameters.
 */

import Joi from 'joi';
import { validate } from '../../middleware/validation.middleware.js';

/**
 * Validation schema for advanced patient search endpoint
 * Validates all optional search parameters and returns 400 Bad Request on validation failure
 */
export const advancedSearchSchema = Joi.object({
  // Text search fields - optional strings
  name: Joi.string().trim().allow('').optional(),
  nik: Joi.string().trim().allow('').optional(),
  phone: Joi.string().trim().allow('').optional(),
  
  // Date range fields - optional ISO 8601 dates (YYYY-MM-DD format)
  dobStart: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid date format for dobStart. Expected ISO 8601 format (YYYY-MM-DD)'
    }),
  
  dobEnd: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid date format for dobEnd. Expected ISO 8601 format (YYYY-MM-DD)'
    }),
  
  regStart: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid date format for regStart. Expected ISO 8601 format (YYYY-MM-DD)'
    }),
  
  regEnd: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid date format for regEnd. Expected ISO 8601 format (YYYY-MM-DD)'
    }),
  
  // Pagination parameters
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.base': 'Page must be a positive integer (minimum: 1)',
      'number.integer': 'Page must be a positive integer (minimum: 1)',
      'number.min': 'Page must be a positive integer (minimum: 1)'
    }),
  
  pageSize: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .optional()
    .messages({
      'number.base': 'PageSize must be a positive integer between 1 and 20',
      'number.integer': 'PageSize must be a positive integer between 1 and 20',
      'number.min': 'PageSize must be a positive integer between 1 and 20',
      'number.max': 'PageSize must be a positive integer between 1 and 20'
    }),
  
  // Sorting parameters
  sortBy: Joi.string()
    .valid('nama', 'nik', 'tgl_lahir', 'created_at')
    .optional()
    .messages({
      'any.only': 'Invalid sortBy value. Allowed values: nama, nik, tgl_lahir, created_at'
    }),
  
  sortOrder: Joi.string()
    .valid('ASC', 'DESC')
    .optional()
    .messages({
      'any.only': 'Invalid sortOrder value. Allowed values: ASC, DESC'
    })
});

/**
 * Express middleware for validating advanced search requests
 * Uses the advancedSearchSchema to validate request body
 */
export const advancedSearchValidation = validate(advancedSearchSchema);
