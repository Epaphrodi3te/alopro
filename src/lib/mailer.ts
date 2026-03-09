import nodemailer from "nodemailer";

type MessageNotificationPayload = {
  receiverEmail: string;
  receiverName: string;
  senderName: string;
  content: string;
};

function getMailerConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port,
    user,
    pass,
    from,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function isMailerConfigured() {
  return Boolean(getMailerConfig());
}

export async function sendMessageNotificationEmail(payload: MessageNotificationPayload) {
  const config = getMailerConfig();
  if (!config) {
    return false;
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const safeContent = escapeHtml(payload.content);
  const safeReceiverName = escapeHtml(payload.receiverName);
  const safeSenderName = escapeHtml(payload.senderName);

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: config.from,
    to: payload.receiverEmail,
    subject: `Nouveau message de ${payload.senderName} sur AloPro`,
    text: `Bonjour ${payload.receiverName},\n\nVous avez recu un nouveau message de ${payload.senderName} sur AloPro.\n\nMessage:\n${payload.content}\n\nConnectez-vous pour repondre: ${appUrl}/messages\n`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">Nouveau message sur AloPro</h2>
        <p style="margin: 0 0 10px;">Bonjour ${safeReceiverName},</p>
        <p style="margin: 0 0 14px;">${safeSenderName} vous a envoye un nouveau message.</p>
        <div style="padding: 12px; border: 1px solid #dbe4f0; border-radius: 10px; background: #f8fafc; margin-bottom: 16px;">
          ${safeContent}
        </div>
        <a href="${appUrl}/messages" style="display: inline-block; text-decoration: none; background: #0f172a; color: #fff; padding: 10px 14px; border-radius: 8px; font-weight: 700;">
          Ouvrir ma messagerie
        </a>
      </div>
    `,
  });

  return true;
}
