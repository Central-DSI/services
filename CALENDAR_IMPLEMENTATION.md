# Backend Calendar Implementation Guide

## Database Schema (Prisma)

```prisma
// schema.prisma

model CalendarEvent {
  id              String   @id @default(cuid())
  title           String
  description     String?
  type            String   // EventType enum
  status          String   @default("scheduled") // EventStatus enum
  startDate       DateTime
  endDate         DateTime?
  
  // User relationship
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userRole        String   // 'student' | 'lecturer' | 'admin'
  
  // Related entities (polymorphic)
  relatedId       String?
  relatedType     String?  // 'thesis' | 'guidance' | 'seminar' | 'defense'
  
  // Location/Link
  location        String?
  meetingLink     String?
  
  // Notifications
  reminderMinutes Int      @default(30)
  notificationSent Boolean @default(false)
  
  // Styling
  color           String?
  backgroundColor String?
  
  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdBy       String
  
  // Relations
  participants    EventParticipant[]
  
  @@index([userId])
  @@index([startDate])
  @@index([type])
  @@index([relatedId, relatedType])
}

model EventParticipant {
  id        String        @id @default(cuid())
  eventId   String
  event     CalendarEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId    String
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      String        // 'student' | 'lecturer' | 'admin'
  status    String        @default("pending") // 'pending' | 'accepted' | 'declined'
  
  @@unique([eventId, userId])
  @@index([userId])
}
```

## Service Layer

### calendar.service.js

