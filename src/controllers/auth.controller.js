import { loginWithEmailPassword, refreshTokens, logout, verifyAccessToken, changePassword, requestPasswordReset, verifyPasswordResetToken, resetPasswordWithToken, verifyAccountToken, requestAccountVerification, getUserProfile } from "../services/auth.service.js";
import { ENV } from "../config/env.js";

export async function login(req, res, next) {
	try {
		const { email, password } = req.body || {};
		if (!email || !password) {
			const err = new Error("Email and password are required");
			err.statusCode = 400;
			throw err;
		}

		const result = await loginWithEmailPassword(email, password);
		res.status(200).json({ success: true, ...result });
	} catch (err) {
		next(err);
	}
}

export async function refresh(req, res, next) {
	try {
		const refreshToken = req.refreshToken || (req.body ? req.body.refreshToken : undefined);
		if (!refreshToken) {
			const err = new Error("Refresh token is required");
			err.statusCode = 400;
			throw err;
		}
		const tokens = await refreshTokens(refreshToken);
		res.status(200).json({ success: true, ...tokens });
	} catch (err) {
		next(err);
	}
}

export async function me(req, res, next) {
	try {
		const userProfile = await getUserProfile(req.user.sub);
		res.json({ success: true, user: userProfile });
	} catch (err) {
		next(err);
	}
}

export async function doLogout(req, res, next) {
	try {
		await logout(req.user.sub);
		res.json({ success: true });
	} catch (err) {
		next(err);
	}
}

export async function changePasswordHandler(req, res, next) {
	try {
		const { currentPassword, newPassword } = req.body || {};
		if (!currentPassword || !newPassword) {
			const err = new Error("currentPassword and newPassword are required");
			err.statusCode = 400;
			throw err;
		}
		await changePassword(req.user.sub, currentPassword, newPassword);
		res.json({ success: true });
	} catch (err) {
		next(err);
	}
}

export async function forgotPassword(req, res, next) {
	try {
		const { email } = req.body || {};
		if (!email) {
			const err = new Error("Email is required");
			err.statusCode = 400;
			throw err;
		}
		await requestPasswordReset(email);
		res.json({ success: true });
	} catch (err) {
		next(err);
	}
}

export async function verifyResetToken(req, res, next) {
	try {
		const token = req.query?.token || req.body?.token;
		if (!token) {
			// Redirect ke frontend dengan error
			const frontendUrl = `${ENV.FRONTEND_URL}/login?reset=error&message=${encodeURIComponent('Token tidak ditemukan')}`;
			return res.redirect(frontendUrl);
		}
		// Verify token
		await verifyPasswordResetToken(token);
		// Redirect ke halaman reset password frontend dengan token
		const frontendUrl = `${ENV.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
		res.redirect(frontendUrl);
	} catch (err) {
		// Redirect ke frontend dengan error
		const errorMessage = err.message || 'Token tidak valid atau sudah kadaluarsa';
		const frontendUrl = `${ENV.FRONTEND_URL}/login?reset=error&message=${encodeURIComponent(errorMessage)}`;
		res.redirect(frontendUrl);
	}
}

export async function resetPassword(req, res, next) {
	try {
		const { token, newPassword } = req.body || {};
		if (!token || !newPassword) {
			const err = new Error("token and newPassword are required");
			err.statusCode = 400;
			throw err;
		}
		await resetPasswordWithToken(token, newPassword);
		res.json({ success: true });
	} catch (err) {
		next(err);
	}
}

export async function verifyAccount(req, res, next) {
	try {
		const token = req.query?.token || req.body?.token;
		if (!token) {
			// Redirect ke frontend dengan error
			const frontendUrl = `${ENV.FRONTEND_URL}/login?verified=error&message=${encodeURIComponent('Token tidak ditemukan')}`;
			return res.redirect(frontendUrl);
		}
		const result = await verifyAccountToken(token);
		// Redirect ke frontend dengan success
		const frontendUrl = `${ENV.FRONTEND_URL}/login?verified=success&message=${encodeURIComponent('Akun berhasil diaktivasi! Silakan login dengan password yang dikirim ke email Anda.')}`;
		res.redirect(frontendUrl);
	} catch (err) {
		// Redirect ke frontend dengan error
		const errorMessage = err.message || 'Terjadi kesalahan saat aktivasi akun';
		const frontendUrl = `${ENV.FRONTEND_URL}/login?verified=error&message=${encodeURIComponent(errorMessage)}`;
		res.redirect(frontendUrl);
	}
}

export async function requestAccountVerificationController(req, res, next) {
	try {
		const { email } = req.body || {};
		if (!email) {
			const err = new Error("Email is required");
			err.statusCode = 400;
			throw err;
		}
		const result = await requestAccountVerification(email);
		// If service returns structured info, forward helpful message
		if (result && result.found === false) {
			return res.status(200).json({ success: true, message: result.message, code: "EMAIL_NOT_FOUND" });
		}
		if (result && result.alreadyVerified) {
			return res.status(200).json({ success: true, message: result.message, code: "ALREADY_VERIFIED" });
		}
		return res.json({ success: true });
	} catch (err) {
		next(err);
	}
}

