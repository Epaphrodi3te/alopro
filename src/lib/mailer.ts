import nodemailer from "nodemailer";

type MessageNotificationPayload = {
  receiverEmail: string;
  receiverName: string;
  senderName: string;
  content: string;
};

function getMailerConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim();

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

  const info = await transporter.sendMail({
    from: config.from,
    to: payload.receiverEmail,
    subject: `AloPro | Nouveau message de ${payload.senderName}`,
    text: `Bonjour ${payload.receiverName},\n\n${payload.senderName} vous a envoye un email via AloPro.\n\nMessage:\n${payload.content}\n\nLien utile: ${appUrl}\n\nAloPro\nCommunication interne professionnelle\n`,
    html: `
      <div style="margin:0; padding:32px 16px; background:#f4f7fb; font-family:Arial, sans-serif; color:#0f172a;">
        <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #dbe4f0; border-radius:20px; overflow:hidden; box-shadow:0 20px 48px -30px rgba(15,23,42,0.35);">
          <div style="padding:28px 28px 22px; background:linear-gradient(135deg,#0f172a,#1e3a8a 55%,#0ea5e9); color:#ffffff;">
            <div style="font-size:12px; letter-spacing:0.18em; text-transform:uppercase; opacity:0.8; font-weight:700;">AloPro</div>
            <h1 style="margin:12px 0 0; font-size:24px; line-height:1.2;">Nouveau message professionnel</h1>
            <p style="margin:10px 0 0; font-size:14px; line-height:1.6; color:rgba(255,255,255,0.86);">
              Un responsable vous a contacte depuis la plateforme AloPro.
            </p>
          </div>

          <div style="padding:28px;">
            <p style="margin:0 0 10px; font-size:15px; color:#334155;">Bonjour ${safeReceiverName},</p>
            <p style="margin:0 0 18px; font-size:15px; line-height:1.7; color:#334155;">
              ${safeSenderName} vous a adresse le message ci-dessous depuis l'espace d'administration AloPro.
            </p>

            <div style="padding:18px; border:1px solid #dbe4f0; border-radius:16px; background:linear-gradient(180deg,#f8fbff,#f3f8ff); margin-bottom:22px;">
              <div style="margin:0 0 10px; font-size:12px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#64748b;">Contenu du message</div>
              <div style="font-size:15px; line-height:1.8; color:#0f172a; white-space:pre-wrap;">${safeContent}</div>
            </div>

            <a href="${appUrl}" style="display:inline-block; text-decoration:none; background:linear-gradient(120deg,#0f172a,#1e3a8a); color:#ffffff; padding:12px 18px; border-radius:12px; font-weight:700; font-size:14px;">
              Acceder a AloPro
            </a>
          </div>

          <div style="padding:18px 28px 24px; border-top:1px solid #e2e8f0; background:#f8fafc;">
            <p style="margin:0 0 8px; font-size:13px; font-weight:700; color:#0f172a;">AloPro</p>
            <p style="margin:0; font-size:12px; line-height:1.7; color:#64748b;">
              Communication interne professionnelle.<br>
              Cet email a ete envoye automatiquement depuis la plateforme AloPro.<br>
              Si vous n'etes pas le bon destinataire, ignorez simplement ce message.
            </p>
          </div>
        </div>
      </div>
    `,
  });

  return info.accepted.includes(payload.receiverEmail);
}
