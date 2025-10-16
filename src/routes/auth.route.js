import express from "express";
import { login, refresh, me, doLogout, changePasswordHandler, forgotPassword, verifyResetToken, resetPassword } from "../controllers/auth.controller.js";
import { authGuard, refreshGuard } from "../middlewares/auth.middleware.js";

const router = express.Router();

// POST /auth/login { email, password }
router.post("/login", login);

// POST /auth/refresh { refreshToken }
router.post("/refresh", refreshGuard, refresh);

// GET /auth/me (requires Authorization: Bearer <accessToken>)
router.get("/me", authGuard, me);

// POST /auth/logout (requires Authorization: Bearer <accessToken>)
router.post("/logout", authGuard, doLogout);

// PATCH /auth/password (requires Authorization: Bearer <accessToken>)
router.patch("/password", authGuard, changePasswordHandler);

// Forgot password flow (no auth)
router.post("/reset/request", forgotPassword);
router.get("/reset/verify", verifyResetToken);
router.post("/reset/confirm", resetPassword);

export default router;

