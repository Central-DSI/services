import express from "express";
import { authGuard, requireAnyRole } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { feedbackSchema, approveGuidanceSchema, approveComponentsSchema } from "../../validators/lecturer.guidance.validator.js";
import {
	myStudents,
	listRequests,
	rejectGuidance,
	approveGuidance,
	listProgress,
	progressDetail,
	approveProgressComponents,
	postFeedback,
	finalApproval,
	guidanceHistory,
	activityLog,
		supervisorEligibility,
} from "../../controllers/thesisGuidance/lecturer.guidance.controller.js";

const router = express.Router();

// Base path: /thesisGuidance/lecturer (will be mounted as /thesisGuidance/lecturer.guidance by auto-loader, so expose full path explicitly in parent route if needed)

// Accept either pembimbing1 or pembimbing2 (case/space insensitive)
router.use(authGuard, requireAnyRole(["pembimbing1", "pembimbing 1", "pembimbing2", "pembimbing 2"]));

router.get("/my-students", myStudents);
router.get("/requests", listRequests);
router.patch("/requests/:guidanceId/reject", validate(feedbackSchema), rejectGuidance);
router.patch("/requests/:guidanceId/approve", validate(approveGuidanceSchema), approveGuidance);

router.get("/progress", listProgress);
router.get("/progress/:studentId", progressDetail);
router.patch("/progress/:studentId/approve", validate(approveComponentsSchema), approveProgressComponents);
router.patch("/progress/:studentId/final-approval", finalApproval);

router.post("/feedback/:guidanceId", validate(feedbackSchema), postFeedback);

// Optional
router.get("/guidance-history/:studentId", guidanceHistory);
router.get("/activity-log/:studentId", activityLog);
router.get("/supervisor/eligibility", supervisorEligibility);

export default router;

