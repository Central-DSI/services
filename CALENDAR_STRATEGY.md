# Calendar Implementation Strategy

## 📋 Strategi: Auto-Generation (Tanpa Cron Job)

Calendar events **dibuat otomatis dari data yang sudah ada** di database, bukan disimpan sebagai tabel terpisah. Ini lebih efisien dan konsisten dengan single source of truth.

## 🎯 Bagaimana Cara Kerja

### 1. **Events Generated On-The-Fly**

Saat user membuka calendar, backend akan:
- Query data dari tabel yang relevan (`thesis_guidances`, `thesis_seminars`, `thesis_defences`)
- Transform data tersebut menjadi format calendar event
- Return sebagai response API

**Keuntungan:**
- ✅ Tidak ada duplikasi data
- ✅ Always up-to-date (real-time)
- ✅ Tidak perlu cron job untuk sync
- ✅ Lebih mudah maintenance

### 2. **Event Sources (Role-Based)**

#### **Student Events:**
```javascript
// 1. Thesis Guidance (Bimbingan)
Source: thesis_guidances table
Trigger: Saat mahasiswa request bimbingan
Event Type: guidance_scheduled, guidance_completed
Participants: Student + Supervisor

// 2. Thesis Seminar
Source: thesis_seminars table
Trigger: Saat seminar dijadwalkan
Event Type: seminar_scheduled
Participants: Student + Examiners + Audiences

// 3. Thesis Defence (Sidang)
Source: thesis_defences table
Trigger: Saat sidang dijadwalkan
Event Type: defense_scheduled
Participants: Student + Examiners

// 4. Internship Guidance
Source: internship_guidance_schedules table
Trigger: Saat request bimbingan KP
Event Type: guidance_scheduled
Participants: Student + Supervisor
```

#### **Lecturer Events:**
```javascript
// 1. Student Guidance Requests
Source: thesis_guidances WHERE supervisorId = lecturerId
Event Type: guidance_request, student_guidance
Participants: Lecturer + Student

// 2. Seminar as Examiner
Source: thesis_seminar_audiences WHERE validatedBy = lecturerId
Event Type: seminar_as_examiner
Participants: Lecturer + Student + Other Examiners

// 3. Defence as Examiner
Source: thesis_defence_scores WHERE scoredBy = lecturerId
Event Type: defense_as_examiner
Participants: Lecturer + Student + Other Examiners
```

#### **Admin Events:**
```javascript
// 1. Academic Year Events
Source: academic_years table
Event Type: academic_year_start, academic_year_end
Broadcast: All users

// 2. Registration Period
Source: academic_years table (startDate - 1 month)
Event Type: registration_period
Broadcast: All students

// 3. System Maintenance (future)
Source: maintenance_schedules table (jika ada)
Event Type: system_maintenance
Broadcast: All users
```

## 🔄 Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     USER OPENS CALENDAR                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend: getMyCalendarEventsAPI(startDate, endDate)       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend: GET /calendar/my-events                            │
│  - Get user role (student/lecturer/admin)                   │
│  - Get user ID                                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Service Layer: Generate Events from Existing Data          │
│                                                              │
│  IF role === 'student':                                      │
│    - Query thesis_guidances WHERE thesis.studentId          │
│    - Query thesis_seminars WHERE thesis.studentId           │
│    - Query thesis_defences WHERE thesis.studentId           │
│    - Query internship_guidance_schedules                    │
│                                                              │
│  IF role === 'lecturer':                                     │
│    - Query thesis_guidances WHERE supervisorId              │
│    - Query thesis_seminar_audiences WHERE validatedBy       │
│    - Query thesis_defence_scores WHERE scoredBy             │
│                                                              │
│  IF role === 'admin':                                        │
│    - Query academic_years                                    │
│    - System-wide events                                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Transform to Calendar Event Format:                         │
│  {                                                           │
│    id: 'guidance-{id}',                                      │
│    title: 'Bimbingan - Dosen Name',                         │
│    type: 'guidance_scheduled',                              │
│    startDate: schedule.guidanceDate,                        │
│    endDate: schedule.guidanceDate,                          │
│    participants: [...],                                      │
│    color: '#3b82f6'                                         │
│  }                                                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Return events array to Frontend                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  FullCalendar displays events                                │
└─────────────────────────────────────────────────────────────┘
```

## 📝 Implementation Example

### Skenario 1: Mahasiswa Request Bimbingan

```javascript
// 1. Mahasiswa create guidance request
POST /thesis-guidance
{
  "thesisId": "xxx",
  "supervisorId": "yyy",
  "scheduleId": "zzz", // Links to thesis_guidance_schedules
  "studentNotes": "Ingin diskusi hasil penelitian"
}

// 2. Data tersimpan di thesis_guidances table
// Status: 'scheduled'

// 3. Saat mahasiswa/dosen buka calendar
GET /calendar/my-events?startDate=2025-11-01&endDate=2025-11-30

// 4. Backend query thesis_guidances dan transform jadi event
// 5. Return event ke frontend
// 6. Calendar menampilkan event
```

**Tidak perlu tabel `calendar_events` terpisah!**

### Skenario 2: Dosen Terima Notifikasi

```javascript
// 1. Saat guidance dibuat, kirim notifikasi real-time (WebSocket/FCM)
// 2. Dosen buka calendar
GET /calendar/my-events

// 3. Backend query guidances WHERE supervisorId = dosenId
// 4. Transform jadi event dengan type: 'guidance_request'
// 5. Calendar menampilkan event dengan warna berbeda
```

## 🚀 API Endpoints

### 1. Get My Calendar Events
```
GET /calendar/my-events
Query Params:
  - startDate: ISO date (required)
  - endDate: ISO date (required)
  - types: comma-separated event types (optional)
  - status: event status filter (optional)

