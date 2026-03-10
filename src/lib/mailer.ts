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
    subject: `AloPro — Message de ${payload.senderName}`,
    text: `Bonjour ${payload.receiverName},\n\n${payload.senderName} vous a envoye un message via AloPro.\n\nMessage:\n${payload.content}\n\nAcceder a AloPro: ${appUrl}\n\n---\nAloPro · Communication interne professionnelle\n`,
    html: `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>AloPro — Nouveau message</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset */
    * { box-sizing: border-box; }
    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { border: 0; height: auto; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    body { margin: 0 !important; padding: 0 !important; background-color: #f5f5f5; }

    /* Responsive */
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
      .content-padding { padding: 24px 20px !important; }
      .header-padding { padding: 28px 20px !important; }
      .footer-padding { padding: 20px !important; }
      .btn { display: block !important; text-align: center !important; }
      h1 { font-size: 20px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding: 40px 16px;">
    <tr>
      <td align="center">

        <!-- Email card -->
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.08); max-width:600px; width:100%;">

          <!-- Header -->
          <tr>
            <td class="header-padding" style="padding: 32px 40px; background-color: #0f172a;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0 0 20px; font-size:11px; font-weight:700; letter-spacing:0.15em; text-transform:uppercase; color:rgba(255,255,255,0.45);">AloPro</p>
                    <h1 style="margin:0 0 8px; font-size:22px; font-weight:600; line-height:1.3; color:#ffffff;">
                      Nouveau message
                    </h1>
                    <p style="margin:0; font-size:14px; color:rgba(255,255,255,0.55); line-height:1.5;">
                      De la part de <strong style="color:rgba(255,255,255,0.8); font-weight:600;">${safeSenderName}</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider accent -->
          <tr>
            <td style="height:3px; background: linear-gradient(90deg, #3b82f6, #0ea5e9);"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="content-padding" style="padding: 36px 40px;">

              <!-- Greeting -->
              <p style="margin:0 0 24px; font-size:15px; color:#374151; line-height:1.6;">
                Bonjour <strong style="color:#111827;">${safeReceiverName}</strong>,
              </p>
              <p style="margin:0 0 28px; font-size:14px; color:#6b7280; line-height:1.7;">
                Vous avez reçu un nouveau message via la plateforme AloPro.
              </p>

              <!-- Message block -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:#f8fafc; border:1px solid #e2e8f0; border-left: 3px solid #3b82f6; border-radius:8px; padding:20px 24px;">
                    <p style="margin:0 0 12px; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#9ca3af;">Message</p>
                    <p style="margin:0; font-size:15px; line-height:1.8; color:#1f2937; white-space:pre-wrap;">${safeContent}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px; background:#0f172a;">
                    <a href="${appUrl}" class="btn"
                      style="display:inline-block; padding:12px 24px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none; letter-spacing:0.01em; border-radius:8px;">
                      Ouvrir AloPro →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer-padding" style="padding: 20px 40px 28px; border-top:1px solid #f1f5f9; background:#fafafa;">
              <p style="margin:0 0 4px; font-size:12px; font-weight:600; color:#9ca3af;">AloPro · Communication interne</p>
              <p style="margin:0; font-size:11px; color:#d1d5db; line-height:1.6;">
                Cet email a été envoyé automatiquement. Si vous n'êtes pas le destinataire attendu, ignorez ce message.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Email card -->

      </td>
    </tr>
  </table>

</body>
</html>`,
  });

  return info.accepted.includes(payload.receiverEmail);
}