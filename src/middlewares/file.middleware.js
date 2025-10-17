import multer from "multer";

const storage = multer.memoryStorage();

function csvFileFilter(req, file, cb) {
	const okMime = [
		"text/csv",
		"application/csv",
		"text/plain",
		"application/vnd.ms-excel",
	];
	const isCsv = okMime.includes(file.mimetype) || (file.originalname || "").toLowerCase().endsWith(".csv");
	if (!isCsv) return cb(new Error("Only CSV files are allowed"));
	cb(null, true);
}

const upload = multer({ storage, fileFilter: csvFileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

export const uploadCsv = upload.single("file");
export default upload;

