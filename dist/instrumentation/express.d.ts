import { Request, Response, NextFunction } from 'express';
import { Agent } from '../agent';
/**
 * Express middleware for automatic transaction creation
 */
export declare function expressMiddleware(agent: Agent): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Express error handler middleware
 */
export declare function expressErrorHandler(agent: Agent): (err: Error, req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=express.d.ts.map