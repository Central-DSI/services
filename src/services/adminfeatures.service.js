import csv from "csv-parser";
import { Readable } from "stream";
import { createUser, ensureStudent, ensureUserRole, findUserByEmail, findUserByEmailOrIdentity, getOrCreateRole } from "../repositories/adminfeatures.repository.js";

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
				});
			})
			.on("end", () => resolve(out))
			.on("error", (err) => reject(err));
	});

	const studentRole = await getOrCreateRole("student");

	const summary = { created: 0, updated: 0, skipped: 0, failed: 0 };

	for (const row of rows) {
		const { nim, nama, email } = row;
			if (!nim || !email) {
			summary.skipped++;
			continue;
		}
			try {
				// Skip if email already exists
				const emailExists = await findUserByEmail(email);
				if (emailExists) {
					// optional log for debugging
					// console.log(`[importStudentsCsv] skip existing email: ${email}`);
					summary.skipped++;
					continue;
				}

				const existing = await findUserByEmailOrIdentity(email, nim);
				let userId;
				if (!existing) {
				const user = await createUser({
					fullName: nama || "",
					email,
							password: null,
					identityNumber: nim,
					identityType: "NIM",
					isVerified: false,
				});
				userId = user.id;
				summary.created++;
			} else {
					// If exists by identityNumber only (edge case), we still SKIP to avoid altering existing data
					summary.skipped++;
					continue;
			}

			await ensureUserRole(userId, studentRole.id);
			const enrollmentYear = deriveEnrollmentYearFromNIM(nim);
			await ensureStudent(userId, enrollmentYear);
		} catch (e) {
			summary.failed++;
		}
	}

	return summary;
}

