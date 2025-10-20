import csv from "csv-parser";
import { Readable } from "stream";
import prisma from "../config/prisma.js";
import { getOrCreateRole } from "../repositories/adminfeatures.repository.js";
import {
	findUserById,
	updateUserById as repoUpdateUserById,
	findRoleByName,
	getOrCreateRole as getOrCreateRoleFromUserRepo,
	getUserRolesWithIds,
	upsertUserRole,
	findStudentByUserId,
	createStudentForUser,
	findLecturerByUserId,
	createLecturerForUser,
} from "../repositories/user.repository.js";

function clean(v) {
	if (v == null) return "";
	return String(v).replace(/[\u00A0\u200B]/g, " ").trim();
}
function deriveEnrollmentYearFromNIM(nim) {
	const s = String(nim || "").trim();
	if (s.length >= 2) {
		const yy = parseInt(s.slice(0, 2), 10);
		if (!isNaN(yy)) return 2000 + yy;
	}
	return null;
}
export async function adminUpdateUser(id, payload = {}) {
	if (!id) {
		const err = new Error("User id is required");
		err.statusCode = 400;
		throw err;
	}

	const user = await findUserById(id);
	if (!user) {
		const err = new Error("User not found");
		err.statusCode = 404;
		throw err;
	}

	const { fullName, email, roles, identityNumber, identityType, isVerified } = payload || {};

	// Prepare update data
	const updateData = {};
	if (typeof fullName === "string" && fullName.trim()) updateData.fullName = fullName.trim();
	if (typeof email === "string" && email.trim()) updateData.email = email.trim().toLowerCase();
	if (typeof identityNumber === "string" && identityNumber.trim()) updateData.identityNumber = identityNumber.trim();
	if (typeof identityType === "string") updateData.identityType = identityType;
	if (typeof isVerified === "boolean") updateData.isVerified = isVerified;

	if (Object.keys(updateData).length) {
		try {
			await repoUpdateUserById(id, updateData);
		} catch (e) {
			// Handle unique constraint errors gracefully
			if (e && e.code === "P2002") {
				const err = new Error("Email or identity number already in use");
				err.statusCode = 409;
				throw err;
			}
			throw e;
		}
	}

	// Update roles if provided (manage only non-admin roles)
	if (Array.isArray(roles)) {
			// roles can be string[] or {name, status}[]
			const desired = [];
			for (const r of roles) {
				if (typeof r === "string") desired.push({ name: r, status: undefined });
				else if (r && typeof r.name === "string") desired.push({ name: r.name, status: r.status });
			}
			// Normalize
			const desiredClean = desired
				.map((x) => ({ name: x.name.trim().toLowerCase(), status: x.status }))
				.filter((x) => x.name && x.name !== "admin");

			// Map role names -> role ids, then upsert with status if provided
			const existing = await getUserRolesWithIds(id);
			const existingByRoleId = new Map(existing.map((ur) => [ur.roleId, ur]));
			const existingByName = new Map(existing.map((ur) => [String(ur.role?.name || "").toLowerCase(), ur]));

			for (const item of desiredClean) {
				let role = await findRoleByName(item.name);
				if (!role) role = await getOrCreateRoleFromUserRepo(item.name);
				const current = existingByRoleId.get(role.id) || existingByName.get(item.name);
				const status = item.status || current?.status || "active";
				// Upsert and update status when provided. Non-destructive for other roles.
				await upsertUserRole(id, role.id, status);
			}
	}

	// Ensure Student/Lecturer records when relevant
	const latest = await findUserById(id);
	const currentRoles = await getUserRolesWithIds(id);
	const roleNames = new Set(currentRoles.map((r) => (r.role?.name || "").toLowerCase()));
	const type = (latest?.identityType || identityType || "").toString();

	// Student
	if (roleNames.has("student") || type === "NIM") {
		const existingStudent = await findStudentByUserId(id);
		if (!existingStudent) {
			const enrollmentYear = deriveEnrollmentYearFromNIM(latest?.identityNumber || identityNumber);
			await createStudentForUser({ userId: id, enrollmentYear, skscompleted: 0 });
		}
	}

	// Lecturer
	if (roleNames.has("lecturer") || type === "NIP") {
		const existingLect = await findLecturerByUserId(id);
		if (!existingLect) {
			await createLecturerForUser({ userId: id });
		}
	}

	// Return user with roles for client convenience
	const result = await prisma.user.findUnique({
		where: { id },
		include: {
			userHasRoles: { include: { role: true } },
			student: true,
			lecturer: true,
		},
	});
	return result;
}
export async function importStudentsCsvFromUpload(fileBuffer) {
	if (!fileBuffer || !fileBuffer.length) {
		const err = new Error("CSV file is required");
		err.statusCode = 400;
		throw err;
	}

	function detectSeparator(buf) {
		try {
			const text = buf.toString("utf8");
			const firstLine = text.split(/\r?\n/).find((l) => l && l.trim().length > 0) || "";
			const commas = (firstLine.match(/,/g) || []).length;
			const semicolons = (firstLine.match(/;/g) || []).length;
			return semicolons > commas ? ";" : ",";
		} catch {
			return ",";
		}
	}

	const sep = detectSeparator(fileBuffer);

		const rows = await new Promise((resolve, reject) => {
		const out = [];
		const stream = Readable.from(fileBuffer);
		stream
			.pipe(csv({ separator: sep }))
			.on("data", (data) => {
				// Normalize keys (strip BOM, lowercase, trim)
				const norm = {};
				for (const k of Object.keys(data)) {
					const nk = String(k).replace(/^\ufeff/, "").trim().toLowerCase();
					norm[nk] = data[k];
				}
						out.push({
					nim: clean(norm.nim || ""),
					nama: clean(norm.nama || norm.name || ""),
							email: clean(norm.email || "").toLowerCase(),
							sks_completed: clean(norm.sks_completed || norm["sks_completed"] || norm.sks || ""),
				});
			})
			.on("end", () => resolve(out))
			.on("error", (err) => reject(err));
	});

	// Pre-process rows: normalize, filter invalid, and de-duplicate within file by email and NIM
	const cleanRows = [];
	const seenEmails = new Set();
	const seenNims = new Set();
	let skippedInvalid = 0;
	let skippedDuplicatesInFile = 0;
	for (const r of rows) {
		const nim = String(r.nim || "").trim();
		const email = String(r.email || "").trim().toLowerCase();
		if (!nim || !email) {
			skippedInvalid++;
			continue;
		}
		// dedupe by email first; also guard against duplicate nim in the same file
		if (seenEmails.has(email) || seenNims.has(nim)) {
			skippedDuplicatesInFile++;
			continue;
		}
		seenEmails.add(email);
		seenNims.add(nim);
		const sksCompletedVal = Number.parseInt(String(r.sks_completed || "").trim(), 10);
		cleanRows.push({
			nim,
			nama: String(r.nama || "").trim(),
			email,
			sksCompleted: Number.isFinite(sksCompletedVal) && sksCompletedVal >= 0 ? sksCompletedVal : 0,
		});
	}

	if (cleanRows.length === 0) {
		return { created: 0, updated: 0, skipped: skippedInvalid + skippedDuplicatesInFile, failed: 0 };
	}

	// Fetch existing users by email and by identityNumber (NIM) in 2 queries for efficiency
	const emails = cleanRows.map((r) => r.email);
	const nims = cleanRows.map((r) => r.nim);

	const [existingByEmail, existingByNim] = await Promise.all([
		prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true } }),
		prisma.user.findMany({ where: { identityNumber: { in: nims } }, select: { identityNumber: true } }),
	]);

	const existingEmailSet = new Set(existingByEmail.map((u) => u.email).filter(Boolean));
	const existingNimSet = new Set(existingByNim.map((u) => u.identityNumber));

	const rowsToCreate = cleanRows.filter((r) => !existingEmailSet.has(r.email) && !existingNimSet.has(r.nim));
	const skippedExisting = cleanRows.length - rowsToCreate.length;

	if (rowsToCreate.length === 0) {
		return { created: 0, updated: 0, skipped: skippedInvalid + skippedDuplicatesInFile + skippedExisting, failed: 0 };
	}

	// Create users in bulk
	const userData = rowsToCreate.map((r) => ({
		fullName: r.nama || "",
		email: r.email,
		password: null,
		identityNumber: r.nim,
		identityType: "NIM",
		isVerified: false,
	}));

	await prisma.user.createMany({ data: userData, skipDuplicates: true });

	// Re-fetch created users to get their IDs
	const createdUsers = await prisma.user.findMany({
		where: { email: { in: rowsToCreate.map((r) => r.email) } },
		select: { id: true, email: true, identityNumber: true },
	});

	// Map email -> userId and NIM -> (sksCompleted, enrollmentYear)
	const userIdByEmail = new Map(createdUsers.map((u) => [u.email, u.id]));
	const enrollmentByEmail = new Map(rowsToCreate.map((r) => [r.email, {
		enrollmentYear: deriveEnrollmentYearFromNIM(r.nim),
		sksCompleted: r.sksCompleted,
	}]));

	// Ensure role 'student'
	const studentRole = await getOrCreateRole("student");

	const userRoleData = createdUsers.map((u) => ({ userId: u.id, roleId: studentRole.id, status: "active" }));
	// Use createMany with skipDuplicates to avoid constraint errors if re-run
	await prisma.userHasRole.createMany({ data: userRoleData, skipDuplicates: true });

	// Build students data and bulk insert
	const studentData = createdUsers.map((u) => {
		const e = enrollmentByEmail.get(u.email) || {};
		return {
			userId: u.id,
			enrollmentYear: e.enrollmentYear ?? null,
			skscompleted: Number.isInteger(e.sksCompleted) && e.sksCompleted >= 0 ? e.sksCompleted : 0,
		};
	});
	await prisma.student.createMany({ data: studentData, skipDuplicates: true });

	return {
		created: createdUsers.length,
		updated: 0,
		skipped: skippedInvalid + skippedDuplicatesInFile + skippedExisting,
		failed: 0,
	};
}

