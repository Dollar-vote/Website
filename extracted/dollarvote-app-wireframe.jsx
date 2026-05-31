import { useState, useEffect } from "react";

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

const F = {
  serif: "'Instrument Serif', Georgia, serif",
  body:  "'Plus Jakarta Sans', -apple-system, sans-serif",
  mono:  "'SF Mono', 'Geist Mono', monospace",
};

const GRAD = "linear-gradient(135deg, #1A3A8F 0%, #1A8FA0 52%, #7DC832 100%)";
const GRAD_BT = "linear-gradient(135deg, #1A3A8F 0%, #1A8FA0 100%)";
const GRAD_TL = "linear-gradient(135deg, #1A8FA0 0%, #7DC832 100%)";

// ─────────────────────────────────────────────
// SHARED UTILITIES
// ─────────────────────────────────────────────
function scoreColor(s) {
  if (s >= 90) return C.green;
  if (s >= 75) return C.teal;
  if (s >= 60) return C.amber;
  return "#C87020";
}
function scoreTier(s) {
  if (s >= 90) return "Champion";
  if (s >= 75) return "Above & Beyond";
  if (s >= 60) return "Solid Commitment";
  return "Growing";
}

// Sample biz data (Detroit-themed for pilot consistency)
const BIZ = [
  { id:1, name:"Maria's Soap Studio",     cat:"Retail",     score:91, loc:36, sus:27, trn:28, hood:"Eastern Market", verified:true,  emoji:"🧼", local:8.30, distance:"0.4 mi" },
  { id:2, name:"Rootwork Kitchen",        cat:"Restaurant", score:87, loc:34, sus:26, trn:27, hood:"Corktown",       verified:true,  emoji:"🍽️", local:7.90, distance:"0.6 mi" },
  { id:3, name:"Ironwood Coffee Co.",     cat:"Café",       score:88, loc:35, sus:26, trn:27, hood:"Midtown",        verified:true,  emoji:"☕", local:8.10, distance:"0.8 mi" },
  { id:4, name:"Harbor & Grain Bakery",   cat:"Bakery",     score:85, loc:33, sus:25, trn:27, hood:"Hamtramck",      verified:true,  emoji:"🥐", local:7.50, distance:"1.2 mi" },
  { id:5, name:"Confluence Yoga",         cat:"Wellness",   score:88, loc:35, sus:26, trn:27, hood:"West Village",   verified:true,  emoji:"🧘", local:7.80, distance:"1.5 mi" },
  { id:6, name:"Detroit Fix-It Co.",      cat:"Home Svc",   score:79, loc:31, sus:23, trn:25, hood:"East English Vil",verified:false, emoji:"🔧", local:7.10, distance:"2.1 mi" },
];

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
        <span style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: size * 0.34, fontWeight: 700, color: color, lineHeight: 1 }}>{score}</span>
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

