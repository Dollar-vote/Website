// Called by the DB trigger on each new submission (verify_jwt = false; auth is
// a shared `notify_secret`). Emails the verification request to the owner via
// Gmail SMTP with a secure one-click Approve link.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

Deno.serve(async (req) => {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: rows } = await sb.from("app_config").select("key,value");
  const cfg: Record<string, string> = {};
  for (const r of rows ?? []) cfg[r.key] = r.value;

  let body: { id?: string; secret?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  if (!body.secret || !cfg.notify_secret || body.secret !== cfg.notify_secret) {
    return new Response("unauthorized", { status: 401 });
  }
  const id = body.id;
  if (!id) return new Response("missing id", { status: 400 });

  if (!cfg.gmail_user || !cfg.gmail_app_password) {
    return new Response("email not configured", { status: 200 });
  }

  const { data: sub } = await sb.from("ceis_submissions")
    .select("business_name,category,address,score_total,tier,ref_code,status")
    .eq("id", id).maybeSingle();
  if (!sub) return new Response("not found", { status: 404 });

  const token = await hmacHex(cfg.approve_secret, id);
  const approveUrl = `${SUPABASE_URL}/functions/v1/approve-submission?id=${encodeURIComponent(id)}&token=${token}`;
  const score = Math.round(Number(sub.score_total));

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0B1525">`
    + `<h2 style="margin:0 0 4px">New verification request</h2>`
    + `<p style="color:#6E6E73;margin:0 0 18px;font-size:14px">A business submitted its CEIS™ assessment and is waiting for your approval.</p>`
    + `<table style="width:100%;border-collapse:collapse;font-size:14px">`
    + `<tr><td style="padding:7px 0;color:#6E6E73">Business</td><td style="padding:7px 0;text-align:right;font-weight:600">${esc(sub.business_name)}</td></tr>`
    + `<tr><td style="padding:7px 0;color:#6E6E73">Category</td><td style="padding:7px 0;text-align:right">${esc(sub.category || "—")}</td></tr>`
    + `<tr><td style="padding:7px 0;color:#6E6E73">Address</td><td style="padding:7px 0;text-align:right">${esc(sub.address || "—")}</td></tr>`
    + `<tr><td style="padding:7px 0;color:#6E6E73">Projected score</td><td style="padding:7px 0;text-align:right;font-weight:700">${score}/100 · ${esc(sub.tier)}</td></tr>`
    + `<tr><td style="padding:7px 0;color:#6E6E73">Reference</td><td style="padding:7px 0;text-align:right">${esc(sub.ref_code || "—")}</td></tr>`
    + `</table>`
    + `<div style="text-align:center;margin:26px 0 10px">`
    + `<a href="${approveUrl}" style="display:inline-block;background:linear-gradient(135deg,#1A3A8F,#1A8FA0,#7DC832);color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 30px;border-radius:12px">✓ Approve &amp; publish</a>`
    + `</div>`
    + `<p style="color:#A1A1A6;font-size:12px;text-align:center;margin:14px 0 0">Approving turns their map pin from faded to solid. If you don't recognize this business, simply ignore this email — it stays pending.</p>`
    + `</div>`;

  try {
    const client = new SMTPClient({
      connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: cfg.gmail_user, password: cfg.gmail_app_password } },
    });
    await client.send({
      from: `DollarVote <${cfg.gmail_user}>`,
      to: cfg.notify_to || cfg.gmail_user,
      subject: `New verification request — ${sub.business_name} (${score}/100)`,
      html,
    });
    await client.close();
  } catch (e) {
    return new Response(`email error: ${e instanceof Error ? e.message : String(e)}`, { status: 500 });
  }
  return new Response("ok", { status: 200 });
});
