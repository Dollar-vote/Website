import { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { supabase } from "./supabaseClient";

// Mapbox public token (safe in browser). When absent, the map falls back to the mockup.
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// ─────────────────────────────────────────────
// LOGO COLOR SYSTEM (matching brand)
// ─────────────────────────────────────────────
const C = {
  blue:    "#1A3A8F",
  blueMid: "#1A5BA0",
  teal:    "#1A8FA0",
  tealLt:  "#22B5CC",
  lime:    "#7DC832",
  limeLt:  "#96E040",
  ink:     "#0B1525",
  dark:    "#1D1D1F",
  mid:     "#6E6E73",
  soft:    "#A1A1A6",
  border:  "#E8E8ED",
  bg:      "#F5F5F7",
  white:   "#FFFFFF",
  ltBlue:  "#EBF0FF",
  ltTeal:  "#E5F5F8",
  ltLime:  "#F0FAEB",
  ltGold:  "#FFF8E8",
  red:     "#C0392B",
  green:   "#1A8F45",
  amber:   "#E8A820",
  basic:   "#8B5CF6", // self-reported (non-verified, free) — a distinct violet
};

// Apple-style typography: real San Francisco on macOS, Inter as the web fallback.
// `serif` is kept as the key name for headings/display, but now points to the
// clean Apple display stack (no more serif).
const F = {
  serif: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Helvetica Neue", sans-serif',
  body:  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Helvetica Neue", sans-serif',
  mono:  '"SF Mono", ui-monospace, SFMono-Regular, Menlo, "Geist Mono", monospace',
};

const GRAD = "linear-gradient(135deg, #1A3A8F 0%, #1A8FA0 52%, #7DC832 100%)";

// ─────────────────────────────────────────────
// GLASSMORPHISM HELPERS
// Frosted, translucent surfaces. Spread into a style object: { ...glass() }
// ─────────────────────────────────────────────
function glass(alpha = 0.6) {
  return {
    background: `rgba(255,255,255,${alpha})`,
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.55)",
    boxShadow: "0 8px 32px rgba(15,21,37,0.10)",
  };
}
function glassDark(alpha = 0.45) {
  return {
    background: `rgba(11,21,37,${alpha})`,
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.12)",
  };
}

// ─────────────────────────────────────────────
// SHARED UTILITIES
// ─────────────────────────────────────────────
function scoreColor(s) {
  if (s >= 90) return C.green;
  if (s >= 75) return C.teal;
  if (s >= 60) return C.amber;
  return "#C87020";
}

// CEIS tiers (ascending). Used to compute "points to the next tier".
const NEXT_TIERS = [
  { min: 40, name: "Growing Intentionally" },
  { min: 60, name: "Solid Commitment" },
  { min: 75, name: "Above & Beyond" },
  { min: 90, name: "Community Champion" },
];
// The next tier above the current total, with the point gap to reach it (null = already top tier).
function nextTierUp(total) {
  for (const t of NEXT_TIERS) {
    if (total < t.min) return { ...t, gap: Math.max(1, Math.ceil(t.min - total)) };
  }
  return null;
}

// Per-pillar improvement ideas, tied to real CEIS factors. Shown weakest-pillar-first.
const PILLAR_META = {
  loc: { label: "Locality",       max: 40, color: C.blue },
  sus: { label: "Sustainability", max: 30, color: C.lime },
  trn: { label: "Transparency",   max: 30, color: C.teal },
};
const IMPROVE_TIPS = {
  loc: [
    ["Source more inventory from local suppliers", "+4 pts"],
    ["Bank with a local credit union or community bank", "+3 pts"],
    ["Hire from your own neighborhood", "+3 pts"],
    ["Verify independent local ownership", "+2 pts"],
  ],
  sus: [
    ["Document a recycling or composting program", "+3 pts"],
    ["Join 1% for the Planet", "+3 pts"],
    ["Switch to LED lighting or renewable energy", "+2 pts"],
    ["Cut single-use packaging", "+2 pts"],
  ],
  trn: [
    ["Publish your wage floor / pay a living wage", "+3 pts"],
    ["Upload documents that verify your claims", "+3 pts"],
    ["Share an ownership & supplier disclosure", "+2 pts"],
    ["Add a public community-impact statement", "+2 pts"],
  ],
};

// Rank the three pillars by how much headroom is left (most room to grow first).
function pillarHeadroom(sub) {
  const vals = {
    loc: Number(sub?.score_loc) || 0,
    sus: Number(sub?.score_sus) || 0,
    trn: Number(sub?.score_trn) || 0,
  };
  return Object.keys(PILLAR_META)
    .map((k) => ({ key: k, ...PILLAR_META[k], value: vals[k], room: PILLAR_META[k].max - vals[k] }))
    .sort((a, b) => b.room - a.room);
}

// Sample biz data — used as a fallback if the database isn't reachable.
const SAMPLE_BIZ = [
  { id:1, name:"Maria's Soap Studio",     cat:"Retail",     score:91, loc:36, sus:27, trn:28, hood:"Eastern Market", verified:true,  emoji:"🧼", local:8.30, distance:"0.4 mi" },
  { id:2, name:"Rootwork Kitchen",        cat:"Restaurant", score:87, loc:34, sus:26, trn:27, hood:"Corktown",       verified:true,  emoji:"🍽️", local:7.90, distance:"0.6 mi" },
  { id:3, name:"Ironwood Coffee Co.",     cat:"Café",       score:88, loc:35, sus:26, trn:27, hood:"Midtown",        verified:true,  emoji:"☕", local:8.10, distance:"0.8 mi" },
  { id:4, name:"Harbor & Grain Bakery",   cat:"Bakery",     score:85, loc:33, sus:25, trn:27, hood:"Hamtramck",      verified:true,  emoji:"🥐", local:7.50, distance:"1.2 mi" },
  { id:5, name:"Confluence Yoga",         cat:"Wellness",   score:88, loc:35, sus:26, trn:27, hood:"West Village",   verified:true,  emoji:"🧘", local:7.80, distance:"1.5 mi" },
  { id:6, name:"Detroit Fix-It Co.",      cat:"Home Svc",   score:79, loc:31, sus:23, trn:25, hood:"East English Vil",verified:false, emoji:"🔧", local:7.10, distance:"2.1 mi" },
];

// ─────────────────────────────────────────────
// LOCATION — detect the user's area (geolocation), scoped to North America.
// ─────────────────────────────────────────────
// Rough North America bounding box (lat/lng). Outside this → treated as "unsupported region".
const NA_BOUNDS = { latMin: 14, latMax: 72, lngMin: -169, lngMax: -52 };
function inNorthAmerica(lat, lng) {
  return lat >= NA_BOUNDS.latMin && lat <= NA_BOUNDS.latMax && lng >= NA_BOUNDS.lngMin && lng <= NA_BOUNDS.lngMax;
}
// Distance between two points in miles (haversine).
function milesBetween(la1, lo1, la2, lo2) {
  const R = 3958.8, toR = Math.PI / 180;
  const dLa = (la2 - la1) * toR, dLo = (lo2 - lo1) * toR;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * toR) * Math.cos(la2 * toR) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// useGeo — asks the browser for location, reverse-geocodes a city label via Mapbox.
// phases: "prompt" (asking) | "ready" (have coords) | "denied" (need manual entry) | "outside" (not in NA)
function useGeo() {
  const [geo, setGeo] = useState({ phase: "prompt", lat: null, lng: null, label: "" });

  const resolveLabel = async (lat, lng) => {
    let label = "Your area";
    try {
      if (MAPBOX_TOKEN) {
        const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,region&access_token=${MAPBOX_TOKEN}`);
        const j = await r.json();
        const place = j.features?.find(f => f.place_type?.includes("place"));
        const region = j.features?.find(f => f.place_type?.includes("region"));
        const short = region?.properties?.short_code?.split("-")?.[1];
        label = [place?.text, short || region?.text].filter(Boolean).join(", ") || label;
      }
    } catch { /* keep default */ }
    return label;
  };

  const useCoords = async (lat, lng) => {
    if (!inNorthAmerica(lat, lng)) { setGeo({ phase: "outside", lat, lng, label: "Outside North America" }); return; }
    const label = await resolveLabel(lat, lng);
    setGeo({ phase: "ready", lat, lng, label });
  };

  const requestLocation = () => {
    if (!navigator.geolocation) { setGeo(g => ({ ...g, phase: "denied" })); return; }
    setGeo(g => ({ ...g, phase: "prompt" }));
    navigator.geolocation.getCurrentPosition(
      (pos) => useCoords(pos.coords.latitude, pos.coords.longitude),
      () => setGeo(g => ({ ...g, phase: "denied" })),
      { timeout: 8000, maximumAge: 600000 },
    );
  };

  // Manual fallback: user types a ZIP or city → forward-geocode it.
  const setManual = async (text) => {
    if (!text || !MAPBOX_TOKEN) return;
    try {
      const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?country=us,ca,mx&types=place,postcode,region&limit=1&access_token=${MAPBOX_TOKEN}`);
      const j = await r.json();
      const f = j.features?.[0];
      if (f) { await useCoords(f.center[1], f.center[0]); }
    } catch { /* ignore */ }
  };

  useEffect(() => { requestLocation(); }, []); // eslint-disable-line

  return { geo, requestLocation, setManual };
}

// Opens turn-by-turn directions to a business in the user's map app.
// Uses precise coordinates when available; otherwise searches by name + area.
function openDirections(biz) {
  let url;
  if (biz && biz.lat != null && biz.lng != null) {
    const label = encodeURIComponent(biz.name || "Destination");
    url = `https://www.google.com/maps/dir/?api=1&destination=${biz.lat},${biz.lng}&destination_place_id=&travelmode=driving&query=${label}`;
  } else if (biz && biz.name) {
    const q = encodeURIComponent(`${biz.name} ${biz.hood || ""} ${biz.city || ""}`.trim());
    url = `https://www.google.com/maps/search/?api=1&query=${q}`;
  } else {
    return;
  }
  // window.open can be blocked; fall back to navigating the current tab.
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) window.location.href = url;
}

// Map a database row (snake_case columns) to the shape the UI components expect.
function rowToBiz(r) {
  return {
    id: r.id,
    name: r.name,
    cat: r.category,
    score: r.score,
    loc: r.loc, sus: r.sus, trn: r.trn,
    hood: r.neighborhood,
    verified: r.verified,
    basic: r.basic || false,
    emoji: r.emoji || "🏬",
    local: Number(r.local_per_10) || 0,
    distance: r.distance || "",
    lat: r.lat != null ? Number(r.lat) : null,
    lng: r.lng != null ? Number(r.lng) : null,
  };
}

// Loads businesses from Supabase, highest score first.
// Falls back to SAMPLE_BIZ if there's no connection or an error.
function useBusinesses() {
  const [biz, setBiz] = useState(SAMPLE_BIZ);
  const [source, setSource] = useState("sample"); // "sample" | "database"

  useEffect(() => {
    let alive = true;
    if (!supabase) return;
    supabase
      .from("businesses")
      .select("*")
      .order("score", { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return;
        if (!error && data && data.length) {
          setBiz(data.map(rowToBiz));
          setSource("database");
        }
      });
    return () => { alive = false; };
  }, []);

  return { biz, source };
}

// ─────────────────────────────────────────────
// SHARED ATOMS
// ─────────────────────────────────────────────
function ScoreBadge({ score, size = 56 }) {
  const color = scoreColor(score);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `conic-gradient(${color} ${score * 3.6}deg, #E8E8ED 0deg)`,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <div style={{
        width: size - 8, height: size - 8, borderRadius: "50%",
        background: C.white, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontFamily: F.serif, fontSize: size * 0.34, fontWeight: 700, color: color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontFamily: F.mono, fontSize: size * 0.13, color: C.soft }}>/100</span>
      </div>
    </div>
  );
}

function Tag({ children, color = C.teal, bg = "transparent", outline = false }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", fontFamily: F.mono, fontSize: 9.5, fontWeight: 600,
      color: color, background: outline ? bg : `${color}15`,
      border: outline ? `1px solid ${color}40` : "none",
      borderRadius: 50, padding: "3px 9px", letterSpacing: "0.06em", textTransform: "uppercase",
    }}>{children}</span>
  );
}

// Consumer-side bottom tab bar (shared by Home + Impact + Categories)
function ConsumerTabs({ active, go = () => {} }) {
  const tabs = [
    ["🏠", "Home", "consumerHome"],
    ["🗺", "Map", "map"],
    ["💚", "Impact", "impact"],
    ["⭐", "Saved", null],
    ["👤", "You", null],
  ];
  return (
    <div style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", borderTop: "1px solid rgba(255,255,255,0.6)", padding: "8px 12px 16px", display: "flex", justifyContent: "space-around" }}>
      {tabs.map(([ico, lbl, target]) => {
        const on = active === target;
        return (
          <div key={lbl} onClick={() => target && go(target)} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: target ? "pointer" : "default" }}>
            <span style={{ fontSize: 16, opacity: on ? 1 : 0.4 }}>{ico}</span>
            <span style={{ fontFamily: F.mono, fontSize: 8, fontWeight: 700, color: on ? C.blue : C.soft, letterSpacing: "0.06em" }}>{lbl}</span>
          </div>
        );
      })}
    </div>
  );
}

