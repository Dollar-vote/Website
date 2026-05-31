import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

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

// Sample biz data — used as a fallback if the database isn't reachable.
const SAMPLE_BIZ = [
  { id:1, name:"Maria's Soap Studio",     cat:"Retail",     score:91, loc:36, sus:27, trn:28, hood:"Eastern Market", verified:true,  emoji:"🧼", local:8.30, distance:"0.4 mi" },
  { id:2, name:"Rootwork Kitchen",        cat:"Restaurant", score:87, loc:34, sus:26, trn:27, hood:"Corktown",       verified:true,  emoji:"🍽️", local:7.90, distance:"0.6 mi" },
  { id:3, name:"Ironwood Coffee Co.",     cat:"Café",       score:88, loc:35, sus:26, trn:27, hood:"Midtown",        verified:true,  emoji:"☕", local:8.10, distance:"0.8 mi" },
  { id:4, name:"Harbor & Grain Bakery",   cat:"Bakery",     score:85, loc:33, sus:25, trn:27, hood:"Hamtramck",      verified:true,  emoji:"🥐", local:7.50, distance:"1.2 mi" },
  { id:5, name:"Confluence Yoga",         cat:"Wellness",   score:88, loc:35, sus:26, trn:27, hood:"West Village",   verified:true,  emoji:"🧘", local:7.80, distance:"1.5 mi" },
  { id:6, name:"Detroit Fix-It Co.",      cat:"Home Svc",   score:79, loc:31, sus:23, trn:25, hood:"East English Vil",verified:false, emoji:"🔧", local:7.10, distance:"2.1 mi" },
];

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
    emoji: r.emoji || "🏬",
    local: Number(r.local_per_10) || 0,
    distance: r.distance || "",
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
    ["📈", "Stats", null],
    ["🚀", "Improve", null],
    ["⚙️", "Profile", null],
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
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: C.white, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.serif, fontSize: 30, fontWeight: 700, color: C.blue }}>$</div>
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
          <button onClick={() => go("consumerHome")} style={{ background: C.white, color: C.blue, fontFamily: F.body, fontSize: 14, fontWeight: 700, padding: "16px", border: "none", borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
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

        {/* PBC tag */}
        <div style={{ position: "absolute", bottom: -30, left: 0, right: 0, textAlign: "center" }}>
          <div style={{ fontFamily: F.mono, fontSize: 8.5, color: "rgba(255,255,255,0.6)", letterSpacing: "0.12em" }}>DELAWARE PUBLIC BENEFIT CORP</div>
        </div>
      </div>
    </div>
  );
}

