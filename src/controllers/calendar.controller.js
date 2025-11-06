import {
  getMyCalendarEvents,
  getUpcomingEvents,
  getEventStatistics,
} from "../services/calendar.service.js";

/**
 * @route GET /calendar/my-events
 * @desc Get calendar events for authenticated user
 */
export async function getMyCalendarEventsController(req, res, next) {
  try {
    const userId = req.user.sub; // JWT payload uses 'sub'
    
    // Get user roles from database
    const userRole = await getUserPrimaryRole(userId);
    
    console.log('[Calendar Controller] User ID:', userId);
    console.log('[Calendar Controller] User Role from DB:', userRole);

    const { startDate, endDate, types, status } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (types) filters.types = types.split(",");
    if (status) filters.status = status;
    
    console.log('[Calendar Controller] Filters:', filters);

    const result = await getMyCalendarEvents(userId, userRole, filters);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

// Helper function to get user primary role
async function getUserPrimaryRole(userId) {
  const { PrismaClient } = await import("../generated/prisma/index.js");
  const prisma = new PrismaClient();
  
  try {
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userHasRoles: {
          where: { status: "active" },
          include: {
            role: true,
          },
        },
      },
    });
    
    const roleName = userWithRoles?.userHasRoles?.[0]?.role?.name || "student";
    
    console.log('[getUserPrimaryRole] Raw role name from DB:', roleName);
    console.log('[getUserPrimaryRole] User has roles:', userWithRoles?.userHasRoles?.map(r => r.role?.name));
    
    // Normalize role names
    if (roleName === "mahasiswa") {
      console.log('[getUserPrimaryRole] Normalized to: student');
      return "student";
    }
    // Lecturer roles: dosen, pembimbing1, pembimbing2, penguji
    if (roleName === "dosen" || roleName === "pembimbing1" || roleName === "pembimbing2" || roleName === "penguji") {
      console.log('[getUserPrimaryRole] Normalized to: lecturer');
      return "lecturer";
    }
    if (roleName === "admin") {
      console.log('[getUserPrimaryRole] Normalized to: admin');
      return "admin";
    }
    
    console.log('[getUserPrimaryRole] No normalization, returning:', roleName);
    return roleName;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * @route GET /calendar/upcoming
 * @desc Get upcoming events (next N days)
 */
export async function getUpcomingEventsController(req, res, next) {
  try {
    const userId = req.user.sub;
    const userRole = await getUserPrimaryRole(userId);
    const days = parseInt(req.query.days) || 7;

    const result = await getUpcomingEvents(userId, userRole, days);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route GET /calendar/statistics
 * @desc Get event statistics for dashboard
 */
export async function getEventStatisticsController(req, res, next) {
  try {
    const userId = req.user.sub;
    const userRole = await getUserPrimaryRole(userId);

    const stats = await getEventStatistics(userId, userRole);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}