Response:
{
  "success": true,
  "events": [
    {
      "id": "guidance-uuid",
      "title": "Bimbingan - Dr. Nama Dosen",
      "description": "Diskusi progress penelitian",
      "type": "guidance_scheduled",
      "status": "scheduled",
      "startDate": "2025-11-10T10:00:00Z",
      "endDate": "2025-11-10T11:00:00Z",
      "userId": "user-uuid",
      "userRole": "student",
      "relatedId": "guidance-uuid",
      "relatedType": "thesis_guidance",
      "participants": [
        {
          "userId": "lecturer-uuid",
          "name": "Dr. Nama Dosen",
          "role": "lecturer"
        }
      ],
      "location": null,
      "meetingLink": "https://zoom.us/j/xxx",
      "reminderMinutes": 30,
      "color": "#3b82f6"
    }
  ]
}
```

### 2. Get Upcoming Events
```
GET /calendar/upcoming?days=7

Returns events for next N days
```

### 3. Get Event Statistics
```
GET /calendar/statistics

Response:
{
  "success": true,
  "data": {
    "todayEvents": 2,
    "upcomingEvents": 5,
    "completedThisMonth": 8,
    "pendingActions": 3
  }
}
```

## 🎨 Event Type Colors

```javascript
const EVENT_COLORS = {
  // Student events
  guidance_scheduled: '#3b82f6',    // Blue
  guidance_completed: '#10b981',    // Green
  thesis_deadline: '#ef4444',       // Red
  seminar_scheduled: '#8b5cf6',     // Purple
  defense_scheduled: '#f59e0b',     // Amber
  
  // Lecturer events
  guidance_request: '#06b6d4',      // Cyan
  student_guidance: '#14b8a6',      // Teal
  seminar_as_examiner: '#6366f1',   // Indigo
  defense_as_examiner: '#f97316',   // Orange
  
  // Common events
  meeting: '#64748b',               // Slate
  holiday: '#dc2626',               // Red-600
};
```

## ⚙️ Configuration

### React Query Setup (Frontend)
```typescript
// Automatic refetch every 2 minutes
const { data } = useQuery({
  queryKey: ['calendar-events', filterType],
  queryFn: () => getMyCalendarEventsAPI({...}),
  staleTime: 2 * 60 * 1000,  // 2 minutes
  refetchInterval: 5 * 60 * 1000,  // 5 minutes
});
```

### Service Configuration (Backend)
```javascript
// Default reminder time: 30 minutes before event
const DEFAULT_REMINDER_MINUTES = 30;

// Guidance events: 30 min reminder
// Seminar/Defence: 60 min reminder
```

## 🔔 Notifikasi (Optional - Future Enhancement)

Jika ingin notifikasi reminder otomatis, bisa pakai **cron job** yang:
1. Run setiap 5 menit
2. Query upcoming events (next 30-60 minutes)
3. Kirim FCM push notification
4. Mark as notified

```javascript
// cron job: */5 * * * * (every 5 minutes)
import cron from 'node-cron';

cron.schedule('*/5 * * * *', async () => {
  // Find events in next 30 minutes that haven't sent notification
  // For now, skip this - notifications sent when guidance created
});
```

**Tapi untuk MVP, notifikasi bisa dikirim langsung saat event dibuat.**

## 📊 Performance Considerations

1. **Indexing**: Pastikan ada index pada:
   - `thesis_guidances.supervisorId`
   - `thesis_guidances.schedule.guidanceDate`
   - `thesis_seminars.schedule.startTime`
   - `thesis_defences.schedule.startTime`

2. **Pagination**: Untuk view list, bisa tambahkan pagination

3. **Caching**: React Query auto-cache response 2-5 menit

4. **Lazy Loading**: Load hanya events dalam range yang visible

## 🎯 Testing

```bash
# 1. Test get my events
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/calendar/my-events?startDate=2025-11-01&endDate=2025-11-30"

# 2. Test upcoming events
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/calendar/upcoming?days=7"

# 3. Test statistics
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/calendar/statistics"
```

## 📝 Next Steps

1. ✅ Backend API created (service, controller, routes)
2. ⏳ Test dengan data real
3. ⏳ Tambahkan event types lainnya (internship, academic year)
4. ⏳ Implement notification system (optional)
5. ⏳ Add event detail view
6. ⏳ Add manual event creation (meeting, holiday)

## 🔗 Integration Points

### Saat Create Guidance:
```javascript
// Di guidance service
async function createGuidance(data) {
  const guidance = await prisma.thesisGuidance.create({...});
  
  // Send notification to both student and lecturer
  await sendNotification({
    userId: guidance.thesis.student.userId,
    title: 'Bimbingan Dijadwalkan',
    message: `Bimbingan dengan ${guidance.supervisor.user.fullName}`,
  });
  
  // No need to create separate calendar event!
  // Calendar akan auto-generate dari data ini
  
  return guidance;
}
```

## 📌 Summary

**Approach: Generate events on-the-fly dari existing data**

✅ **Pros:**
- Single source of truth
- Always up-to-date
- No data duplication
- Easier to maintain
- No sync issues

❌ **Cons:**
- Sedikit lebih lambat (tapi di-cache React Query)
- Tidak bisa create "custom" events mudah (tapi bisa ditambahkan tabel terpisah untuk ini)

**Untuk 90% use case, approach ini lebih baik daripada Cron + separate calendar_events table.**
