// src/middleware/error.middleware.js

export const notFound = (req, res, next) => {
  res.status(404);
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    message: err.message,
    // tampilkan stack hanya saat dev
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};
