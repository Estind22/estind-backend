import axios from "axios";

export const sendOutlookMail = async ({
  accessToken,
  to,
  subject,
  body,
  cc = [],
  bcc = [],
  replyTo
}) => {
  if (!to || !subject || !body) {
    throw new Error("to, subject and body are required");
  }

  const normalize = (emails) =>
    emails.map(email => ({
      emailAddress: { address: email }
    }));

  const mailResponse = await axios.post(
    "https://graph.microsoft.com/v1.0/me/sendMail",
    {
      message: {
        subject,
        body: {
          contentType: "HTML",
          content: body
        },
        toRecipients: normalize([].concat(to)),
        ccRecipients: normalize(cc),
        bccRecipients: normalize(bcc),
        replyTo: replyTo
          ? [{ emailAddress: { address: replyTo } }]
          : []
      },
      saveToSentItems: true
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    }
  );
  return mailResponse;
};