function PillarMini({ label, score, max, color }) {
  const pct = (score / max) * 100;
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ fontFamily: F.mono, fontSize: 8, color: C.soft, letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
      <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: "hidden", marginBottom: 3 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
      <div style={{ fontFamily: F.mono, fontSize: 9.5, fontWeight: 600, color }}>{score}/{max}</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PHONE FRAME
// ─────────────────────────────────────────────
function Phone({ label, screen, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
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
      {/* Label below */}
      <div style={{ marginTop: 18, textAlign: "center", maxWidth: 290 }}>
        <div style={{ fontFamily: F.mono, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.12em", color: C.lime, marginBottom: 4 }}>{screen}</div>
        <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 16, color: C.ink, lineHeight: 1.3 }}>{label}</div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// CONSUMER SCREENS
// ═════════════════════════════════════════════════════════

// SCREEN 1 — Welcome / Path Selector (the "Who Are You?" moment)
function WelcomeScreen() {
  return (
    <div style={{ height: "100%", background: GRAD, display: "flex", flexDirection: "column", padding: "20px 22px 24px", position: "relative", overflow: "hidden" }}>
      {/* Decorative orbs */}
      <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
      <div style={{ position: "absolute", bottom: -60, left: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(125,200,50,0.15)" }} />

      <div style={{ position: "relative", zIndex: 2, marginTop: 40 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: C.white, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.serif, fontStyle: "italic", fontSize: 30, fontWeight: 700, color: C.blue }}>$</div>
          <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 24, color: C.white, fontWeight: 700, letterSpacing: "-0.01em" }}>DollarVote</div>
        </div>

        {/* Headline */}
        <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 28, color: C.white, lineHeight: 1.1, textAlign: "center", marginBottom: 12 }}>
          Every dollar<br/>is a vote.
        </div>
        <div style={{ fontFamily: F.body, fontSize: 13, color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 1.6, marginBottom: 36 }}>
          Know where your money<br/>actually goes.
        </div>

        {/* Path buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button style={{ background: C.white, color: C.blue, fontFamily: F.body, fontSize: 14, fontWeight: 700, padding: "16px", border: "none", borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>🛍</span>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontWeight: 700 }}>I'm a Shopper</div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: C.mid, fontWeight: 500, letterSpacing: "0.06em", marginTop: 2 }}>FIND VERIFIED LOCAL BUSINESSES</div>
            </div>
            <span style={{ color: C.blue }}>→</span>
          </button>
          <button style={{ background: "rgba(255,255,255,0.18)", color: C.white, fontFamily: F.body, fontSize: 14, fontWeight: 700, padding: "16px", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, backdropFilter: "blur(10px)" }}>
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
function ConsumerHomeScreen() {
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
        <div style={{ background: C.bg, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>🔍</span>
          <span style={{ fontFamily: F.body, fontSize: 12.5, color: C.soft, flex: 1 }}>Search businesses, ZIP, or category...</span>
        </div>
      </div>

      {/* Impact card - signature feature like Upside's earnings */}
      <div style={{ margin: "0 18px 14px", borderRadius: 18, background: GRAD, padding: 18, color: C.white, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -20, bottom: -20, fontSize: 100, opacity: 0.08 }}>💚</div>
        <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.12em", opacity: 0.8, marginBottom: 6 }}>YOUR LOCAL IMPACT THIS MONTH</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
          <span style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 32, fontWeight: 700, lineHeight: 1 }}>$284</span>
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
          <div key={lbl} style={{ background: lbl === "Top Scored" ? C.ink : C.bg, color: lbl === "Top Scored" ? C.white : C.mid, padding: "6px 12px", borderRadius: 50, fontFamily: F.body, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", display: "flex", gap: 4 }}>
            <span>{ico}</span>{lbl}
          </div>
        ))}
      </div>

      {/* "Near you" header */}
      <div style={{ padding: "0 18px 8px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 18, color: C.ink, fontWeight: 700 }}>Near you</div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.soft, letterSpacing: "0.08em" }}>HIGHEST SCORES FIRST</div>
        </div>
        <span style={{ fontFamily: F.body, fontSize: 11, color: C.teal, fontWeight: 600 }}>View Map →</span>
      </div>

      {/* Business cards - Upside-style horizontal scroll */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 18px 12px" }}>
        {BIZ.slice(0, 4).map(b => (
          <div key={b.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 12, marginBottom: 8, display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 50, height: 50, borderRadius: 12, background: C.ltBlue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{b.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                <span style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 13, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</span>
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
      <div style={{ background: C.white, borderTop: `1px solid ${C.border}`, padding: "8px 12px 16px", display: "flex", justifyContent: "space-around" }}>
        {[["🏠", "Home", true], ["🗺", "Map", false], ["💚", "Impact", false], ["⭐", "Saved", false], ["👤", "You", false]].map(([ico, lbl, on]) => (
          <div key={lbl} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 16, opacity: on ? 1 : 0.4 }}>{ico}</span>
            <span style={{ fontFamily: F.mono, fontSize: 8, fontWeight: 700, color: on ? C.blue : C.soft, letterSpacing: "0.06em" }}>{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// SCREEN 3 — Map View (Google Maps-style)
function MapScreen() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.white, position: "relative" }}>
      {/* Search bar overlay */}
      <div style={{ position: "absolute", top: 44, left: 14, right: 14, zIndex: 10 }}>
        <div style={{ background: C.white, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
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
          <div key={i} style={{ position: "absolute", left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%, -100%)" }}>
            <div style={{ background: C.white, borderRadius: 10, padding: "5px 8px 4px", border: `2px solid ${scoreColor(m.score)}`, boxShadow: "0 4px 8px rgba(0,0,0,0.2)", minWidth: 38, textAlign: "center", position: "relative" }}>
              <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 13, fontWeight: 700, color: scoreColor(m.score), lineHeight: 1 }}>{m.score}</div>
              <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", border: "6px solid transparent", borderTop: `6px solid ${scoreColor(m.score)}`, borderBottom: "none" }} />
            </div>
          </div>
        ))}

        {/* Center "you are here" pin */}
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 16, height: 16, borderRadius: "50%", background: C.blue, border: "3px solid white", boxShadow: "0 0 0 8px rgba(26,58,143,0.2)" }} />
      </div>

      {/* Bottom sheet — selected business preview (Upside style) */}
      <div style={{ background: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: "14px 18px 12px", boxShadow: "0 -4px 20px rgba(0,0,0,0.1)", position: "relative" }}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 12px" }} />
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.ltBlue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🧼</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 15, fontWeight: 700, color: C.ink }}>Maria's Soap Studio</div>
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
          <button style={{ flex: 1, background: GRAD, color: C.white, fontFamily: F.body, fontSize: 12, fontWeight: 700, padding: "10px", border: "none", borderRadius: 10 }}>View Profile</button>
          <button style={{ flex: 1, background: C.bg, color: C.ink, fontFamily: F.body, fontSize: 12, fontWeight: 600, padding: "10px", border: "none", borderRadius: 10 }}>Directions</button>
        </div>
      </div>
    </div>
  );
}

