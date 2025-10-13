import express from "express";

const router = express.Router();

// GET /notification/
router.get("/", (req, res) => {
	res.json({
		route: "/notification",
		message: "Notification route is alive",
		examples: [
			{ id: 1, title: "Welcome", message: "Hello there!" },
			{ id: 2, title: "Reminder", message: "Don't forget to check in." },
		],
	});
});

// POST /notification/
router.post("/", (req, res) => {
	const payload = req.body || {};
	res.status(201).json({
		route: "/notification",
		action: "create",
		received: payload,
	});
});

export default router;