// Business-side bottom tab bar
function BizTabs({ active, go = () => {} }) {
  const tabs = [
    ["📊", "Score", "bizDashboard"],
    ["📈", "Stats", "bizStats"],
    ["🚀", "Improve", "bizImprove"],
    ["⚙️", "Profile", "bizProfile"],
    ["🗺", "Explore", "map"], // exit the dashboard → consumer map + search
  ];
  return (
    <div style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", borderTop: "1px solid rgba(255,255,255,0.6)", padding: "8px 12px 16px", display: "flex", justifyContent: "space-around" }}>
      {tabs.map(([ico, lbl, target]) => {
        const on = active === target;
        return (
          <div key={lbl} onClick={() => target && go(target)} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: target ? "pointer" : "default" }}>
            <span style={{ fontSize: 16, opacity: on ? 1 : 0.4 }}>{ico}</span>
            <span style={{ fontFamily: F.mono, fontSize: 8, fontWeight: 700, color: on ? C.blue : C.soft, letterSpacing: "0.06em" }}>{lbl}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// PHONE FRAME
// ─────────────────────────────────────────────
function Phone({ label, screen, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
      <PhoneFrame>{children}</PhoneFrame>
      {/* Label below */}
      <div style={{ marginTop: 18, textAlign: "center", maxWidth: 290 }}>
        <div style={{ fontFamily: F.mono, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.12em", color: C.lime, marginBottom: 4 }}>{screen}</div>
        <div style={{ fontFamily: F.serif, fontSize: 16, color: C.ink, lineHeight: 1.3 }}>{label}</div>
      </div>
    </div>
  );
}

// Just the device chrome + screen (reused by gallery and prototype)
function PhoneFrame({ children }) {
  return (
    <div style={{
      width: 290, background: C.ink, borderRadius: 38,
      padding: 6, boxShadow: "0 30px 60px rgba(0,0,0,0.18), 0 12px 24px rgba(0,0,0,0.12)",
      position: "relative",
    }}>
      {/* Speaker notch */}
      <div style={{
        position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
        width: 90, height: 22, background: C.ink, borderRadius: 50, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#333" }} />
        <div style={{ width: 30, height: 4, borderRadius: 2, background: "#333" }} />
      </div>
      {/* Screen */}
      <div style={{
        background: C.white, borderRadius: 32, overflow: "hidden",
        width: "100%", height: 600, position: "relative",
      }}>
        {/* Status bar */}
        <div style={{
          height: 36, background: "transparent", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", paddingTop: 8, fontSize: 11, fontFamily: F.mono, fontWeight: 600, color: C.ink,
          position: "relative", zIndex: 50,
        }}>
          <span>9:41</span>
          <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 10 }}>•••</span>
            <span style={{ fontSize: 10 }}>📶</span>
            <span style={{ fontSize: 10 }}>🔋</span>
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// CONSUMER SCREENS
// ═════════════════════════════════════════════════════════

// SCREEN — Shopper manifesto (the "why this matters / why now" pitch after tapping Shopper)
function ShopperWelcomeScreen({ go = () => {}, back = () => {} }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.white, overflow: "hidden" }}>
      {/* Gradient hero */}
      <div style={{ background: GRAD, color: C.white, padding: "18px 22px 22px", position: "relative", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ position: "absolute", right: -30, top: -30, fontSize: 130, opacity: 0.08 }}>🗳️</div>
        <span onClick={() => back()} style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", cursor: "pointer" }}>← Back</span>
        <div style={{ marginTop: 14 }}>
          <Tag color={C.white} bg="rgba(255,255,255,0.18)" outline>FOR SHOPPERS · A MOVEMENT</Tag>
          <div style={{ fontFamily: F.serif, fontSize: 27, fontWeight: 700, lineHeight: 1.1, marginTop: 10 }}>
            You already vote<br/>every single day.
          </div>
          <div style={{ fontFamily: F.body, fontSize: 13, color: "rgba(255,255,255,0.9)", lineHeight: 1.6, marginTop: 8 }}>
            Not at a ballot box — at the register. Every dollar you spend is a vote for the kind of business, wages, and community you want to exist. Most people cast those votes <strong>blind.</strong>
          </div>
        </div>
      </div>

      {/* Scrolling pitch */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px 14px" }}>
        {/* The shift / trend */}
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.teal, letterSpacing: "0.12em", fontWeight: 700, marginBottom: 10 }}>THE SHIFT ALREADY HAPPENING</div>
        {[
          ["207M", "Americans now actively choose businesses that match their values", C.blue],
          ["82%", "say it matters where a company stands — and they spend accordingly", C.teal],
          ["3×", "faster growth for values-driven local businesses vs. faceless chains", C.lime],
        ].map(([n, t, col]) => (
          <div key={t} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: F.serif, fontSize: 24, fontWeight: 700, color: col, minWidth: 56 }}>{n}</div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.ink, lineHeight: 1.4 }}>{t}</div>
          </div>
        ))}

        {/* Why subscribe */}
        <div style={{ ...glass(0.6), borderRadius: 16, padding: 16, margin: "18px 0 14px" }}>
          <div style={{ fontFamily: F.serif, fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Why members go further</div>
          {[
            ["🔎", "Find verified businesses", "Every score is independently verified — no greenwashing, no guessing."],
            ["💚", "See your real impact", "Watch exactly how much of your spending stays in your community, month over month."],
            ["📈", "Make it count", "Your dollars, pooled with thousands of others, become measurable democratic power."],
          ].map(([ic, h, d]) => (
            <div key={h} style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "7px 0" }}>
              <span style={{ fontSize: 18 }}>{ic}</span>
              <div>
                <div style={{ fontFamily: F.body, fontSize: 12.5, fontWeight: 700, color: C.ink }}>{h}</div>
                <div style={{ fontFamily: F.body, fontSize: 11, color: C.mid, lineHeight: 1.45, marginTop: 1 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Urgency */}
        <div style={{ background: C.ink, color: C.white, borderRadius: 14, padding: 16 }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.lime, letterSpacing: "0.1em", fontWeight: 700, marginBottom: 6 }}>⏳ WHY NOW</div>
          <div style={{ fontFamily: F.body, fontSize: 12.5, lineHeight: 1.6, color: "rgba(255,255,255,0.9)" }}>
            Every week you spend "blind" is impact you can't get back. The businesses that earn your dollars today are the ones that survive tomorrow. <strong style={{ color: C.white }}>Be early. Shape the map.</strong>
          </div>
        </div>
      </div>

      {/* Sticky CTAs */}
      <div style={{ padding: "12px 22px", borderTop: `1px solid ${C.border}`, background: C.white, flexShrink: 0 }}>
        <button onClick={() => go("shopperJoin")} style={{ width: "100%", background: GRAD, color: C.white, fontFamily: F.body, fontSize: 15, fontWeight: 700, padding: "15px", border: "none", borderRadius: 13, cursor: "pointer", marginBottom: 8 }}>
          Join the movement · $4.99/mo →
        </button>
        <button onClick={() => go("consumerHome")} style={{ width: "100%", background: C.white, color: C.mid, fontFamily: F.body, fontSize: 12.5, fontWeight: 600, padding: "11px", border: `1px solid ${C.border}`, borderRadius: 11, cursor: "pointer" }}>
          Explore the map free first
        </button>
      </div>
    </div>
  );
}

// SCREEN 1 — Welcome / Path Selector (the "Who Are You?" moment)
function WelcomeScreen({ go = () => {} }) {
  return (
    <div style={{ height: "100%", background: GRAD, display: "flex", flexDirection: "column", padding: "20px 22px 24px", position: "relative", overflow: "hidden" }}>
      {/* Decorative orbs */}
      <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
      <div style={{ position: "absolute", bottom: -60, left: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(125,200,50,0.15)" }} />

      <div style={{ position: "relative", zIndex: 2, marginTop: 40 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: C.white, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}><img src="/logo.png" alt="DollarVote" style={{ width: 46, height: 46, objectFit: "contain" }} /></div>
          <div style={{ fontFamily: F.serif, fontSize: 24, color: C.white, fontWeight: 700, letterSpacing: "-0.01em" }}>DollarVote</div>
        </div>

        {/* Headline */}
        <div style={{ fontFamily: F.serif, fontSize: 28, color: C.white, lineHeight: 1.1, textAlign: "center", marginBottom: 12 }}>
          Every dollar<br/>is a vote.
        </div>
        <div style={{ fontFamily: F.body, fontSize: 13, color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 1.6, marginBottom: 36 }}>
          Know where your money<br/>actually goes.
        </div>

        {/* Path buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => go("shopperWelcome")} style={{ background: C.white, color: C.blue, fontFamily: F.body, fontSize: 14, fontWeight: 700, padding: "16px", border: "none", borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>🛍</span>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontWeight: 700 }}>I'm a Shopper</div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: C.mid, fontWeight: 500, letterSpacing: "0.06em", marginTop: 2 }}>FIND VERIFIED LOCAL BUSINESSES</div>
            </div>
            <span style={{ color: C.blue }}>→</span>
          </button>
          <button onClick={() => go("bizWelcome")} style={{ background: "rgba(255,255,255,0.18)", color: C.white, fontFamily: F.body, fontSize: 14, fontWeight: 700, padding: "16px", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, backdropFilter: "blur(10px)" }}>
            <span style={{ fontSize: 24 }}>🏪</span>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontWeight: 700 }}>I'm a Business Owner</div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: "rgba(255,255,255,0.7)", fontWeight: 500, letterSpacing: "0.06em", marginTop: 2 }}>GET YOUR DOLLARVOTE SCORE</div>
            </div>
            <span>→</span>
          </button>
        </div>

        {/* Returning user — go straight to sign-in */}
        <div style={{ textAlign: "center", marginTop: 18, fontFamily: F.body, fontSize: 12.5, color: "rgba(255,255,255,0.8)" }}>
          Already a member?{" "}
          <span onClick={() => go("auth")} style={{ color: C.white, fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}>Log in</span>
        </div>

        {/* PBC tag */}
        <div style={{ position: "absolute", bottom: -30, left: 0, right: 0, textAlign: "center" }}>
          <div style={{ fontFamily: F.mono, fontSize: 8.5, color: "rgba(255,255,255,0.6)", letterSpacing: "0.12em" }}>DELAWARE PUBLIC BENEFIT CORP</div>
        </div>
      </div>
    </div>
  );
}

// SCREEN 2 — Consumer Home (Upside-inspired map + offers feed)
function ConsumerHomeScreen({ go = () => {}, biz = SAMPLE_BIZ, source = "sample", geo = {} }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.white, overflow: "hidden", position: "relative" }}>
      {/* Top: location + greeting */}
      <div style={{ padding: "8px 18px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.soft, letterSpacing: "0.12em" }}>YOUR LOCATION</div>
          <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 4 }}>
            📍 {geo.label || (geo.phase === "prompt" ? "Locating…" : "Set your area")} <span style={{ color: C.soft, fontSize: 10 }}>▾</span>
          </div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔔</div>
      </div>

      {/* Search bar */}
      <div style={{ padding: "0 18px 12px" }}>
        <div onClick={() => go("categories")} style={{ background: C.bg, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <span style={{ fontSize: 14 }}>🔍</span>
          <span style={{ fontFamily: F.body, fontSize: 12.5, color: C.soft, flex: 1 }}>Search businesses, ZIP, or category...</span>
        </div>
      </div>

      {/* Impact card - signature feature like Upside's earnings */}
      <div onClick={() => go("impact")} style={{ margin: "0 18px 14px", borderRadius: 18, background: GRAD, padding: 18, color: C.white, position: "relative", overflow: "hidden", cursor: "pointer" }}>
        <div style={{ position: "absolute", right: -20, bottom: -20, fontSize: 100, opacity: 0.08 }}>💚</div>
        <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.12em", opacity: 0.8, marginBottom: 6 }}>YOUR LOCAL IMPACT THIS MONTH</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
          <span style={{ fontFamily: F.serif, fontSize: 32, fontWeight: 700, lineHeight: 1 }}>$284</span>
          <span style={{ fontFamily: F.body, fontSize: 11, opacity: 0.85 }}>kept in Detroit</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.25)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: "68%", background: C.lime, borderRadius: 3 }} />
          </div>
          <span style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 700 }}>68%</span>
        </div>
        <div style={{ fontFamily: F.body, fontSize: 10.5, opacity: 0.85, marginTop: 6 }}>of your spending stayed local · vs. 43% chain avg</div>
      </div>

      {/* Category chips */}
      <div style={{ padding: "0 18px 12px", display: "flex", gap: 6, overflowX: "auto" }}>
        {[["🌟", "Top Scored"], ["☕", "Café"], ["🍽️", "Food"], ["🛍", "Retail"], ["🧘", "Wellness"]].map(([ico, lbl]) => (
          <div key={lbl} onClick={() => go("categories")} style={{ background: lbl === "Top Scored" ? C.ink : C.bg, color: lbl === "Top Scored" ? C.white : C.mid, padding: "6px 12px", borderRadius: 50, fontFamily: F.body, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", display: "flex", gap: 4, cursor: "pointer" }}>
            <span>{ico}</span>{lbl}
          </div>
        ))}
      </div>

      {/* "Near you" header */}
      <div style={{ padding: "0 18px 8px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ fontFamily: F.serif, fontSize: 18, color: C.ink, fontWeight: 700 }}>Near you</div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.soft, letterSpacing: "0.08em" }}>HIGHEST SCORES FIRST</div>
        </div>
        <span onClick={() => go("map")} style={{ fontFamily: F.body, fontSize: 11, color: C.teal, fontWeight: 600, cursor: "pointer" }}>View Map →</span>
      </div>

      {/* Business cards - Upside-style horizontal scroll */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 18px 12px" }}>
        {biz.slice(0, 4).map(b => (
          <div key={b.id} onClick={() => go("profile", b)} style={{ ...glass(0.55), borderRadius: 14, padding: 12, marginBottom: 8, display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
            <div style={{ width: 50, height: 50, borderRadius: 12, background: C.ltBlue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{b.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                <span style={{ fontFamily: F.serif, fontSize: 13, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</span>
                {b.verified && <span style={{ fontSize: 9 }}>✓</span>}
              </div>
              <div style={{ fontFamily: F.body, fontSize: 10, color: C.soft, marginBottom: 4 }}>{b.cat} · {b.distance}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: F.mono, fontSize: 9, color: C.green, fontWeight: 700 }}>${b.local.toFixed(2)}/$10 stays local</span>
              </div>
            </div>
            <ScoreBadge score={b.score} size={42} />
          </div>
        ))}
      </div>

      {/* Bottom tab bar */}
      <ConsumerTabs active="consumerHome" go={go} />
    </div>
  );
}

// Real interactive Mapbox map — centers on the user's location; plots nearby businesses.
function MapboxMap({ businesses, selectedId, onSelect, userLat, userLng }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Only businesses that have real coordinates can be plotted.
  const pts = businesses.filter(b => b.lat != null && b.lng != null);

  // Create the map once — centered on the user when we have their location.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const center = (userLat != null && userLng != null)
      ? [userLng, userLat]
      : pts.length
        ? [pts.reduce((s, b) => s + Number(b.lng), 0) / pts.length,
           pts.reduce((s, b) => s + Number(b.lat), 0) / pts.length]
        : [-98.5, 39.8]; // center of North America fallback
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom: 12,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    // A "you are here" dot at the user's real location.
    if (userLat != null && userLng != null) {
      const dot = document.createElement("div");
      dot.style.cssText = `width:16px;height:16px;border-radius:50%;background:${C.blue};border:3px solid #fff;box-shadow:0 0 0 6px rgba(26,58,143,0.2);`;
      new mapboxgl.Marker({ element: dot }).setLngLat([userLng, userLat]).addTo(map);
    }
    map.on("load", () => {
      if (pts.length > 1) {
        const b = new mapboxgl.LngLatBounds();
        pts.forEach(p => b.extend([Number(p.lng), Number(p.lat)]));
        if (userLat != null && userLng != null) b.extend([userLng, userLat]);
        map.fitBounds(b, { padding: 70, maxZoom: 14, duration: 0 });
      }
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line

  // (Re)draw score markers whenever the businesses change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    pts.forEach(b => {
      const basic = !!b.basic;          // free self-reported → neutral grey pin
      const pending = !basic && !b.verified; // full submission, awaiting review → faded ⏳
      const col = basic ? C.basic : scoreColor(b.score);
      const el = document.createElement("div");
      el.title = basic ? "Basic · self-reported (free)" : pending ? "Pending Dollar Vote verification" : "Dollar Vote verified";
      el.style.cssText = `cursor:pointer;background:#fff;border:2px ${pending ? "dashed" : "solid"} ${col};border-radius:10px;
        padding:3px 7px;box-shadow:0 3px 8px rgba(0,0,0,${pending ? ".12" : ".22"});font-family:${F.serif};
        font-weight:700;font-size:13px;color:${col};line-height:1;opacity:${pending ? "0.5" : "1"};
        display:flex;align-items:center;gap:3px;`;
      el.textContent = b.score;
      if (pending) { const c = document.createElement("span"); c.textContent = "⏳"; c.style.cssText = "font-size:9px;"; el.appendChild(c); }
      if (basic) { const c = document.createElement("span"); c.textContent = "ⓘ"; c.style.cssText = "font-size:10px;opacity:.7;"; el.appendChild(c); }
      el.addEventListener("click", (e) => { e.stopPropagation(); onSelect(b); });
      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([Number(b.lng), Number(b.lat)])
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [businesses]); // eslint-disable-line

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}

// SCREEN 3 — Map View. Centers on the user's location; shows businesses near them.
const NEARBY_RADIUS_MI = 50; // "immediate area" radius
function MapScreen({ go = () => {}, back = () => {}, biz = SAMPLE_BIZ, geo = { phase: "ready" }, requestLocation = () => {}, setManual = () => {} }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [manualText, setManualText] = useState("");

  const hasLoc = geo.lat != null && geo.lng != null;

  // Add a real distance to each business when we know the user's location.
  const withDist = biz.map(b => {
    if (hasLoc && b.lat != null && b.lng != null) {
      const mi = milesBetween(geo.lat, geo.lng, Number(b.lat), Number(b.lng));
      return { ...b, _mi: mi, distance: mi < 0.1 ? "here" : `${mi.toFixed(1)} mi` };
    }
    return { ...b, _mi: null };
  });

  // Apply search + filter chips + proximity (only show businesses in the immediate area).
  const filtered = withDist.filter(b => {
    const q = query.trim().toLowerCase();
    if (q && !(`${b.name} ${b.cat || ""} ${b.hood || ""}`.toLowerCase().includes(q))) return false;
    if (filter === "90+" && b.score < 90) return false;
    if (filter === "75+" && b.score < 75) return false;
    if (filter === "Verified" && !b.verified) return false;
    if (hasLoc && b._mi != null && b._mi > NEARBY_RADIUS_MI) return false; // proximity scope
    return true;
  }).sort((a, b) => (a._mi ?? 1e9) - (b._mi ?? 1e9));

  const withCoords = filtered.filter(b => b.lat != null && b.lng != null);
  const liveMap = !!MAPBOX_TOKEN && (withCoords.length > 0 || hasLoc);
  const [selected, setSelected] = useState(null);
  const sel = (selected && filtered.some(b => b.id === selected.id) ? selected : filtered[0]) || null;
  const areaLabel = geo.label || "Your area";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.white, position: "relative" }}>
      {/* Search bar overlay */}
      <div style={{ position: "absolute", top: 12, left: 14, right: 14, zIndex: 10 }}>
        <div style={{ ...glass(0.85), borderRadius: 12, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
          <span onClick={() => back()} style={{ fontSize: 17, cursor: "pointer", color: C.ink, lineHeight: 1 }} title="Back">←</span>
          <span style={{ fontSize: 14 }}>📍</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search near ${areaLabel}…`}
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: F.body, fontSize: 12.5, color: C.ink, fontWeight: 600, minWidth: 0 }}
          />
          {query
            ? <span onClick={() => setQuery("")} style={{ fontSize: 13, color: C.soft, cursor: "pointer" }}>✕</span>
            : <span style={{ fontFamily: F.mono, fontSize: 9, color: C.teal, fontWeight: 700, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{filtered.length} NEAR</span>}
        </div>
        {/* Location status line */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontFamily: F.mono, fontSize: 8.5, letterSpacing: "0.08em" }}>
          {geo.phase === "ready" && <span style={{ color: C.green, fontWeight: 700 }}>● {areaLabel.toUpperCase()}</span>}
          {geo.phase === "prompt" && <span style={{ color: C.soft }}>◌ FINDING YOUR LOCATION…</span>}
          {geo.phase === "outside" && <span style={{ color: C.amber, fontWeight: 700 }}>⚠ NORTH AMERICA ONLY · SET A US/CA/MX AREA BELOW</span>}
          {geo.phase === "denied" && <span style={{ color: C.soft }} onClick={() => requestLocation()}>📍 ENABLE LOCATION</span>}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, overflowX: "auto" }}>
          {["All", "90+", "75+", "Verified"].map((f) => {
            const on = filter === f;
            return (
              <div key={f} onClick={() => setFilter(f)} style={{ background: on ? C.ink : C.white, color: on ? C.white : C.mid, padding: "5px 11px", borderRadius: 50, fontFamily: F.body, fontSize: 10.5, fontWeight: 600, whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", cursor: "pointer" }}>{f}</div>
            );
          })}
        </div>
        {/* Manual area entry when location is denied or outside NA */}
        {(geo.phase === "denied" || geo.phase === "outside") && (
          <div style={{ ...glass(0.9), borderRadius: 12, padding: "8px 10px", marginTop: 8, display: "flex", gap: 6 }}>
            <input value={manualText} onChange={e => setManualText(e.target.value)} placeholder="Enter your ZIP or city (US · CA · MX)"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: F.body, fontSize: 12, color: C.ink, fontWeight: 600 }} />
            <button onClick={() => setManual(manualText)} style={{ background: GRAD, color: C.white, border: "none", borderRadius: 8, fontFamily: F.body, fontSize: 11, fontWeight: 700, padding: "5px 12px", cursor: "pointer" }}>Go</button>
          </div>
        )}
      </div>

      {/* Map area — real Mapbox, or the styled mockup as a fallback */}
      <div style={{ flex: 1, background: "#E8EDF5", position: "relative", overflow: "hidden" }}>
        {liveMap ? (
          <MapboxMap key={(hasLoc ? `${geo.lat.toFixed(3)},${geo.lng.toFixed(3)}` : "noloc") + "|" + withCoords.map(b => b.id).join(",")} businesses={filtered} selectedId={sel?.id} onSelect={setSelected} userLat={hasLoc ? geo.lat : null} userLng={hasLoc ? geo.lng : null} />
        ) : (
          <>
            {/* Mockup fallback (shown until a Mapbox token is added) */}
            {[20, 38, 56, 74].map(p => (
              <div key={`h${p}`} style={{ position: "absolute", left: 0, right: 0, top: `${p}%`, height: 3, background: "rgba(255,255,255,0.7)" }} />
            ))}
            {[15, 35, 55, 75].map(p => (
              <div key={`v${p}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${p}%`, width: 3, background: "rgba(255,255,255,0.7)" }} />
            ))}
            <div style={{ position: "absolute", top: "78%", left: 0, right: 0, height: 30, background: "#C5D5F0" }} />
            {[
              { x: 22, y: 30 }, { x: 48, y: 24 }, { x: 38, y: 50 },
              { x: 68, y: 42 }, { x: 72, y: 64 }, { x: 18, y: 60 },
            ].map((m, i) => {
              const b = filtered[i];
              if (!b) return null;
              return (
                <div key={i} onClick={() => setSelected(b)} style={{ position: "absolute", left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%, -100%)", cursor: "pointer", opacity: b.verified ? 1 : 0.5 }}>
                  <div style={{ background: C.white, borderRadius: 10, padding: "5px 8px 4px", border: `2px ${b.verified ? "solid" : "dashed"} ${scoreColor(b.score)}`, boxShadow: "0 4px 8px rgba(0,0,0,0.2)", minWidth: 38, textAlign: "center", position: "relative" }}>
                    <div style={{ fontFamily: F.serif, fontSize: 13, fontWeight: 700, color: scoreColor(b.score), lineHeight: 1 }}>{b.score}{b.verified ? "" : " ⏳"}</div>
                    <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", border: "6px solid transparent", borderTop: `6px solid ${scoreColor(b.score)}`, borderBottom: "none" }} />
                  </div>
                </div>
              );
            })}
            <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 16, height: 16, borderRadius: "50%", background: C.blue, border: "3px solid white", boxShadow: "0 0 0 8px rgba(26,58,143,0.2)" }} />
            <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", fontFamily: F.mono, fontSize: 8, color: C.soft, background: "rgba(255,255,255,0.8)", padding: "3px 8px", borderRadius: 50, whiteSpace: "nowrap" }}>PREVIEW MAP · add Mapbox token for live map</div>
          </>
        )}
      </div>

      {/* Bottom sheet — selected business, or an honest empty state when none nearby */}
      <div style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: "14px 18px 12px", boxShadow: "0 -4px 30px rgba(15,21,37,0.12)", position: "relative" }}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 12px" }} />
        {sel ? (
          <>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: C.ltBlue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{sel.emoji || "🏬"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: F.serif, fontSize: 15, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sel.name}</div>
                <div style={{ fontFamily: F.body, fontSize: 10.5, color: C.soft }}>{sel.hood || sel.cat}{sel.distance ? ` · ${sel.distance}` : ""}</div>
                {sel.basic
                  ? <Tag color={C.basic}>ⓘ {sel.score}/100 · BASIC (SELF-REPORTED)</Tag>
                  : sel.verified
                  ? <Tag color={scoreColor(sel.score)}>✓ {sel.score}/100</Tag>
                  : <Tag color={C.amber}>⏳ {sel.score}/100 · PENDING</Tag>}
              </div>
              <ScoreBadge score={sel.score} size={42} />
            </div>
            <div style={{ background: C.ltLime, borderRadius: 10, padding: "8px 12px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>💚</span>
              <span style={{ fontFamily: F.body, fontSize: 11, color: C.ink, flex: 1 }}><strong>${(sel.local || 0).toFixed(2)} of every $10 stays local</strong></span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => go("profile", sel)} style={{ flex: 1, background: GRAD, color: C.white, fontFamily: F.body, fontSize: 12, fontWeight: 700, padding: "10px", border: "none", borderRadius: 10, cursor: "pointer" }}>View Profile</button>
              <button onClick={() => openDirections(sel)} style={{ flex: 1, background: C.bg, color: C.ink, fontFamily: F.body, fontSize: 12, fontWeight: 600, padding: "10px", border: "none", borderRadius: 10, cursor: "pointer" }}>Directions</button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "6px 4px 8px" }}>
            <div style={{ fontSize: 30, marginBottom: 6 }}>🌱</div>
            <div style={{ fontFamily: F.serif, fontSize: 16, fontWeight: 700, color: C.ink }}>No verified businesses near {areaLabel} yet</div>
            <div style={{ fontFamily: F.body, fontSize: 11.5, color: C.mid, lineHeight: 1.5, margin: "6px 0 12px" }}>
              We're just getting started in your area. Be the first to put a values-driven business on the map.
            </div>
            <button onClick={() => go("bizWelcome")} style={{ background: GRAD, color: C.white, fontFamily: F.body, fontSize: 12.5, fontWeight: 700, padding: "11px 18px", border: "none", borderRadius: 11, cursor: "pointer" }}>Nominate a business →</button>
          </div>
        )}
      </div>

      {/* Bottom tab bar — so users can always navigate away from the map */}
      <ConsumerTabs active="map" go={go} />
    </div>
  );
}

// SCREEN 4 — Business Profile (after tap). Uses the tapped business (falls back to a sample).
function BusinessProfileScreen({ go = () => {}, back = () => {}, biz = null }) {
  const b = biz || SAMPLE_BIZ[0];
  const tier = b.score >= 90 ? "Community Champion" : b.score >= 75 ? "Above & Beyond" : b.score >= 60 ? "Solid Commitment" : "Growing";
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, overflowY: "auto" }}>
      {/* Hero with score */}
      <div style={{ background: GRAD, padding: "12px 20px 28px", color: C.white, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span onClick={() => back()} style={{ fontSize: 16, cursor: "pointer" }}>← Back</span>
          <span style={{ fontSize: 16 }}>⋯</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{b.emoji || "🏬"}</div>
          <div style={{ flex: 1 }}>
            {b.basic
              ? <Tag color={C.white} bg="rgba(139,92,246,0.85)" outline>ⓘ BASIC · SELF-REPORTED</Tag>
              : b.verified
              ? <Tag color={C.lime} bg="rgba(125,200,50,0.15)" outline>✓ DOLLARVOTE VERIFIED</Tag>
              : <Tag color={C.amber} bg="rgba(232,168,32,0.18)" outline>⏳ PENDING VERIFICATION</Tag>}
            <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 700, marginTop: 4, lineHeight: 1.1 }}>{b.name}</div>
            <div style={{ fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>{b.cat || "Local business"}{b.hood ? ` · ${b.hood}` : ""}</div>
          </div>
        </div>
        {/* Big score */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, background: "rgba(255,255,255,0.12)", borderRadius: 14, backdropFilter: "blur(10px)" }}>
          <ScoreBadge score={b.score} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 700 }}>{tier}</div>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em" }}>VERIFIED · ${(b.local || 0).toFixed(2)}/$10 STAYS LOCAL</div>
          </div>
        </div>
      </div>

      {/* Where your dollar goes */}
      <div style={{ background: C.white, margin: "-14px 16px 12px", borderRadius: 16, padding: 18, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.lime, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 10 }}>WHERE YOUR $10 GOES HERE</div>
        {[
          ["Maria's wages & taxes",      3.40, C.green, 34],
          ["Local Michigan suppliers",   2.80, C.teal, 28],
          ["Maria's profit (reinvested)",2.20, C.blueMid, 22],
          ["Local printer & utilities",  1.10, C.amber, 11],
          ["Detroit nonprofits",         0.50, C.lime, 5],
        ].map(([lbl, amt, col, pct]) => (
          <div key={lbl} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontFamily: F.body, fontSize: 10.5, color: C.ink }}>{lbl}</span>
              <span style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 700, color: col }}>${amt}</span>
            </div>
            <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 2 }} />
            </div>
          </div>
        ))}
        <div style={{ marginTop: 12, padding: 10, background: C.ltLime, borderRadius: 10, textAlign: "center" }}>
          <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 700, color: C.green, lineHeight: 1 }}>$8.30</div>
          <div style={{ fontFamily: F.body, fontSize: 10, color: C.mid, marginTop: 2 }}>stays in Michigan · 83% local impact</div>
        </div>
      </div>

      {/* Pillars detail */}
      <div style={{ margin: "0 16px 12px", background: C.white, borderRadius: 16, padding: 16 }}>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.soft, letterSpacing: "0.12em", marginBottom: 10 }}>SCORE BREAKDOWN</div>
        {[
          ["🏘️", "Locality", 36, 40, C.blue, "87% local supply chain · 100% local team"],
          ["🌿", "Sustainability", 27, 30, C.teal, "Plastic-free packaging · Solar-powered studio"],
          ["📖", "Transparency", 28, 30, C.lime, "Living wage verified · 5% revenue donated"],
        ].map(([ico, name, s, m, col, desc]) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 18, width: 28 }}>{ico}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: C.ink }}>{name}</span>
                <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: col }}>{s}/{m}</span>
              </div>
              <div style={{ fontFamily: F.body, fontSize: 9.5, color: C.soft }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <ProfileActions biz={b} />

      {/* Bottom tab bar — keep navigation available */}
      <ConsumerTabs active="map" go={go} />
    </div>
  );
}

// Working Save / Share / Call / Directions actions for a business profile.
function ProfileActions({ biz = {} }) {
  const name = biz.name || "this business";
  const phone = biz.phone || "";
  const [saved, setSaved] = useState(false);
  const [note, setNote] = useState("");
  const flash = (m) => { setNote(m); setTimeout(() => setNote(""), 1800); };

  const directions = () => openDirections(biz);
  const share = async () => {
    const data = { title: name, text: `Check out ${name} on DollarVote`, url: location.origin };
    try {
      if (navigator.share) { await navigator.share(data); }
      else { await navigator.clipboard.writeText(`${data.text} — ${data.url}`); flash("Link copied ✓"); }
    } catch { /* user cancelled */ }
  };
  const call = () => { if (phone) window.location.href = `tel:${phone}`; else flash("No phone number on file"); };
  const toggleSave = () => { setSaved(s => !s); flash(saved ? "Removed from saved" : "Saved ✓"); };

  const ghost = { flex: 1, background: C.white, color: C.ink, fontFamily: F.body, fontSize: 11, fontWeight: 600, padding: "10px", border: `1px solid ${C.border}`, borderRadius: 10, cursor: "pointer" };

  return (
    <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
      <button onClick={directions} style={{ background: C.ink, color: C.white, fontFamily: F.body, fontSize: 13, fontWeight: 700, padding: "13px", border: "none", borderRadius: 12, cursor: "pointer" }}>📍 Get Directions</button>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={toggleSave} style={{ ...ghost, ...(saved ? { borderColor: C.lime, color: C.green, background: C.ltLime } : {}) }}>{saved ? "★ Saved" : "⭐ Save"}</button>
        <button onClick={share} style={ghost}>↗ Share</button>
        <button onClick={call} style={ghost}>📞 Call</button>
      </div>
      {note && (
        <div style={{ position: "absolute", bottom: 60, left: "50%", transform: "translateX(-50%)", background: C.ink, color: C.white, fontFamily: F.body, fontSize: 11, fontWeight: 600, padding: "7px 14px", borderRadius: 50, whiteSpace: "nowrap" }}>{note}</div>
      )}
    </div>
  );
}

// SCREEN 5 — My Impact (Spending tracker) — gated behind the $4.99 shopper membership.
function ImpactScreen({ go = () => {}, session = null, isActive = false }) {
  // Non-members see a paywall instead of the dashboard.
  if (!isActive) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.white }}>
        <div style={{ height: 4, background: GRAD, flexShrink: 0 }} />
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>💚</div>
          <Tag color={C.teal}>MEMBERS ONLY</Tag>
          <div style={{ fontFamily: F.serif, fontSize: 24, fontWeight: 700, color: C.ink, marginTop: 10, lineHeight: 1.15 }}>
            See where your<br/>dollars actually go.
          </div>
          <div style={{ fontFamily: F.body, fontSize: 13, color: C.mid, marginTop: 10, lineHeight: 1.6 }}>
            Your personal local-impact dashboard tracks how much of your spending stays in your community — month over month.
          </div>
          <div style={{ ...glass(0.6), borderRadius: 16, padding: 16, margin: "20px 0", textAlign: "left" }}>
            {["Live dollar-impact tracking", "Your local % vs. the chain average", "Monthly streaks & community ranking"].map(f => (
              <div key={f} style={{ display: "flex", gap: 9, alignItems: "center", padding: "5px 0", fontFamily: F.body, fontSize: 12.5, color: C.ink }}>
                <span style={{ color: C.green, fontWeight: 800 }}>✓</span>{f}
              </div>
            ))}
          </div>
          <button onClick={() => go("shopperJoin")} style={{ background: GRAD, color: C.white, fontFamily: F.body, fontSize: 15, fontWeight: 700, padding: "15px", border: "none", borderRadius: 13, cursor: "pointer" }}>
            Join for $4.99/month →
          </button>
          <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.soft, letterSpacing: "0.06em", marginTop: 10 }}>CANCEL ANYTIME · BROWSING THE MAP STAYS FREE</div>
        </div>
        <ConsumerTabs active="impact" go={go} />
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "8px 18px 16px", background: C.white }}>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.lime, letterSpacing: "0.12em", fontWeight: 700, marginBottom: 4 }}>YOUR LOCAL IMPACT ✓ MEMBER</div>
        <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 700, color: C.ink }}>April 2026</div>
      </div>

      {/* Big number card */}
      <div style={{ margin: "0 18px 14px", padding: 20, borderRadius: 18, background: GRAD, color: C.white, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -30, top: -30, fontSize: 130, opacity: 0.07 }}>💚</div>
        <div style={{ fontFamily: F.mono, fontSize: 9, opacity: 0.85, letterSpacing: "0.12em", marginBottom: 4 }}>KEPT IN DETROIT THIS MONTH</div>
        <div style={{ fontFamily: F.serif, fontSize: 42, fontWeight: 700, lineHeight: 1, marginBottom: 6 }}>$284<span style={{ fontSize: 20, opacity: 0.7 }}>.50</span></div>
        <div style={{ fontFamily: F.body, fontSize: 11, opacity: 0.85 }}>↑ 22% from last month · You're outpacing 78% of Detroit users</div>
        <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(255,255,255,0.12)", borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>🏆</span>
          <span style={{ fontFamily: F.body, fontSize: 11 }}><strong>Streak: 4 months</strong> over 60% local</span>
        </div>
      </div>

      {/* Comparison row */}
      <div style={{ display: "flex", gap: 8, padding: "0 18px 14px" }}>
        <div style={{ flex: 1, ...glass(0.55), borderRadius: 12, padding: 12 }}>
          <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.soft, letterSpacing: "0.1em", marginBottom: 4 }}>SPENDING</div>
          <div style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 700, color: C.ink, lineHeight: 1 }}>$418</div>
          <div style={{ fontFamily: F.body, fontSize: 9.5, color: C.soft, marginTop: 2 }}>This month, total</div>
        </div>
        <div style={{ flex: 1, ...glass(0.55), borderRadius: 12, padding: 12 }}>
          <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.lime, letterSpacing: "0.1em", marginBottom: 4 }}>LOCAL %</div>
          <div style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 700, color: C.green, lineHeight: 1 }}>68%</div>
          <div style={{ fontFamily: F.body, fontSize: 9.5, color: C.soft, marginTop: 2 }}>vs 43% chain avg</div>
        </div>
      </div>

      {/* Recent transactions */}
      <div style={{ flex: 1, padding: "0 18px 12px", overflowY: "auto" }}>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.soft, letterSpacing: "0.12em", marginBottom: 10 }}>RECENT PURCHASES</div>
        {[
          ["Maria's Soap Studio", "🧼", 14.50, 12.04, 91],
          ["Rootwork Kitchen", "🍽️", 38.40, 30.34, 87],
          ["Ironwood Coffee", "☕", 5.75, 4.66, 88],
          ["Whole Foods Market", "🛒", 87.20, 37.50, 52],
          ["Harbor & Grain", "🥐", 12.30, 9.23, 85],
        ].map(([name, ico, amt, local, score], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{ico}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                <Tag color={scoreColor(score)}>{score}</Tag>
                <span style={{ fontFamily: F.body, fontSize: 9.5, color: C.green, fontWeight: 600 }}>${local.toFixed(2)} stayed local</span>
              </div>
            </div>
            <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: C.ink }}>${amt.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <ConsumerTabs active="impact" go={go} />
    </div>
  );
}

// SCREEN 6 — Categories (browse)
function CategoriesScreen({ go = () => {} }) {
  const cats = [
    ["Café", "☕", 47, C.amber],
    ["Restaurant", "🍽️", 89, C.red],
    ["Bakery", "🥐", 22, "#D4A074"],
    ["Grocery", "🛒", 31, C.green],
    ["Retail", "🛍", 64, C.blue],
    ["Wellness", "🧘", 38, C.teal],
    ["Home Svc", "🔧", 52, "#7B4A8B"],
    ["Business Svc", "💼", 41, "#3A4A6A"],
    ["Farm", "🌾", 18, C.lime],
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "8px 18px 14px", background: C.white }}>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.teal, letterSpacing: "0.12em", fontWeight: 700, marginBottom: 4 }}>BROWSE BY CATEGORY</div>
        <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 700, color: C.ink }}>What are you looking for?</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
        {/* Featured */}
        <div onClick={() => go("map")} style={{ marginBottom: 16, padding: 14, borderRadius: 14, background: C.ink, color: C.white, cursor: "pointer" }}>
          <Tag color={C.lime} bg="rgba(125,200,50,0.15)" outline>FEATURED THIS MONTH</Tag>
          <div style={{ fontFamily: F.serif, fontSize: 16, fontWeight: 700, marginTop: 6, marginBottom: 4 }}>Earth Day Champions</div>
          <div style={{ fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>23 Detroit businesses with sustainability scores 28+/30</div>
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {cats.map(([name, ico, count, col]) => (
            <div key={name} onClick={() => go("map")} style={{ ...glass(0.55), borderRadius: 14, padding: 14, cursor: "pointer" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${col}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 8 }}>{ico}</div>
              <div style={{ fontFamily: F.serif, fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 2 }}>{name}</div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: C.soft, letterSpacing: "0.06em" }}>{count} BUSINESSES</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom tab bar */}
      <ConsumerTabs active="map" go={go} />
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// BUSINESS OWNER SCREENS
// ═════════════════════════════════════════════════════════

// Opens the standalone CEIS™ assessment (served from /public) in a new tab.
function openAssessment() {
  window.open("/ceis-assessment.html", "_blank", "noopener");
}

// ─────────────────────────────────────────────
// AUTH — business-owner accounts (Supabase Auth)
// ─────────────────────────────────────────────
function useAuth() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, ready };
}

// True when the logged-in user is a DollarVote admin (in the `admins` table).
function useIsAdmin(session) {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!supabase || !session) { setIsAdmin(false); return; }
    supabase.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle()
      .then(({ data }) => { if (alive) setIsAdmin(!!data); });
    return () => { alive = false; };
  }, [session]);
  return isAdmin;
}

// Loads the logged-in user's subscription row (active membership status).
function useSubscription(session) {
  const [sub, setSub] = useState({ phase: "loading", row: null });
  useEffect(() => {
    let alive = true;
    if (!supabase || !session) { setSub({ phase: session ? "loading" : "anon", row: null }); return; }
    const load = () => supabase
      .from("subscriptions")
      .select("tier, status, current_period_end")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => { if (alive) setSub({ phase: "ready", row: data || null }); });
    load();
    // Re-check shortly after returning from Stripe (webhook writes the row async).
    const t = setTimeout(load, 4000);
    return () => { alive = false; clearTimeout(t); };
  }, [session]);
  const isActive = sub.row?.status === "active";
  return { ...sub, isActive };
}

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

// SCREEN — Shopper membership: sign up (email/pw + state/ZIP) → $4.99/mo checkout.
function ShopperJoinScreen({ go = () => {}, back = () => {}, session = null }) {
  const [mode, setMode] = useState("signup"); // signup | login
  const [plan, setPlan] = useState("annual");  // monthly | annual (annual highlighted = better deal)
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [stateUS, setStateUS] = useState("");
  const [zip, setZip] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const TERMS_VERSION = "v1.0";
  const TERMS_URL = "/DollarVote_Terms_and_Privacy.docx";

  // Saves state/ZIP for the logged-in user, then starts checkout for the chosen plan.
  async function startCheckout(userId) {
    if (stateUS || zip) {
      await supabase.from("shopper_profiles").upsert({ user_id: userId, state: stateUS, zip, updated_at: new Date().toISOString() });
    }
    const tier = plan === "annual" ? "shopper_annual" : "shopper";
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { tier, returnUrl: window.location.origin },
    });
    if (error) { setMsg({ type: "err", text: "Couldn't start checkout. Please try again." }); return; }
    if (data?.configured === false) { setMsg({ type: "err", text: "Payments aren't switched on yet." }); return; }
    if (data?.url) { window.location.href = data.url; return; }
    setMsg({ type: "err", text: data?.error || "Couldn't start checkout." });
  }

  async function submit() {
    if (!supabase) { setMsg({ type: "err", text: "No database connection." }); return; }
    if (mode === "signup") {
      if (!email || !pw) { setMsg({ type: "err", text: "Enter an email and password." }); return; }
      if (!stateUS || !zip) { setMsg({ type: "err", text: "Please add your state and ZIP code." }); return; }
      if (!/^\d{5}$/.test(zip.trim())) { setMsg({ type: "err", text: "Enter a valid 5-digit ZIP code." }); return; }
      if (!agreed) { setMsg({ type: "err", text: "Please agree to the Terms & Privacy Policy." }); return; }
    } else if (!email || !pw) { setMsg({ type: "err", text: "Enter your email and password." }); return; }

    setBusy(true); setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password: pw,
          options: { data: { role: "shopper", state: stateUS, zip, terms_accepted: true, terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString() } },
        });
        if (error) throw error;
        const { data: sess, error: e2 } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (e2 || !sess?.user) { setMsg({ type: "ok", text: "Account created. Check your email to confirm, then log in to finish." }); setBusy(false); return; }
        await startCheckout(sess.user.id);
      } else {
        const { data: sess, error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        await startCheckout(sess.user.id);
      }
    } catch (e) {
      setMsg({ type: "err", text: e.message || "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  const inp = { width: "100%", fontFamily: F.body, fontSize: 14, color: C.ink, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "13px 14px", marginBottom: 10, outline: "none" };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.white, overflowY: "auto" }}>
      <div style={{ height: 4, background: GRAD, flexShrink: 0 }} />
      <div style={{ padding: "16px 22px 24px" }}>
        <span onClick={() => back()} style={{ fontSize: 13, color: C.soft, cursor: "pointer" }}>← Back</span>

        <div style={{ textAlign: "center", margin: "10px 0 14px" }}>
          <Tag color={C.teal}>SHOPPER MEMBERSHIP</Tag>
          <div style={{ fontFamily: F.serif, fontSize: 24, fontWeight: 700, color: C.ink, marginTop: 8, lineHeight: 1.1 }}>
            Unlock your <span style={{ background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>local impact</span>
          </div>
          <div style={{ fontFamily: F.body, fontSize: 12, color: C.mid, marginTop: 6, lineHeight: 1.5 }}>
            See exactly where your dollars travel — and how much stays in your community.
          </div>
        </div>

        {/* Plan chooser: monthly vs annual (annual = best value) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {[
            { id: "annual", title: "Annual", price: "$19.99", per: "/year", sub: "Just $1.67/mo — save 67%", badge: "BEST VALUE" },
            { id: "monthly", title: "Monthly", price: "$4.99", per: "/month", sub: "Billed once per month", badge: null },
          ].map(p => {
            const on = plan === p.id;
            return (
              <div key={p.id} onClick={() => setPlan(p.id)} style={{
                position: "relative", cursor: "pointer", borderRadius: 14, padding: "12px 14px",
                border: `2px solid ${on ? C.teal : C.border}`,
                background: on ? "linear-gradient(180deg,rgba(26,143,160,0.06),rgba(125,200,50,0.04))" : C.white,
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${on ? C.teal : C.border}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  {on && <div style={{ width: 10, height: 10, borderRadius: "50%", background: GRAD }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: F.body, fontSize: 13.5, fontWeight: 700, color: C.ink }}>{p.title}</span>
                    {p.badge && <span style={{ fontFamily: F.mono, fontSize: 8, fontWeight: 800, color: C.white, background: GRAD, padding: "2px 7px", borderRadius: 50, letterSpacing: "0.06em" }}>{p.badge}</span>}
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 10.5, color: C.mid, marginTop: 1 }}>{p.sub}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 700, color: on ? C.teal : C.ink }}>{p.price}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 9, color: C.soft }}>{p.per}</span>
                </div>
              </div>
            );
          })}
        </div>

        <input style={inp} type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} />
        <input style={inp} type="password" placeholder="Password (min 6 characters)" value={pw} onChange={e => setPw(e.target.value)} />

        {mode === "signup" && (
          <div style={{ display: "flex", gap: 10 }}>
            <select value={stateUS} onChange={e => setStateUS(e.target.value)} style={{ ...inp, flex: 1 }}>
              <option value="">State…</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input style={{ ...inp, flex: 1 }} inputMode="numeric" maxLength={5} placeholder="ZIP code" value={zip} onChange={e => setZip(e.target.value.replace(/\D/g, ""))} />
          </div>
        )}

        {mode === "signup" && (
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", background: agreed ? "rgba(125,200,50,0.08)" : C.bg, border: `1.5px solid ${agreed ? "rgba(125,200,50,0.5)" : C.border}`, borderRadius: 12, padding: "11px 13px", marginBottom: 12 }}>
            <input type="checkbox" checked={agreed} onChange={e => { setAgreed(e.target.checked); if (e.target.checked) setMsg(null); }} style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: C.lime, cursor: "pointer" }} />
            <span style={{ fontFamily: F.body, fontSize: 11, color: C.ink, lineHeight: 1.5 }}>
              I agree to DollarVote's{" "}
              <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: C.teal, fontWeight: 700, textDecoration: "underline" }}>Terms</a>
              {" "}&{" "}
              <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: C.teal, fontWeight: 700, textDecoration: "underline" }}>Privacy Policy</a>.
            </span>
          </label>
        )}

        {msg && (
          <div style={{ fontFamily: F.body, fontSize: 11.5, lineHeight: 1.4, borderRadius: 10, padding: "9px 12px", marginBottom: 10,
            background: msg.type === "ok" ? "rgba(125,200,50,0.12)" : "rgba(192,57,43,0.1)", color: msg.type === "ok" ? C.green : C.red,
            border: `1px solid ${msg.type === "ok" ? "rgba(125,200,50,0.4)" : "rgba(192,57,43,0.3)"}` }}>{msg.text}</div>
        )}

        <button onClick={submit} disabled={busy} style={{ width: "100%", background: GRAD, color: C.white, fontFamily: F.body, fontSize: 14, fontWeight: 700, padding: "14px", border: "none", borderRadius: 12, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1, marginBottom: 10 }}>
          {busy ? "Please wait…" : (mode === "signup" ? "Continue to payment →" : "Log in & subscribe →")}
        </button>
        <div style={{ textAlign: "center", fontFamily: F.mono, fontSize: 8.5, color: C.soft, letterSpacing: "0.06em", marginBottom: 12 }}>SECURE CHECKOUT BY STRIPE · CANCEL ANYTIME</div>

        <div style={{ textAlign: "center", fontFamily: F.body, fontSize: 12, color: C.mid }}>
          {mode === "signup" ? "Already a member? " : "New here? "}
          <span onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setMsg(null); }} style={{ color: C.teal, fontWeight: 700, cursor: "pointer" }}>
            {mode === "signup" ? "Log in" : "Create an account"}
          </span>
        </div>
      </div>
    </div>
  );
}

// SCREEN — Sign up / Log in for business owners
function AuthScreen({ go = () => {}, back = () => {}, session = null }) {
  const [mode, setMode] = useState("signup"); // "signup" | "login"
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [agreed, setAgreed] = useState(false); // Terms & Privacy acceptance (signup only)
  const isAdmin = useIsAdmin(session); // admins land in the review console, not the dashboard

  // Boilerplate version of the legal docs the owner is agreeing to.
  const TERMS_VERSION = "v1.0";
  const TERMS_URL = "/DollarVote_Terms_and_Privacy.docx";

  // Already signed in → show a friendly confirmation instead of the form.
  if (session) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.white, padding: "20px 22px", overflowY: "auto" }}>
        <span onClick={() => back()} style={{ fontSize: 13, color: C.soft, cursor: "pointer", marginBottom: 18 }}>← Back</span>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
          <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 700, color: C.ink, marginBottom: 6 }}>You're signed in</div>
          <div style={{ fontFamily: F.body, fontSize: 12.5, color: C.mid, marginBottom: 20 }}>{session.user.email}</div>
          {isAdmin && (
            <button onClick={() => go("admin")} style={{ background: C.ink, color: C.white, fontFamily: F.body, fontSize: 14, fontWeight: 700, padding: "13px", border: "none", borderRadius: 12, cursor: "pointer", marginBottom: 8 }}>🛠 Open review queue →</button>
          )}
          <button onClick={() => go(isAdmin ? "admin" : "bizDashboard")} style={{ background: GRAD, color: C.white, fontFamily: F.body, fontSize: 14, fontWeight: 700, padding: "13px", border: "none", borderRadius: 12, cursor: "pointer", marginBottom: 8 }}>{isAdmin ? "Continue →" : "Go to my dashboard →"}</button>
          <button onClick={() => supabase && supabase.auth.signOut()} style={{ background: C.white, color: C.mid, fontFamily: F.body, fontSize: 12, fontWeight: 600, padding: "11px", border: `1px solid ${C.border}`, borderRadius: 10, cursor: "pointer" }}>Sign out</button>
        </div>
      </div>
    );
  }

  async function submit() {
    if (!supabase) { setMsg({ type: "err", text: "No database connection." }); return; }
    if (!email || !pw) { setMsg({ type: "err", text: "Enter an email and password." }); return; }
    // Business owners MUST accept the Terms & Privacy Policy before an account is created.
    if (mode === "signup" && !agreed) {
      setMsg({ type: "err", text: "Please agree to the Terms of Service & Privacy Policy to create your account." });
      return;
    }
    setBusy(true); setMsg(null);
    try {
      if (mode === "signup") {
        // Record acceptance (version + timestamp) on the account itself.
        const { error } = await supabase.auth.signUp({
          email, password: pw,
          options: { data: {
            terms_accepted: true,
            terms_version: TERMS_VERSION,
            terms_accepted_at: new Date().toISOString(),
          } },
        });
        if (error) throw error;
        // If email confirmation is on, there's no session yet; try an immediate sign-in.
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (e2) { setMsg({ type: "ok", text: "Account created. Check your email to confirm, then log in." }); }
        else { go("bizPricing"); } // brand-new account → choose a plan
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        // Admins land in the review console; everyone else in their dashboard.
        let admin = false;
        const uid = data?.user?.id;
        if (uid) { const { data: a } = await supabase.from("admins").select("user_id").eq("user_id", uid).maybeSingle(); admin = !!a; }
        go(admin ? "admin" : "bizDashboard");
      }
    } catch (e) {
      setMsg({ type: "err", text: e.message || "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    width: "100%", fontFamily: F.body, fontSize: 14, color: C.ink, background: C.bg,
    border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "13px 14px", marginBottom: 10, outline: "none",
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.white, padding: "20px 22px", overflowY: "auto" }}>
      <span onClick={() => back()} style={{ fontSize: 13, color: C.soft, cursor: "pointer", marginBottom: 16 }}>← Back</span>

      <Tag color={C.blue}>BUSINESS OWNER ACCOUNT</Tag>
      <div style={{ fontFamily: F.serif, fontSize: 24, fontWeight: 700, color: C.ink, lineHeight: 1.1, marginTop: 8, marginBottom: 6 }}>
        {mode === "signup" ? "Create your account" : "Welcome back"}
      </div>
      <div style={{ fontFamily: F.body, fontSize: 12.5, color: C.mid, lineHeight: 1.5, marginBottom: 18 }}>
        {mode === "signup"
          ? "Your account saves your CEIS™ assessment and unlocks your dashboard."
          : "Log in to pick up where you left off."}
      </div>

      <input style={inputStyle} type="email" placeholder="you@yourbusiness.com" value={email} onChange={e => setEmail(e.target.value)} />
      <input style={inputStyle} type="password" placeholder="Password (min 6 characters)" value={pw} onChange={e => setPw(e.target.value)} />

      {msg && (
        <div style={{
          fontFamily: F.body, fontSize: 11.5, lineHeight: 1.4, borderRadius: 10, padding: "9px 12px", marginBottom: 10,
          background: msg.type === "ok" ? "rgba(125,200,50,0.12)" : "rgba(192,57,43,0.1)",
          color: msg.type === "ok" ? C.green : C.red,
          border: `1px solid ${msg.type === "ok" ? "rgba(125,200,50,0.4)" : "rgba(192,57,43,0.3)"}`,
        }}>{msg.text}</div>
      )}

      {/* Required Terms & Privacy agreement — shown for sign-up only */}
      {mode === "signup" && (
        <label style={{
          display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer",
          background: agreed ? "rgba(125,200,50,0.08)" : C.bg,
          border: `1.5px solid ${agreed ? "rgba(125,200,50,0.5)" : C.border}`,
          borderRadius: 12, padding: "12px 13px", marginBottom: 12, transition: "all 0.15s",
        }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => { setAgreed(e.target.checked); if (e.target.checked) setMsg(null); }}
            style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: C.lime, cursor: "pointer" }}
          />
          <span style={{ fontFamily: F.body, fontSize: 11.5, color: C.ink, lineHeight: 1.5 }}>
            I have read and agree to DollarVote's{" "}
            <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: C.teal, fontWeight: 700, textDecoration: "underline" }}>Terms of Service</a>
            {" "}and{" "}
            <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: C.teal, fontWeight: 700, textDecoration: "underline" }}>Privacy Policy</a>.
            <span style={{ display: "block", fontFamily: F.mono, fontSize: 8.5, color: C.soft, letterSpacing: "0.04em", marginTop: 3 }}>REQUIRED · {TERMS_VERSION}</span>
          </span>
        </label>
      )}

      <button onClick={submit} disabled={busy || (mode === "signup" && !agreed)} style={{
        background: GRAD, color: C.white, fontFamily: F.body, fontSize: 14, fontWeight: 700,
        padding: "14px", border: "none", borderRadius: 12,
        cursor: busy ? "wait" : ((mode === "signup" && !agreed) ? "not-allowed" : "pointer"),
        opacity: (busy || (mode === "signup" && !agreed)) ? 0.55 : 1, marginBottom: 12,
      }}>{busy ? "Please wait…" : (mode === "signup" ? "Create account →" : "Log in →")}</button>

      <div style={{ textAlign: "center", fontFamily: F.body, fontSize: 12, color: C.mid }}>
        {mode === "signup" ? "Already have an account? " : "New here? "}
        <span onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setMsg(null); setAgreed(false); }} style={{ color: C.teal, fontWeight: 700, cursor: "pointer" }}>
          {mode === "signup" ? "Log in" : "Create one"}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ADMIN — review & approve incoming submissions
// ─────────────────────────────────────────────
function AdminScreen({ go = () => {}, back = () => {}, session = null }) {
  const [state, setState] = useState({ phase: "loading", rows: [], isAdmin: false });
  const [busyId, setBusyId] = useState(null);

  async function load() {
    if (!supabase) { setState({ phase: "noconn", rows: [], isAdmin: false }); return; }
    if (!session) { setState({ phase: "anon", rows: [], isAdmin: false }); return; }
    // Admins can read all submissions; non-admins get nothing back (RLS).
    const { data, error } = await supabase
      .from("ceis_submissions")
      .select("id, business_name, category, ein, reg_state, address, score_total, score_loc, score_sus, score_trn, tier, status, ref_code, created_at, answers, evidence")
      .order("created_at", { ascending: false });
    if (error) { setState({ phase: "error", rows: [], isAdmin: false, err: error.message }); return; }
    // Confirm admin explicitly (so we can show a clear "not authorized" message).
    const { data: adminRow } = await supabase.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle();
    setState({ phase: "ready", rows: data || [], isAdmin: !!adminRow });
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [session]);

  async function setStatus(id, status) {
    setBusyId(id);
    await supabase.from("ceis_submissions").update({ status }).eq("id", id);
    await load();
    setBusyId(null);
  }
  const approve = (id) => setStatus(id, "verified");
  const reject  = (id) => { if (confirm("Reject this submission? Its pin will be removed from the map.")) setStatus(id, "rejected"); };

  // Open an uploaded evidence document via a short-lived signed URL (admins can read all).
  async function openDoc(path) {
    const { data, error } = await supabase.storage.from("ceis-evidence").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) { alert("Couldn't open that document: " + (error?.message || "unknown error")); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  const wrap = (children) => (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>
      <div style={{ padding: "8px 18px 14px", background: C.white }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.blue, letterSpacing: "0.12em", fontWeight: 700 }}>ADMIN · REVIEW QUEUE</div>
            <div style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 700, color: C.ink }}>Submissions</div>
          </div>
          <span onClick={() => back()} style={{ fontFamily: F.body, fontSize: 12, color: C.soft, cursor: "pointer" }}>Close</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>{children}</div>
    </div>
  );

  const note = (emoji, title, body, cta) => wrap(
    <div style={{ textAlign: "center", paddingTop: 40 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</div>
      <div style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 6 }}>{title}</div>
      <div style={{ fontFamily: F.body, fontSize: 12.5, color: C.mid, lineHeight: 1.5, marginBottom: 16 }}>{body}</div>
      {cta}
    </div>
  );

  if (state.phase === "loading") return note("⏳", "Loading…", "Checking your access.");
  if (state.phase === "noconn") return note("🔌", "No database", "The app isn't connected to the database.");
  if (state.phase === "anon") return note("🔐", "Admin sign-in required", "Log in with your admin account to review submissions.",
    <button onClick={() => go("auth")} style={{ background: GRAD, color: C.white, fontFamily: F.body, fontSize: 13, fontWeight: 700, padding: "12px 20px", border: "none", borderRadius: 12, cursor: "pointer" }}>Log in →</button>);
  if (state.phase === "error" || !state.isAdmin) return note("🚫", "Not authorized", "This account isn't an admin. Ask an existing admin to add you.");

  const pending  = state.rows.filter(r => r.status !== "verified" && r.status !== "rejected");
  const done     = state.rows.filter(r => r.status === "verified");
  const rejected = state.rows.filter(r => r.status === "rejected");

  const row = (label, value) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontFamily: F.body, fontSize: 11.5, color: C.mid }}>{label}</span>
      <span style={{ fontFamily: F.body, fontSize: 11.5, fontWeight: 600, color: C.ink, textAlign: "right", maxWidth: "62%", wordBreak: "break-word" }}>{value}</span>
    </div>
  );

  const card = (r) => {
    const docEntries = r.evidence && typeof r.evidence === "object" ? Object.entries(r.evidence).filter(([, v]) => v) : [];
    const answered = r.answers && typeof r.answers === "object" ? Object.keys(r.answers).length : 0;
    const ein = r.ein ? `••• •• ${String(r.ein).slice(-4)}` : "—";
    const statusColor = r.status === "verified" ? C.green : r.status === "rejected" ? C.red : C.amber;
    return (
      <div key={r.id} style={{ ...glass(0.6), borderRadius: 14, padding: 14, marginBottom: 10 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F.serif, fontSize: 15, fontWeight: 700, color: C.ink }}>{r.business_name}</div>
            <div style={{ fontFamily: F.body, fontSize: 11, color: C.soft, marginTop: 2 }}>Ref {r.ref_code || "—"} · {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}</div>
            <div style={{ marginTop: 6 }}><Tag color={statusColor}>{r.status}</Tag></div>
          </div>
          <div style={{ textAlign: "center" }}>
            <ScoreBadge score={Math.floor(Number(r.score_total))} size={46} />
            <div style={{ fontFamily: F.mono, fontSize: 8, color: C.soft, marginTop: 3 }}>{r.tier}</div>
          </div>
        </div>

        {/* Identity to verify */}
        <div style={{ marginTop: 10 }}>
          {row("Category", r.category || "—")}
          {row("Address", r.address || "— (none provided)")}
          {row("EIN", ein)}
          {row("Reg. state", r.reg_state || "—")}
        </div>

        {/* Pillar breakdown */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.soft, letterSpacing: "0.08em", marginBottom: 8 }}>SCORE BREAKDOWN</div>
          <PillarBars sub={r} />
        </div>

        {/* Evidence — real uploaded documents (open via signed URL) */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.soft, letterSpacing: "0.08em", marginBottom: 6 }}>
            DOCUMENTS ({docEntries.length}) · {answered} questions answered
          </div>
          {docEntries.length === 0
            ? <div style={{ fontFamily: F.body, fontSize: 11, color: C.soft }}>No documents attached.</div>
            : docEntries.map(([qid, v]) => {
                const name = v && typeof v === "object" ? v.name : String(v);
                const path = v && typeof v === "object" ? v.path : null;
                return path
                  ? <div key={qid} onClick={() => openDoc(path)} style={{ fontFamily: F.body, fontSize: 11.5, color: C.teal, fontWeight: 600, padding: "4px 0", cursor: "pointer" }}>📎 {name} <span style={{ fontSize: 10 }}>↗</span></div>
                  : <div key={qid} style={{ fontFamily: F.body, fontSize: 11.5, color: C.soft, padding: "4px 0" }}>📎 {name} <span style={{ fontSize: 9 }}>(placeholder)</span></div>;
              })}
        </div>

        {/* Actions (pending only) */}
        {r.status !== "verified" && r.status !== "rejected" && (
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={() => approve(r.id)} disabled={busyId === r.id} style={{
              flex: 1, background: GRAD, color: C.white, fontFamily: F.body, fontSize: 12, fontWeight: 700,
              padding: "10px", border: "none", borderRadius: 10, cursor: busyId === r.id ? "wait" : "pointer", opacity: busyId === r.id ? 0.7 : 1,
            }}>{busyId === r.id ? "Working…" : "✓ Approve & publish"}</button>
            <button onClick={() => reject(r.id)} disabled={busyId === r.id} style={{
              background: C.white, color: C.red, fontFamily: F.body, fontSize: 12, fontWeight: 700,
              padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10, cursor: busyId === r.id ? "wait" : "pointer",
            }}>Reject</button>
          </div>
        )}
      </div>
    );
  };

  const section = (label, list, sub) => list.length > 0 && (
    <>
      <div style={{ fontFamily: F.mono, fontSize: 9, color: C.soft, letterSpacing: "0.1em", margin: "12px 0 8px" }}>
        {label} ({list.length}){sub ? ` · ${sub}` : ""}
      </div>
      {list.map(card)}
    </>
  );

  return wrap(
    <>
      <div style={{ fontFamily: F.mono, fontSize: 9, color: C.soft, letterSpacing: "0.1em", marginBottom: 8 }}>
        PENDING ({pending.length})
      </div>
      {pending.length === 0
        ? <div style={{ fontFamily: F.body, fontSize: 12, color: C.soft, padding: "8px 0 16px" }}>Nothing waiting. 🎉</div>
        : pending.map(card)}
      {section("VERIFIED", done, "now public")}
      {section("REJECTED", rejected, "not shown on map")}
    </>
  );
}

// SCREEN 7 — Business Welcome / Why Subscribe
function BizWelcomeScreen({ go = () => {}, back = () => {} }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.white, overflow: "hidden" }}>
      {/* Top stripe */}
      <div style={{ height: 4, background: GRAD, flexShrink: 0 }} />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 14px" }}>
        <div style={{ marginBottom: 10 }}>
          <span onClick={() => back()} style={{ fontSize: 13, color: C.soft, cursor: "pointer" }}>← Back</span>
        </div>

        {/* Hero */}
        <div style={{ marginBottom: 16 }}>
          <Tag color={C.blue}>FOR BUSINESS OWNERS</Tag>
          <div style={{ fontFamily: F.serif, fontSize: 26, fontWeight: 700, color: C.ink, lineHeight: 1.1, marginTop: 8 }}>
            Your values, <em style={{ background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>verified.</em>
          </div>
          <div style={{ fontFamily: F.body, fontSize: 12, color: C.mid, lineHeight: 1.6, marginTop: 8 }}>
            Stop competing with Amazon on price. Start competing on community — the one thing they can never copy.
          </div>
        </div>

        {/* Urgency / trend band */}
        <div style={{ background: C.ink, color: C.white, borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.lime, letterSpacing: "0.1em", fontWeight: 700, marginBottom: 6 }}>⏳ THE WINDOW IS NOW</div>
          <div style={{ fontFamily: F.body, fontSize: 12, lineHeight: 1.6, color: "rgba(255,255,255,0.9)" }}>
            <strong style={{ color: C.white }}>207M shoppers</strong> are already choosing businesses by their values — and they're searching this map. The first verified business in each category owns that story. <strong style={{ color: C.white }}>Your competitor is reading this too.</strong>
          </div>
        </div>

        {/* Benefit cards (Upside-style values) */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.lime, letterSpacing: "0.12em", fontWeight: 700, marginBottom: 10 }}>WHY YOUR SCORE MATTERS</div>

          {[
            ["207M", "American shoppers actively seek values-aligned businesses", C.blue, "🛍"],
            ["+34%", "Average new customer visits in first 60 days for verified businesses", C.teal, "📈"],
            ["78%", "Of consumers will pay MORE at businesses they can verify", C.lime, "💚"],
            ["$0", "Cost to apply. The Founder Cohort tier is free forever.", C.amber, "🎟"],
          ].map(([num, lbl, col, ico]) => (
            <div key={lbl} style={{ display: "flex", gap: 10, padding: 12, marginBottom: 6, background: C.bg, borderRadius: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: `${col}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 }}>{ico}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 700, color: col, lineHeight: 1 }}>{num}</div>
                <div style={{ fontFamily: F.body, fontSize: 10, color: C.mid, marginTop: 3, lineHeight: 1.4 }}>{lbl}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Score preview */}
        <div style={{ background: C.ink, color: C.white, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", marginBottom: 8 }}>WHAT YOUR PUBLIC PROFILE LOOKS LIKE</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <ScoreBadge score={88} size={48} />
            <div style={{ flex: 1 }}>
              <Tag color={C.lime} bg="rgba(125,200,50,0.15)" outline>VERIFIED</Tag>
              <div style={{ fontFamily: F.serif, fontSize: 14, fontWeight: 700, marginTop: 4 }}>Your Business Name</div>
              <div style={{ fontFamily: F.body, fontSize: 9.5, color: "rgba(255,255,255,0.55)" }}>Above & Beyond Tier</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div style={{ padding: "12px 18px", background: C.white, borderTop: `1px solid ${C.border}` }}>
        <button onClick={() => go("bizPricing")} style={{ width: "100%", background: GRAD, color: C.white, fontFamily: F.body, fontSize: 14, fontWeight: 700, padding: "14px", border: "none", borderRadius: 12, cursor: "pointer" }}>See Pricing →</button>
        <div style={{ textAlign: "center", marginTop: 6, fontFamily: F.mono, fontSize: 8.5, color: C.soft, letterSpacing: "0.06em" }}>NO CREDIT CARD · FREE TIER FOREVER</div>
      </div>
    </div>
  );
}

// SCREEN 8 — Pricing / Tiers
function BizPricingScreen({ go = () => {}, back = () => {}, session = null }) {
  const [busyTier, setBusyTier] = useState(null);
  const [payMsg, setPayMsg] = useState(null);

  const tiers = [
    { key: "free",    name: "Free", price: "$0", per: "forever", color: C.mid, popular: false, features: ["Basic self-reported score", "Posted on the map instantly", "No documents or review", "Upgrade to verified anytime"] },
    { key: "starter", name: "Starter", price: "$29", per: "/mo", color: C.blue, popular: false, features: ["Everything in Free", "Score assessment", "Peer benchmarks", "Improvement roadmap"] },
    { key: "growth",  name: "Growth", price: "$59", per: "/mo", color: C.teal, popular: true, features: ["Everything in Starter", "Verified badge", "Priority placement", "Review responses", "Story page"] },
    { key: "premium", name: "Premium", price: "$99", per: "/mo", color: C.lime, popular: false, features: ["Everything in Growth", "Full analytics", "Demographic data", "API access", "Account manager"] },
  ];

  async function choose(t) {
    if (!session) { go("auth"); return; }
    // Free tier: the quick self-reported Basic score (auto-posts to the map).
    if (t.key === "free") { go("basicScore"); return; }
    if (!supabase) { setPayMsg("No database connection."); return; }
    setBusyTier(t.key); setPayMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { tier: t.key, returnUrl: window.location.origin },
      });
      if (error) throw error;
      if (data?.url) { window.location.href = data.url; return; }       // → Stripe checkout
      if (data?.configured === false) {
        // Payments built but Stripe keys not added yet — let them proceed for now.
        setPayMsg("💳 Payments aren't switched on yet. Continuing without charge for now.");
        setTimeout(() => { openAssessment(); go("bizDashboard"); }, 1400);
        return;
      }
      setPayMsg(data?.error || "Couldn't start checkout.");
    } catch (e) {
      setPayMsg(e.message || "Couldn't start checkout.");
    } finally {
      setBusyTier(null);
    }
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>
      <div style={{ padding: "8px 18px 14px", background: C.white }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span onClick={() => back()} style={{ fontSize: 13, color: C.soft, cursor: "pointer" }}>← Back</span>
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.teal, letterSpacing: "0.08em", fontWeight: 700 }}>STEP 2 of 5</span>
        </div>
        <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 700, color: C.ink }}>Choose your tier</div>
        <div style={{ fontFamily: F.body, fontSize: 11, color: C.mid, marginTop: 2 }}>Start free. Upgrade based on your needs.</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        {payMsg && (
          <div style={{ background: C.ltGold, border: `1px solid ${C.amber}55`, borderRadius: 10, padding: "10px 12px", marginBottom: 10, fontFamily: F.body, fontSize: 11.5, color: C.ink, lineHeight: 1.4 }}>{payMsg}</div>
        )}

        {/* ⭐ LIFETIME FOUNDER SPECIAL — the irresistible hero offer */}
        <div style={{ position: "relative", borderRadius: 18, padding: 18, marginBottom: 16, background: C.ink, color: C.white, overflow: "hidden", boxShadow: "0 16px 40px rgba(11,21,37,0.28)", border: `1.5px solid ${C.lime}` }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 100% 0%, rgba(125,200,50,0.22), transparent 55%), radial-gradient(circle at 0% 100%, rgba(26,143,160,0.20), transparent 50%)" }} />
          <div style={{ position: "absolute", right: -18, top: -18, fontSize: 96, opacity: 0.12 }}>🏆</div>
          <div style={{ position: "relative" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: GRAD, padding: "4px 11px", borderRadius: 50, fontFamily: F.mono, fontSize: 8.5, fontWeight: 800, letterSpacing: "0.1em" }}>
              ⚡ FOUNDER COHORT · LIMITED
            </div>
            <div style={{ fontFamily: F.serif, fontSize: 27, fontWeight: 700, lineHeight: 1.05, marginTop: 10 }}>
              Pay once. <span style={{ background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Verified for life.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
              <span style={{ fontFamily: F.serif, fontSize: 40, fontWeight: 700, lineHeight: 1 }}>$299</span>
              <span style={{ fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.6)" }}>once · never billed again</span>
            </div>
            <div style={{ fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.55)", textDecoration: "line-through", marginTop: 2 }}>
              vs. $708/yr on Premium — pays for itself in ~5 months
            </div>

            <div style={{ marginTop: 12, marginBottom: 12 }}>
              {[
                "Lifetime verified status — free as long as your business exists",
                "Permanent Founding-Member badge customers can see",
                "Top priority placement on the map, locked in",
                "Every future feature & analytics — included forever",
              ].map(f => (
                <div key={f} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "4px 0", fontFamily: F.body, fontSize: 12, color: "rgba(255,255,255,0.92)", lineHeight: 1.4 }}>
                  <span style={{ color: C.lime, fontWeight: 800 }}>✓</span>{f}
                </div>
              ))}
            </div>

            <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(125,200,50,0.3)", borderRadius: 10, padding: "9px 12px", marginBottom: 12, fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.9)", lineHeight: 1.5 }}>
              🌱 You won't just save money — you'll be a <strong style={{ color: C.white }}>founding pioneer of local commerce</strong> in your community, on the map before anyone else.
            </div>

            <button onClick={() => choose({ key: "lifetime", name: "Lifetime" })} disabled={busyTier === "lifetime"} style={{
              width: "100%", background: GRAD, color: C.white, fontFamily: F.body, fontSize: 15, fontWeight: 800,
              padding: "15px", border: "none", borderRadius: 13, cursor: busyTier === "lifetime" ? "wait" : "pointer", opacity: busyTier === "lifetime" ? 0.7 : 1,
            }}>{busyTier === "lifetime" ? "Starting…" : "Claim Lifetime — $299 once →"}</button>
            <div style={{ textAlign: "center", marginTop: 8, fontFamily: F.mono, fontSize: 8, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em", lineHeight: 1.5 }}>
              ONE-TIME PAYMENT · NON-TRANSFERABLE · TIED TO THIS BUSINESS
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", fontFamily: F.mono, fontSize: 8.5, color: C.soft, letterSpacing: "0.1em", marginBottom: 10 }}>— OR CHOOSE A MONTHLY PLAN —</div>

        {tiers.map(t => (
          <div key={t.name} style={{
            ...(t.popular ? {} : glass(0.5)),
            background: t.popular ? C.ink : "rgba(255,255,255,0.5)",
            color: t.popular ? C.white : C.ink,
            borderRadius: 14, padding: 16, marginBottom: 8,
            border: t.popular ? "none" : "1px solid rgba(255,255,255,0.55)",
            position: "relative",
          }}>
            {t.popular && <div style={{ position: "absolute", top: -8, right: 16, background: C.lime, color: C.ink, fontFamily: F.mono, fontSize: 8.5, fontWeight: 700, padding: "3px 10px", borderRadius: 50, letterSpacing: "0.08em" }}>MOST POPULAR</div>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <div style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 700 }}>{t.name}</div>
              <div>
                <span style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 700, color: t.popular ? C.lime : t.color }}>{t.price}</span>
                <span style={{ fontFamily: F.mono, fontSize: 10, color: t.popular ? "rgba(255,255,255,0.5)" : C.soft, marginLeft: 4 }}>{t.per}</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
              {t.features.slice(0, 3).map(f => (
                <div key={f} style={{ fontFamily: F.body, fontSize: 10, color: t.popular ? "rgba(255,255,255,0.7)" : C.mid, display: "flex", gap: 6 }}>
                  <span style={{ color: t.popular ? C.lime : t.color }}>✓</span>{f}
                </div>
              ))}
            </div>
            <button onClick={() => choose(t)} disabled={busyTier === t.key} style={{
              width: "100%", padding: 10,
              background: t.popular ? GRAD : (t.color === C.mid ? C.bg : C.white),
              color: t.popular ? C.white : (t.color === C.mid ? C.ink : t.color),
              border: t.popular ? "none" : `1.5px solid ${t.color === C.mid ? C.border : t.color}`,
              borderRadius: 10, fontFamily: F.body, fontSize: 11, fontWeight: 700, cursor: busyTier === t.key ? "wait" : "pointer", opacity: busyTier === t.key ? 0.7 : 1,
            }}>{busyTier === t.key ? "Starting…" : (t.key === "free" ? "Start free" : (t.popular ? "Get Growth →" : `Choose ${t.name}`))}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Loads the logged-in owner's most recent submission (RLS shows only their own).
function useMySubmission(session) {
  const [data, setData] = useState({ phase: "loading", sub: null });
  useEffect(() => {
    let alive = true;
    if (!supabase || !session) { setData({ phase: session ? "loading" : "anon", sub: null }); return; }
    supabase
      .from("ceis_submissions")
      .select("business_name, category, ein, reg_state, score_total, score_loc, score_sus, score_trn, tier, status, ref_code, created_at")
      .eq("user_id", session.user.id) // only THIS owner's submission (admins can read all, so filter explicitly)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data: rows, error }) => {
        if (!alive) return;
        if (error) { setData({ phase: "error", sub: null, err: error.message }); return; }
        setData({ phase: "ready", sub: rows && rows[0] ? rows[0] : null });
      });
    return () => { alive = false; };
  }, [session]);
  return data;
}

// SCREEN 9 — Business Dashboard
function BizDashboardScreen({ go = () => {}, session = null }) {
  const mine = useMySubmission(session);
  const sub = mine.sub;
  const isAdmin = useIsAdmin(session);

  // Real data when the owner has a submission; sample data otherwise (e.g. the gallery).
  const bizName = sub ? sub.business_name : "Maria's Soap Studio";
  const total   = sub ? Math.floor(Number(sub.score_total)) : 91;
  const tier    = sub ? sub.tier : "Community Champion";
  const isVerified = sub ? sub.status === "verified" : true;
  const isBasic = sub ? sub.status === "basic" : false;
  const statusLabel = !sub ? "✓ COMMUNITY CHAMPION · VERIFIED"
    : isBasic ? "ⓘ BASIC · SELF-REPORTED"
    : isVerified ? `✓ ${(tier || "").toUpperCase()} · VERIFIED`
    : `⏳ ${(tier || "").toUpperCase()} · UNDER REVIEW`;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ padding: "8px 18px 14px", background: C.white }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.lime, letterSpacing: "0.12em", fontWeight: 700 }}>BUSINESS DASHBOARD</div>
            <div style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 700, color: C.ink }}>{bizName}</div>
            {session && <div style={{ fontFamily: F.mono, fontSize: 9, color: C.soft, marginTop: 2 }}>👤 {session.user.email}</div>}
          </div>
          {session
            ? <span onClick={() => { supabase && supabase.auth.signOut(); go("welcome"); }} style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.teal, cursor: "pointer" }}>Sign out</span>
            : <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚙️</div>}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
        {/* Admin entry point — only shown to admins */}
        {isAdmin && (
          <div onClick={() => go("admin")} style={{ background: C.ink, color: C.white, borderRadius: 14, padding: 14, marginBottom: 12, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <div style={{ fontSize: 22 }}>🛠</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.serif, fontSize: 14, fontWeight: 700 }}>Verification review queue</div>
              <div style={{ fontFamily: F.body, fontSize: 10.5, color: "rgba(255,255,255,0.6)" }}>Review, approve & publish business submissions</div>
            </div>
            <span style={{ color: C.lime, fontWeight: 700 }}>→</span>
          </div>
        )}

        {/* Empty state: logged in but no submission yet */}
        {session && mine.phase === "ready" && !sub && (
          <div style={{ ...glass(0.6), borderRadius: 16, padding: 20, marginBottom: 12, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>📋</div>
            <div style={{ fontFamily: F.serif, fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 4 }}>No assessment yet</div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.mid, lineHeight: 1.5, marginBottom: 14 }}>
              Complete your CEIS™ assessment to get your score and appear in the directory.
            </div>
            <button onClick={() => openAssessment()} style={{ background: GRAD, color: C.white, fontFamily: F.body, fontSize: 13, fontWeight: 700, padding: "12px 20px", border: "none", borderRadius: 12, cursor: "pointer" }}>Start assessment →</button>
          </div>
        )}

        {/* Score hero (real when available) */}
        <div style={{ background: GRAD, color: C.white, borderRadius: 16, padding: 18, marginBottom: 12, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -20, top: -20, fontSize: 100, opacity: 0.1 }}>{isBasic ? "ⓘ" : isVerified ? "🏆" : "⏳"}</div>
          <Tag color={isBasic ? C.white : C.lime} bg={isBasic ? "rgba(139,92,246,0.85)" : "rgba(125,200,50,0.2)"} outline>{statusLabel}</Tag>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
            <ScoreBadge score={total} size={62} />
            <div>
              <div style={{ fontFamily: F.serif, fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{total}</div>
              <div style={{ fontFamily: F.body, fontSize: 10, opacity: 0.85, marginTop: 2 }}>
                {sub
                  ? (isBasic ? "Self-reported — live on the map" : isVerified ? "Verified & live in the directory" : "Projected — pending verification")
                  : "↑ 4 pts since last quarter"}
              </div>
            </div>
          </div>
          {sub && !isBasic && (
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              {[["Locality", sub.score_loc, 40], ["Sustainability", sub.score_sus, 30], ["Transparency", sub.score_trn, 30]].map(([lbl, v, max]) => (
                <div key={lbl} style={{ flex: 1, background: "rgba(255,255,255,0.14)", borderRadius: 8, padding: "7px 8px" }}>
                  <div style={{ fontFamily: F.mono, fontSize: 7.5, opacity: 0.8, letterSpacing: "0.06em" }}>{String(lbl).toUpperCase()}</div>
                  <div style={{ fontFamily: F.serif, fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>{Math.round(Number(v))}<span style={{ fontSize: 9, opacity: 0.7 }}>/{max}</span></div>
                </div>
              ))}
            </div>
          )}
          {sub && isBasic && (
            <div onClick={() => go("bizPricing")} style={{ marginTop: 12, background: "rgba(255,255,255,0.14)", borderRadius: 10, padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, fontFamily: F.body, fontSize: 11, lineHeight: 1.4 }}>This is a self-reported score. <strong>Upgrade to a verified CEIS™ score</strong> for a premium badge.</div>
              <span style={{ color: C.lime, fontWeight: 700 }}>→</span>
            </div>
          )}
        </div>

        {/* Quick stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {[
            ["Profile Views", "2,847", "↑ 18%", C.blue],
            ["New Customers", "127", "↑ 34%", C.lime],
            ["QR Scans", "1,294", "↑ 22%", C.teal],
            ["Avg Rating", "4.9★", "−", C.amber],
          ].map(([lbl, val, ch, col]) => (
            <div key={lbl} style={{ ...glass(0.55), borderRadius: 12, padding: 12 }}>
              <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.soft, letterSpacing: "0.08em" }}>{lbl}</div>
              <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 700, color: C.ink, lineHeight: 1.1, marginTop: 2 }}>{val}</div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: col, fontWeight: 700, marginTop: 2 }}>{ch}</div>
            </div>
          ))}
        </div>

        {/* Score improvements */}
        <div style={{ background: C.white, borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.lime, letterSpacing: "0.08em", fontWeight: 700 }}>QUICK WINS</div>
            <span style={{ fontFamily: F.body, fontSize: 10, color: C.teal, fontWeight: 600 }}>View All</span>
          </div>
          {[
            ["Add 1% for the Planet membership", "+3 pts", C.lime],
            ["Document your composting program", "+2 pts", C.teal],
            ["Switch to Bank of Detroit", "+1 pt", C.blue],
          ].map(([t, p, c]) => (
            <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: F.body, fontSize: 11, color: C.ink }}>{t}</span>
              <Tag color={c}>{p}</Tag>
            </div>
          ))}
        </div>

        {/* CTA: Share QR */}
        <div style={{ background: C.ink, color: C.white, borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 50, height: 50, borderRadius: 10, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>📱</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.serif, fontSize: 14, fontWeight: 700 }}>Share Your QR Scorecard</div>
              <div style={{ fontFamily: F.body, fontSize: 10, color: "rgba(255,255,255,0.6)" }}>Print, post, share</div>
            </div>
            <span style={{ color: C.lime, fontWeight: 700 }}>↗</span>
          </div>
        </div>
      </div>

      {/* Bottom nav for biz */}
      <BizTabs active="bizDashboard" go={go} />
    </div>
  );
}

