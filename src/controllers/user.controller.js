import { adminCreateUser } from "../services/user.service.js";

export async function createUserByAdmin(req, res, next) {
	try {
		const { fullName, email, roles, identityNumber, identityType } = req.body || {};
		const result = await adminCreateUser({ fullName, email, roles, identityNumber, identityType });
		res.status(201).json({ message: "User created", user: result });
	} catch (err) {
		next(err);
	}
}