// SCREEN 4 — Business Profile (after tap)
function BusinessProfileScreen() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, overflowY: "auto" }}>
      {/* Hero with score */}
      <div style={{ background: GRAD, padding: "12px 20px 28px", color: C.white, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 16 }}>← Back</span>
          <span style={{ fontSize: 16 }}>⋯</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🧼</div>
          <div style={{ flex: 1 }}>
            <Tag color={C.lime} bg="rgba(125,200,50,0.15)" outline>✓ DOLLARVOTE VERIFIED</Tag>
            <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 22, fontWeight: 700, marginTop: 4, lineHeight: 1.1 }}>Maria's Soap Studio</div>
            <div style={{ fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>Independent Retail · Eastern Market</div>
          </div>
        </div>
        {/* Big score */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, background: "rgba(255,255,255,0.12)", borderRadius: 14, backdropFilter: "blur(10px)" }}>
          <ScoreBadge score={91} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 18, fontWeight: 700 }}>Community Champion</div>
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
          <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 22, fontWeight: 700, color: C.green, lineHeight: 1 }}>$8.30</div>
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
        <button style={{ background: C.ink, color: C.white, fontFamily: F.body, fontSize: 13, fontWeight: 700, padding: "13px", border: "none", borderRadius: 12 }}>📍 Get Directions</button>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ flex: 1, background: C.white, color: C.ink, fontFamily: F.body, fontSize: 11, fontWeight: 600, padding: "10px", border: `1px solid ${C.border}`, borderRadius: 10 }}>⭐ Save</button>
          <button style={{ flex: 1, background: C.white, color: C.ink, fontFamily: F.body, fontSize: 11, fontWeight: 600, padding: "10px", border: `1px solid ${C.border}`, borderRadius: 10 }}>↗ Share</button>
          <button style={{ flex: 1, background: C.white, color: C.ink, fontFamily: F.body, fontSize: 11, fontWeight: 600, padding: "10px", border: `1px solid ${C.border}`, borderRadius: 10 }}>📞 Call</button>
        </div>
      </div>
    </div>
  );
}

