// One-click "Approve" link target (verify_jwt = false; auth is the HMAC token).
// Validates the signed token, flips the submission to verified (turning its
// map pin solid), and returns a simple confirmation page.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// HMAC-SHA256(message, secret) -> lowercase hex
async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function page(title: string, body: string): Response {
  const icon = title.startsWith("Approved") ? "✅" : title.startsWith("Already") ? "☑️" : "⚠️";
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>`
    + `<body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#F5F5F7;margin:0;display:grid;place-items:center;min-height:100vh">`
    + `<div style="background:#fff;border-radius:18px;padding:40px;max-width:440px;margin:20px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.10)">`
    + `<div style="font-size:48px;margin-bottom:12px">${icon}</div>`
    + `<h1 style="font-size:22px;color:#0B1525;margin:0 0 10px">${title}</h1>`
    + `<p style="font-size:14px;color:#6E6E73;line-height:1.55;margin:0">${body}</p>`
    + `</div></body></html>`;
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") || "";
  const token = url.searchParams.get("token") || "";
  if (!id || !token) return page("Invalid link", "This approval link is missing information.");

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: cfg } = await sb.from("app_config").select("value").eq("key", "approve_secret").maybeSingle();
  const secret = cfg?.value;
  if (!secret) return page("Not set up", "Approval isn't configured yet.");

  const expected = await hmacHex(secret, id);
  if (expected.length !== token.length) return page("Invalid link", "This approval link couldn't be verified.");
  let diff = 0; for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  if (diff !== 0) return page("Invalid link", "This approval link couldn't be verified.");

  const { data: sub } = await sb.from("ceis_submissions").select("business_name,status").eq("id", id).maybeSingle();
  if (!sub) return page("Not found", "That submission no longer exists.");
  if (sub.status === "verified") return page("Already verified", `${sub.business_name} is already verified and live on the map.`);

  const { error } = await sb.from("ceis_submissions").update({ status: "verified" }).eq("id", id);
  if (error) return page("Something went wrong", error.message);

  return page("Approved ✓", `${sub.business_name} is now verified — their score is live and pinned on the DollarVote map.`);
});
