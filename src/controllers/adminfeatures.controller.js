import { importStudentsCsvFromUpload, adminUpdateUser, createAcademicYear, updateAcademicYear } from "../services/adminfeatures.service.js";
import { adminCreateUser } from "../services/user.service.js";

export async function importStudentsCsv(req, res, next) {
	try {
		const file = req.file;
		if (!file) {
			const err = new Error("CSV file is required (field name: file)");
			err.statusCode = 400;
			throw err;
		}
		const summary = await importStudentsCsvFromUpload(file.buffer);
		res.status(200).json({ success: true, summary });
	} catch (err) {
		next(err);
	}
}


export async function updateUserByAdmin(req, res, next) {
  try {
    const { id } = req.params;
		const body = req.validated ?? req.body ?? {};
		const { fullName, email, roles, identityNumber, identityType, isVerified } = body;
    const user = await adminUpdateUser(id, { fullName, email, roles, identityNumber, identityType, isVerified });
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export async function createUserByAdminController(req, res, next) {
	try {
		const body = req.validated ?? req.body ?? {};
		const { fullName, email, roles, identityNumber, identityType } = body;
		const result = await adminCreateUser({ fullName, email, roles, identityNumber, identityType });
		res.status(201).json({ success: true, user: result });
	} catch (err) {
		next(err);
	}
}

export async function createAcademicYearController(req, res, next) {
	try {
		const body = req.validated ?? req.body ?? {};
		const { semester, year, startDate, endDate } = body;
		const ay = await createAcademicYear({ semester, year, startDate, endDate });
		res.status(201).json({ success: true, academicYear: ay });
	} catch (err) {
		next(err);
	}
}

export async function updateAcademicYearController(req, res, next) {
	try {
		const { id } = req.params;
		const body = req.validated ?? req.body ?? {};
		const { semester, year, startDate, endDate } = body;
		const updated = await updateAcademicYear(id, { semester, year, startDate, endDate });
		res.status(200).json({ success: true, academicYear: updated });
	} catch (err) {
		next(err);
	}
}