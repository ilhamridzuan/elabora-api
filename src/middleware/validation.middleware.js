/**
 * Validation Middleware
 * 
 * Factory function that creates Express middleware for validating request bodies
 * against Joi schemas. Returns 400 status with formatted validation errors on failure.
 */

/**
 * Creates validation middleware for a given Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all validation errors, not just the first one
      stripUnknown: true, // Remove unknown fields from the validated data
    });

    if (error) {
      // Format validation errors into a readable structure
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        message: 'Validation failed',
        errors,
      });
    }

    // Replace req.body with validated and sanitized value
    req.body = value;
    
    // Validation passed, proceed to next middleware
    next();
  };
};
