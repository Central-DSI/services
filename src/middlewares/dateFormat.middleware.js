import { withFormattedDates } from "../utils/date.util.js";

// Middleware to wrap res.json and add `<key>Formatted` for date fields
export function dateFormatMiddleware(options = {}) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      try {
        const transformed = withFormattedDates(body, options);
        return originalJson(transformed);
      } catch (err) {
        // Fallback to original body if transformation fails
        return originalJson(body);
      }
    };
    next();
  };
}

export default dateFormatMiddleware;