// SCREEN 5 — My Impact (Spending tracker)
function ImpactScreen() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "8px 18px 16px", background: C.white }}>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.lime, letterSpacing: "0.12em", fontWeight: 700, marginBottom: 4 }}>YOUR LOCAL IMPACT</div>
        <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 22, fontWeight: 700, color: C.ink }}>April 2026</div>
      </div>

      {/* Big number card */}
      <div style={{ margin: "0 18px 14px", padding: 20, borderRadius: 18, background: GRAD, color: C.white, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -30, top: -30, fontSize: 130, opacity: 0.07 }}>💚</div>
        <div style={{ fontFamily: F.mono, fontSize: 9, opacity: 0.85, letterSpacing: "0.12em", marginBottom: 4 }}>KEPT IN DETROIT THIS MONTH</div>
        <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 42, fontWeight: 700, lineHeight: 1, marginBottom: 6 }}>$284<span style={{ fontSize: 20, opacity: 0.7 }}>.50</span></div>
        <div style={{ fontFamily: F.body, fontSize: 11, opacity: 0.85 }}>↑ 22% from last month · You're outpacing 78% of Detroit users</div>
        <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(255,255,255,0.12)", borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>🏆</span>
          <span style={{ fontFamily: F.body, fontSize: 11 }}><strong>Streak: 4 months</strong> over 60% local</span>
        </div>
      </div>

      {/* Comparison row */}
      <div style={{ display: "flex", gap: 8, padding: "0 18px 14px" }}>
        <div style={{ flex: 1, background: C.white, borderRadius: 12, padding: 12 }}>
          <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.soft, letterSpacing: "0.1em", marginBottom: 4 }}>SPENDING</div>
          <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 18, fontWeight: 700, color: C.ink, lineHeight: 1 }}>$418</div>
          <div style={{ fontFamily: F.body, fontSize: 9.5, color: C.soft, marginTop: 2 }}>This month, total</div>
        </div>
        <div style={{ flex: 1, background: C.white, borderRadius: 12, padding: 12 }}>
          <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.lime, letterSpacing: "0.1em", marginBottom: 4 }}>LOCAL %</div>
          <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 18, fontWeight: 700, color: C.green, lineHeight: 1 }}>68%</div>
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
      <div style={{ background: C.white, borderTop: `1px solid ${C.border}`, padding: "8px 12px 16px", display: "flex", justifyContent: "space-around" }}>
        {[["🏠", "Home", false], ["🗺", "Map", false], ["💚", "Impact", true], ["⭐", "Saved", false], ["👤", "You", false]].map(([ico, lbl, on]) => (
          <div key={lbl} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 16, opacity: on ? 1 : 0.4 }}>{ico}</span>
            <span style={{ fontFamily: F.mono, fontSize: 8, fontWeight: 700, color: on ? C.blue : C.soft, letterSpacing: "0.06em" }}>{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// SCREEN 6 — Categories (browse)
function CategoriesScreen() {
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
        <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 22, fontWeight: 700, color: C.ink }}>What are you looking for?</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
        {/* Featured */}
        <div style={{ marginBottom: 16, padding: 14, borderRadius: 14, background: C.ink, color: C.white }}>
          <Tag color={C.lime} bg="rgba(125,200,50,0.15)" outline>FEATURED THIS MONTH</Tag>
          <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 16, fontWeight: 700, marginTop: 6, marginBottom: 4 }}>Earth Day Champions</div>
          <div style={{ fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>23 Detroit businesses with sustainability scores 28+/30</div>
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {cats.map(([name, ico, count, col]) => (
            <div key={name} style={{ background: C.white, borderRadius: 14, padding: 14, border: `1px solid ${C.border}` }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${col}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 8 }}>{ico}</div>
              <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 2 }}>{name}</div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: C.soft, letterSpacing: "0.06em" }}>{count} BUSINESSES</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// BUSINESS OWNER SCREENS
