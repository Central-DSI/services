import express from "express";
import { authGuard } from "../middlewares/auth.middleware.js";
import {
	getNotifications,
	getUnreadCountController,
	markNotificationRead,
	markAllRead,
	deleteNotification,
} from "../controllers/notification.controller.js";

const router = express.Router();

// All notification routes require authentication
router.use(authGuard);

// GET /notification - Get user's notifications
router.get("/", getNotifications);

// GET /notification/unread-count - Get unread count
router.get("/unread-count", getUnreadCountController);

// PATCH /notification/read-all - Mark all as read
router.patch("/read-all", markAllRead);

// PATCH /notification/:id/read - Mark notification as read
router.patch("/:id/read", markNotificationRead);

// DELETE /notification/:id - Delete notification
router.delete("/:id", deleteNotification);

export default router;
