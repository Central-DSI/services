import express from "express";
import { authGuard, requireAnyRole } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import {
	requestGuidanceSchema,
	rescheduleGuidanceSchema,
	studentNotesSchema,
	completeComponentsSchema,
} from "../../validators/student.guidance.validator.js";
import {
	listMyGuidances,
	guidanceDetail,
	requestGuidance,
	rescheduleGuidance,
	cancelGuidance,
	updateStudentNotes,
	myProgress,
	completeProgressComponents,
	guidanceHistory,
	activityLog,
	listSupervisors,
} from "../../controllers/thesisGuidance/student.guidance.controller.js";

const router = express.Router();

// Accept only student roles (adjust names as per your user_roles)
router.use(authGuard, requireAnyRole(["mahasiswa", "student"]));

// Guidance list/detail
router.get("/guidance", listMyGuidances);
router.get("/guidance/:guidanceId", guidanceDetail);

// Create / reschedule / cancel guidance
router.post("/guidance/request", validate(requestGuidanceSchema), requestGuidance);
router.patch("/guidance/:guidanceId/reschedule", validate(rescheduleGuidanceSchema), rescheduleGuidance);
router.patch("/guidance/:guidanceId/cancel", cancelGuidance);

// Update student notes
router.post("/guidance/:guidanceId/notes", validate(studentNotesSchema), updateStudentNotes);

// Progress
router.get("/progress", myProgress);
router.patch("/progress/complete", validate(completeComponentsSchema), completeProgressComponents);

// History & activity
router.get("/history", guidanceHistory);
router.get("/activity-log", activityLog);

// Supervisors info
router.get("/supervisors", listSupervisors);

export default router;

