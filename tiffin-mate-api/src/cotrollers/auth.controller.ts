import z, { date, success } from "zod";
import { CreateUserDto, LoginUserDto, ForgotPasswordDto, ResetPasswordDto } from "../dtos/user.dto";
import { AuthService } from "../services/auth.service";
import { Request, Response } from "express";
import { parse } from "path";
import { setAuthCookies, clearAuthCookies, REFRESH_TOKEN_COOKIE, ACCESS_TOKEN_COOKIE } from "../utils/cookies";
import { logAuditEvent } from "../services/audit-log.service";
import jwt from "jsonwebtoken";

let authService= new AuthService();


export class AuthController{
    async registerUser(req:Request, res: Response){
        try{
            const parsedData= CreateUserDto.safeParse(req.body);
            if(!parsedData.success){
                return res.status(400).json(
                    {success: false, message: z.prettifyError(parsedData.error)}
                )
            }
            const newUser =await authService.registerUser(parsedData.data);
            return res.status(201).json(
                {success: true,data:newUser, message: "Registered success"}
            )
        }catch(error: Error | any ){
            return res.status(error.statusCode || 500).json(
                {success: false, message:error.message || "Internal server error"}
            )
        }
    }
   async loginUser(req: Request, res: Response) {
    try {
      const parsedData = LoginUserDto.safeParse(req.body);
      if (!parsedData.success) {
        return res.status(400).json({
          success: false,
          message: z.formatError(parsedData.error),
        });
      }

      const result = await authService.loginUser(parsedData.data, req.ip);

      if (result.mfaRequired) {
        // Password was correct, but a second factor is required before a real
        // session is issued - no cookies are set at this point.
        return res.status(200).json({
          success: true,
          mfaRequired: true,
          mfaToken: result.mfaToken,
          message: "MFA verification required",
        });
      }

      const { token, refreshToken, user } = result;
      setAuthCookies(res, { accessToken: token, refreshToken, role: user.role });
      return res.status(200).json({
        success: true,
        data: user,
        token,
        message: "Login success",
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  // Step 2 of an MFA-gated login: exchanges the pre-auth token + a TOTP code
  // for a real session. This endpoint has no session cookie yet, so it is
  // naturally exempt from CSRF checks the same way login/register are.
  async mfaLoginVerify(req: Request, res: Response) {
    try {
      const { mfaToken, code } = req.body || {};
      if (!mfaToken || !code) {
        return res.status(400).json({ success: false, message: "mfaToken and code are required" });
      }
      const { token, refreshToken, user } = await authService.verifyMfaLogin(String(mfaToken), String(code), req.ip);
      setAuthCookies(res, { accessToken: token, refreshToken, role: user.role });
      return res.status(200).json({ success: true, data: user, token, message: "Login success" });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  // MFA enrollment - all three require an existing authenticated session
  // (authorizedMiddelWare sets req.user), so a stranger can never enroll MFA
  // on someone else's account or silently disable it on a hijacked cookie
  // jar without also knowing a current TOTP code (see disableMfa).
  async mfaSetup(req: Request, res: Response) {
    try {
      const userId = String((req.user as any)?._id);
      const { qrCodeDataUrl, secret } = await authService.setupMfa(userId);
      return res.status(200).json({ success: true, data: { qrCodeDataUrl, secret } });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async mfaVerifySetup(req: Request, res: Response) {
    try {
      const userId = String((req.user as any)?._id);
      const { code } = req.body || {};
      if (!code) return res.status(400).json({ success: false, message: "code is required" });
      await authService.confirmMfaSetup(userId, String(code));
      return res.status(200).json({ success: true, message: "MFA enabled" });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async mfaDisable(req: Request, res: Response) {
    try {
      const userId = String((req.user as any)?._id);
      const { code } = req.body || {};
      if (!code) return res.status(400).json({ success: false, message: "code is required" });
      await authService.disableMfa(userId, String(code));
      return res.status(200).json({ success: true, message: "MFA disabled" });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  // Exchanges the httpOnly refresh cookie for a new access/refresh pair.
  // Lets the frontend keep the user signed in past the 15 minute access
  // token lifetime without ever putting a long-lived credential in
  // JS-readable storage.
  async refresh(req: Request, res: Response) {
    try {
      const existingRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
      if (!existingRefreshToken) {
        return res.status(401).json({ success: false, message: "Missing refresh token" });
      }
      const { token, refreshToken, user } = await authService.refreshTokens(existingRefreshToken);
      setAuthCookies(res, { accessToken: token, refreshToken, role: user.role });
      logAuditEvent({ action: 'auth.token.refresh', outcome: 'success', actorId: user._id.toString(), actorEmail: user.email, ip: req.ip });
      return res.status(200).json({ success: true, message: "Token refreshed" });
    } catch (error: any) {
      clearAuthCookies(res);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const existingRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
      await authService.logout(existingRefreshToken);
      // Best-effort actor identification for the audit log only: decode
      // (not verify) the still-present access token cookie before clearing
      // it. This never gates the logout itself - an expired/garbled token
      // just means the log entry has no actorId, which is fine.
      const accessToken = req.cookies?.[ACCESS_TOKEN_COOKIE];
      const decoded = accessToken ? (jwt.decode(accessToken) as any) : null;
      clearAuthCookies(res);
      logAuditEvent({ action: 'auth.logout', outcome: 'success', actorId: decoded?.id, actorEmail: decoded?.email, ip: req.ip });
      return res.status(200).json({ success: true, message: "Logged out" });
    } catch (error: any) {
      clearAuthCookies(res);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async forgotPassword(req: Request, res: Response){
    try{
      const parsedData = ForgotPasswordDto.safeParse(req.body);
      if(!parsedData.success) return res.status(400).json({ success:false, message: z.prettifyError(parsedData.error) });
      await authService.forgotPassword(parsedData.data.email);
      return res.status(200).json({ success:true, message: 'If the email exists, a reset link was sent' });
    }catch(error:any){
      return res.status(error.statusCode || 500).json({ success:false, message: error.message || 'Internal Server Error' });
    }
  }

  async resetPassword(req: Request, res: Response){
    try{
      const parsedData = ResetPasswordDto.safeParse(req.body);
      if(!parsedData.success) return res.status(400).json({ success:false, message: z.prettifyError(parsedData.error) });
      await authService.resetPassword(parsedData.data.token, parsedData.data.password);
      return res.status(200).json({ success:true, message: 'Password has been reset' });
    }catch(error:any){
      return res.status(error.statusCode || 500).json({ success:false, message: error.message || 'Internal Server Error' });
    }
  }
}

//create a new file under, src/controllers/admin/user.controller.ts
//AdminUserController with  createUser method
//use createUserDto for validation
// reuse service and call authService.registerUser method
//handle errors and success responses
// api path: /ap/admin/users (POST)