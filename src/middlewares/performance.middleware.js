/**
 * Performance Middleware
 * 
 * Measures and logs API endpoint response times per performance.mdc
 * Must be applied before routes to measure full request/response cycle
 * 
 * Per performance.mdc:
 * - Performance metrics must be logged or monitored
 * - Alert on API endpoints exceeding thresholds
 */

const { logEndpointPerformance } = require('@lib/performance');

/**
 * Performance monitoring middleware
 * Measures request duration and logs metrics
 * 
 * @returns {Function} Express middleware
 */
const performanceMiddleware = () => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Override res.end to measure response time
    const originalEnd = res.end;

    const endResponse = (...args) => {
      const durationMs = Date.now() - startTime;
      const method = req.method;
      const path = req.path;
      const statusCode = res.statusCode;
      
      // Log endpoint performance (non-blocking)
      setImmediate(() => {
        logEndpointPerformance(method, path, durationMs, statusCode);
      });
      
      // Call original end
      originalEnd.apply(res, args);
    };
    
    res.end = endResponse;
    
    next();
  };
};

module.exports = performanceMiddleware;