// ─────────────────────────────────────────────
// BUSINESS TAB SCREENS (Stats / Improve / Profile)
// All read the owner's real submission via useMySubmission.
// ─────────────────────────────────────────────

// Shared header for the business tab screens.
function BizTopBar({ title, sub, session }) {
  return (
    <div style={{ padding: "8px 18px 14px", background: C.white }}>
      <div style={{ fontFamily: F.mono, fontSize: 9, color: C.lime, letterSpacing: "0.12em", fontWeight: 700 }}>{title}</div>
      <div style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 700, color: C.ink }}>{sub ? sub.business_name : "Your business"}</div>
      {session && <div style={{ fontFamily: F.mono, fontSize: 9, color: C.soft, marginTop: 2 }}>👤 {session.user.email}</div>}
    </div>
  );
}

// The three pillar progress bars from a submission's real scores.
function PillarBars({ sub }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[["loc", "Locality", 40], ["sus", "Sustainability", 30], ["trn", "Transparency", 30]].map(([k, lbl, max]) => {
        const v = Math.round(Number(sub[`score_${k}`]) || 0);
        const pct = Math.min(100, (v / max) * 100);
        return (
          <div key={k}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.ink }}>{lbl}</span>
              <span style={{ fontFamily: F.mono, fontSize: 11, color: C.mid }}>{v}<span style={{ color: C.soft }}>/{max}</span></span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: C.border, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: PILLAR_META[k].color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Loading / logged-out / no-submission states for a business tab screen.
// Returns a full screen for those cases, or null when a real submission exists.
function bizStateScreen({ mine, session, active, go, title }) {
  if (mine.sub) return null; // real submission loaded → let the screen render
  const anon = !session;
  const empty = session && mine.phase === "ready"; // logged in, fetch done, but no submission
  let icon = "⏳", head = "Loading…", body = "Fetching your assessment record.", cta = null;
  if (anon) { icon = "🔐"; head = "Log in to see this"; body = "Sign in as a business owner to track your score, stats and ways to improve."; cta = ["Log in →", () => go("auth")]; }
  else if (empty) { icon = "📋"; head = "No assessment yet"; body = "Complete your free CEIS™ assessment to unlock your stats and score."; cta = ["Start assessment →", () => openAssessment()]; }
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>
      <BizTopBar title={title} sub={null} session={session} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ ...glass(0.6), borderRadius: 16, padding: 24, textAlign: "center", maxWidth: 300 }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>{icon}</div>
          <div style={{ fontFamily: F.serif, fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 6 }}>{head}</div>
          <div style={{ fontFamily: F.body, fontSize: 12, color: C.mid, lineHeight: 1.5, marginBottom: cta ? 14 : 0 }}>{body}</div>
          {cta && <button onClick={cta[1]} style={{ background: GRAD, color: C.white, fontFamily: F.body, fontSize: 13, fontWeight: 700, padding: "12px 20px", border: "none", borderRadius: 12, cursor: "pointer" }}>{cta[0]}</button>}
        </div>
      </div>
      <BizTabs active={active} go={go} />
    </div>
  );
}

