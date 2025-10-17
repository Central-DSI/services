import express from "express";
import { authGuard, requireRole } from "../middlewares/auth.middleware.js";
import { uploadCsv } from "../middlewares/file.middleware.js";
import { importStudentsCsv } from "../controllers/adminfeatures.controller.js";

const router = express.Router();

// POST /adminfeatures/students/import (CSV: nim,nama,email)
router.post("/students/import", authGuard, requireRole("admin"), uploadCsv, importStudentsCsv);

export default router;

