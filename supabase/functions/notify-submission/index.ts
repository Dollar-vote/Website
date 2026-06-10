// Called by the DB trigger on each new submission (verify_jwt = false; auth is
// a shared `notify_secret`). Emails the owner a verification alert via Resend
// with a link to the admin Review Console (review → verify → authorize there).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Where the admin Review Console lives.
const REVIEW_URL = "https://app.dollar-vote.com/?screen=admin";

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
  if (!body.secret || !cfg.notify_secret || body.secret !== cfg.notify_secret) return new Response("unauthorized", { status: 401 });
  const id = body.id;
  if (!id) return new Response("missing id", { status: 400 });

  if (!cfg.resend_api_key) return new Response("email not configured", { status: 200 });

  const { data: sub } = await sb.from("ceis_submissions")
    .select("business_name,category,address,score_total,tier,ref_code").eq("id", id).maybeSingle();
  if (!sub) return new Response("not found", { status: 404 });
  const score = Math.round(Number(sub.score_total));

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0B1525">`
    + `<h2 style="margin:0 0 4px">New verification request</h2>`
    + `<p style="color:#6E6E73;margin:0 0 18px;font-size:14px">A business submitted its CEIS™ assessment. Review the details and evidence, then approve or reject it in your console.</p>`
    + `<table style="width:100%;border-collapse:collapse;font-size:14px">`
    + `<tr><td style="padding:7px 0;color:#6E6E73">Business</td><td style="padding:7px 0;text-align:right;font-weight:600">${esc(sub.business_name)}</td></tr>`
    + `<tr><td style="padding:7px 0;color:#6E6E73">Category</td><td style="padding:7px 0;text-align:right">${esc(sub.category || "—")}</td></tr>`
    + `<tr><td style="padding:7px 0;color:#6E6E73">Address</td><td style="padding:7px 0;text-align:right">${esc(sub.address || "—")}</td></tr>`
    + `<tr><td style="padding:7px 0;color:#6E6E73">Projected score</td><td style="padding:7px 0;text-align:right;font-weight:700">${score}/100 · ${esc(sub.tier)}</td></tr>`
    + `<tr><td style="padding:7px 0;color:#6E6E73">Reference</td><td style="padding:7px 0;text-align:right">${esc(sub.ref_code || "—")}</td></tr>`
    + `</table>`
    + `<div style="text-align:center;margin:26px 0 10px">`
    + `<a href="${REVIEW_URL}" style="display:inline-block;background:linear-gradient(135deg,#1A3A8F,#1A8FA0,#7DC832);color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 30px;border-radius:12px">Review request →</a>`
    + `</div>`
    + `<p style="color:#A1A1A6;font-size:12px;text-align:center;margin:14px 0 0">Sign in with your admin account to review the full submission, then Approve (pins their score on the map) or Reject.</p>`
    + `</div>`;

  const from = cfg.email_from || "DollarVote <onboarding@resend.dev>";
  const to = cfg.notify_to || cfg.gmail_user;
  const subject = `New verification request — ${sub.business_name} (${score}/100)`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${cfg.resend_api_key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) return new Response(`resend failed: ${res.status} ${await res.text()}`, { status: 500 });
  return new Response("ok", { status: 200 });
});
