import { useState } from "react";

// ─────────────────────────────────────────────
// CLEANER APPLE-NATIVE COLOR SYSTEM
// ─────────────────────────────────────────────
const C = {
  blue:    "#1A3A8F",
  blueMid: "#1A5BA0",
  teal:    "#1A8FA0",
  tealLt:  "#22B5CC",
  lime:    "#7DC832",
  ink:     "#000000",
  primary: "#1D1D1F",   // Apple's near-black
  secondary: "#86868B", // Apple's secondary text
  tertiary: "#C7C7CC",  // Apple's tertiary
  separator: "#E5E5EA", // Apple's separator
  bg:      "#F2F2F7",   // Apple's grouped bg
  white:   "#FFFFFF",
  ltBlue:  "#EBF0FF",
  ltTeal:  "#E5F5F8",
  ltLime:  "#F0FAEB",
  red:     "#FF3B30",   // Apple system red
  green:   "#34C759",   // Apple system green
  amber:   "#FF9500",   // Apple system orange
};

// Apple-native font stack — SF Pro on Apple devices, Inter elsewhere
const F = {
  sans:  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', Roboto, sans-serif",
  text:  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Segoe UI', Roboto, sans-serif",
  mono:  "'SF Mono', 'JetBrains Mono', Menlo, monospace",
};

// iOS Typography Scale (mirrors Apple HIG)
const T = {
  largeTitle:   { fontFamily: F.sans, fontSize: 28,   fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.14 },
  title1:       { fontFamily: F.sans, fontSize: 22,   fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.18 },
  title2:       { fontFamily: F.sans, fontSize: 17,   fontWeight: 600, letterSpacing: "-0.005em",lineHeight: 1.25 },
  title3:       { fontFamily: F.sans, fontSize: 15,   fontWeight: 600, letterSpacing: "-0.005em",lineHeight: 1.3 },
  body:         { fontFamily: F.text, fontSize: 14,   fontWeight: 400, letterSpacing: "-0.005em",lineHeight: 1.45 },
  bodyEmph:     { fontFamily: F.text, fontSize: 14,   fontWeight: 500, letterSpacing: "-0.005em",lineHeight: 1.45 },
  callout:      { fontFamily: F.text, fontSize: 13,   fontWeight: 400, letterSpacing: "0em",     lineHeight: 1.4 },
  subhead:      { fontFamily: F.text, fontSize: 12,   fontWeight: 500, letterSpacing: "0em",     lineHeight: 1.4 },
  footnote:     { fontFamily: F.text, fontSize: 11,   fontWeight: 400, letterSpacing: "0.005em", lineHeight: 1.35 },
  caption1:     { fontFamily: F.text, fontSize: 10,   fontWeight: 500, letterSpacing: "0.01em",  lineHeight: 1.3 },
  caption2:     { fontFamily: F.mono, fontSize: 9,    fontWeight: 500, letterSpacing: "0.06em",  lineHeight: 1.3, textTransform: "uppercase" },
  number:       { fontFamily: F.sans, fontWeight: 700, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums" },
};

const GRAD     = "linear-gradient(135deg, #1A3A8F 0%, #1A8FA0 52%, #7DC832 100%)";
const GRAD_BT  = "linear-gradient(135deg, #1A3A8F 0%, #1A8FA0 100%)";

// ─────────────────────────────────────────────
function scoreColor(s) {
  if (s >= 90) return C.green;
  if (s >= 75) return C.teal;
  if (s >= 60) return C.amber;
  return "#C87020";
}

const BIZ = [
  { id:1, name:"Maria's Soap Studio",   cat:"Retail",     score:91, loc:36, sus:27, trn:28, hood:"Eastern Market", verified:true,  emoji:"🧼", local:8.30, distance:"0.4 mi" },
  { id:2, name:"Rootwork Kitchen",      cat:"Restaurant", score:87, loc:34, sus:26, trn:27, hood:"Corktown",       verified:true,  emoji:"🍽️", local:7.90, distance:"0.6 mi" },
  { id:3, name:"Ironwood Coffee Co.",   cat:"Café",       score:88, loc:35, sus:26, trn:27, hood:"Midtown",        verified:true,  emoji:"☕", local:8.10, distance:"0.8 mi" },
  { id:4, name:"Harbor & Grain Bakery", cat:"Bakery",     score:85, loc:33, sus:25, trn:27, hood:"Hamtramck",      verified:true,  emoji:"🥐", local:7.50, distance:"1.2 mi" },
  { id:5, name:"Confluence Yoga",       cat:"Wellness",   score:88, loc:35, sus:26, trn:27, hood:"West Village",   verified:true,  emoji:"🧘", local:7.80, distance:"1.5 mi" },
  { id:6, name:"Detroit Fix-It Co.",    cat:"Home Svc",   score:79, loc:31, sus:23, trn:25, hood:"E English Vil",  verified:false, emoji:"🔧", local:7.10, distance:"2.1 mi" },
];

// ─────────────────────────────────────────────
// CLEAN ATOMS
// ─────────────────────────────────────────────
function ScoreRing({ score, size = 56 }) {
  const color = scoreColor(score);
  const stroke = size * 0.08;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={radius} stroke={C.separator} strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ ...T.number, fontSize: size * 0.36, color: color, lineHeight: 1 }}>{score}</span>
      </div>
    </div>
  );
}