// SCREEN 2 — Consumer Home (Upside-inspired map + offers feed)
function ConsumerHomeScreen({ go = () => {}, biz = SAMPLE_BIZ, source = "sample" }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.white, overflow: "hidden", position: "relative" }}>
      {/* Top: location + greeting */}
      <div style={{ padding: "8px 18px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.soft, letterSpacing: "0.12em" }}>YOUR LOCATION</div>
          <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 4 }}>
            📍 Detroit, MI <span style={{ color: C.soft, fontSize: 10 }}>▾</span>
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
          <div key={b.id} onClick={() => go("profile")} style={{ ...glass(0.55), borderRadius: 14, padding: 12, marginBottom: 8, display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
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

// SCREEN 3 — Map View (Google Maps-style)
function MapScreen({ go = () => {} }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.white, position: "relative" }}>
      {/* Search bar overlay */}
      <div style={{ position: "absolute", top: 44, left: 14, right: 14, zIndex: 10 }}>
        <div style={{ ...glass(0.7), borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>🔍</span>
          <span style={{ fontFamily: F.body, fontSize: 12.5, color: C.ink, flex: 1, fontWeight: 600 }}>Eastern Market, Detroit</span>
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.teal, fontWeight: 700, letterSpacing: "0.06em" }}>6 RESULTS</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, overflowX: "auto" }}>
          {["All", "90+", "75+", "Verified", "☕", "🍽️"].map((f, i) => (
            <div key={f} style={{ background: i===0 ? C.ink : C.white, color: i===0 ? C.white : C.mid, padding: "5px 11px", borderRadius: 50, fontFamily: F.body, fontSize: 10.5, fontWeight: 600, whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>{f}</div>
          ))}
        </div>
      </div>

      {/* Map area */}
      <div style={{ flex: 1, background: "#E8EDF5", position: "relative", overflow: "hidden" }}>
        {/* Roads */}
        {[20, 38, 56, 74].map(p => (
          <div key={`h${p}`} style={{ position: "absolute", left: 0, right: 0, top: `${p}%`, height: 3, background: "rgba(255,255,255,0.7)" }} />
        ))}
        {[15, 35, 55, 75].map(p => (
          <div key={`v${p}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${p}%`, width: 3, background: "rgba(255,255,255,0.7)" }} />
        ))}
        {/* River */}
        <div style={{ position: "absolute", top: "78%", left: 0, right: 0, height: 30, background: "#C5D5F0" }} />

        {/* Markers */}
        {[
          { x: 22, y: 30, score: 91 },
          { x: 48, y: 24, score: 87 },
          { x: 38, y: 50, score: 88 },
          { x: 68, y: 42, score: 85 },
          { x: 72, y: 64, score: 88 },
          { x: 18, y: 60, score: 79 },
        ].map((m, i) => (
          <div key={i} onClick={() => go("profile")} style={{ position: "absolute", left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%, -100%)", cursor: "pointer" }}>
            <div style={{ background: C.white, borderRadius: 10, padding: "5px 8px 4px", border: `2px solid ${scoreColor(m.score)}`, boxShadow: "0 4px 8px rgba(0,0,0,0.2)", minWidth: 38, textAlign: "center", position: "relative" }}>
              <div style={{ fontFamily: F.serif, fontSize: 13, fontWeight: 700, color: scoreColor(m.score), lineHeight: 1 }}>{m.score}</div>
              <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", border: "6px solid transparent", borderTop: `6px solid ${scoreColor(m.score)}`, borderBottom: "none" }} />
            </div>
          </div>
        ))}

        {/* Center "you are here" pin */}
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 16, height: 16, borderRadius: "50%", background: C.blue, border: "3px solid white", boxShadow: "0 0 0 8px rgba(26,58,143,0.2)" }} />
      </div>

      {/* Bottom sheet — selected business preview (Upside style) */}
      <div style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: "14px 18px 12px", boxShadow: "0 -4px 30px rgba(15,21,37,0.12)", position: "relative" }}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 12px" }} />
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.ltBlue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🧼</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.serif, fontSize: 15, fontWeight: 700, color: C.ink }}>Maria's Soap Studio</div>
            <div style={{ fontFamily: F.body, fontSize: 10.5, color: C.soft }}>Eastern Market · 0.4 mi away</div>
            <Tag color={C.green}>✓ Champion · 91/100</Tag>
          </div>
          <ScoreBadge score={91} size={42} />
        </div>
        <div style={{ background: C.ltLime, borderRadius: 10, padding: "8px 12px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>💚</span>
          <span style={{ fontFamily: F.body, fontSize: 11, color: C.ink, flex: 1 }}><strong>$8.30 of every $10 stays local</strong></span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => go("profile")} style={{ flex: 1, background: GRAD, color: C.white, fontFamily: F.body, fontSize: 12, fontWeight: 700, padding: "10px", border: "none", borderRadius: 10, cursor: "pointer" }}>View Profile</button>
          <button style={{ flex: 1, background: C.bg, color: C.ink, fontFamily: F.body, fontSize: 12, fontWeight: 600, padding: "10px", border: "none", borderRadius: 10, cursor: "pointer" }}>Directions</button>
        </div>
      </div>
    </div>
  );
}