// ═════════════════════════════════════════════════════════

// SCREEN 7 — Business Welcome / Why Subscribe
function BizWelcomeScreen() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.white, overflow: "hidden" }}>
      {/* Top stripe */}
      <div style={{ height: 4, background: GRAD, flexShrink: 0 }} />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 14px" }}>
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: C.soft }}>← Back</span>
        </div>

        {/* Hero */}
        <div style={{ marginBottom: 16 }}>
          <Tag color={C.blue}>FOR BUSINESS OWNERS</Tag>
          <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 26, fontWeight: 700, color: C.ink, lineHeight: 1.1, marginTop: 8 }}>
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
                <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 18, fontWeight: 700, color: col, lineHeight: 1 }}>{num}</div>
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
              <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 14, fontWeight: 700, marginTop: 4 }}>Your Business Name</div>
              <div style={{ fontFamily: F.body, fontSize: 9.5, color: "rgba(255,255,255,0.55)" }}>Above & Beyond Tier</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div style={{ padding: "12px 18px", background: C.white, borderTop: `1px solid ${C.border}` }}>
        <button style={{ width: "100%", background: GRAD, color: C.white, fontFamily: F.body, fontSize: 14, fontWeight: 700, padding: "14px", border: "none", borderRadius: 12 }}>See Pricing →</button>
        <div style={{ textAlign: "center", marginTop: 6, fontFamily: F.mono, fontSize: 8.5, color: C.soft, letterSpacing: "0.06em" }}>NO CREDIT CARD · FREE TIER FOREVER</div>
      </div>
    </div>
  );
}

// SCREEN 8 — Pricing / Tiers
function BizPricingScreen() {
  const tiers = [
    { name: "Free", price: "$0", per: "forever", color: C.mid, popular: false, features: ["Basic profile", "Score published", "QR scorecard", "Map listing"] },
    { name: "Starter", price: "$29", per: "/mo", color: C.blue, popular: false, features: ["Everything in Free", "Score assessment", "Peer benchmarks", "Improvement roadmap"] },
    { name: "Growth", price: "$59", per: "/mo", color: C.teal, popular: true, features: ["Everything in Starter", "Verified badge", "Priority placement", "Review responses", "Story page"] },
    { name: "Premium", price: "$99", per: "/mo", color: C.lime, popular: false, features: ["Everything in Growth", "Full analytics", "Demographic data", "API access", "Account manager"] },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>
      <div style={{ padding: "8px 18px 14px", background: C.white }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: C.soft }}>← Back</span>
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.teal, letterSpacing: "0.08em", fontWeight: 700 }}>STEP 2 of 5</span>
        </div>
        <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 22, fontWeight: 700, color: C.ink }}>Choose your tier</div>
        <div style={{ fontFamily: F.body, fontSize: 11, color: C.mid, marginTop: 2 }}>Start free. Upgrade based on your needs.</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        {tiers.map(t => (
          <div key={t.name} style={{
            background: t.popular ? C.ink : C.white,
            color: t.popular ? C.white : C.ink,
            borderRadius: 14, padding: 16, marginBottom: 8,
            border: t.popular ? "none" : `1px solid ${C.border}`,
            position: "relative",
          }}>
            {t.popular && <div style={{ position: "absolute", top: -8, right: 16, background: C.lime, color: C.ink, fontFamily: F.mono, fontSize: 8.5, fontWeight: 700, padding: "3px 10px", borderRadius: 50, letterSpacing: "0.08em" }}>MOST POPULAR</div>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 18, fontWeight: 700 }}>{t.name}</div>
              <div>
                <span style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 22, fontWeight: 700, color: t.popular ? C.lime : t.color }}>{t.price}</span>
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
            <button style={{
              width: "100%", padding: 10,
              background: t.popular ? GRAD : (t.color === C.mid ? C.bg : C.white),
              color: t.popular ? C.white : (t.color === C.mid ? C.ink : t.color),
              border: t.popular ? "none" : `1.5px solid ${t.color === C.mid ? C.border : t.color}`,
              borderRadius: 10, fontFamily: F.body, fontSize: 11, fontWeight: 700,
            }}>{t.popular ? "Get Growth →" : `Choose ${t.name}`}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// SCREEN 9 — Business Dashboard
