import express from "express";
import { authGuard, requireRole } from "../middlewares/auth.middleware.js";
import { createUserByAdmin } from "../controllers/user.controller.js";
import { validate } from "../middlewares/validation.middleware.js";
import { createUserSchema } from "../validators/user.validator.js";

const router = express.Router();

// Health/info endpoint
router.get("/", (req, res) => {
	res.json({
		route: "/user",
		message: "User route is alive",
	});
});

router.post("/", authGuard, requireRole("admin"), validate(createUserSchema), createUserByAdmin);

export default router;
