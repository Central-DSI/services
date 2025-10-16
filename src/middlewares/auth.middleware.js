import { verifyAccessToken } from "../services/auth.service.js";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";

export function authGuard(req, res, next) {
	try {
		const auth = req.headers.authorization || "";
		const [, token] = auth.split(" "); // Expect: Bearer <token>
		if (!token) {
			const err = new Error("Unauthorized");
			err.statusCode = 401;
			throw err;
		}
		const decoded = verifyAccessToken(token);
		req.user = decoded;
		next();
	} catch (err) {
		next(err);
	}
}

export function refreshGuard(req, res, next) {
	try {
		const tokenFromBody = req.body?.refreshToken;
		const tokenFromHeader = req.headers["x-refresh-token"]; // optional custom header
		const auth = req.headers.authorization || "";
		const bearerToken = auth.startsWith("Bearer ") ? auth.split(" ")[1] : undefined;

		const token = tokenFromBody || tokenFromHeader || bearerToken;
		if (!token) {
			const err = new Error("Refresh token is required");
			err.statusCode = 400;
			throw err;
		}

		const claims = jwt.verify(token, ENV.REFRESH_TOKEN_SECRET);
		req.refreshToken = token;
		req.refreshClaims = claims;
		next();
	} catch (err) {
		err.statusCode = err.statusCode || 401;
		next(err);
	}
}