// STATS tab — real score breakdown + the owner's assessment record.
function BizStatsScreen({ go = () => {}, session = null }) {
  const mine = useMySubmission(session);
  const sub = mine.sub;
  const notice = bizStateScreen({ mine, session, active: "bizStats", go, title: "YOUR STATS" });
  if (notice) return notice;
  const total = Math.floor(Number(sub.score_total));
  const verified = sub.status === "verified";
  const submitted = sub.created_at ? new Date(sub.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>
      <BizTopBar title="YOUR STATS" sub={sub} session={session} />
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        <div style={{ background: GRAD, color: C.white, borderRadius: 16, padding: 18, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <ScoreBadge score={total} size={58} />
            <div>
              <div style={{ fontFamily: F.serif, fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{total}<span style={{ fontSize: 14, opacity: 0.7 }}>/100</span></div>
              <div style={{ fontFamily: F.body, fontSize: 11, opacity: 0.9, marginTop: 3 }}>{sub.tier}</div>
            </div>
          </div>
        </div>
        <div style={{ background: C.white, borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.lime, letterSpacing: "0.08em", fontWeight: 700, marginBottom: 12 }}>SCORE BREAKDOWN</div>
          <PillarBars sub={sub} />
        </div>
        <div style={{ background: C.white, borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.lime, letterSpacing: "0.08em", fontWeight: 700, marginBottom: 10 }}>YOUR ASSESSMENT RECORD</div>
          {[
            ["Business", sub.business_name],
            ["Category", sub.category || "—"],
            ["Tier", sub.tier],
            ["Status", verified ? "✓ Verified & live" : "⏳ Under review"],
            ["Submitted", submitted],
            ["Reference", sub.ref_code || "—"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: F.body, fontSize: 12, color: C.mid }}>{k}</span>
              <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.ink, textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ ...glass(0.5), borderRadius: 14, padding: 14 }}>
          <div style={{ fontFamily: F.body, fontSize: 11.5, color: C.mid, lineHeight: 1.55 }}>
            📊 <strong style={{ color: C.ink }}>Customer analytics</strong> — profile views, QR scans and new-customer counts begin tracking once your profile is verified and live in the directory.
          </div>
        </div>
      </div>
      <BizTabs active="bizStats" go={go} />
    </div>
  );
}

// IMPROVE tab — data-driven: points to next tier + prioritized wins for the weakest pillar.
function BizImproveScreen({ go = () => {}, session = null }) {
  const mine = useMySubmission(session);
  const sub = mine.sub;
  const notice = bizStateScreen({ mine, session, active: "bizImprove", go, title: "IMPROVE" });
  if (notice) return notice;
  const total = Math.floor(Number(sub.score_total));
  const next = nextTierUp(total);
  const ranked = pillarHeadroom(sub); // weakest pillar first
  const weakest = ranked[0];
  const tips = ranked.flatMap((p) => IMPROVE_TIPS[p.key].map(([t, pts]) => ({ t, pts, pillar: p.label, color: p.color })));
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>
      <BizTopBar title="IMPROVE YOUR SCORE" sub={sub} session={session} />
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        <div style={{ background: GRAD, color: C.white, borderRadius: 16, padding: 18, marginBottom: 12 }}>
          {next ? (
            <>
              <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", opacity: 0.85 }}>NEXT MILESTONE</div>
              <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 700, marginTop: 4 }}>{next.gap} pts to {next.name}</div>
              <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.25)", overflow: "hidden", marginTop: 12 }}>
                <div style={{ width: `${Math.min(100, (total / next.min) * 100)}%`, height: "100%", background: C.white, borderRadius: 99 }} />
              </div>
              <div style={{ fontFamily: F.body, fontSize: 11, opacity: 0.85, marginTop: 6 }}>You're at {total} — reach {next.min} to level up.</div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 700 }}>🏆 Top tier reached</div>
              <div style={{ fontFamily: F.body, fontSize: 12, opacity: 0.9, marginTop: 6 }}>You're a Community Champion — keep your evidence current to hold your score.</div>
            </>
          )}
        </div>
        <div style={{ background: C.white, borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.lime, letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>BIGGEST OPPORTUNITY</div>
          <div style={{ fontFamily: F.serif, fontSize: 16, fontWeight: 700, color: C.ink }}>{weakest.label}</div>
          <div style={{ fontFamily: F.body, fontSize: 12, color: C.mid, marginTop: 4 }}>You're using {Math.round(weakest.value)} of {weakest.max} possible points here — your biggest room to grow.</div>
        </div>
        <div style={{ background: C.white, borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.lime, letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>QUICK WINS · PRIORITIZED FOR YOU</div>
          {tips.map((tip, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontFamily: F.body, fontSize: 12, color: C.ink }}>{tip.t}</div>
                <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.soft, letterSpacing: "0.06em", marginTop: 2 }}>{tip.pillar.toUpperCase()}</div>
              </div>
              <Tag color={tip.color}>{tip.pts}</Tag>
            </div>
          ))}
        </div>
        <div style={{ background: C.ink, color: C.white, borderRadius: 14, padding: 16 }}>
          <div style={{ fontFamily: F.serif, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Made an improvement?</div>
          <div style={{ fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.65)", marginBottom: 12 }}>Update your assessment with new evidence to raise your verified score.</div>
          <button onClick={() => openAssessment()} style={{ background: GRAD, color: C.white, fontFamily: F.body, fontSize: 13, fontWeight: 700, padding: "11px 18px", border: "none", borderRadius: 11, cursor: "pointer" }}>Update my assessment →</button>
        </div>
      </div>
      <BizTabs active="bizImprove" go={go} />
    </div>
  );
}

// PROFILE tab — public-profile preview + real business details + account actions.
function BizProfileScreen({ go = () => {}, session = null }) {
  const mine = useMySubmission(session);
  const sub = mine.sub;
  const notice = bizStateScreen({ mine, session, active: "bizProfile", go, title: "PROFILE" });
  if (notice) return notice;
  const total = Math.floor(Number(sub.score_total));
  const verified = sub.status === "verified";
  const maskEin = sub.ein ? `••• •• ${String(sub.ein).slice(-4)}` : "—";
  const signOut = () => { supabase && supabase.auth.signOut(); go("welcome"); };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>
      <BizTopBar title="PROFILE & ACCOUNT" sub={sub} session={session} />
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        <div style={{ background: GRAD, color: C.white, borderRadius: 16, padding: 18, marginBottom: 12 }}>
          <div style={{ fontFamily: F.mono, fontSize: 8.5, letterSpacing: "0.1em", opacity: 0.8, marginBottom: 10 }}>WHAT CUSTOMERS SEE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <ScoreBadge score={total} size={54} />
            <div>
              <div style={{ fontFamily: F.serif, fontSize: 17, fontWeight: 700 }}>{sub.business_name}</div>
              <div style={{ fontFamily: F.body, fontSize: 11, opacity: 0.9 }}>{sub.category || "Local business"} · {sub.tier}</div>
              <div style={{ fontFamily: F.mono, fontSize: 8.5, opacity: 0.85, marginTop: 3 }}>{verified ? "✓ VERIFIED" : "⏳ UNDER REVIEW"}</div>
            </div>
          </div>
        </div>
        <div style={{ background: C.white, borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.lime, letterSpacing: "0.08em", fontWeight: 700, marginBottom: 10 }}>BUSINESS DETAILS</div>
          {[
            ["Name", sub.business_name],
            ["Category", sub.category || "—"],
            ["EIN", maskEin],
            ["Registered", sub.reg_state || "—"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: F.body, fontSize: 12, color: C.mid }}>{k}</span>
              <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.ink, textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ background: C.white, borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.lime, letterSpacing: "0.08em", fontWeight: 700, marginBottom: 10 }}>ACCOUNT</div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
            <span style={{ fontFamily: F.body, fontSize: 12, color: C.mid }}>Email</span>
            <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.ink }}>{session?.user?.email || "—"}</span>
          </div>
        </div>
        <button onClick={() => openAssessment()} style={{ width: "100%", background: GRAD, color: C.white, fontFamily: F.body, fontSize: 13, fontWeight: 700, padding: "13px", border: "none", borderRadius: 12, cursor: "pointer", marginBottom: 10 }}>Update my assessment →</button>
        <button onClick={signOut} style={{ width: "100%", background: C.white, color: C.red, fontFamily: F.body, fontSize: 13, fontWeight: 700, padding: "13px", border: `1px solid ${C.border}`, borderRadius: 12, cursor: "pointer" }}>Sign out</button>
      </div>
      <BizTabs active="bizProfile" go={go} />
    </div>
  );
}

