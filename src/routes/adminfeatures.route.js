import express from "express";
import { authGuard, requireRole } from "../middlewares/auth.middleware.js";
import { uploadCsv } from "../middlewares/file.middleware.js";
import { importStudentsCsv, updateUserByAdmin, createAcademicYearController, updateAcademicYearController, createUserByAdminController, getAcademicYearsController, getUsersController, getStudentsController, getLecturersController } from "../controllers/adminfeatures.controller.js";
import { updateUserSchema, createUserSchema } from "../validators/user.validator.js";
import { validate } from "../middlewares/validation.middleware.js";
import { createAcademicYearSchema, updateAcademicYearSchema } from "../validators/academicYear.validator.js";


const router = express.Router();

router.post("/students/import", authGuard, requireRole("admin"), uploadCsv, importStudentsCsv);
router.get("/users", authGuard, requireRole("admin"), getUsersController);
router.get("/students", authGuard, requireRole("admin"), getStudentsController);
router.get("/lecturers", authGuard, requireRole("admin"), getLecturersController);
router.post("/users", authGuard, requireRole("admin"), validate(createUserSchema), createUserByAdminController);
router.patch("/:id", authGuard, requireRole("admin"), validate(updateUserSchema), updateUserByAdmin);
router.get("/academic-years", authGuard, requireRole("admin"), getAcademicYearsController);
router.post("/academic-years", authGuard, requireRole("admin"), validate(createAcademicYearSchema), createAcademicYearController);
router.patch("/academic-years/:id", authGuard, requireRole("admin"), validate(updateAcademicYearSchema), updateAcademicYearController);


export default router;

