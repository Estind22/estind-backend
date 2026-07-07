import { google } from "googleapis";
import { v4 as uuidv4 } from "uuid";

/**
 * Create Google Calendar event with Meet link
 */
export const createGoogleCalendarEvent = async ({
  oauthClient,
  title,
  description,
  startTime,
  endTime,
  attendees = []
}) => {
  const calendar = google.calendar({
    version: "v3",
    auth: oauthClient
  });

  const event = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    requestBody: {
      summary: title,
      description,
      start: {
        dateTime: startTime,
        timeZone: "Asia/Kolkata"
      },
      end: {
        dateTime: endTime,
        timeZone: "Asia/Kolkata"
      },
      attendees: attendees.map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: uuidv4(),
          conferenceSolutionKey: {
            type: "hangoutsMeet"
          }
        }
      },
      reminders: {
        useDefault: true
      }
    }
  });

    // console.log("Event Created: ", event);
    
    return event?.data;
//   return {
//     eventId: event.data.id,
//     meetLink: event.data.hangoutLink,
//     calendarLink: event.data.htmlLink
//   };
};

/**
 * Send email using Gmail API
 * Mail will be sent FROM the OAuth-connected Google account
 */
export const sendGmail = async ({
  oauthClient,
  to,
  subject,
  body,
  cc = [],
  bcc = [],
  replyTo // optional (employee email)
}) => {
  const gmail = google.gmail({
    version: "v1",
    auth: oauthClient
  });

  if (!to || !subject || !body) {
    throw new Error("to, subject and body are required");
  }

  // Build raw email
  const emailLines = [
    `To: ${Array.isArray(to) ? to.join(", ") : to}`,
    cc.length ? `Cc: ${cc.join(", ")}` : "",
    bcc.length ? `Bcc: ${bcc.join(", ")}` : "",
    replyTo ? `Reply-To: ${replyTo}` : "",
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${subject}`,
    "",
    body
  ].filter(Boolean);

  const rawMessage = Buffer
    .from(emailLines.join("\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: rawMessage
    }
  });

  return response.data;
};

/**
 * Send ONE email to MULTIPLE recipients using BCC (single API call)
 * Gmail-compatible implementation
 */
export const sendBulkGmailBCC = async ({
  oauthClient,
  recipients = [],
  subject,
  body,
  replyTo,
  fromEmail // 👈 OAuth-connected company email
}) => {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error("At least one recipient is required");
  }

  if (!subject || !body) {
    throw new Error("subject and body are required");
  }

  const gmail = google.gmail({
    version: "v1",
    auth: oauthClient
  });

  const emailLines = [
    `To: ${fromEmail}`,                 // ✅ MUST be a real email
    `Bcc: ${recipients.join(", ")}`,    // ✅ Hidden recipients
    replyTo ? `Reply-To: ${replyTo}` : "",
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    `Subject: ${subject}`,
    "",
    body
  ].filter(Boolean);

  const rawMessage = Buffer.from(emailLines.join("\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: rawMessage }
  });

  return response.data;
};