function Pill({ children, color = C.teal, variant = "filled", size = "sm" }) {
  const styles = {
    filled: { background: `${color}15`, color: color, border: "none" },
    outline: { background: "transparent", color: color, border: `1px solid ${color}30` },
    solid: { background: color, color: C.white, border: "none" },
  }[variant];
  const sizing = size === "sm" ? { padding: "2px 8px", fontSize: 10 } : { padding: "4px 10px", fontSize: 11 };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontFamily: F.text, fontWeight: 600, borderRadius: 50,
      letterSpacing: "0.01em",
      ...sizing, ...styles,
    }}>{children}</span>
  );
}

// ─────────────────────────────────────────────
// PHONE FRAME (refined - quieter labels)
// ─────────────────────────────────────────────
function Phone({ label, screen, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
      <div style={{
        width: 290, background: C.primary, borderRadius: 42,
        padding: 6, boxShadow: "0 24px 48px -8px rgba(0,0,0,0.18), 0 10px 20px -5px rgba(0,0,0,0.08)",
        position: "relative",
      }}>
        {/* Dynamic Island */}
        <div style={{
          position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
          width: 96, height: 26, background: C.primary, borderRadius: 50, zIndex: 100,
        }} />
        {/* Screen */}
        <div style={{
          background: C.white, borderRadius: 36, overflow: "hidden",
          width: "100%", height: 600, position: "relative",
        }}>
          {/* iOS status bar */}
          <div style={{
            height: 44, padding: "12px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between",
            position: "relative", zIndex: 50,
          }}>
            <span style={{ ...T.subhead, fontWeight: 600, color: C.primary }}>9:41</span>
            <span style={{ display: "flex", gap: 5, alignItems: "center", color: C.primary, fontSize: 11 }}>
              <span>􀙇</span><span>􀛨</span><span>􀛪</span>
            </span>
          </div>
          {children}
        </div>
      </div>
      <div style={{ marginTop: 16, textAlign: "center", maxWidth: 290 }}>
        <div style={{ ...T.caption2, color: C.secondary, marginBottom: 4 }}>{screen}</div>
        <div style={{ ...T.title3, color: C.primary }}>{label}</div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// CONSUMER FLOW
// ═════════════════════════════════════════════════════════

function WelcomeScreen() {
  return (
    <div style={{ height: "calc(100% - 44px)", background: GRAD, display: "flex", flexDirection: "column", padding: "0 24px 32px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -80, right: -80, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
      <div style={{ position: "absolute", bottom: -100, left: -100, width: 280, height: 280, borderRadius: "50%", background: "rgba(125,200,50,0.12)" }} />

      <div style={{ position: "relative", zIndex: 2, marginTop: 60, flex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22,
            background: C.white, margin: "0 auto 20px",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
          }}>
            <span style={{ ...T.number, fontSize: 36, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>$</span>
          </div>
          <div style={{ ...T.title1, color: C.white, fontSize: 26 }}>DollarVote</div>
          <div style={{ ...T.footnote, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>Know where your dollar goes</div>
        </div>

        <div style={{ ...T.largeTitle, fontSize: 32, color: C.white, textAlign: "center", marginBottom: 40 }}>
          Every dollar<br />is a vote.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative", zIndex: 2 }}>
        <button style={{
          background: C.white, color: C.primary,
          padding: "16px 20px", border: "none", borderRadius: 16, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 14, boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.ltBlue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🛍</div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ ...T.title2 }}>I'm a Shopper</div>
            <div style={{ ...T.footnote, color: C.secondary }}>Find verified local businesses</div>
          </div>
          <span style={{ color: C.secondary, fontSize: 14 }}>›</span>
        </button>
        <button style={{
          background: "rgba(255,255,255,0.15)", color: C.white,
          padding: "16px 20px", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 16, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 14, backdropFilter: "blur(20px)",
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏪</div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ ...T.title2, color: C.white }}>I'm a Business Owner</div>
            <div style={{ ...T.footnote, color: "rgba(255,255,255,0.7)" }}>Get your DollarVote Score</div>
          </div>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>›</span>
        </button>
      </div>
    </div>
  );
}

function ConsumerHomeScreen() {
  return (
    <div style={{ height: "calc(100% - 44px)", display: "flex", flexDirection: "column", background: C.white, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "8px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ ...T.caption2, color: C.secondary }}>LOCATION</div>
          <div style={{ ...T.title2, display: "flex", alignItems: "center", gap: 4, color: C.primary }}>
            Detroit, MI <span style={{ color: C.secondary, fontSize: 10 }}>⌄</span>
          </div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🔔</div>
      </div>

      {/* Search */}
      <div style={{ padding: "0 20px 14px" }}>
        <div style={{ background: C.bg, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: C.secondary }}>􀊫</span>
          <span style={{ ...T.body, color: C.secondary, flex: 1 }}>Search businesses or ZIP code</span>
        </div>
      </div>

      {/* Local Impact Card */}
      <div style={{ margin: "0 20px 16px", borderRadius: 20, background: GRAD, padding: 18, color: C.white, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -10, bottom: -20, fontSize: 90, opacity: 0.06 }}>♡</div>
        <div style={{ ...T.caption2, color: "rgba(255,255,255,0.8)", marginBottom: 4 }}>LOCAL IMPACT · APRIL</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 12 }}>
          <span style={{ ...T.number, fontSize: 34, color: C.white }}>$284</span>
          <span style={{ ...T.subhead, color: "rgba(255,255,255,0.85)" }}>kept in Detroit</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.2)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: "68%", background: C.lime, borderRadius: 3 }} />
          </div>
          <span style={{ ...T.number, fontSize: 13, color: C.white }}>68%</span>
        </div>
        <div style={{ ...T.footnote, color: "rgba(255,255,255,0.8)", marginTop: 6 }}>vs. 43% national chain avg</div>
      </div>

      {/* Chips */}
      <div style={{ padding: "0 20px 14px", display: "flex", gap: 6, overflowX: "auto" }}>
        {[["Top Scored", true], ["Café", false], ["Food", false], ["Retail", false], ["Wellness", false]].map(([lbl, on]) => (
          <div key={lbl} style={{
            background: on ? C.primary : C.bg, color: on ? C.white : C.primary,
            padding: "7px 14px", borderRadius: 50, whiteSpace: "nowrap",
            ...T.subhead, fontWeight: on ? 600 : 500,
          }}>{lbl}</div>
        ))}
      </div>

      {/* List header */}
      <div style={{ padding: "0 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ ...T.title1, color: C.primary }}>Near you</div>
        <span style={{ ...T.subhead, color: C.teal, fontWeight: 600 }}>Map</span>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 12px" }}>
        {BIZ.slice(0, 4).map(b => (
          <div key={b.id} style={{
            background: C.white, padding: "12px 0",
            borderBottom: `0.5px solid ${C.separator}`,
            display: "flex", gap: 12, alignItems: "center",
          }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{b.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...T.title3, color: C.primary, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</div>
              <div style={{ ...T.footnote, color: C.secondary }}>{b.cat} · {b.distance}</div>
              <div style={{ ...T.caption1, color: C.green, fontWeight: 600, marginTop: 3 }}>${b.local.toFixed(2)} of $10 stays local</div>
            </div>
            <ScoreRing score={b.score} size={44} />
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", borderTop: `0.5px solid ${C.separator}`, padding: "8px 0 22px", display: "flex", justifyContent: "space-around" }}>
        {[["􀎟", "Home", true], ["􀙋", "Map", false], ["􀊵", "Impact", false], ["􀋃", "Saved", false], ["􀉭", "You", false]].map(([ico, lbl, on]) => (
          <div key={lbl} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 18, color: on ? C.blue : C.secondary }}>{ico}</span>
            <span style={{ ...T.caption1, color: on ? C.blue : C.secondary, fontWeight: on ? 600 : 500, letterSpacing: 0 }}>{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MapScreen() {
  return (
    <div style={{ height: "calc(100% - 44px)", display: "flex", flexDirection: "column", background: C.white, position: "relative" }}>
      {/* Search overlay */}
      <div style={{ position: "absolute", top: 12, left: 16, right: 16, zIndex: 10 }}>
        <div style={{ background: C.white, borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
          <span style={{ fontSize: 14, color: C.secondary }}>􀊫</span>
          <span style={{ ...T.body, color: C.primary, flex: 1, fontWeight: 500 }}>Eastern Market, Detroit</span>
          <Pill color={C.teal} size="sm">6 found</Pill>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, overflowX: "auto" }}>
          {["All", "90+", "75+", "Verified", "☕", "🍽"].map((f, i) => (
            <div key={f} style={{
              background: i===0 ? C.primary : C.white,
              color: i===0 ? C.white : C.primary,
              ...T.subhead, fontWeight: 600,
              padding: "6px 12px", borderRadius: 50, whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}>{f}</div>
          ))}
        </div>
      </div>

      {/* Map area */}
      <div style={{ flex: 1, background: "#E8EDF5", position: "relative", overflow: "hidden" }}>
        {[20, 38, 56, 74].map(p => <div key={`h${p}`} style={{ position: "absolute", left: 0, right: 0, top: `${p}%`, height: 3, background: "rgba(255,255,255,0.6)" }} />)}
        {[15, 35, 55, 75].map(p => <div key={`v${p}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${p}%`, width: 3, background: "rgba(255,255,255,0.6)" }} />)}
        <div style={{ position: "absolute", top: "78%", left: 0, right: 0, height: 36, background: "#C5D5F0" }} />

        {[
          { x: 22, y: 32, score: 91 },
          { x: 48, y: 26, score: 87 },
          { x: 38, y: 50, score: 88 },
          { x: 68, y: 44, score: 85 },
          { x: 72, y: 64, score: 88 },
          { x: 18, y: 62, score: 79 },
        ].map((m, i) => (
          <div key={i} style={{ position: "absolute", left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%, -100%)" }}>
            <div style={{
              background: C.white, borderRadius: 12, padding: "5px 10px 4px",
              border: `2px solid ${scoreColor(m.score)}`, boxShadow: "0 4px 8px rgba(0,0,0,0.18)",
              minWidth: 40, textAlign: "center", position: "relative",
            }}>
              <span style={{ ...T.number, fontSize: 13, color: scoreColor(m.score) }}>{m.score}</span>
              <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", border: "6px solid transparent", borderTop: `6px solid ${scoreColor(m.score)}`, borderBottom: "none" }} />
            </div>
          </div>
        ))}

        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 16, height: 16, borderRadius: "50%", background: C.blue, border: "3px solid white", boxShadow: "0 0 0 8px rgba(26,58,143,0.18)" }} />
      </div>

      {/* Bottom sheet */}
      <div style={{
        background: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: "12px 20px 16px", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
      }}>
        <div style={{ width: 36, height: 4, background: C.tertiary, borderRadius: 2, margin: "0 auto 14px" }} />
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🧼</div>
          <div style={{ flex: 1 }}>
            <div style={{ ...T.title2, color: C.primary }}>Maria's Soap Studio</div>
            <div style={{ ...T.footnote, color: C.secondary, marginBottom: 4 }}>Eastern Market · 0.4 mi</div>
            <Pill color={C.green}>✓ Champion · 91</Pill>
          </div>
          <ScoreRing score={91} size={44} />
        </div>
        <div style={{ background: C.ltLime, borderRadius: 12, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>💚</span>
          <span style={{ ...T.callout, color: C.primary }}><strong>$8.30 of every $10</strong> stays local</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ flex: 1, background: C.primary, color: C.white, ...T.bodyEmph, fontWeight: 600, padding: "12px", border: "none", borderRadius: 12 }}>View Profile</button>
          <button style={{ flex: 1, background: C.bg, color: C.primary, ...T.bodyEmph, fontWeight: 600, padding: "12px", border: "none", borderRadius: 12 }}>Directions</button>
        </div>
      </div>
    </div>
  );
}

function BusinessProfileScreen() {
  return (
    <div style={{ height: "calc(100% - 44px)", display: "flex", flexDirection: "column", background: C.bg, overflowY: "auto" }}>
      {/* Hero */}
      <div style={{ background: GRAD, padding: "8px 20px 32px", color: C.white }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <span style={{ fontSize: 16 }}>‹ Back</span>
          <span style={{ fontSize: 16 }}>⋯</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🧼</div>
          <div style={{ flex: 1 }}>
            <Pill color={C.lime} variant="outline">✓ VERIFIED</Pill>
            <div style={{ ...T.title1, color: C.white, marginTop: 6 }}>Maria's Soap Studio</div>
            <div style={{ ...T.footnote, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>Independent Retail · Eastern Market</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, background: "rgba(255,255,255,0.12)", borderRadius: 16, backdropFilter: "blur(20px)" }}>
          <ScoreRing score={91} size={60} />
          <div style={{ flex: 1 }}>
            <div style={{ ...T.title2, color: C.white }}>Community Champion</div>
            <div style={{ ...T.caption2, color: "rgba(255,255,255,0.7)" }}>RENEWED FEB 2026</div>
          </div>
        </div>
      </div>

      {/* Where your dollar goes */}
      <div style={{ background: C.white, margin: "-16px 16px 12px", borderRadius: 18, padding: 18, boxShadow: "0 4px 14px rgba(0,0,0,0.06)" }}>
        <div style={{ ...T.caption2, color: C.green, marginBottom: 12 }}>WHERE YOUR $10 GOES</div>
        {[
          ["Maria's wages",            3.40, C.green, 34],
          ["Local MI suppliers",       2.80, C.teal,  28],
          ["Maria's profit",           2.20, C.blueMid, 22],
          ["Printer & utilities",      1.10, C.amber, 11],
          ["Detroit nonprofits",       0.50, C.lime,  5],
        ].map(([lbl, amt, col, pct]) => (
          <div key={lbl} style={{ marginBottom: 9 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ ...T.callout, color: C.primary }}>{lbl}</span>
              <span style={{ ...T.number, fontSize: 11, color: col }}>${amt.toFixed(2)}</span>
            </div>
            <div style={{ height: 4, background: C.separator, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 2 }} />
            </div>
          </div>
        ))}
        <div style={{ marginTop: 14, padding: 12, background: C.ltLime, borderRadius: 12, textAlign: "center" }}>
          <div style={{ ...T.number, fontSize: 24, color: C.green, lineHeight: 1 }}>$8.30</div>
          <div style={{ ...T.footnote, color: C.secondary, marginTop: 3 }}>stays in Michigan · 83% local</div>
        </div>
      </div>

      {/* Pillar breakdown */}
      <div style={{ margin: "0 16px 12px", background: C.white, borderRadius: 18, padding: 18 }}>
        <div style={{ ...T.caption2, color: C.secondary, marginBottom: 12 }}>SCORE BREAKDOWN</div>
        {[
          ["🏘", "Locality", 36, 40, C.blue, "87% local supply chain"],
          ["🌿", "Sustainability", 27, 30, C.teal, "Plastic-free packaging"],
          ["📖", "Transparency", 28, 30, C.lime, "Living wage verified"],
        ].map(([ico, name, s, m, col, desc]) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: `0.5px solid ${C.separator}` }}>
            <div style={{ fontSize: 18, width: 28 }}>{ico}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                <span style={{ ...T.bodyEmph, color: C.primary, fontWeight: 600 }}>{name}</span>
                <span style={{ ...T.number, fontSize: 12, color: col }}>{s}/{m}</span>
              </div>
              <div style={{ ...T.footnote, color: C.secondary }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
        <button style={{ background: C.primary, color: C.white, ...T.bodyEmph, fontWeight: 600, padding: "14px", border: "none", borderRadius: 14 }}>Get Directions</button>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ flex: 1, background: C.white, color: C.primary, ...T.subhead, fontWeight: 600, padding: "12px", border: `0.5px solid ${C.separator}`, borderRadius: 12 }}>􀋃 Save</button>
          <button style={{ flex: 1, background: C.white, color: C.primary, ...T.subhead, fontWeight: 600, padding: "12px", border: `0.5px solid ${C.separator}`, borderRadius: 12 }}>􀈂 Share</button>
          <button style={{ flex: 1, background: C.white, color: C.primary, ...T.subhead, fontWeight: 600, padding: "12px", border: `0.5px solid ${C.separator}`, borderRadius: 12 }}>􀌾 Call</button>
        </div>
      </div>
    </div>
  );
}

function ImpactScreen() {
  return (
    <div style={{ height: "calc(100% - 44px)", display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ padding: "8px 20px 16px", background: C.white }}>
        <div style={{ ...T.caption2, color: C.green, marginBottom: 4 }}>YOUR LOCAL IMPACT</div>
        <div style={{ ...T.largeTitle, color: C.primary }}>April 2026</div>
      </div>

      <div style={{ margin: "0 16px 14px", padding: 20, borderRadius: 20, background: GRAD, color: C.white, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -20, top: -20, fontSize: 120, opacity: 0.05 }}>♡</div>
        <div style={{ ...T.caption2, color: "rgba(255,255,255,0.85)", marginBottom: 6 }}>KEPT IN DETROIT</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 8 }}>
          <span style={{ ...T.number, fontSize: 44, color: C.white, lineHeight: 1 }}>$284</span>
          <span style={{ ...T.number, fontSize: 22, color: "rgba(255,255,255,0.65)" }}>.50</span>
        </div>
        <div style={{ ...T.footnote, color: "rgba(255,255,255,0.85)" }}>↑ 22% from last month · top 22% in Detroit</div>
        <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(255,255,255,0.12)", borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>🏆</span>
          <span style={{ ...T.callout }}><strong>4-month streak</strong> over 60% local</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "0 16px 14px" }}>
        <div style={{ flex: 1, background: C.white, borderRadius: 14, padding: 14 }}>
          <div style={{ ...T.caption2, color: C.secondary, marginBottom: 4 }}>SPENDING</div>
          <div style={{ ...T.number, fontSize: 22, color: C.primary, lineHeight: 1 }}>$418</div>
          <div style={{ ...T.footnote, color: C.secondary, marginTop: 4 }}>This month</div>
        </div>
        <div style={{ flex: 1, background: C.white, borderRadius: 14, padding: 14 }}>
          <div style={{ ...T.caption2, color: C.green, marginBottom: 4 }}>LOCAL %</div>
          <div style={{ ...T.number, fontSize: 22, color: C.green, lineHeight: 1 }}>68%</div>
          <div style={{ ...T.footnote, color: C.secondary, marginTop: 4 }}>vs 43% chain avg</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: "0 16px", overflowY: "auto" }}>
        <div style={{ ...T.caption2, color: C.secondary, marginBottom: 10 }}>RECENT</div>
        {[
          ["Maria's Soap Studio", "🧼", 14.50, 12.04, 91],
          ["Rootwork Kitchen", "🍽️", 38.40, 30.34, 87],
          ["Ironwood Coffee", "☕", 5.75, 4.66, 88],
          ["Whole Foods Market", "🛒", 87.20, 37.50, 52],
        ].map(([name, ico, amt, local, score], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `0.5px solid ${C.separator}` }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{ico}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...T.bodyEmph, color: C.primary, fontWeight: 600 }}>{name}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                <Pill color={scoreColor(score)} size="sm">{score}</Pill>
                <span style={{ ...T.caption1, color: C.green, fontWeight: 600 }}>${local.toFixed(2)} local</span>
              </div>
            </div>
            <span style={{ ...T.number, fontSize: 14, color: C.primary }}>${amt.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", borderTop: `0.5px solid ${C.separator}`, padding: "8px 0 22px", display: "flex", justifyContent: "space-around" }}>
        {[["􀎟", "Home", false], ["􀙋", "Map", false], ["􀊵", "Impact", true], ["􀋃", "Saved", false], ["􀉭", "You", false]].map(([ico, lbl, on]) => (
          <div key={lbl} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 18, color: on ? C.blue : C.secondary }}>{ico}</span>
            <span style={{ ...T.caption1, color: on ? C.blue : C.secondary, fontWeight: on ? 600 : 500, letterSpacing: 0 }}>{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoriesScreen() {
  const cats = [
    ["Café", "☕", 47, C.amber], ["Restaurant", "🍽", 89, C.red], ["Bakery", "🥐", 22, "#D4A074"],
    ["Grocery", "🛒", 31, C.green], ["Retail", "🛍", 64, C.blue], ["Wellness", "🧘", 38, C.teal],
    ["Home Svc", "🔧", 52, "#7B4A8B"], ["Business Svc", "💼", 41, "#3A4A6A"], ["Farm", "🌾", 18, C.lime],
  ];
  return (
    <div style={{ height: "calc(100% - 44px)", display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ padding: "8px 20px 16px", background: C.white }}>
        <div style={{ ...T.caption2, color: C.teal, marginBottom: 4 }}>BROWSE</div>
        <div style={{ ...T.largeTitle, color: C.primary }}>Categories</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        <div style={{ marginBottom: 16, padding: 16, borderRadius: 18, background: C.primary, color: C.white }}>
          <Pill color={C.lime} variant="outline">FEATURED</Pill>
          <div style={{ ...T.title2, color: C.white, marginTop: 8, marginBottom: 4 }}>Earth Day Champions</div>
          <div style={{ ...T.footnote, color: "rgba(255,255,255,0.7)" }}>23 businesses with sustainability 28+/30</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {cats.map(([name, ico, count, col]) => (
            <div key={name} style={{ background: C.white, borderRadius: 16, padding: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: `${col}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 10 }}>{ico}</div>
              <div style={{ ...T.title3, color: C.primary, marginBottom: 2 }}>{name}</div>
              <div style={{ ...T.caption2, color: C.secondary }}>{count} BUSINESSES</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// BUSINESS OWNER FLOW
// ═════════════════════════════════════════════════════════

function BizWelcomeScreen() {
  return (
    <div style={{ height: "calc(100% - 44px)", display: "flex", flexDirection: "column", background: C.white }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 14px" }}>
        <div style={{ marginBottom: 14, ...T.subhead, color: C.secondary }}>‹ Back</div>

        <div style={{ marginBottom: 22 }}>
          <Pill color={C.blue}>FOR BUSINESS OWNERS</Pill>
          <div style={{ ...T.largeTitle, color: C.primary, marginTop: 10 }}>Your values, verified.</div>
          <div style={{ ...T.callout, color: C.secondary, marginTop: 8 }}>Compete on community — not price.</div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ ...T.caption2, color: C.green, marginBottom: 12 }}>WHY YOUR SCORE MATTERS</div>
          {[
            ["207M", "Shoppers actively seek values-aligned businesses", C.blue],
            ["+34%", "New customer visits in first 60 days verified", C.teal],
            ["78%",  "Pay MORE at businesses they can verify", C.green],
            ["$0",   "Cost to apply. Free Founder tier forever.", C.amber],
          ].map(([num, lbl, col]) => (
            <div key={lbl} style={{ display: "flex", gap: 14, padding: "12px 14px", marginBottom: 6, background: C.bg, borderRadius: 14 }}>
              <div style={{ width: 52, textAlign: "center" }}>
                <div style={{ ...T.number, fontSize: 20, color: col, lineHeight: 1 }}>{num}</div>
              </div>
              <div style={{ flex: 1, ...T.callout, color: C.primary, alignSelf: "center" }}>{lbl}</div>
            </div>
          ))}
        </div>

        <div style={{ background: C.primary, color: C.white, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ ...T.caption2, color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>YOUR PUBLIC PROFILE</div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <ScoreRing score={88} size={52} />
            <div style={{ flex: 1 }}>
              <Pill color={C.lime} variant="outline">VERIFIED</Pill>
              <div style={{ ...T.title2, color: C.white, marginTop: 4 }}>Your Business</div>
              <div style={{ ...T.footnote, color: "rgba(255,255,255,0.6)" }}>Above & Beyond Tier</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 20px 22px", background: C.white, borderTop: `0.5px solid ${C.separator}` }}>
        <button style={{ width: "100%", background: GRAD, color: C.white, ...T.title3, padding: "16px", border: "none", borderRadius: 14 }}>See Pricing</button>
        <div style={{ textAlign: "center", marginTop: 8, ...T.caption2, color: C.secondary }}>NO CREDIT CARD · FREE TIER FOREVER</div>
      </div>
    </div>
  );
}

function BizPricingScreen() {
  const tiers = [
    { name: "Free",    price: "$0",  per: "forever", popular: false, features: ["Basic profile", "Score published", "QR scorecard"] },
    { name: "Starter", price: "$29", per: "/mo",     popular: false, features: ["Score assessment tools", "Peer benchmarks", "Improvement roadmap"] },
    { name: "Growth",  price: "$59", per: "/mo",     popular: true,  features: ["Verified badge", "Priority placement", "Story page"] },
    { name: "Premium", price: "$99", per: "/mo",     popular: false, features: ["Full analytics", "Demographic data", "API access"] },
  ];
  return (
    <div style={{ height: "calc(100% - 44px)", display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ padding: "8px 20px 14px", background: C.white }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ ...T.subhead, color: C.secondary }}>‹ Back</span>
          <span style={{ ...T.caption2, color: C.teal }}>STEP 2 OF 5</span>
        </div>
        <div style={{ ...T.largeTitle, color: C.primary }}>Choose your tier</div>
        <div style={{ ...T.footnote, color: C.secondary, marginTop: 4 }}>Start free. Upgrade based on results.</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        {tiers.map(t => (
          <div key={t.name} style={{
            background: t.popular ? C.primary : C.white,
            color: t.popular ? C.white : C.primary,
            borderRadius: 16, padding: 18, marginBottom: 10,
            position: "relative",
          }}>
            {t.popular && <div style={{ position: "absolute", top: -8, right: 18, background: C.lime, color: C.primary, ...T.caption2, padding: "4px 10px", borderRadius: 50 }}>MOST POPULAR</div>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <div style={{ ...T.title1, color: t.popular ? C.white : C.primary }}>{t.name}</div>
              <div>
                <span style={{ ...T.number, fontSize: 24, color: t.popular ? C.lime : C.primary }}>{t.price}</span>
                <span style={{ ...T.footnote, color: t.popular ? "rgba(255,255,255,0.5)" : C.secondary, marginLeft: 4 }}>{t.per}</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
              {t.features.map(f => (
                <div key={f} style={{ display: "flex", gap: 8, ...T.callout, color: t.popular ? "rgba(255,255,255,0.75)" : C.secondary }}>
                  <span style={{ color: t.popular ? C.lime : C.teal }}>✓</span>{f}
                </div>
              ))}
            </div>
            <button style={{
              width: "100%", padding: "12px",
              background: t.popular ? GRAD : C.bg,
              color: t.popular ? C.white : C.primary,
              border: "none", borderRadius: 12,
              ...T.bodyEmph, fontWeight: 600,
            }}>{t.popular ? "Choose Growth" : `Choose ${t.name}`}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BizDashboardScreen() {
  return (
    <div style={{ height: "calc(100% - 44px)", display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ padding: "8px 20px 14px", background: C.white, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ ...T.caption2, color: C.green }}>DASHBOARD</div>
          <div style={{ ...T.title1, color: C.primary }}>Maria's Soap</div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚙</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        <div style={{ background: GRAD, color: C.white, borderRadius: 18, padding: 20, marginBottom: 12 }}>
          <Pill color={C.lime} variant="outline">CHAMPION · VERIFIED</Pill>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
            <ScoreRing score={91} size={56} />
            <div>
              <div style={{ ...T.number, fontSize: 38, color: C.white, lineHeight: 1 }}>91</div>
              <div style={{ ...T.footnote, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>↑ 4 pts since Q1</div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {[
            ["Profile Views", "2,847", "↑ 18%", C.blue],
            ["New Customers", "127", "↑ 34%", C.green],
            ["QR Scans", "1,294", "↑ 22%", C.teal],
            ["Avg Rating", "4.9", "—", C.amber],
          ].map(([lbl, val, ch, col]) => (
            <div key={lbl} style={{ background: C.white, borderRadius: 14, padding: 14 }}>
              <div style={{ ...T.caption2, color: C.secondary, marginBottom: 4 }}>{lbl}</div>
              <div style={{ ...T.number, fontSize: 22, color: C.primary, lineHeight: 1 }}>{val}</div>
              <div style={{ ...T.caption1, color: col, fontWeight: 600, marginTop: 3 }}>{ch}</div>
            </div>
          ))}
        </div>

        <div style={{ background: C.white, borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ ...T.caption2, color: C.green }}>QUICK WINS</div>
            <span style={{ ...T.subhead, color: C.teal, fontWeight: 600 }}>View All</span>
          </div>
          {[
            ["Add 1% for the Planet", "+3", C.green],
            ["Document composting", "+2", C.teal],
            ["Switch to Bank of Detroit", "+1", C.blue],
          ].map(([t, p, c]) => (
            <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `0.5px solid ${C.separator}` }}>
              <span style={{ ...T.callout, color: C.primary }}>{t}</span>
              <Pill color={c} size="sm">+{p} pts</Pill>
            </div>
          ))}
        </div>

        <div style={{ background: C.primary, color: C.white, borderRadius: 16, padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>􀎻</div>
          <div style={{ flex: 1 }}>
            <div style={{ ...T.title3, color: C.white }}>Your QR Scorecard</div>
            <div style={{ ...T.footnote, color: "rgba(255,255,255,0.65)" }}>Print, post, share</div>
          </div>
          <span style={{ color: C.lime, fontSize: 16 }}>›</span>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", borderTop: `0.5px solid ${C.separator}`, padding: "8px 0 22px", display: "flex", justifyContent: "space-around" }}>
        {[["􀪥", "Score", true], ["􀜟", "Stats", false], ["􀎷", "Improve", false], ["􀉭", "Profile", false]].map(([ico, lbl, on]) => (
          <div key={lbl} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 18, color: on ? C.blue : C.secondary }}>{ico}</span>
            <span style={{ ...T.caption1, color: on ? C.blue : C.secondary, fontWeight: on ? 600 : 500, letterSpacing: 0 }}>{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// CANVAS
// ═════════════════════════════════════════════════════════
export default function App() {
  const [flow, setFlow] = useState("all");

  const consumer = [
    { component: <WelcomeScreen />,         label: "Choose your path",                     screen: "01 · WELCOME" },
    { component: <ConsumerHomeScreen />,    label: "Home with Local Impact card",          screen: "02 · HOME" },
    { component: <MapScreen />,             label: "Map view with bottom sheet",           screen: "03 · MAP" },
    { component: <CategoriesScreen />,      label: "Browse by category",                   screen: "04 · CATEGORIES" },
    { component: <BusinessProfileScreen />, label: "Business profile · $10 breakdown",     screen: "05 · PROFILE" },
    { component: <ImpactScreen />,          label: "Personal impact tracker",              screen: "06 · IMPACT" },
  ];
  const business = [
    { component: <BizWelcomeScreen />,    label: "Why your score matters",                 screen: "07 · BIZ WELCOME" },
    { component: <BizPricingScreen />,    label: "Tier selector",                          screen: "08 · PRICING" },
    { component: <BizDashboardScreen />,  label: "Live dashboard",                         screen: "09 · DASHBOARD" },
  ];

  const screens = flow === "all" ? [...consumer, ...business] : flow === "consumer" ? consumer : business;

  return (
    <div style={{
      minHeight: "100vh", background: "#FAFAFB",
      fontFamily: F.text, padding: "40px 20px 80px",
      WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: 1400, margin: "0 auto 36px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ ...T.number, fontSize: 22, color: C.white }}>$</span>
          </div>
          <span style={{ ...T.largeTitle, fontSize: 26, color: C.primary }}>DollarVote</span>
        </div>
        <div style={{ ...T.caption2, color: C.green, marginBottom: 12 }}>APP WIREFRAMES · IOS NATIVE STYLING</div>
        <h1 style={{ ...T.largeTitle, fontSize: "clamp(28px, 4vw, 44px)", color: C.primary, marginBottom: 12 }}>
          Two flows. One mission.
        </h1>
        <p style={{ ...T.body, fontSize: 15, color: C.secondary, maxWidth: 540, margin: "0 auto" }}>
          Mobile-first wireframes built with Apple-native typography. Map-first discovery, prominent local-impact tracking, clearly separated paths.
        </p>
      </div>

      {/* Filter */}
      <div style={{ maxWidth: 1400, margin: "0 auto 36px", display: "flex", justifyContent: "center", gap: 8 }}>
        {[
          { id: "all",      label: "All",       count: 9 },
          { id: "consumer", label: "Consumer",  count: 6 },
          { id: "business", label: "Business",  count: 3 },
        ].map(f => (
          <button key={f.id} onClick={() => setFlow(f.id)} style={{
            background: flow === f.id ? C.primary : C.white,
            color: flow === f.id ? C.white : C.primary,
            border: `1px solid ${flow === f.id ? C.primary : C.separator}`,
            borderRadius: 50, padding: "10px 22px",
            ...T.bodyEmph, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            transition: "all 0.15s",
          }}>
            <span>{f.label}</span>
            <span style={{ ...T.caption1, opacity: 0.7, padding: "2px 7px", background: flow === f.id ? "rgba(255,255,255,0.18)" : C.bg, borderRadius: 50 }}>{f.count}</span>
          </button>
        ))}
      </div>

      <div style={{
        maxWidth: 1400, margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(290px, max-content))",
        justifyContent: "center",
        gap: "48px 36px",
      }}>
        {screens.map((s, i) => (
          <Phone key={i} label={s.label} screen={s.screen}>
            {s.component}
          </Phone>
        ))}
      </div>
    </div>
  );
}
