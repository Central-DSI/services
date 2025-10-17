import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { ENV } from "../config/env.js";
import { addRoleToUser, createUser, findRoleByName, findUserByEmailOrIdentity, getOrCreateRole, hasUserRole, findStudentStatusByName, createStudentStatus, createStudentForUser, findLecturerByUserId, createLecturerForUser } from "../repositories/user.repository.js";
import { deriveEnrollmentYearFromNIM } from "../utils/global.util.js";
import { generatePassword } from "../utils/password.util.js";
import { sendMail } from "../config/mailer.js";
import redisClient from "../config/redis.js";
import { accountInviteTemplate } from "../utils/emailTemplate.js";

export async function adminCreateUser({ fullName, email, roles = [], identityNumber, identityType }) {
	// Validate
	if (!email) {
		const err = new Error("Email is required");
		err.statusCode = 400;
		throw err;
	}

	const existing = await findUserByEmailOrIdentity(email.toLowerCase(), identityNumber);
	if (existing) {
		const err = new Error("User already exists");
		err.statusCode = 409;
		throw err;
	}

	const plainPassword = generatePassword(12);
	const hash = await bcrypt.hash(plainPassword, 10);
	const user = await createUser({
		// Schema requires non-null String; use empty string when admin doesn't provide name
		fullName: fullName || "",
		email: email.toLowerCase(),
		password: hash,
		identityNumber: identityNumber || undefined,
		identityType: identityType || undefined,
		phoneNumber: undefined,
		isVerified: false,
	});

	// Roles: admin can set any roles EXCEPT 'admin' for this endpoint
	const rawRoles = Array.isArray(roles) ? roles.filter((r) => String(r).trim().toLowerCase() !== "admin") : [];
	const uniqueRoles = [...new Set(rawRoles)];
	console.log("[adminCreateUser] incoming roles:", roles);
	console.log("[adminCreateUser] unique (no normalization):", uniqueRoles);
	for (const rn of uniqueRoles) {
		const role = await getOrCreateRole(rn);
		const exists = await hasUserRole(user.id, role.id);
		if (!exists) await addRoleToUser(user.id, role.id);
	}

	// If role 'student' is assigned, ensure Student record exists
	if (uniqueRoles.some((r) => String(r).trim().toLowerCase() === "student")) {
		// Minimal defaults
		let status = await findStudentStatusByName("Aktif");
		if (!status) status = await createStudentStatus("Aktif");
		// Avoid duplicate create if already exists
		const existingStudent = await prisma.student.findUnique({ where: { userId: user.id } });
		if (!existingStudent) {
			const enrollmentYear = identityNumber ? deriveEnrollmentYearFromNIM(identityNumber) : null;
			// Set a sensible default SKS completed (or 0)
			await createStudentForUser({ userId: user.id, studentStatusId: status.id, enrollmentYear, skscompleted: 0 });
		}
	}

	// If identityType is NIP OR lecturer-related role is assigned, ensure Lecturer record exists
	const lecturerRoleSet = new Set(["pembimbing", "penguji", "kadep", "sekretaris_departemen", "gkm", "pembimbing 1", "pembimbing 2", "sekdep", "sekretaris departemen"]);
	const isLecturerRole = uniqueRoles.some((r) => lecturerRoleSet.has(String(r).trim().toLowerCase()));
	const isLecturerIdentity = String(identityType || "").toUpperCase() === "NIP";
	console.log("[adminCreateUser] lecturer-role detected:", isLecturerRole, "; identityType=NIP:", isLecturerIdentity);
	if (isLecturerRole || isLecturerIdentity) {
		const existingLect = await findLecturerByUserId(user.id);
		if (!existingLect) {
			console.log("[adminCreateUser] creating Lecturer for user", user.id);
			const createdLect = await createLecturerForUser({ userId: user.id });
			console.log("[adminCreateUser] Lecturer created id:", createdLect?.id);
		} else {
			console.log("[adminCreateUser] Lecturer already exists for user", user.id);
		}
	}

	// Return minimal payload

	// Prepare verification token and send email
	try {
		if (!redisClient.isOpen) await redisClient.connect();
		const tokenPayload = { sub: user.id, purpose: "verify" };
		const token = jwt.sign(tokenPayload, ENV.JWT_SECRET, { expiresIn: "7d" });
		const key = `verify:${user.id}`;
		await redisClient.setEx(key, 7 * 24 * 3600, "1");
		const baseUrl = (ENV.BASE_URL || "").replace(/\/$/, "");
		const verifyUrl = `${baseUrl}/auth/verify?token=${encodeURIComponent(token)}`;
		const html = accountInviteTemplate({ appName: ENV.APP_NAME, fullName: user.fullName, email: user.email, temporaryPassword: plainPassword, verifyUrl });
		await sendMail({ to: user.email, subject: `${ENV.APP_NAME || "App"} - Account Invitation`, html });
	} catch (e) {
		console.error("✉️ Failed to send verification email:", e?.message || e);
	}

	return { id: user.id, email: user.email, roles: uniqueRoles };
}