function BizDashboardScreen() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ padding: "8px 18px 14px", background: C.white }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.lime, letterSpacing: "0.12em", fontWeight: 700 }}>BUSINESS DASHBOARD</div>
            <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 18, fontWeight: 700, color: C.ink }}>Maria's Soap Studio</div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚙️</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
        {/* Score hero */}
        <div style={{ background: GRAD, color: C.white, borderRadius: 16, padding: 18, marginBottom: 12, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -20, top: -20, fontSize: 100, opacity: 0.1 }}>🏆</div>
          <Tag color={C.lime} bg="rgba(125,200,50,0.2)" outline>✓ COMMUNITY CHAMPION · VERIFIED</Tag>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
            <ScoreBadge score={91} size={62} />
            <div>
              <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 32, fontWeight: 700, lineHeight: 1 }}>91</div>
              <div style={{ fontFamily: F.body, fontSize: 10, opacity: 0.85, marginTop: 2 }}>↑ 4 pts since last quarter</div>
            </div>
          </div>
        </div>

        {/* Quick stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {[
            ["Profile Views", "2,847", "↑ 18%", C.blue],
            ["New Customers", "127", "↑ 34%", C.lime],
            ["QR Scans", "1,294", "↑ 22%", C.teal],
            ["Avg Rating", "4.9★", "−", C.amber],
          ].map(([lbl, val, ch, col]) => (
            <div key={lbl} style={{ background: C.white, borderRadius: 12, padding: 12 }}>
              <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.soft, letterSpacing: "0.08em" }}>{lbl}</div>
              <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 22, fontWeight: 700, color: C.ink, lineHeight: 1.1, marginTop: 2 }}>{val}</div>
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
              <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 14, fontWeight: 700 }}>Share Your QR Scorecard</div>
              <div style={{ fontFamily: F.body, fontSize: 10, color: "rgba(255,255,255,0.6)" }}>Print, post, share</div>
            </div>
            <span style={{ color: C.lime, fontWeight: 700 }}>↗</span>
          </div>
        </div>
      </div>

      {/* Bottom nav for biz */}
      <div style={{ background: C.white, borderTop: `1px solid ${C.border}`, padding: "8px 12px 16px", display: "flex", justifyContent: "space-around" }}>
        {[["📊", "Score", true], ["📈", "Stats", false], ["🚀", "Improve", false], ["⚙️", "Profile", false]].map(([ico, lbl, on]) => (
          <div key={lbl} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 16, opacity: on ? 1 : 0.4 }}>{ico}</span>
            <span style={{ fontFamily: F.mono, fontSize: 8, fontWeight: 700, color: on ? C.blue : C.soft, letterSpacing: "0.06em" }}>{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// MAIN APP — DESKTOP CANVAS WITH ALL SCREENS
// ═════════════════════════════════════════════════════════
export default function App() {
  const [activeFlow, setActiveFlow] = useState("all");

  const consumerScreens = [
    { component: <WelcomeScreen />,         label: "Choose your path — shopper or business owner",      screen: "01 · WELCOME" },
    { component: <ConsumerHomeScreen />,    label: "Home feed with 'Local Impact' card (Upside-style)", screen: "02 · CONSUMER HOME" },
    { component: <MapScreen />,             label: "Map view — score markers + bottom sheet preview",    screen: "03 · MAP" },
    { component: <CategoriesScreen />,      label: "Browse by category — Restaurant, Retail, Services",  screen: "04 · CATEGORIES" },
    { component: <BusinessProfileScreen />, label: "Business detail — 'Where your $10 goes' breakdown",  screen: "05 · PROFILE" },
    { component: <ImpactScreen />,          label: "Personal impact tracker — your local % over time",   screen: "06 · MY IMPACT" },
  ];

  const businessScreens = [
    { component: <BizWelcomeScreen />,    label: "Why your DollarVote score is worth pursuing",        screen: "07 · BIZ WELCOME" },
    { component: <BizPricingScreen />,    label: "Tier selector — Free / Starter / Growth / Premium",   screen: "08 · PRICING" },
    { component: <BizDashboardScreen />,  label: "Live dashboard — score, analytics, score improvers",  screen: "09 · DASHBOARD" },
  ];

  const flowsToShow = activeFlow === "all" ? [...consumerScreens, ...businessScreens]
                    : activeFlow === "consumer" ? consumerScreens
                    : businessScreens;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #FAFAFB 0%, #F0F4FF 100%)",
      fontFamily: F.body,
      padding: "40px 20px 80px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 2px; }
      `}</style>

      {/* Top header */}
      <div style={{ maxWidth: 1400, margin: "0 auto 40px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.serif, fontStyle: "italic", fontSize: 22, fontWeight: 700, color: C.white }}>$</div>
          <span style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 28, fontWeight: 700, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>DollarVote</span>
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 11, color: C.lime, letterSpacing: "0.18em", marginBottom: 10, fontWeight: 600 }}>APP WIREFRAMES · INSPIRED BY UPSIDE</div>
        <h1 style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: "clamp(2rem, 4vw, 3.2rem)", color: C.ink, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: 12 }}>
          The conscious commerce app.<br/>
          <em style={{ background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Two flows. One mission.</em>
        </h1>
        <p style={{ fontFamily: F.body, fontSize: 15, color: C.mid, maxWidth: 600, margin: "0 auto", lineHeight: 1.65 }}>
          Mobile-first wireframes following the Upside pattern: map-first discovery, prominent local-impact tracking, and clearly separated paths for shoppers and business owners. Tap a flow to filter screens.
        </p>
      </div>

      {/* Flow filter */}
      <div style={{ maxWidth: 1400, margin: "0 auto 32px", display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
        {[
          { id: "all", label: "All Screens", icon: "📱", count: 9 },
          { id: "consumer", label: "Consumer Flow", icon: "🛍", count: 6 },
          { id: "business", label: "Business Owner Flow", icon: "🏪", count: 3 },
        ].map(f => (
          <button key={f.id} onClick={() => setActiveFlow(f.id)} style={{
            background: activeFlow === f.id ? C.ink : C.white,
            color: activeFlow === f.id ? C.white : C.mid,
            border: `1.5px solid ${activeFlow === f.id ? C.ink : C.border}`,
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
        {flowsToShow.map((s, i) => (
          <Phone key={i} label={s.label} screen={s.screen}>
            {s.component}
          </Phone>
        ))}
      </div>

      {/* Footer note */}
      <div style={{ maxWidth: 700, margin: "80px auto 0", textAlign: "center", padding: "32px", background: C.white, borderRadius: 20, border: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.teal, letterSpacing: "0.14em", fontWeight: 600, marginBottom: 8 }}>DESIGN PRINCIPLES</div>
        <h3 style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 22, color: C.ink, fontWeight: 700, marginBottom: 14, lineHeight: 1.2 }}>
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
    </div>
  );
}