// Create Academic Year (Admin)
export async function createAcademicYear({ semester = "ganjil", year, startDate, endDate }) {
	// Optional: basic date check
	if (startDate && endDate) {
		const s = new Date(startDate);
		const e = new Date(endDate);
		if (!isNaN(s) && !isNaN(e) && s > e) {
			const err = new Error("startDate must be before endDate");
			err.statusCode = 400;
			throw err;
		}
	}

	// Prevent duplicates by (semester, year) when year provided
	if (typeof year === "number") {
		const existing = await prisma.academicYear.findFirst({ where: { semester, year } });
		if (existing) {
			const err = new Error("Academic year already exists for this semester and year");
			err.statusCode = 409;
			throw err;
		}
	}

	const created = await prisma.academicYear.create({
		data: {
			semester,
			year: typeof year === "number" ? year : null,
			startDate: startDate ? new Date(startDate) : null,
			endDate: endDate ? new Date(endDate) : null,
		},
	});
	return created;
}

export async function updateAcademicYear(id, { semester, year, startDate, endDate } = {}) {
	if (!id) {
		const err = new Error("Academic year id is required");
		err.statusCode = 400;
		throw err;
	}

	if (startDate && endDate) {
		const s = new Date(startDate);
		const e = new Date(endDate);
		if (!isNaN(s) && !isNaN(e) && s > e) {
			const err = new Error("startDate must be before endDate");
			err.statusCode = 400;
			throw err;
		}
	}

	// Ensure exists
	const existing = await prisma.academicYear.findUnique({ where: { id } });
	if (!existing) {
		const err = new Error("Academic year not found");
		err.statusCode = 404;
		throw err;
	}

	// When both semester & year provided, prevent duplicates
	if (semester && typeof year === "number") {
		const dup = await prisma.academicYear.findFirst({ where: { semester, year, NOT: { id } } });
		if (dup) {
			const err = new Error("Another academic year with the same semester and year already exists");
			err.statusCode = 409;
			throw err;
		}
	}

	const data = {};
	if (semester) data.semester = semester;
	if (typeof year === "number") data.year = year;
	if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
	if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;

	const updated = await prisma.academicYear.update({ where: { id }, data });
	return updated;
}


