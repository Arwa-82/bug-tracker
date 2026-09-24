import { Request, Response, NextFunction } from "express";

// Catches any error passed to next(err), or thrown in an async route handler
// (when wrapped with asyncHandler below), and sends a consistent JSON response
// instead of letting the request hang or crash the server.
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("Unhandled error:", err);

  // Multer-specific errors (file too large, wrong type) have a clear message
  if (err.message) {
    return res.status(400).json({ message: err.message });
  }

  res.status(500).json({ message: "Something went wrong on the server" });
}

// Wraps an async controller so any thrown error/rejected promise
// gets passed to next(err) instead of hanging the request forever.
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}