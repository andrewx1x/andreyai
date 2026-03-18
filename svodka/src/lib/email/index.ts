import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Сводка <alerts@svodka.app>";

export async function sendAlertEmail(
  to: string,
  subject: string,
  html: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[Email] RESEND_API_KEY not set, skipping:", subject);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("[Email] Failed to send:", error);
  }
}