```javascript
import prisma from '../config/prisma.js';

/**
 * Get calendar events for specific user with role-based filtering
 */
export async function getMyCalendarEvents(userId, userRole, { startDate, endDate, types, status }) {
  const where = {
    AND: [
      // User filter
      {
        OR: [
          { userId }, // Events owned by user
          { participants: { some: { userId } } } // Events where user is participant
        ]
      },
      // Date range filter
      {
        startDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      // Type filter (optional)
      types && types.length > 0 ? { type: { in: types } } : {},
      // Status filter (optional)
      status && status.length > 0 ? { status: { in: status } } : {},
    ].filter(condition => Object.keys(condition).length > 0)
  };

  const events = await prisma.calendarEvent.findMany({
    where,
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        }
      }
    },
    orderBy: { startDate: 'asc' }
  });

  return {
    events: events.map(event => ({
      ...event,
      participants: event.participants.map(p => ({
        userId: p.userId,
        name: p.user.fullName,
        role: p.role,
        status: p.status
      }))
    })),
    meta: {
      total: events.length,
      startDate,
      endDate
    }
  };
}

/**
 * Auto-generate calendar events from thesis guidance
 * Called when guidance is scheduled
 */
export async function createGuidanceCalendarEvent(guidanceId, guidance) {
  const { studentId, lecturerId, guidanceDate, notes } = guidance;

  // Create event for student
  const studentEvent = await prisma.calendarEvent.create({
    data: {
      title: 'Bimbingan Tugas Akhir',
      description: notes || 'Bimbingan dengan dosen pembimbing',
      type: 'guidance_scheduled',
      status: 'scheduled',
      startDate: new Date(guidanceDate),
      endDate: new Date(new Date(guidanceDate).getTime() + 60 * 60 * 1000), // +1 hour
      userId: studentId,
      userRole: 'student',
      relatedId: guidanceId,
      relatedType: 'guidance',
      color: '#3b82f6',
      backgroundColor: '#dbeafe',
      createdBy: lecturerId,
      reminderMinutes: 30
    }
  });

  // Create event for lecturer
  const lecturerEvent = await prisma.calendarEvent.create({
    data: {
      title: 'Bimbingan Mahasiswa',
      description: notes || 'Bimbingan tugas akhir',
      type: 'student_guidance',
      status: 'scheduled',
      startDate: new Date(guidanceDate),
      endDate: new Date(new Date(guidanceDate).getTime() + 60 * 60 * 1000),
      userId: lecturerId,
      userRole: 'lecturer',
      relatedId: guidanceId,
      relatedType: 'guidance',
      color: '#10b981',
      backgroundColor: '#d1fae5',
      createdBy: lecturerId,
      reminderMinutes: 30,
      participants: {
        create: {
          userId: studentId,
          role: 'student',
          status: 'accepted'
        }
      }
    }
  });

  return { studentEvent, lecturerEvent };
}

/**
 * Auto-generate calendar events for academic year milestones
 * Called by admin when academic year is created
 */
export async function createAcademicYearEvents(academicYearId, academicYear) {
  const { semester, year, startDate, endDate } = academicYear;

  const events = [];

  // Academic year start event
  if (startDate) {
    events.push({
      title: `Tahun Ajaran ${year} ${semester === 'ganjil' ? 'Ganjil' : 'Genap'} Dimulai`,
      type: 'academic_year_start',
      status: 'scheduled',
      startDate: new Date(startDate),
      relatedId: academicYearId,
      relatedType: 'academic_year',
      color: '#8b5cf6',
      backgroundColor: '#ede9fe'
    });
  }

  // Academic year end event
  if (endDate) {
    events.push({
      title: `Tahun Ajaran ${year} ${semester === 'ganjil' ? 'Ganjil' : 'Genap'} Berakhir`,
      type: 'academic_year_end',
      status: 'scheduled',
      startDate: new Date(endDate),
      relatedId: academicYearId,
      relatedType: 'academic_year',
      color: '#f59e0b',
      backgroundColor: '#fef3c7'
    });
  }

  // Create events for all users (broadcast)
  const allUsers = await prisma.user.findMany({
    select: { id: true, roles: true }
  });

  for (const eventData of events) {
    for (const user of allUsers) {
      await prisma.calendarEvent.create({
        data: {
          ...eventData,
          userId: user.id,
          userRole: user.roles[0]?.name || 'student',
          createdBy: 'system'
        }
      });
    }
  }

  return events;
}

/**
 * Get upcoming events (next N days)
 */
export async function getUpcomingEvents(userId, days = 7) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + days);

  const events = await prisma.calendarEvent.findMany({
    where: {
      OR: [
        { userId },
        { participants: { some: { userId } } }
      ],
      startDate: {
        gte: now,
        lte: futureDate
      },
      status: { in: ['scheduled', 'rescheduled'] }
    },
    orderBy: { startDate: 'asc' },
    take: 10
  });

  return { events };
}

/**
 * Get event statistics for dashboard
 */
export async function getEventStatistics(userId) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [todayEvents, upcomingEvents, completedThisMonth, pendingActions] = await Promise.all([
    // Today's events
    prisma.calendarEvent.count({
      where: {
        OR: [{ userId }, { participants: { some: { userId } } }],
        startDate: { gte: today, lt: tomorrow },
        status: { in: ['scheduled', 'rescheduled'] }
      }
    }),
    // Upcoming events (next 7 days)
    prisma.calendarEvent.count({
      where: {
        OR: [{ userId }, { participants: { some: { userId } } }],
        startDate: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
        status: { in: ['scheduled', 'rescheduled'] }
      }
    }),
    // Completed this month
    prisma.calendarEvent.count({
      where: {
        OR: [{ userId }, { participants: { some: { userId } } }],
        startDate: { gte: startOfMonth, lte: endOfMonth },
        status: 'completed'
      }
    }),
    // Pending actions (guidance requests for lecturers)
    prisma.calendarEvent.count({
      where: {
        userId,
        type: 'guidance_request',
        status: 'scheduled'
      }
    })
  ]);

  return {
    todayEvents,
    upcomingEvents,
    completedThisMonth,
    pendingActions
  };
}
```

## Controller Layer

### calendar.controller.js