// SCREEN 4 — Business Profile (after tap)
function BusinessProfileScreen({ back = () => {} }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, overflowY: "auto" }}>
      {/* Hero with score */}
      <div style={{ background: GRAD, padding: "12px 20px 28px", color: C.white, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span onClick={() => back()} style={{ fontSize: 16, cursor: "pointer" }}>← Back</span>
          <span style={{ fontSize: 16 }}>⋯</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🧼</div>
          <div style={{ flex: 1 }}>
            <Tag color={C.lime} bg="rgba(125,200,50,0.15)" outline>✓ DOLLARVOTE VERIFIED</Tag>
            <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 700, marginTop: 4, lineHeight: 1.1 }}>Maria's Soap Studio</div>
            <div style={{ fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>Independent Retail · Eastern Market</div>
          </div>
        </div>
        {/* Big score */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, background: "rgba(255,255,255,0.12)", borderRadius: 14, backdropFilter: "blur(10px)" }}>
          <ScoreBadge score={91} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 700 }}>Community Champion</div>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em" }}>RENEWED FEB 2026 · NEXT FEB 2027</div>
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
      <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <button style={{ background: C.ink, color: C.white, fontFamily: F.body, fontSize: 13, fontWeight: 700, padding: "13px", border: "none", borderRadius: 12, cursor: "pointer" }}>📍 Get Directions</button>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ flex: 1, background: C.white, color: C.ink, fontFamily: F.body, fontSize: 11, fontWeight: 600, padding: "10px", border: `1px solid ${C.border}`, borderRadius: 10, cursor: "pointer" }}>⭐ Save</button>
          <button style={{ flex: 1, background: C.white, color: C.ink, fontFamily: F.body, fontSize: 11, fontWeight: 600, padding: "10px", border: `1px solid ${C.border}`, borderRadius: 10, cursor: "pointer" }}>↗ Share</button>
          <button style={{ flex: 1, background: C.white, color: C.ink, fontFamily: F.body, fontSize: 11, fontWeight: 600, padding: "10px", border: `1px solid ${C.border}`, borderRadius: 10, cursor: "pointer" }}>📞 Call</button>
        </div>
      </div>
    </div>
  );
}

// SCREEN 5 — My Impact (Spending tracker)
function ImpactScreen({ go = () => {} }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "8px 18px 16px", background: C.white }}>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.lime, letterSpacing: "0.12em", fontWeight: 700, marginBottom: 4 }}>YOUR LOCAL IMPACT</div>
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

