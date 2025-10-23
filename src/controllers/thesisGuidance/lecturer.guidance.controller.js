import {
	getMyStudentsService,
	getRequestsService,
	rejectGuidanceService,
	approveGuidanceService,
	getAllProgressService,
	getStudentProgressDetailService,
	approveStudentProgressComponentsService,
	postGuidanceFeedbackService,
	finalApprovalService,
	guidanceHistoryService,
	activityLogService,
		supervisorEligibilityService,
		failStudentThesisService,
} from "../../services/thesisGuidance/lecturer.guidance.service.js";

export async function myStudents(req, res, next) {
	try {
		// Enforce supervisor roles based on UserRole names
		// We use user_roles.name values: pembimbing1 and pembimbing2
		const roles = ["pembimbing1", "pembimbing 1", "pembimbing2", "pembimbing 2"]; // allow space variants
		const result = await getMyStudentsService(req.user.sub, roles);
		res.json({ success: true, ...result });
	} catch (err) {
		next(err);
	}
}

export async function listRequests(req, res, next) {
	try {
		const result = await getRequestsService(req.user.sub);
		res.json({ success: true, ...result });
	} catch (err) {
		next(err);
	}
}

export async function rejectGuidance(req, res, next) {
	try {
		const { guidanceId } = req.params;
		const { feedback } = req.body || {};
		const result = await rejectGuidanceService(req.user.sub, guidanceId, { feedback });
		res.json({ success: true, ...result });
	} catch (err) {
		next(err);
	}
}

export async function approveGuidance(req, res, next) {
	try {
		const { guidanceId } = req.params;
		const { feedback, meetingUrl } = req.body || {};
		const result = await approveGuidanceService(req.user.sub, guidanceId, { feedback, meetingUrl });
		res.json({ success: true, ...result });
	} catch (err) {
		next(err);
	}
}

export async function listProgress(req, res, next) {
	try {
		const result = await getAllProgressService(req.user.sub);
		res.json({ success: true, ...result });
	} catch (err) {
		next(err);
	}
}

export async function progressDetail(req, res, next) {
	try {
		const { studentId } = req.params;
		const result = await getStudentProgressDetailService(req.user.sub, studentId);
		res.json({ success: true, ...result });
	} catch (err) {
		next(err);
	}
}

export async function approveProgressComponents(req, res, next) {
	try {
		const { studentId } = req.params;
		const { componentIds } = req.body || {};
		if (!Array.isArray(componentIds) || componentIds.length === 0) {
			const e = new Error("componentIds (array) is required");
			e.statusCode = 400;
			throw e;
		}
		const result = await approveStudentProgressComponentsService(req.user.sub, studentId, componentIds);
		res.json({ success: true, ...result });
	} catch (err) {
		next(err);
	}
}

export async function postFeedback(req, res, next) {
	try {
		const { guidanceId } = req.params;
		const { feedback } = req.body || {};
		if (!feedback || String(feedback).trim().length === 0) {
			const e = new Error("feedback is required");
			e.statusCode = 400;
			throw e;
		}
		const result = await postGuidanceFeedbackService(req.user.sub, guidanceId, { feedback });
		res.json({ success: true, ...result });
	} catch (err) {
		next(err);
	}
}

export async function finalApproval(req, res, next) {
	try {
		const { studentId } = req.params;
		const result = await finalApprovalService(req.user.sub, studentId);
		res.json({ success: true, ...result });
	} catch (err) {
		next(err);
	}
}

export async function guidanceHistory(req, res, next) {
	try {
		const { studentId } = req.params;
		const result = await guidanceHistoryService(req.user.sub, studentId);
		res.json({ success: true, ...result });
	} catch (err) {
		next(err);
	}
}

export async function activityLog(req, res, next) {
	try {
		const { studentId } = req.params;
		const result = await activityLogService(req.user.sub, studentId);
		res.json({ success: true, ...result });
	} catch (err) {
		next(err);
	}
}

export async function supervisorEligibility(req, res, next) {
	try {
		const threshold = req.query?.threshold ? Number(req.query.threshold) : undefined;
		const result = await supervisorEligibilityService(req.user.sub, Number.isFinite(threshold) ? threshold : undefined);
		res.json({ success: true, ...result });
	} catch (err) {
		next(err);
	}
}

export async function failStudentThesis(req, res, next) {
	try {
		const { studentId } = req.params;
		const { reason } = req.body || {};
		const result = await failStudentThesisService(req.user.sub, studentId, { reason });
		res.json({ success: true, ...result });
	} catch (err) {
		next(err);
	}
}

