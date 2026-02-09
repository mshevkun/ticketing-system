import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "onboarding@resend.dev";

/** Resend limit: 2 requests/second. Delay between sends to avoid 429. */
const RATE_LIMIT_DELAY_MS = 550;

/**
 * Send multiple emails sequentially with rate-limit delay to stay under Resend's 2 req/sec.
 */
export async function sendEmailsWithRateLimit(
  items: Array<{ to: string; subject: string; html: string }>
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS));
    await sendEmail(items[i]).catch((e) =>
      console.error("[email] Rate-limited send failed:", e)
    );
  }
}

/**
 * Send an email via Resend. No-op if RESEND_API_KEY is not set.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set, skipping email to", to);
    return { ok: false, error: "RESEND_API_KEY not set" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email] Exception:", msg);
    return { ok: false, error: msg };
  }
}
