import express from "express";

const router = express.Router();

// GET /user/
router.get("/", (req, res) => {
	res.json({
		route: "/user",
		message: "User route is alive",
		sample: [
			{ id: 1, name: "Alice", email: "alice@example.com" },
			{ id: 2, name: "Bob", email: "bob@example.com" },
		],
	});
});

// GET /user/:id
router.get("/:id", (req, res) => {
	const { id } = req.params;
	res.json({ route: "/user/:id", id });
});

// POST /user/
router.post("/", (req, res) => {
	const payload = req.body || {};
	res.status(201).json({
		route: "/user",
		action: "create",
		received: payload,
	});
});

export default router;
