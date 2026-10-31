import { Injectable } from '@nestjs/common';

export interface CalendarEventInput {
  uid: string;
  sequence?: number;
  method?: 'REQUEST' | 'CANCEL';
  status?: 'CONFIRMED' | 'CANCELLED';
  summary: string;
  description?: string;
  location: string;
  startDate: Date;
  endDate: Date;
  organizer: {
    name: string;
    email: string;
  };
  attendees: Array<{
    name?: string;
    email: string;
  }>;
}

@Injectable()
export class CalendarInvitationService {
  /**
   * Format JS Date to iCalendar UTC string format: YYYYMMDDTHHMMSSZ
   */
  private formatDateToICS(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  /**
   * Escape special text characters according to RFC 5545 section 3.3.11
   */
  private escapeICSText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  /**
   * Generate RFC 5545 (iCalendar) and RFC 5546 (iTIP) compliant ICS payload
   */
  generateICSPayload(input: CalendarEventInput): string {
    const method = input.method || 'REQUEST';
    const sequence = input.sequence ?? 0;
    const status = input.status || (method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED');
    const dtStamp = this.formatDateToICS(new Date());
    const dtStart = this.formatDateToICS(input.startDate);
    const dtEnd = this.formatDateToICS(input.endDate);

    const escSummary = this.escapeICSText(input.summary);
    const escDescription = this.escapeICSText(
      `${input.description ? `${input.description}\n\n` : ''}Join Meeting: ${input.location}`
    );
    const escLocation = this.escapeICSText(input.location);
    const escOrganizerName = this.escapeICSText(input.organizer.name || input.organizer.email);

    const attendeeLines = input.attendees
      .filter(a => a.email && a.email.trim().length > 0)
      .map(a => {
        const cn = this.escapeICSText(a.name || a.email.split('@')[0]);
        return `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${cn}:mailto:${a.email.trim()}`;
      })
      .join('\r\n');

    const lines = [
      'BEGIN:VCALENDAR',
      'PRODID:-//IntoAI Platform//Meeting Schedule System//EN',
      'VERSION:2.0',
      'CALSCALE:GREGORIAN',
      `METHOD:${method}`,
      'BEGIN:VEVENT',
      `UID:${input.uid}`,
      `SEQUENCE:${sequence}`,
      `STATUS:${status}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escSummary}`,
      `DESCRIPTION:${escDescription}`,
      `LOCATION:${escLocation}`,
      `ORGANIZER;CN=${escOrganizerName}:mailto:${input.organizer.email}`,
    ];

    if (attendeeLines) {
      lines.push(attendeeLines);
    }

    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
  }
}
