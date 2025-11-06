import { Router } from "express";
import {
  getMyCalendarEventsController,
  getUpcomingEventsController,
  getEventStatisticsController,
} from "../controllers/calendar.controller.js";
import { authGuard } from "../middlewares/auth.middleware.js";

const router = Router();

// Calendar routes
router.get("/my-events", authGuard, getMyCalendarEventsController);
router.get("/upcoming", authGuard, getUpcomingEventsController);
router.get("/statistics", authGuard, getEventStatisticsController);

export default router;
