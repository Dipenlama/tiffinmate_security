import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken"
import { ACCESS_TOKEN_SECRET } from "../config";
import { IUser } from "../models/user.model";
import { UserRepository } from "../repositories/auth.repository";
import { HttpError } from "../errors/http-error";
import { ACCESS_TOKEN_COOKIE } from "../utils/cookies";

let userRepository = new UserRepository();
declare global {
    namespace Express {
        interface Request {
            user?: Record<string, any> | IUser
        }
    }
} // creating a tag for user 
// can use req.user after this

export async function authorizedMiddelWare(req: Request, res: Response, next: NextFunction) {
    // express function can have next function to go to next
    try{
        // Prefer the httpOnly cookie (the browser flow); fall back to a Bearer
        // header so API clients/tests/tools (Postman, curl, supertest) that
        // can't rely on cookie jars keep working.
        const cookieToken = (req as any).cookies?.[ACCESS_TOKEN_COOKIE];
        const authHeader = req.headers.authorization;
        const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
        const token = cookieToken || bearerToken;
        if(!token)
            throw new HttpError( 401, "Unauthorized, No Token" );

        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as Record<string, any>; // decoded -> payload
        if(!decoded || !decoded.id)
            throw new HttpError( 401, "Unauthorized, Invalid Token" );
        
        const user = await userRepository.getUserById( decoded.id ); // make function async
        if(!user)
            throw new HttpError( 401, "Unauthorized, User Not Found" );
        
        req.user = user;
        return next();
    }catch(err: Error | any){
        // jsonwebtoken throws plain Errors (JsonWebTokenError/TokenExpiredError/
        // NotBeforeError) with no statusCode - a malformed or expired token is a
        // client error (401), not a server fault, so map those explicitly
        // instead of falling through to a misleading 500.
        const isJwtError = ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(err?.name);
        return res.status(err.statusCode || (isJwtError ? 401 : 500)).json(
            { success: false, message: err.message || "Unauthorized" }
        )
    }
    // if(req.headers && req.headers.authorization){
    //     return next();
    // }
    // return res.status(401).json(
    //     { success: false, message: "Unauthorized" }
    // )
}

    export async function adminMiddleware(req: Request, res: Response, next: NextFunction) {
    try{
        // req.user is set in authorizedMiddelWare
        // only use role/admin middleware after user is authorized
        if(!req.user)
            throw new HttpError( 401, "Unauthorized, User Not Found" );
        
        if(req.user.role !== 'admin')
            throw new HttpError( 403, "Forbidden, Admins Only" );
        
        return next();
    }catch(err: Error | any){
        return res.status(err.statusCode || 500 ).json(
            { success: false, message: err.message || "Unauthorized" }
        )
    }

}