```javascript
import { getMyCalendarEvents, getUpcomingEvents, getEventStatistics } from '../services/calendar.service.js';

export async function getMyCalendarEventsController(req, res, next) {
  try {
    const userId = req.user.id;
    const userRole = req.user.roles[0]?.name || 'student';
    
    const { startDate, endDate, types, status } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'startDate and endDate are required' 
      });
    }

    const result = await getMyCalendarEvents(userId, userRole, {
      startDate,
      endDate,
      types: types ? (Array.isArray(types) ? types : [types]) : undefined,
      status: status ? (Array.isArray(status) ? status : [status]) : undefined
    });

    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getUpcomingEventsController(req, res, next) {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days) || 7;

    const result = await getUpcomingEvents(userId, days);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getEventStatisticsController(req, res, next) {
  try {
    const userId = req.user.id;
    const stats = await getEventStatistics(userId);
    res.status(200).json({ success: true, ...stats });
  } catch (err) {
    next(err);
  }
}
```

## Routes

### calendar.route.js

```javascript
import express from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { 
  getMyCalendarEventsController,
  getUpcomingEventsController,
  getEventStatisticsController
} from '../controllers/calendar.controller.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Get my calendar events
router.get('/my-events', getMyCalendarEventsController);

// Get upcoming events
router.get('/upcoming', getUpcomingEventsController);

// Get event statistics
router.get('/statistics', getEventStatisticsController);

export default router;
```

## Integration Points

### 1. Guidance System Integration
When guidance is scheduled, automatically create calendar events:

```javascript
// In thesisGuidance.service.js
import { createGuidanceCalendarEvent } from './calendar.service.js';

export async function approveGuidance(guidanceId, lecturerId, data) {
  // ... existing guidance approval logic
  
  // Create calendar events
  await createGuidanceCalendarEvent(guidanceId, {
    studentId: guidance.studentId,
    lecturerId,
    guidanceDate: data.guidanceDate,
    notes: data.notes
  });
  
  return guidance;
}
```

### 2. Academic Year Integration
When admin creates academic year:

```javascript
// In adminfeatures.service.js
import { createAcademicYearEvents } from './calendar.service.js';

export async function createAcademicYear(data) {
  const academicYear = await prisma.academicYear.create({ data });
  
  // Create calendar events for all users
  await createAcademicYearEvents(academicYear.id, academicYear);
  
  return academicYear;
}
```

### 3. Notification System Integration
Send notifications for upcoming events:

```javascript
// In notification.job.js (scheduled job)
export async function sendEventReminders() {
  const now = new Date();
  const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

  const upcomingEvents = await prisma.calendarEvent.findMany({
    where: {
      startDate: {
        gte: now,
        lte: thirtyMinutesFromNow
      },
      notificationSent: false,
      status: 'scheduled'
    },
    include: { user: true }
  });

  for (const event of upcomingEvents) {
    await sendNotification(event.userId, {
      title: `Reminder: ${event.title}`,
      body: `Event akan dimulai dalam ${event.reminderMinutes} menit`,
      type: 'event_reminder',
      data: { eventId: event.id }
    });

    await prisma.calendarEvent.update({
      where: { id: event.id },
      data: { notificationSent: true }
    });
  }
}
```

## Testing

### Example API Calls

```bash
# Get calendar events for current month
GET /calendar/my-events?startDate=2025-11-01T00:00:00Z&endDate=2025-11-30T23:59:59Z

# Get calendar events with filters
GET /calendar/my-events?startDate=2025-11-01T00:00:00Z&endDate=2025-11-30T23:59:59Z&types=guidance_scheduled&types=thesis_deadline

# Get upcoming events (next 7 days)
GET /calendar/upcoming?days=7

# Get event statistics
GET /calendar/statistics
```

## Performance Optimization

1. **Add indexes**: Already included in schema for userId, startDate, type
2. **Cache frequently accessed data**: Use Redis for event statistics
3. **Pagination**: Add pagination for large date ranges
4. **Lazy loading**: Load event details only when clicked

## Security Considerations

1. **User isolation**: Users can only see their own events + shared events
2. **Role-based filtering**: Events filtered by user role
3. **Input validation**: Validate all date inputs
4. **SQL injection**: Use Prisma ORM (prevents injection)
