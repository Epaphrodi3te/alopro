const nodemailer = require("nodemailer");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function main() {
  const host = requiredEnv("SMTP_HOST");
  const port = Number(requiredEnv("SMTP_PORT"));
  const user = requiredEnv("SMTP_USER");
  const pass = requiredEnv("SMTP_PASS");
  const from = requiredEnv("SMTP_FROM");
  const to = (process.argv[2] || process.env.SMTP_USER || "").trim();

  if (!to) {
    throw new Error("Usage: npm run mail:test -- recipient@example.com");
  }

  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    tls: {
      servername: host,
    },
  });

  console.log(`[mail:test] Verifying SMTP ${host}:${port} secure=${secure} ...`);
  await transporter.verify();
  console.log("[mail:test] SMTP verify OK");

  const info = await transporter.sendMail({
    from,
    to,
    subject: "AloPro SMTP test",
    text: "Test SMTP AloPro: votre configuration email fonctionne.",
  });

  const accepted = info.accepted?.map(String) ?? [];
  const rejected = info.rejected?.map(String) ?? [];

  console.log("[mail:test] Message sent");
  console.log("[mail:test] Message-ID:", info.messageId);
  console.log("[mail:test] Accepted:", accepted.join(", ") || "(none)");
  console.log("[mail:test] Rejected:", rejected.join(", ") || "(none)");

  if (!accepted.includes(to)) {
    throw new Error(`SMTP server did not accept recipient: ${to}`);
  }
}

main().catch((error) => {
  console.error("[mail:test] ERROR:", error?.message ?? error);
  process.exit(1);
});
