// src/middleware/error.middleware.js

export const notFound = (req, res, next) => {
  res.status(404);
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  // Log full error details server-side for debugging
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    status: err.status,
    path: req.path,
    method: req.method,
  });

  // Use err.status if provided, otherwise default to 500
  const statusCode = err.status || 500;

  // Determine if we're in production (hide stack traces by default)
  const isProduction = process.env.NODE_ENV !== 'development';

  // Detect database errors by checking for SQL keywords
  const isDatabaseError = err.message && (
    err.message.includes('Duplicate entry') ||
    err.message.includes('ER_DUP_ENTRY') ||
    err.message.includes('SQLITE_CONSTRAINT') ||
    err.message.includes('duplicate key') ||
    err.message.includes('foreign key constraint') ||
    err.message.includes('violates') ||
    err.message.toLowerCase().includes('sql')
  );

  // Sanitize error message for production
  let sanitizedMessage = err.message;

  if (isProduction) {
    // Handle specific error types with appropriate messages
    if (statusCode === 400) {
      // Validation errors - keep message but sanitize
      sanitizedMessage = err.message || 'Invalid request data';
    } else if (statusCode === 401) {
      sanitizedMessage = err.message || 'Authentication required';
    } else if (statusCode === 403) {
      sanitizedMessage = err.message || 'Access forbidden';
    } else if (statusCode === 409) {
      sanitizedMessage = err.message || 'Resource conflict';
    } else if (isDatabaseError) {
      // Replace database errors with generic message
      sanitizedMessage = 'An error occurred while processing your request';
    } else if (statusCode >= 500) {
      // Generic message for server errors
      sanitizedMessage = 'Internal server error';
    }
  }

  res.status(statusCode).json({
    message: sanitizedMessage,
    // Only show stack trace in development mode
    stack: isProduction ? undefined : err.stack,
  });
};