// SCREEN — Sign up / Log in for business owners
function AuthScreen({ go = () => {}, back = () => {}, session = null }) {
  const [mode, setMode] = useState("signup"); // "signup" | "login"
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [agreed, setAgreed] = useState(false); // Terms & Privacy acceptance (signup only)

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
          <button onClick={() => go("bizPricing")} style={{ background: GRAD, color: C.white, fontFamily: F.body, fontSize: 14, fontWeight: 700, padding: "13px", border: "none", borderRadius: 12, cursor: "pointer", marginBottom: 8 }}>Continue →</button>
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
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
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
      .select("id, business_name, category, score_total, tier, status, ref_code, created_at")
      .order("created_at", { ascending: false });
    if (error) { setState({ phase: "error", rows: [], isAdmin: false, err: error.message }); return; }
    // Confirm admin explicitly (so we can show a clear "not authorized" message).
    const { data: adminRow } = await supabase.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle();
    setState({ phase: "ready", rows: data || [], isAdmin: !!adminRow });
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [session]);

  async function approve(id) {
    setBusyId(id);
    await supabase.from("ceis_submissions").update({ status: "verified" }).eq("id", id);
    await load();
    setBusyId(null);
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

  const pending = state.rows.filter(r => r.status !== "verified");
  const done = state.rows.filter(r => r.status === "verified");

  const card = (r) => (
    <div key={r.id} style={{ ...glass(0.6), borderRadius: 14, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: F.serif, fontSize: 15, fontWeight: 700, color: C.ink }}>{r.business_name}</div>
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.soft, marginTop: 2 }}>{r.category || "—"} · Ref {r.ref_code || "—"}</div>
        </div>
        <ScoreBadge score={Math.round(Number(r.score_total))} size={40} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        <Tag color={r.status === "verified" ? C.green : C.amber}>{r.status}</Tag>
        <span style={{ flex: 1 }} />
        {r.status !== "verified" && (
          <button onClick={() => approve(r.id)} disabled={busyId === r.id} style={{
            background: GRAD, color: C.white, fontFamily: F.body, fontSize: 11, fontWeight: 700,
            padding: "8px 14px", border: "none", borderRadius: 9, cursor: busyId === r.id ? "wait" : "pointer", opacity: busyId === r.id ? 0.7 : 1,
          }}>{busyId === r.id ? "Approving…" : "✓ Approve & publish"}</button>
        )}
      </div>
    </div>
  );

  return wrap(
    <>
      <div style={{ fontFamily: F.mono, fontSize: 9, color: C.soft, letterSpacing: "0.1em", marginBottom: 8 }}>
        PENDING ({pending.length})
      </div>
      {pending.length === 0
        ? <div style={{ fontFamily: F.body, fontSize: 12, color: C.soft, padding: "8px 0 16px" }}>Nothing waiting. 🎉</div>
        : pending.map(card)}

      {done.length > 0 && (
        <>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.soft, letterSpacing: "0.1em", margin: "12px 0 8px" }}>
            VERIFIED ({done.length}) · now public
          </div>
          {done.map(card)}
        </>
      )}
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
            Stop competing with Amazon on price. Start competing on community.
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
    { key: "free",    name: "Free", price: "$0", per: "forever", color: C.mid, popular: false, features: ["Basic profile", "Score published", "QR scorecard", "Map listing"] },
    { key: "starter", name: "Starter", price: "$29", per: "/mo", color: C.blue, popular: false, features: ["Everything in Free", "Score assessment", "Peer benchmarks", "Improvement roadmap"] },
    { key: "growth",  name: "Growth", price: "$59", per: "/mo", color: C.teal, popular: true, features: ["Everything in Starter", "Verified badge", "Priority placement", "Review responses", "Story page"] },
    { key: "premium", name: "Premium", price: "$99", per: "/mo", color: C.lime, popular: false, features: ["Everything in Growth", "Full analytics", "Demographic data", "API access", "Account manager"] },
  ];

  async function choose(t) {
    if (!session) { go("auth"); return; }
    // Free tier: no payment — go straight to the assessment.
    if (t.key === "free") { openAssessment(); go("bizDashboard"); return; }
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
      .select("business_name, category, score_total, score_loc, score_sus, score_trn, tier, status, ref_code, created_at")
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

  // Real data when the owner has a submission; sample data otherwise (e.g. the gallery).
  const bizName = sub ? sub.business_name : "Maria's Soap Studio";
  const total   = sub ? Math.round(Number(sub.score_total)) : 91;
  const tier    = sub ? sub.tier : "Community Champion";
  const isVerified = sub ? sub.status === "verified" : true;
  const statusLabel = !sub ? "✓ COMMUNITY CHAMPION · VERIFIED"
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
          <div style={{ position: "absolute", right: -20, top: -20, fontSize: 100, opacity: 0.1 }}>{isVerified ? "🏆" : "⏳"}</div>
          <Tag color={C.lime} bg="rgba(125,200,50,0.2)" outline>{statusLabel}</Tag>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
            <ScoreBadge score={total} size={62} />
            <div>
              <div style={{ fontFamily: F.serif, fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{total}</div>
              <div style={{ fontFamily: F.body, fontSize: 10, opacity: 0.85, marginTop: 2 }}>
                {sub
                  ? (isVerified ? "Verified & live in the directory" : "Projected — pending verification")
                  : "↑ 4 pts since last quarter"}
              </div>
            </div>
          </div>
          {sub && (
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              {[["Locality", sub.score_loc, 40], ["Sustainability", sub.score_sus, 30], ["Transparency", sub.score_trn, 30]].map(([lbl, v, max]) => (
                <div key={lbl} style={{ flex: 1, background: "rgba(255,255,255,0.14)", borderRadius: 8, padding: "7px 8px" }}>
                  <div style={{ fontFamily: F.mono, fontSize: 7.5, opacity: 0.8, letterSpacing: "0.06em" }}>{String(lbl).toUpperCase()}</div>
                  <div style={{ fontFamily: F.serif, fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>{Math.round(Number(v))}<span style={{ fontSize: 9, opacity: 0.7 }}>/{max}</span></div>
                </div>
              ))}
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

// ═════════════════════════════════════════════════════════
// SCREEN REGISTRY
// ═════════════════════════════════════════════════════════
const SCREENS = {
  welcome:       { flow: "consumer", screen: "01 · WELCOME",       label: "Choose your path — shopper or business owner",      render: (nav) => <WelcomeScreen {...nav} /> },
  consumerHome:  { flow: "consumer", screen: "02 · CONSUMER HOME", label: "Home feed with 'Local Impact' card (Upside-style)",  render: (nav, data) => <ConsumerHomeScreen {...nav} biz={data.biz} source={data.source} /> },
  map:           { flow: "consumer", screen: "03 · MAP",           label: "Map view — score markers + bottom sheet preview",    render: (nav) => <MapScreen {...nav} /> },
  categories:    { flow: "consumer", screen: "04 · CATEGORIES",    label: "Browse by category — Restaurant, Retail, Services",  render: (nav) => <CategoriesScreen {...nav} /> },
  profile:       { flow: "consumer", screen: "05 · PROFILE",       label: "Business detail — 'Where your $10 goes' breakdown",  render: (nav) => <BusinessProfileScreen {...nav} /> },
  impact:        { flow: "consumer", screen: "06 · MY IMPACT",     label: "Personal impact tracker — your local % over time",   render: (nav) => <ImpactScreen {...nav} /> },
  bizWelcome:    { flow: "business", screen: "07 · BIZ WELCOME",   label: "Why your DollarVote score is worth pursuing",        render: (nav) => <BizWelcomeScreen {...nav} /> },
  auth:          { flow: "business", screen: "08 · ACCOUNT",       label: "Sign up or log in as a business owner",              render: (nav, data) => <AuthScreen {...nav} session={data.session} /> },
  bizPricing:    { flow: "business", screen: "09 · PRICING",       label: "Tier selector — Free / Starter / Growth / Premium",  render: (nav, data) => <BizPricingScreen {...nav} session={data.session} /> },
  bizDashboard:  { flow: "business", screen: "10 · DASHBOARD",     label: "Live dashboard — score, analytics, score improvers", render: (nav, data) => <BizDashboardScreen {...nav} session={data.session} /> },
  admin:         { flow: "admin",    screen: "★ ADMIN",            label: "Review queue — approve & publish submissions",       render: (nav, data) => <AdminScreen {...nav} session={data.session} /> },
};

const CONSUMER_ORDER = ["welcome", "consumerHome", "map", "categories", "profile", "impact"];
const BUSINESS_ORDER = ["bizWelcome", "auth", "bizPricing", "bizDashboard"];

// ═════════════════════════════════════════════════════════
// INTERACTIVE PROTOTYPE — single phone with real navigation
// ═════════════════════════════════════════════════════════
function Prototype() {
  const [stack, setStack] = useState(["welcome"]);
  const current = stack[stack.length - 1];
  const { biz, source } = useBusinesses();
  const { session } = useAuth();

  const nav = {
    go: (key) => setStack((s) => [...s, key]),
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
      <PhoneFrame>{meta.render(nav, { biz, source, session })}</PhoneFrame>

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
            {SCREENS[k].render({}, { biz: SAMPLE_BIZ, source: "sample", session: null })}
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
export default function App() {
  const [view, setView] = useState("prototype");

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #FAFAFB 0%, #F0F4FF 100%)",
      fontFamily: F.body,
      padding: "40px 20px 80px",
    }}>
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

      {/* Top header */}
      <div style={{ maxWidth: 1400, margin: "0 auto 28px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.serif, fontSize: 22, fontWeight: 700, color: C.white }}>$</div>
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
