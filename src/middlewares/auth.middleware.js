import { verifyAccessToken } from "../services/auth.service.js";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";
import prisma from "../config/prisma.js";

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

// Require a specific role (e.g., 'admin') for the authenticated user
export function requireRole(roleName) {
	return async function (req, res, next) {
		try {
			const userId = req.user?.sub;
			if (!userId) {
				const err = new Error("Unauthorized");
				err.statusCode = 401;
				throw err;
			}

			// Find role by name (case-insensitive)
					const role = await prisma.userRole.findFirst({
						where: { name: String(roleName) },
						select: { id: true, name: true },
					});
			if (!role) {
				const err = new Error("Forbidden: required role not found");
				err.statusCode = 403;
				throw err;
			}

			const hasRole = await prisma.userHasRole.findFirst({
				where: { userId, roleId: role.id, status: "active" },
				select: { userId: true },
			});
			if (!hasRole) {
				const err = new Error("Forbidden: insufficient role");
				err.statusCode = 403;
				throw err;
			}

			next();
		} catch (err) {
			next(err);
		}
	};
}