// Geocode a free-text address to {lat,lng} via Mapbox (best-effort, returns nulls on failure).
async function geocodeAddress(address) {
  if (!address || !MAPBOX_TOKEN) return { lat: null, lng: null };
  try {
    const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?limit=1&country=us,ca,mx&access_token=${MAPBOX_TOKEN}`);
    if (!r.ok) return { lat: null, lng: null };
    const d = await r.json();
    const f = d.features && d.features[0];
    if (f && Array.isArray(f.center)) return { lat: f.center[1], lng: f.center[0] };
  } catch (e) { /* offline — fall through */ }
  return { lat: null, lng: null };
}

// SCREEN — Free "Basic" self-reported score (non-algorithmic). Auto-posts to the map.
const BASIC_QUESTIONS = [
  ["Independently or locally owned?", "Not a national chain or franchise", 25],
  ["Buy supplies from local or regional sources?", "At least some of your inventory or ingredients", 20],
  ["Pay your team at or above a living wage?", "Fair pay for your area", 20],
  ["Any sustainability practices?", "Recycling, less waste, energy savings, etc.", 20],
  ["Active in your local community?", "Events, donations, partnerships", 15],
];
function BasicScoreScreen({ go = () => {}, back = () => {}, session = null }) {
  const [name, setName] = useState("");
  const [cat, setCat] = useState("");
  const [address, setAddress] = useState("");
  const [ans, setAns] = useState(BASIC_QUESTIONS.map(() => false));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [done, setDone] = useState(null); // { score }

  // CEIS™ v3: unverified self-declaration is Evidence Tier 5 → multiplier 0.550,
  // and the Free Tier integer uses floor() (never rounds up a tier). So a Basic
  // score is always a WHOLE number and structurally lower than a verified score.
  const SELF_REPORT_MULTIPLIER = 0.55;
  const claimed = BASIC_QUESTIONS.reduce((s, q, i) => s + (ans[i] ? q[2] : 0), 0); // 0–100 claimed
  const score = Math.floor(claimed * SELF_REPORT_MULTIPLIER); // 0–55, whole number

  if (!session) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.white, padding: 24, justifyContent: "center", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🔐</div>
        <div style={{ fontFamily: F.serif, fontSize: 20, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Log in to get your free score</div>
        <div style={{ fontFamily: F.body, fontSize: 12.5, color: C.mid, marginBottom: 18 }}>Create a free business account, then claim your Basic score.</div>
        <button onClick={() => go("auth")} style={{ background: GRAD, color: C.white, fontFamily: F.body, fontSize: 14, fontWeight: 700, padding: "13px", border: "none", borderRadius: 12, cursor: "pointer" }}>Log in →</button>
      </div>
    );
  }

  async function submit() {
    if (!supabase) { setMsg({ type: "err", text: "No connection." }); return; }
    if (!name.trim() || !cat) { setMsg({ type: "err", text: "Add your business name and category." }); return; }
    if (!address.trim() || address.trim().length < 6) { setMsg({ type: "err", text: "Add your business address so we can place you on the map." }); return; }
    setBusy(true); setMsg(null);
    try {
      const geo = await geocodeAddress(address);
      const ref = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())).slice(0, 8).toUpperCase();
      const answers = {}; BASIC_QUESTIONS.forEach((q, i) => { answers["b" + i] = ans[i]; });
      const { error } = await supabase.from("ceis_submissions").insert({
        user_id: session.user.id,
        business_name: name.trim(), category: cat, address: address.trim(),
        lat: geo.lat, lng: geo.lng,
        answers, evidence: {},
        score_loc: 0, score_sus: 0, score_trn: 0, score_total: score,
        tier: "Basic", status: "basic", ref_code: ref,
      });
      if (error) throw error;
      setDone({ score, located: geo.lat != null });
    } catch (e) {
      setMsg({ type: "err", text: e.message || "Something went wrong." });
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, overflowY: "auto", padding: 24, textAlign: "center", justifyContent: "center" }}>
        <div style={{ width: 96, height: 96, borderRadius: "50%", border: `3px solid ${C.basic}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", background: C.white }}>
          <div style={{ fontFamily: F.serif, fontSize: 34, fontWeight: 700, color: C.basic, lineHeight: 1 }}>{done.score}</div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.soft }}>/100</div>
        </div>
        <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 700, color: C.ink, marginBottom: 6 }}>You're on the map!</div>
        <div style={{ fontFamily: F.body, fontSize: 12.5, color: C.mid, lineHeight: 1.55, maxWidth: 320, margin: "0 auto 20px" }}>
          Your <strong>Basic · self-reported</strong> score is live. {done.located ? "Shoppers can find you now." : "Add a clearer address later to pin your exact spot."} Upgrade anytime to a <strong>verified CEIS™</strong> score for a premium, trust-building badge.
        </div>
        <button onClick={() => go("map")} style={{ background: GRAD, color: C.white, fontFamily: F.body, fontSize: 14, fontWeight: 700, padding: "13px", border: "none", borderRadius: 12, cursor: "pointer", marginBottom: 10 }}>See me on the map →</button>
        <button onClick={() => go("bizPricing")} style={{ background: C.white, color: C.ink, fontFamily: F.body, fontSize: 13, fontWeight: 700, padding: "12px", border: `1px solid ${C.border}`, borderRadius: 12, cursor: "pointer" }}>Upgrade to a verified score</button>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.white, overflowY: "auto" }}>
      <div style={{ padding: "18px 22px 8px" }}>
        <span onClick={() => back()} style={{ fontSize: 13, color: C.soft, cursor: "pointer" }}>← Back</span>
        <Tag color={C.basic}>FREE · BASIC SCORE</Tag>
        <div style={{ fontFamily: F.serif, fontSize: 23, fontWeight: 700, color: C.ink, lineHeight: 1.1, marginTop: 8 }}>Get on the map in a minute</div>
        <div style={{ fontFamily: F.body, fontSize: 12.5, color: C.mid, marginTop: 6, lineHeight: 1.5 }}>
          A quick self-report — no documents, no review. It posts a <strong>Basic · self-reported</strong> pin instantly. (Want the premium verified CEIS™ score? That's the full assessment.)
        </div>
      </div>

      <div style={{ padding: "8px 22px 22px" }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Business name" style={inpBasic} />
        <select value={cat} onChange={e => setCat(e.target.value)} style={{ ...inpBasic, color: cat ? C.ink : C.soft }}>
          <option value="">Choose a category…</option>
          {["Restaurant", "Café", "Grocery", "Retail", "Services", "Wellness", "Other"].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Street address (places you on the map)" style={inpBasic} />

        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.soft, letterSpacing: "0.1em", margin: "14px 0 8px" }}>YOUR BASICS · TAP WHAT'S TRUE</div>
        {BASIC_QUESTIONS.map((q, i) => (
          <div key={i} onClick={() => setAns(a => a.map((v, n) => n === i ? !v : v))}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 8, borderRadius: 12, cursor: "pointer", border: `1.5px solid ${ans[i] ? C.teal : C.border}`, background: ans[i] ? C.ltTeal : C.white }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: ans[i] ? C.teal : C.white, border: `1.5px solid ${ans[i] ? C.teal : C.border}`, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{ans[i] ? "✓" : ""}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.ink }}>{q[0]}</div>
              <div style={{ fontFamily: F.body, fontSize: 10.5, color: C.soft }}>{q[1]}</div>
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: ans[i] ? C.teal : C.soft }}>+{q[2]}</div>
          </div>
        ))}

        <div style={{ background: C.bg, borderRadius: 12, padding: "12px 14px", marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: F.body, fontSize: 12, color: C.soft }}>Claimed basics</span>
            <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 700, color: C.soft }}>{claimed}/100</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.ink }}>Your Basic score</span>
            <span style={{ fontFamily: F.serif, fontSize: 26, fontWeight: 700, color: C.basic }}>{score}<span style={{ fontSize: 13, color: C.soft }}>/100</span></span>
          </div>
          <div style={{ fontFamily: F.body, fontSize: 10.5, color: C.soft, lineHeight: 1.45, marginTop: 8 }}>
            Self-reported claims count at <strong>55%</strong> until independently verified (CEIS™ Evidence Tier 5). A verified assessment unlocks your full score — always higher than a Basic one.
          </div>
        </div>

        {msg && <div style={{ fontFamily: F.body, fontSize: 11.5, color: msg.type === "err" ? C.red : C.green, margin: "6px 0" }}>{msg.text}</div>}

        <button onClick={submit} disabled={busy} style={{ width: "100%", background: GRAD, color: C.white, fontFamily: F.body, fontSize: 14, fontWeight: 700, padding: "14px", border: "none", borderRadius: 12, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1, marginTop: 8 }}>
          {busy ? "Posting…" : "Post my free Basic score →"}
        </button>
      </div>
    </div>
  );
}
const inpBasic = { width: "100%", fontFamily: F.body, fontSize: 14, color: C.ink, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "13px 14px", marginBottom: 10, outline: "none", boxSizing: "border-box" };

