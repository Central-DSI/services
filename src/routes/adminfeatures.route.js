import express from "express";
import { authGuard, requireRole } from "../middlewares/auth.middleware.js";
import { uploadCsv } from "../middlewares/file.middleware.js";
import { importStudentsCsv, updateUserByAdmin, createAcademicYearController, updateAcademicYearController, createUserByAdminController } from "../controllers/adminfeatures.controller.js";
import { updateUserSchema, createUserSchema } from "../validators/user.validator.js";
import { validate } from "../middlewares/validation.middleware.js";
import { createAcademicYearSchema, updateAcademicYearSchema } from "../validators/academicYear.validator.js";


const router = express.Router();

router.post("/students/import", authGuard, requireRole("admin"), uploadCsv, importStudentsCsv);
router.post("/users", authGuard, requireRole("admin"), validate(createUserSchema), createUserByAdminController);
router.patch("/:id", authGuard, requireRole("admin"), validate(updateUserSchema), updateUserByAdmin);
router.post("/academic-years", authGuard, requireRole("admin"), validate(createAcademicYearSchema), createAcademicYearController);
router.patch("/academic-years/:id", authGuard, requireRole("admin"), validate(updateAcademicYearSchema), updateAcademicYearController);


export default router;

