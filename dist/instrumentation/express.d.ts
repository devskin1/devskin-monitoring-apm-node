import { Request, Response, NextFunction } from 'express';
import { Agent } from '../agent';
export declare function expressMiddleware(agent: Agent): (req: Request, res: Response, next: NextFunction) => void;
export declare function expressErrorHandler(agent: Agent): (err: Error, req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=express.d.ts.map