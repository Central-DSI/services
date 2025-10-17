import { loginWithEmailPassword, refreshTokens, logout, verifyAccessToken, changePassword, requestPasswordReset, verifyPasswordResetToken, resetPasswordWithToken, verifyAccountToken, requestAccountVerification } from "../services/auth.service.js";

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

export async function me(req, res) {
	res.json({ success: true, user: req.user });
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
			const err = new Error("Token is required");
			err.statusCode = 400;
			throw err;
		}
		const decoded = await verifyPasswordResetToken(token);
		res.json({ success: true, tokenValid: true, sub: decoded.sub });
	} catch (err) {
		next(err);
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
			const err = new Error("Token is required");
			err.statusCode = 400;
			throw err;
		}
		const result = await verifyAccountToken(token);
		res.json({ success: true, verified: true, userId: result.userId });
	} catch (err) {
		next(err);
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
		await requestAccountVerification(email);
		res.json({ success: true });
	} catch (err) {
		next(err);
	}
}

