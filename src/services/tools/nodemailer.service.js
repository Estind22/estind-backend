import nodemailer from "nodemailer";
import dns from "node:dns";

// Force IPv4 for external connections to avoid ENETUNREACH on IPv6-only environments
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * Send email via custom SMTP
 */
export const sendEmailViaSMTP = async ({
  host,
  port,
  username,
  password,
  to,
  subject,
  body,
  senderEmail,
  cc = [],
  bcc = [],
  replyTo
}) => {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user: username,
      pass: password
    },
    // Force IPv4 to avoid ENETUNREACH errors in environments with poor IPv6 support
    family: 4,
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 15000
  });

  const mailOptions = {
    from: senderEmail || username,
    to,
    subject,
    html: body,
    cc,
    bcc,
    replyTo: replyTo || senderEmail || username
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

/**
 * Verify SMTP connection
 */
export const verifySMTPConnection = async ({ host, port, username, password }) => {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: username,
      pass: password
    },
    family: 4,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });

  return await transporter.verify();
};