// ═════════════════════════════════════════════════════════
// SCREEN REGISTRY
// ═════════════════════════════════════════════════════════
const SCREENS = {
  welcome:       { flow: "consumer", screen: "01 · WELCOME",       label: "Choose your path — shopper or business owner",      render: (nav) => <WelcomeScreen {...nav} /> },
  shopperWelcome:{ flow: "consumer", screen: "01b · SHOPPER PITCH", label: "Why DollarVote matters — the shopper manifesto",     render: (nav) => <ShopperWelcomeScreen {...nav} /> },
  consumerHome:  { flow: "consumer", screen: "02 · CONSUMER HOME", label: "Home feed with 'Local Impact' card (Upside-style)",  render: (nav, data) => <ConsumerHomeScreen {...nav} biz={data.biz} source={data.source} geo={data.geo} /> },
  map:           { flow: "consumer", screen: "03 · MAP",           label: "Map view — score markers + bottom sheet preview",    render: (nav, data) => <MapScreen {...nav} biz={data.biz} geo={data.geo} requestLocation={data.requestLocation} setManual={data.setManual} /> },
  categories:    { flow: "consumer", screen: "04 · CATEGORIES",    label: "Browse by category — Restaurant, Retail, Services",  render: (nav) => <CategoriesScreen {...nav} /> },
  profile:       { flow: "consumer", screen: "05 · PROFILE",       label: "Business detail — 'Where your $10 goes' breakdown",  render: (nav, data) => <BusinessProfileScreen {...nav} biz={data.selectedBiz} /> },
  impact:        { flow: "consumer", screen: "06 · MY IMPACT",     label: "Personal impact tracker — your local % over time",   render: (nav, data) => <ImpactScreen {...nav} session={data.session} isActive={data.isActive} /> },
  shopperJoin:   { flow: "consumer", screen: "06b · MEMBERSHIP",   label: "Shopper membership — $4.99/mo sign-up + checkout",   render: (nav, data) => <ShopperJoinScreen {...nav} session={data.session} /> },
  bizWelcome:    { flow: "business", screen: "07 · BIZ WELCOME",   label: "Why your DollarVote score is worth pursuing",        render: (nav) => <BizWelcomeScreen {...nav} /> },
  auth:          { flow: "business", screen: "08 · ACCOUNT",       label: "Sign up or log in as a business owner",              render: (nav, data) => <AuthScreen {...nav} session={data.session} /> },
  bizPricing:    { flow: "business", screen: "09 · PRICING",       label: "Tier selector — Free / Starter / Growth / Premium",  render: (nav, data) => <BizPricingScreen {...nav} session={data.session} /> },
  basicScore:    { flow: "business", screen: "09b · BASIC SCORE",  label: "Free self-reported Basic score — auto-posts to the map", render: (nav, data) => <BasicScoreScreen {...nav} session={data.session} /> },
  bizDashboard:  { flow: "business", screen: "10 · DASHBOARD",     label: "Live dashboard — score, analytics, score improvers", render: (nav, data) => <BizDashboardScreen {...nav} session={data.session} /> },
  bizStats:      { flow: "business", screen: "10b · STATS",        label: "Real score breakdown + your assessment record",      render: (nav, data) => <BizStatsScreen {...nav} session={data.session} /> },
  bizImprove:    { flow: "business", screen: "10c · IMPROVE",      label: "Points to next tier + prioritized quick wins",       render: (nav, data) => <BizImproveScreen {...nav} session={data.session} /> },
  bizProfile:    { flow: "business", screen: "10d · PROFILE",      label: "Public-profile preview + business details + account", render: (nav, data) => <BizProfileScreen {...nav} session={data.session} /> },
  admin:         { flow: "admin",    screen: "★ ADMIN",            label: "Review queue — approve & publish submissions",       render: (nav, data) => <AdminScreen {...nav} session={data.session} /> },
};

