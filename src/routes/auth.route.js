import express from "express";
import { login, refresh, me, doLogout, updateProfileHandler, changePasswordHandler, forgotPassword, verifyResetToken, resetPassword, verifyAccount, requestAccountVerificationController } from "../controllers/auth.controller.js";
import { authGuard, refreshGuard } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/refresh", refreshGuard, refresh);
router.get("/me", authGuard, me);
router.post("/logout", authGuard, doLogout);
router.patch("/profile", authGuard, updateProfileHandler);
router.patch("/password", authGuard, changePasswordHandler);
router.post("/reset/request", forgotPassword);
router.get("/reset/verify", verifyResetToken);
router.post("/reset/confirm", resetPassword);
router.get("/verify", verifyAccount);
router.post("/verify/request", requestAccountVerificationController);

export default router;

