import { Router } from "express";
import { AuthController } from "../cotrollers/auth.controller";
import { issueCsrfToken } from "../middlewares/csrf.middleware";
import { authorizedMiddelWare } from "../middlewares/authorized.middleware";
import { loginLimiter, registerLimiter, forgotPasswordLimiter } from "../middlewares/rate-limit.middleware";
import { verifyCaptcha } from "../middlewares/captcha.middleware";

const router: Router=Router();
const authController=new AuthController();

// Public: the frontend calls this once (e.g. on app load) to obtain the
// CSRF cookie+token pair before submitting any state-changing request,
// including login/register themselves.
router.get('/csrf-token', issueCsrfToken);

// Rate limiting slows down automated abuse; captcha verification (below)
// blocks it outright by requiring a human-solvable challenge, so the two are
// deliberately layered rather than either alone (OWASP ASVS V2.2.4). Order:
// cheap in-process rate-limit check first, external captcha-provider call
// second, so an already-rate-limited caller never even reaches the network
// call.
router.post('/register', registerLimiter, verifyCaptcha, authController.registerUser);
router.post('/login', loginLimiter, verifyCaptcha, authController.loginUser);
router.post('/mfa/login-verify', loginLimiter, authController.mfaLoginVerify);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', forgotPasswordLimiter, verifyCaptcha, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// MFA enrollment/disablement requires an existing authenticated session.
router.post('/mfa/setup', authorizedMiddelWare, authController.mfaSetup);
router.post('/mfa/verify-setup', authorizedMiddelWare, authController.mfaVerifySetup);
router.post('/mfa/disable', authorizedMiddelWare, authController.mfaDisable);

export default router;