const CONSUMER_ORDER = ["welcome", "shopperWelcome", "consumerHome", "map", "categories", "profile", "impact", "shopperJoin"];
const BUSINESS_ORDER = ["bizWelcome", "auth", "bizPricing", "basicScore", "bizDashboard", "bizStats", "bizImprove", "bizProfile"];

// ═════════════════════════════════════════════════════════
// INTERACTIVE PROTOTYPE — single phone with real navigation
// ═════════════════════════════════════════════════════════
// Read an optional starting screen from the URL so other pages can deep-link in.
// e.g. "/?screen=auth" (or "#auth") opens the sign-in screen directly.
function initialStack() {
  try {
    const params = new URLSearchParams(window.location.search);
    const target = params.get("screen") || window.location.hash.replace("#", "");
    if (target && SCREENS[target]) {
      // Start at welcome so a Back button still makes sense, then the deep-linked screen on top.
      return target === "welcome" ? ["welcome"] : ["welcome", target];
    }
  } catch { /* ignore */ }
  return ["welcome"];
}

function Prototype() {
  const [stack, setStack] = useState(initialStack);
  const [selectedBiz, setSelectedBiz] = useState(null);
  const current = stack[stack.length - 1];
  const { biz, source } = useBusinesses();
  const { session } = useAuth();
  const { isActive } = useSubscription(session);
  const { geo, requestLocation, setManual } = useGeo();

  const nav = {
    go: (key, b) => { if (b !== undefined) setSelectedBiz(b); setStack((s) => [...s, key]); },
    back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
  };
  const restart = () => setStack(["welcome"]);

  const meta = SCREENS[current];
  const canGoBack = stack.length > 1;

  const ctrlBtn = (enabled) => ({
    fontFamily: F.body, fontSize: 13, fontWeight: 600,
    padding: "8px 16px", borderRadius: 50, cursor: enabled ? "pointer" : "not-allowed",
    background: "rgba(255,255,255,0.55)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.6)",
    boxShadow: "0 4px 16px rgba(15,21,37,0.08)",
    color: enabled ? C.ink : C.soft, opacity: enabled ? 1 : 0.5,
    display: "inline-flex", alignItems: "center", gap: 6,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      {/* Prototype controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={nav.back} disabled={!canGoBack} style={ctrlBtn(canGoBack)}>← Back</button>
        <button onClick={restart} style={ctrlBtn(true)}>🏠 Restart</button>
        <button onClick={() => nav.go("admin")} style={ctrlBtn(true)}>★ Admin</button>
        <span style={{ fontFamily: F.mono, fontSize: 10, color: C.soft, letterSpacing: "0.1em", marginLeft: 4 }}>{meta.screen}</span>
      </div>

      {/* Data-source badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        fontFamily: F.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
        padding: "5px 12px", borderRadius: 50,
        background: source === "database" ? "rgba(125,200,50,0.14)" : "rgba(110,110,115,0.1)",
        color: source === "database" ? C.green : C.mid,
        border: `1px solid ${source === "database" ? "rgba(125,200,50,0.4)" : C.border}`,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: source === "database" ? C.green : C.soft }} />
        {source === "database" ? "LIVE FROM DATABASE" : "SAMPLE DATA"}
      </div>

      {/* The live phone */}
      <PhoneFrame>{meta.render(nav, { biz, source, session, isActive, geo, requestLocation, setManual, selectedBiz })}</PhoneFrame>

      {/* Hint */}
      <div style={{ fontFamily: F.body, fontSize: 12, color: C.mid, textAlign: "center", maxWidth: 320, lineHeight: 1.5 }}>
        Tap around — the buttons, cards, and bottom tabs all navigate. Start by choosing
        <strong> Shopper</strong> or <strong>Business Owner</strong>.
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// ALL-SCREENS GALLERY (the original design overview)
// ═════════════════════════════════════════════════════════
function Gallery() {
  const [activeFlow, setActiveFlow] = useState("all");

  const keys =
    activeFlow === "consumer" ? CONSUMER_ORDER
    : activeFlow === "business" ? BUSINESS_ORDER
    : [...CONSUMER_ORDER, ...BUSINESS_ORDER];

  return (
    <>
      {/* Flow filter */}
      <div style={{ maxWidth: 1400, margin: "0 auto 32px", display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
        {[
          { id: "all", label: "All Screens", icon: "📱", count: 9 },
          { id: "consumer", label: "Consumer Flow", icon: "🛍", count: 6 },
          { id: "business", label: "Business Owner Flow", icon: "🏪", count: 3 },
        ].map(f => (
          <button key={f.id} onClick={() => setActiveFlow(f.id)} style={{
            background: activeFlow === f.id ? C.ink : "rgba(255,255,255,0.55)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            color: activeFlow === f.id ? C.white : C.mid,
            border: activeFlow === f.id ? "1.5px solid " + C.ink : "1px solid rgba(255,255,255,0.6)",
            boxShadow: "0 4px 16px rgba(15,21,37,0.08)",
            borderRadius: 50, padding: "10px 20px",
            fontFamily: F.body, fontSize: 13, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            transition: "all 0.2s",
          }}>
            <span>{f.icon}</span>
            <span>{f.label}</span>
            <span style={{ fontFamily: F.mono, fontSize: 10, opacity: 0.7, padding: "2px 7px", background: activeFlow === f.id ? "rgba(255,255,255,0.15)" : C.bg, borderRadius: 50 }}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Screens grid */}
      <div style={{
        maxWidth: 1400, margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(290px, max-content))",
        justifyContent: "center",
        gap: "48px 36px",
      }}>
        {keys.map(k => (
          <Phone key={k} label={SCREENS[k].label} screen={SCREENS[k].screen}>
            {SCREENS[k].render({}, { biz: SAMPLE_BIZ, source: "sample", session: null, isActive: false })}
          </Phone>
        ))}
      </div>

      {/* Footer note */}
      <div style={{ ...glass(0.55), maxWidth: 700, margin: "80px auto 0", textAlign: "center", padding: "32px", borderRadius: 20 }}>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.teal, letterSpacing: "0.14em", fontWeight: 600, marginBottom: 8 }}>DESIGN PRINCIPLES</div>
        <h3 style={{ fontFamily: F.serif, fontSize: 22, color: C.ink, fontWeight: 700, marginBottom: 14, lineHeight: 1.2 }}>
          Following Upside's UX <em>blueprint.</em>
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, textAlign: "left", marginTop: 18 }}>
          {[
            ["Map-first discovery", "Big visual map with score-bubble markers — like Upside's gas station view."],
            ["Prominent value tracker", "Your 'Local Impact' card replaces Upside's cashback totals."],
            ["One-tap actions", "Profile · Directions · Save — all reachable in 1 tap."],
            ["Two clear paths", "Welcome screen splits shoppers from business owners immediately."],
          ].map(([t, d]) => (
            <div key={t}>
              <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 4 }}>{t}</div>
              <div style={{ fontFamily: F.body, fontSize: 11, color: C.mid, lineHeight: 1.5 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ═════════════════════════════════════════════════════════
// MAIN APP — toggle between interactive prototype & gallery
// ═════════════════════════════════════════════════════════
// ═════════════════════════════════════════════════════════
// APP MODE — clean, full-screen product (what real users see)
// The app fills the viewport like a native app: no prototype
// chrome, no marketing header, no phone frame.
// ═════════════════════════════════════════════════════════
function AppMode() {
  const [stack, setStack] = useState(initialStack);
  const [selectedBiz, setSelectedBiz] = useState(null);
  const current = stack[stack.length - 1];
  const { biz, source } = useBusinesses();
  const { session } = useAuth();
  const { isActive } = useSubscription(session);
  const { geo, requestLocation, setManual } = useGeo();

  const nav = {
    go: (key, b) => { if (b !== undefined) setSelectedBiz(b); setStack((s) => [...s, key]); },
    back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
  };
  const meta = SCREENS[current];

  return (
    <div style={{
      position: "fixed", inset: 0,
      maxWidth: 480, margin: "0 auto",
      background: C.white,
      boxShadow: "0 0 60px rgba(15,21,37,0.10)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        {meta.render(nav, { biz, source, session, isActive, geo, requestLocation, setManual, selectedBiz })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// SHOWCASE — the designer/prototype preview (header + toggle)
// Reachable at "?showcase=1" for design review.
// ═════════════════════════════════════════════════════════
function Showcase() {
  const [view, setView] = useState("prototype");

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #FAFAFB 0%, #F0F4FF 100%)",
      fontFamily: F.body,
      padding: "40px 20px 80px",
    }}>
      {/* Top header */}
      <div style={{ maxWidth: 1400, margin: "0 auto 28px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.white, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}><img src="/logo.png" alt="DollarVote" style={{ width: 34, height: 34, objectFit: "contain" }} /></div>
          <span style={{ fontFamily: F.serif, fontSize: 28, fontWeight: 700, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>DollarVote</span>
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 11, color: C.lime, letterSpacing: "0.18em", marginBottom: 10, fontWeight: 600 }}>INTERACTIVE PROTOTYPE · INSPIRED BY UPSIDE</div>
        <h1 style={{ fontFamily: F.serif, fontSize: "clamp(2rem, 4vw, 3.2rem)", color: C.ink, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: 12 }}>
          The conscious commerce app.<br/>
          <em style={{ background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Two flows. One mission.</em>
        </h1>
      </div>

      {/* View toggle: Prototype vs All Screens */}
      <div style={{ maxWidth: 1400, margin: "0 auto 36px", display: "flex", justifyContent: "center", gap: 8 }}>
        {[
          { id: "prototype", label: "▶ Interactive Prototype" },
          { id: "gallery", label: "▦ All Screens" },
        ].map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            background: view === v.id ? C.ink : "rgba(255,255,255,0.55)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            color: view === v.id ? C.white : C.mid,
            border: view === v.id ? "1.5px solid " + C.ink : "1px solid rgba(255,255,255,0.6)",
            boxShadow: "0 4px 16px rgba(15,21,37,0.08)",
            borderRadius: 50, padding: "10px 22px",
            fontFamily: F.body, fontSize: 13, fontWeight: 700,
            cursor: "pointer", transition: "all 0.2s",
          }}>{v.label}</button>
        ))}
      </div>

      {view === "prototype" ? <Prototype /> : <Gallery />}
    </div>
  );
}

export default function App() {
  // Default to clean app mode. The prototype showcase is available at ?showcase=1.
  const showcase = (() => {
    try { return new URLSearchParams(window.location.search).has("showcase"); }
    catch { return false; }
  })();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        html, body, #root {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 2px; }
      `}</style>
      {showcase ? <Showcase /> : <AppMode />}
    </>
  );
}
