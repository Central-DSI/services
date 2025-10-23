import express from "express";
import lecturerRouter from "./thesisGuidance/lecturer.guidance.route.js";
import studentRouter from "./thesisGuidance/student.guidance.route.js";

const router = express.Router();

// Mount under a stable path: /thesis-guidance/lecturer
router.use("/lecturer", lecturerRouter);
router.use("/student", studentRouter);

export default router;
