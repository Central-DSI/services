import { importStudentsCsvFromUpload } from "../services/adminfeatures.service.js";

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

