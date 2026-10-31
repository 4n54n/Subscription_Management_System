import { CalendarInvitationService } from './calendar-invitation.service';

export function validateCalendarInvitationGeneration() {
  const service = new CalendarInvitationService();
  const startDate = new Date('2026-08-01T10:00:00Z');
  const endDate = new Date('2026-08-01T11:00:00Z');

  const ics = service.generateICSPayload({
    uid: 'meeting-test-123@intoai.app',
    sequence: 0,
    method: 'REQUEST',
    status: 'CONFIRMED',
    summary: 'Quarterly Roadmap Sync',
    description: 'Review roadmap & laboratory features',
    location: 'https://app.intoai.com/join/test-token',
    startDate,
    endDate,
    organizer: {
      name: 'Jane Host',
      email: 'jane@company.com',
    },
    attendees: [
      { name: 'John Doe', email: 'john@company.com' },
      { name: 'Alice Smith', email: 'alice@company.com' },
    ],
  });

  if (
    !ics.includes('BEGIN:VCALENDAR') ||
    !ics.includes('METHOD:REQUEST') ||
    !ics.includes('UID:meeting-test-123@intoai.app') ||
    !ics.includes('SEQUENCE:0')
  ) {
    throw new Error('iCalendar payload generation validation failed');
  }

  return true;
}
