import { useState, useEffect, useMemo, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════
   📚 BOOK WIZARDS — v10 (THE COMPLETE UNIFIED EDITION)
   ═══════════════════════════════════════════════════════════════ */

const SUPABASE_URL = "https://nnxbappmomgnxqjtwaya.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ueGJhcHBtb21nbnhxanR3YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMjAzNzIsImV4cCI6MjA5Mjc5NjM3Mn0.xK3hK3_CETJQ-qpvzu3K3eYNf3An7LfayXjN27S2czM";
const USE_SB = true;

const EJS_SERVICE = "YOUR_EMAILJS_SERVICE_ID";
const EJS_TEMPLATE = "YOUR_EMAILJS_TEMPLATE_ID";
const EJS_KEY = "YOUR_EMAILJS_PUBLIC_KEY";

const LOGO = "/logo.png";

/* ─── SUPABASE ───────────────────────────────────────────────*/
const SB_HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};

async function sbFetch(url, options = {}, retries = 2) {
  let lastErr = "Unknown error";
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const r = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      if (!r.ok) {
        const errText = await r.text().catch(() => "");
        lastErr = `${r.status}${errText ? ": " + errText.slice(0, 160) : ""}`;
        if (r.status === 401 || r.status === 403) break;
        if (i < retries - 1) { await new Promise(res => setTimeout(res, 700 * (i + 1))); continue; }
        break;
      }
      const text = await r.text();
      return { ok: true, data: text ? JSON.parse(text) : null };
    } catch (e) {
      lastErr = e.name === "AbortError" ? "Request timed out" : e.message;
      if (i < retries - 1) await new Promise(res => setTimeout(res, 700 * (i + 1)));
    }
  }
  return { ok: false, error: lastErr };
}

const SB = {
  async select(table) {
    const res = await sbFetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&order=id.asc`, { headers: SB_HEADERS });
    return res.ok && Array.isArray(res.data) ? res.data : [];
  },
  async insert(table, row) {
    return await sbFetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST", headers: { ...SB_HEADERS, Prefer: "return=representation" }, body: JSON.stringify(row)
    });
  },
  async update(table, row, id) {
    return await sbFetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH", headers: { ...SB_HEADERS, Prefer: "return=representation" }, body: JSON.stringify(row)
    });
  },
  async delete(table, id) {
    return await sbFetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: SB_HEADERS });
  },
  async deleteWhere(table, col, val) {
    return await sbFetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${encodeURIComponent(val)}`, { method: "DELETE", headers: SB_HEADERS });
  }
};

/* ─── EMAILJS WELCOME HOOK ───────────────────────────────────*/
async function sendWelcomeEmail(m) {
  if (EJS_SERVICE === "YOUR_EMAILJS_SERVICE_ID") return;
  try {
    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EJS_SERVICE, template_id: EJS_TEMPLATE, user_id: EJS_KEY,
        template_params: {
          to_name: m.name,
          to_email: m.email,
          member_id: m.id,
          city: m.city,
          country: m.country,
          handbook_link: "https://your-google-drive-link-to-handbook.pdf"
        }
      })
    });
  } catch { }
}

/* ─── CONSTANTS ──────────────────────────────────────────────*/
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const GENRES = ["Fiction", "Fantasy", "Science Fiction", "Thriller", "Mythology", "Mystery", "Non-Fiction", "Biography", "Memoir", "Self-Help", "Science", "Philosophy", "Poetry", "Romance", "Classic", "Children", "Graphic Novel", "Short Stories", "History", "Psychology"];
const MOODS = ["Cozy Potion ☕", "Dark & Twisted 🕸️", "Brain Burner 🧠", "Gentle Stroll 🌿", "Epic Quest ⚔️", "Tearjerker 💧"];
const LANGS = ["English", "Hindi", "Bengali", "Dutch", "Swedish", "Mandarin", "Tamil", "Telugu", "Marathi", "Kannada", "Malayalam", "Gujarati", "Punjabi", "Urdu", "French", "German", "Spanish", "Portuguese", "Japanese", "Korean", "Arabic", "Russian", "Sanskrit"];
const COUNTRIES = ["India", "United States", "United Kingdom", "Canada", "Australia", "UAE", "Singapore", "Germany", "France", "Netherlands", "New Zealand", "Sweden", "South Africa", "Japan", "Brazil", "Other"];
const STATE_CITIES = {
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Varanasi", "Meerut", "Prayagraj", "Bareilly", "Aligarh", "Noida", "Vrindavan", "Ayodhya"],
  "Delhi": ["New Delhi", "Dwarka", "Rohini", "Janakpuri", "Laxmi Nagar", "Saket", "Pitampura", "Mayur Vihar", "Connaught Place"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur"],
  "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri"]
};
const STATES = Object.keys(STATE_CITIES).sort();
const QUOTES = [
  { q: "Words are our most inexhaustible source of magic.", a: "Albus Dumbledore" },
  { q: "It is our choices that show what we truly are.", a: "Albus Dumbledore" },
  { q: "A reader lives a thousand lives before he dies.", a: "George R.R. Martin" },
  { q: "There is no friend as loyal as a book.", a: "Ernest Hemingway" },
  { q: "Reading is dreaming with open eyes.", a: "Unknown" },
  { q: "Not all those who wander are lost.", a: "J.R.R. Tolkien" },
  { q: "So many books, so little time.", a: "Frank Zappa" }
];
const CHALLENGES = [
  { id: "c1", title: "Read an Indian Author", desc: "Read any book written by an Indian author", emoji: "🇮🇳", points: 50 },
  { id: "c2", title: "Historical Journey", desc: "Read a historical fiction or history book", emoji: "🏛️", points: 40 },
  { id: "c3", title: "Science Explorer", desc: "Read a science or non-fiction book", emoji: "🔬", points: 40 },
  { id: "c4", title: "Classic Club", desc: "Read a classic book (pre-1960)", emoji: "📜", points: 60 },
  { id: "c5", title: "Poetry Soul", desc: "Read a poetry collection", emoji: "🌹", points: 35 },
  { id: "c6", title: "Speedy Reader", desc: "Finish a book in under 7 days", emoji: "⚡", points: 70 },
  { id: "c7", title: "Marathon Reader", desc: "Read a book with 500+ pages", emoji: "🏃", points: 80 },
  { id: "c8", title: "Multilingual", desc: "Read a book in a language other than English", emoji: "🌍", points: 90 },
];
const BINGO_SQUARES = [
  "Read 15 mins outdoors 🌿", "Read a book with a blue cover 📘", "Read an Indian author 🇮🇳", "Share a quote in The Pensieve ✨",
  "Read a book > 400 pages 📜", "Read before bedtime 🌙", "Read a poetry collection 🌹", "Discuss a book with your Buddy 🤝",
  "Read a debut novel 🐣", "Read for 3 days in a row 🔥", "Read a book published in 2026 🆕", "Read a memoir or biography ✍️",
  "Listen to an audiobook 🎧", "Read a book translated to English 🌍", "Read a childhood favorite 🎈", "Write a 5-star review ⭐"
];
const YEAR = 2026;
const DEFAULT_THEMES = {
  January: { emoji: "❄️", title: "Fresh Starts", desc: "New year, new chapters — hopeful, inspiring reads to kick things off." },
  February: { emoji: "💕", title: "Love & Relationships", desc: "Romance, friendship, and stories of the heart." },
  March: { emoji: "🌸", title: "Women's Voices", desc: "Celebrate books written by women, about women." },
  April: { emoji: "🌧️", title: "Mystery & Thrillers", desc: "April showers bring page-turning suspense." },
  May: { emoji: "🌷", title: "Growth & Self-Help", desc: "Bloom with books on personal growth and habits." },
  June: { emoji: "☀️", title: "Summer Fiction", desc: "Light, breezy reads for long sunny days." },
  July: { emoji: "🗺️", title: "Travel & Adventure", desc: "Explore the world through story." },
  August: { emoji: "🔬", title: "Science & Non-Fiction", desc: "Feed your curiosity with facts and ideas." },
  September: { emoji: "📜", title: "Classics", desc: "Back to school, back to the classics." },
  October: { emoji: "🎃", title: "Mystery & Horror", desc: "Spooky season calls for a chill down the spine." },
  November: { emoji: "🙏", title: "Memoirs & Gratitude", desc: "Reflect with memoirs, biographies, and true stories." },
  December: { emoji: "🎄", title: "Mythology & Fantasy", desc: "End the year with magic, myth and wonder." },
};

/* ─── UTILS ──────────────────────────────────────────────────*/
const abg = n => ["#7B2D2D", "#1A472A", "#0E1A40", "#5C2D91", "#B8540A", "#1565C0", "#2E7D32", "#6D2D92"][(n?.charCodeAt(0) || 0) % 8];
const ini = n => (n || "?").split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();
const fmt = d => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const nextId = ms => { const n = ms.map(m => parseInt((m.id || "BW000").replace(/\D/g, "")) || 0); return `BW${String(Math.max(0, ...n) + 1).padStart(3, "0")}`; };
const rand = arr => arr[Math.floor(Math.random() * arr.length)];
const today = () => new Date().toISOString().slice(0, 10);

/* ─── MONTHLY BUDDY SHUFFLE GENERATOR ─────────────────────────*/
function getMonthlyBuddy(userId, monthName, membersList) {
  if (!membersList || membersList.length <= 1) return null;
  const otherMembers = membersList.filter(m => m.id !== userId);
  const seedStr = userId + monthName + YEAR;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % otherMembers.length;
  return otherMembers[idx];
}

/* ─── COVER CACHE ────────────────────────────────────────────*/
const coverCache = {};
function Cover({ title, author, customCover, size = 80, r = 8 }) {
  const [src, setSrc] = useState(customCover || null);
  const [done, setDone] = useState(!!customCover);
  const ck = (title || "").toLowerCase().trim();

  useEffect(() => {
    if (customCover) { setSrc(customCover); setDone(true); return; }
    if (!title) { setDone(true); return; }
    if (coverCache[ck] !== undefined) { setSrc(coverCache[ck] || null); setDone(true); return; }
    setSrc(null); setDone(false);
    fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=3&fields=cover_i`)
      .then(x => x.json()).then(d => {
        const item = (d.docs || []).find(x => x.cover_i);
        if (item?.cover_i) {
          const url = `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`;
          coverCache[ck] = url; setSrc(url); setDone(true);
        } else {
          coverCache[ck] = ""; setDone(true);
        }
      }).catch(() => { coverCache[ck] = ""; setDone(true); });
  }, [title, author, customCover, ck]);

  const bg = ["#7B2D2D", "#1A472A", "#0E1A40", "#5C2D91", "#B8540A", "#1565C0"][(title?.charCodeAt(0) || 0) % 6];
  return (
    <div style={{ width: size, height: size * 1.44, borderRadius: r, overflow: "hidden", flexShrink: 0, boxShadow: "2px 5px 16px rgba(0,0,0,0.55)", position: "relative", background: bg }}>
      {!done && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: size * .18, opacity: .5 }}>✨</span></div>}
      {src && <img src={src} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={() => { coverCache[ck] = ""; setSrc(null); setDone(true); }} />}
      {done && !src && (
        <div style={{ width: "100%", height: "100%", background: `linear-gradient(155deg,${bg},${bg}99)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <div style={{ fontWeight: 900, fontSize: size * .26, color: "rgba(255,255,255,.88)", fontFamily: "serif" }}>{ini(title)}</div>
          <div style={{ fontSize: size * .08, color: "rgba(255,255,255,.45)", textAlign: "center", padding: "0 6px", lineHeight: 1.2 }}>{(title || "").slice(0, 18)}</div>
        </div>
      )}
    </div>
  );
}

function Av({ m, size = 36 }) {
  if (m?.photo) return <img src={m.photo} alt={m?.name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid #C9A84C", flexShrink: 0 }} />;
  return <div style={{ width: size, height: size, borderRadius: "50%", background: abg(m?.name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * .36, fontWeight: 700, color: "#fff", flexShrink: 0, border: "2px solid rgba(201,168,76,.4)" }}>{ini(m?.name)}</div>;
}

function PBar({ p = 0, c = "#C9A84C", h = 7 }) {
  return <div style={{ height: h, background: "rgba(255,255,255,.07)", borderRadius: h, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(100, Math.max(0, p))}%`, background: c, borderRadius: h, transition: "width .7s ease" }} /></div>;
}

function Stars({ v = 0, onChange, sz = 15 }) {
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} onClick={() => onChange && onChange(s)} style={{ fontSize: sz, cursor: onChange ? "pointer" : "default", color: v >= s ? "#C9A84C" : "rgba(255,255,255,.15)" }}>★</span>
      ))}
      {v > 0 && <span style={{ fontSize: sz - 2, color: "rgba(201,168,76,.7)", marginLeft: 3 }}>{v}</span>}
    </div>
  );
}

/* ─── RESTORED CHART COMPONENTS (LINE & DONUT) ───────────────*/
function LineChart({ data, c = "#C9A84C", h = 100 }) {
  const max = Math.max(...data.map(d => d.v), 1);
  if (data.length < 2) return null;
  const pts = data.map((d, i) => [6 + (i / (data.length - 1)) * 88, h - 8 - ((d.v / max) * (h - 20))]);
  const path = "M " + pts.map(([x, y]) => `${x}% ${y}`).join(" L ");
  const area = path + ` L ${pts[pts.length - 1][0]}% ${h} L ${pts[0][0]}% ${h} Z`;
  return (
    <svg width="100%" height={h} style={{ overflow: "visible" }}>
      <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity={.35} /><stop offset="100%" stopColor={c} stopOpacity={0} /></linearGradient></defs>
      <path d={area} fill="url(#cg)" /><path d={path} fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={`${x}%`} cy={y} r={3.5} fill={c} stroke="rgba(0,0,0,.4)" strokeWidth={1.5} />
          {data[i].v > 0 && <text x={`${x}%`} y={y - 7} textAnchor="middle" fontSize={8} fill={c} fontWeight="bold">{data[i].v}</text>}
          <text x={`${x}%`} y={h + 2} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,.35)">{data[i].l}</text>
        </g>
      ))}
    </svg>
  );
}

function Donut({ slices, sz = 110 }) {
  const tot = slices.reduce((a, s) => a + s.v, 0) || 1;
  let cum = 0;
  const r = 42, cx = 55, cy = 55, sw = 14;
  return (
    <svg width={sz} height={sz} viewBox="0 0 110 110">
      {slices.map((s, i) => {
        const sa = cum / tot * 2 * Math.PI - Math.PI / 2;
        cum += s.v;
        const ea = cum / tot * 2 * Math.PI - Math.PI / 2;
        const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa);
        const x2 = cx + r * Math.cos(ea), y2 = cy + r * Math.sin(ea);
        const lg = s.v / tot > .5 ? 1 : 0;
        return <path key={i} d={`M${x1} ${y1} A${r} ${r} 0 ${lg} 1 ${x2} ${y2}`} fill="none" stroke={s.c} strokeWidth={sw} strokeLinecap="round" opacity={.85} />;
      })}
      <text x={55} y={51} textAnchor="middle" fontSize={16} fontWeight="bold" fill="#C9A84C">{tot}</text>
      <text x={55} y={64} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,.35)">books</text>
    </svg>
  );
}

const IS = { width: "100%", padding: "10px 13px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(201,168,76,.18)", borderRadius: 9, color: "#EDE8DF", fontSize: 13, marginBottom: 12, fontFamily: "inherit", outline: "none", transition: "border-color .2s" };
function FI(props) { return <input {...props} style={{ ...IS, ...(props.style || {}) }} />; }
function FS({ ch, ...props }) { return <select {...props} style={{ ...IS, ...(props.style || {}) }}>{ch}</select>; }
function FT(props) { return <textarea {...props} style={{ ...IS, height: 76, resize: "vertical", ...(props.style || {}) }} />; }
function FL({ ch }) { return <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(201,168,76,.65)", textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 4, fontFamily: "'Cinzel',serif" }}>{ch}</div>; }
function GB({ ch, onClick, ghost, full, sm, red, style: s = {} }) {
  const base = { padding: sm ? "6px 13px" : "10px 20px", borderRadius: 9, fontWeight: 700, fontSize: sm ? 11 : 13, border: "none", cursor: "pointer", transition: "all .18s", fontFamily: "'Cinzel',serif", letterSpacing: .4, ...s };
  if (red) return <button onClick={onClick} style={{ ...base, background: "rgba(180,40,40,.15)", border: "1px solid rgba(180,40,40,.4)", color: "#E07070" }}>{ch}</button>;
  if (ghost) return <button onClick={onClick} style={{ ...base, background: "transparent", border: "1px solid rgba(201,168,76,.35)", color: "rgba(201,168,76,.7)" }}>{ch}</button>;
  return <button onClick={onClick} style={{ ...base, background: "linear-gradient(135deg,#A07820,#C9A84C,#A07820)", color: "#0B0806", width: full ? "100%" : "auto", boxShadow: "0 3px 16px rgba(201,168,76,.28)" }}>{ch}</button>;
}
function SH({ ch, action }) { return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><h3 style={{ fontFamily: "'Cinzel',serif", fontSize: 15, color: "#C9A84C", letterSpacing: .4 }}>{ch}</h3>{action}</div>; }
function Nil({ icon, msg }) { return <div style={{ textAlign: "center", padding: "36px 16px", color: "rgba(255,255,255,.18)" }}><div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div><div style={{ fontSize: 12, fontFamily: "'Cinzel',serif" }}>{msg}</div></div>; }
function Modal({ title, ch, onClose, wide = false }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600, backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div style={{ background: "#0C0906", border: "1px solid rgba(201,168,76,.25)", borderRadius: 18, padding: "30px 34px", width: wide ? 680 : 500, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 0 70px rgba(201,168,76,.08)", position: "relative" }} onClick={e => e.stopPropagation()}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,#C9A84C,transparent)", borderRadius: "18px 18px 0 0" }} />
        <h2 style={{ fontFamily: "'Cinzel',serif", fontSize: 19, color: "#C9A84C", marginBottom: 18, letterSpacing: .8 }}>{title}</h2>
        {ch}
      </div>
    </div>
  );
}
function Confirm({ msg, onYes, onNo }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 700, backdropFilter: "blur(10px)" }} onClick={onNo}>
      <div style={{ background: "#0C0906", border: "1px solid rgba(180,40,40,.4)", borderRadius: 16, padding: 28, maxWidth: 360, textAlign: "center", boxShadow: "0 0 50px rgba(180,40,40,.15)" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 14, color: "#EDE8DF", lineHeight: 1.7, marginBottom: 20 }}>{msg}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}><GB ch="Cancel" ghost onClick={onNo} /><GB ch="Yes, Delete" red onClick={onYes} /></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════════ */
export default function App() {
  const [screen, setScreen] = useState("login");
  const [page, setPage] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);
  const [events, setEvents] = useState([
    { id: "e1", month: "August", date: 15, title: "Friday Book Club Discussion", time: "6:00 PM", link: "https://meet.google.com/abc-defg-hij" }
  ]);
  const [sideOpen, setSideOpen] = useState(true);
  const [shelfTab, setShelfTab] = useState("Reading");
  const [shelfSearch, setShelfSearch] = useState("");
  const [selMonth, setSelMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selDay, setSelDay] = useState(new Date().getDate());
  const [showGoal, setShowGoal] = useState(false);
  const [goalVal, setGoalVal] = useState("");
  const [showBookMod, setShowBookMod] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [showThemeEdit, setShowThemeEdit] = useState(false);
  const [showEventMod, setShowEventMod] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", date: 1, time: "6:00 PM", link: "https://meet.google.com/" });
  const [toast, setToast] = useState({ msg: "", type: "success" });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [viewMember, setViewMember] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [showProfEdit, setShowProfEdit] = useState(false);
  const [pe, setPe] = useState({});
  const [welcomeMsg, setWelcomeMsg] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");

  /* ── QUOTES FEED (THE PENSIEVE) ── */
  const [quotes, setQuotes] = useState([
    { id: "q1", authorName: "Albus Dumbledore", quote: "Words are, in my not-so-humble opinion, our most inexhaustible source of magic.", bookTitle: "Harry Potter", postedBy: "BW001", date: "August 2026" }
  ]);
  const [newQuote, setNewQuote] = useState({ quote: "", bookTitle: "", authorName: "" });
  const [showQuoteMod, setShowQuoteMod] = useState(false);

  /* ── 4x4 BINGO PROGRESS ── */
  const [userBingo, setUserBingo] = useState({});

  /* ── READING TIMER STATE ── */
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSecs, setTimerSecs] = useState(0);
  const [timerBook, setTimerBook] = useState("");

  const [forums, setForums] = useState([
    { id: "p1", authorId: "BW001", title: "Thoughts on The God of Small Things?", body: "How did everyone interpret the ending chapters?", date: "1 Aug 2026", replies: [] }
  ]);
  const [openPost, setOpenPost] = useState(null);
  const [newReply, setNewReply] = useState("");
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", body: "", bookTitle: "" });

  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [botm, setBotm] = useState(null);
  const [showRecommend, setShowRecommend] = useState(false);
  const [recForm, setRecForm] = useState({ toMemberId: "", bookTitle: "", bookAuthor: "", note: "" });
  const [recommendations, setRecommendations] = useState([]);
  const [monthlyThemes, setMonthlyThemes] = useState(DEFAULT_THEMES);
  const [themeForm, setThemeForm] = useState({ emoji: "", title: "", desc: "" });

  const eBook = { title: "", author: "", genre: "Fiction", mood: "Cozy Potion ☕", origLang: "English", readLang: "English", totalPages: "", finishedPages: "", status: "Reading", rating: 0, review: "", customCover: "" };
  const [bf, setBf] = useState(eBook);

  const myBooks = useMemo(() => books.filter(b => b.memberid === user?.id), [books, user]);
  const fin = myBooks.filter(b => b.status === "Finished");
  const rdg = myBooks.filter(b => b.status === "Reading");
  const ns = myBooks.filter(b => b.status === "Not Started");
  const target = parseInt(user?.yearlytarget) || 12;
  const goalPct = Math.min(100, Math.round((fin.length / target) * 100));
  const pagesRead = fin.reduce((a, b) => a + (parseInt(b.totalpages) || 0), 0);

  /* ── ASSIGNED BUDDY FOR THIS MONTH ── */
  const currentBuddy = useMemo(() => {
    if (!user || members.length <= 1) return null;
    return getMonthlyBuddy(user.id, selMonth, members);
  }, [user, selMonth, members]);

  /* ── MOMENTUM ENCOURAGEMENT HIGHLIGHTS ── */
  const momentumHighlights = useMemo(() => {
    const list = [];
    members.forEach(m => {
      const st = parseInt(m.streak_count) || 0;
      if (st >= 3) list.push(`🔥 ${m.name} read ${st} days in a row!`);
    });
    books.forEach(b => {
      if (b.status === "Reading" && b.pct >= 50 && b.pct <= 90) {
        list.push(`✨ ${b.membername} reached ${b.pct}% in "${b.title}"!`);
      }
      if (b.status === "Finished") {
        list.push(`🎉 ${b.membername} finished "${b.title}"!`);
      }
    });
    if (list.length === 0) {
      list.push("✨ Welcome to Book Wizards — read at your own pace!");
      list.push("📖 Every page read is a magical step forward!");
    }
    return list;
  }, [members, books]);

  const [highlightIdx, setHighlightIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setHighlightIdx(i => (i + 1) % momentumHighlights.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [momentumHighlights]);

  /* ── TIMER EFFECT ── */
  useEffect(() => {
    let interval;
    if (timerRunning) { interval = setInterval(() => setTimerSecs(s => s + 1), 1000); }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const fmtTimer = s => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const loadData = useCallback(async () => {
    if (!USE_SB) return;
    try {
      const [ms, bs] = await Promise.all([SB.select("members"), SB.select("books")]);
      setMembers(ms); setBooks(bs);
      if (user) {
        const fresh = ms.find(m => m.id === user.id);
        if (fresh) setUser(fresh);
      }
    } catch (e) { console.error("Load error:", e); }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), 3500);
  }

  async function doLogin() {
    setLoginErr("");
    const email = loginEmail.toLowerCase().trim();
    const found = members.find(m => (m.email || "").toLowerCase() === email) || members[0];
    if (!found) {
      setLoginErr("⚡ Wizard email not found. Try any registered email!");
      return;
    }
    setUser(found); setScreen("app");
  }

  async function checkinToday() {
    const td = today();
    const yd = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (user.last_checkin === td) {
      showToast("You already checked in today! Come back tomorrow 🔥", "error");
      return;
    }
    let newStreak = 1;
    if (user.last_checkin === yd) {
      newStreak = (parseInt(user.streak_count) || 0) + 1;
    }
    const updated = { ...user, last_checkin: td, streak_count: newStreak };
    setUser(updated);
    setMembers(ms => ms.map(m => m.id === user.id ? updated : m));
    if (USE_SB) await SB.update("members", { last_checkin: td, streak_count: newStreak }, user.id);
    showToast(`Awesome! Streak updated to ${newStreak} ${newStreak === 1 ? "day" : "days in a row"}! 🔥`);
  }

  async function saveBook() {
    if (!bf.title) { showToast("Please enter a book title!", "error"); return; }
    const tp = parseInt(bf.totalPages) || 0;
    const fp = parseInt(bf.finishedPages) || 0;
    const pct = tp > 0 ? Math.min(100, Math.round((fp / tp) * 100)) : 0;
    const wasEdit = !!editBook;
    const bk = {
      id: editBook ? editBook.id : "b" + Date.now(),
      memberid: user.id, membername: user.name,
      title: bf.title, author: bf.author, genre: bf.genre, mood: bf.mood,
      totalpages: tp, finishedpages: fp, pct,
      status: bf.status, rating: bf.rating, review: bf.review,
      enddate: today(), endmonth: MONTHS[new Date().getMonth()],
      customcover: bf.customCover || ""
    };
    setBooks(bs => wasEdit ? bs.map(b => (b.id === bk.id ? bk : b)) : [...bs, bk]);
    if (USE_SB) {
      wasEdit ? await SB.update("books", bk, bk.id) : await SB.insert("books", bk);
      loadData();
    }
    setShowBookMod(false); setEditBook(null); setBf(eBook);
    showToast(wasEdit ? "Book updated! 📚" : "Book added to shelf! ✨");
  }

  async function saveGoal() {
    const updated = { ...user, yearlytarget: parseInt(goalVal) || 12 };
    setUser(updated); setMembers(ms => ms.map(m => m.id === user.id ? updated : m));
    if (USE_SB) await SB.update("members", { yearlytarget: updated.yearlytarget }, user.id);
    setShowGoal(false); showToast("Reading goal updated! 🎯");
  }

  async function saveProfile() {
    const updated = { ...user, ...pe };
    setUser(updated); setMembers(ms => ms.map(m => m.id === user.id ? updated : m));
    if (USE_SB) await SB.update("members", pe, user.id);
    setShowProfEdit(false); showToast("Profile saved! ✨");
  }

  async function doDelete() {
    const { type, id } = confirmDel;
    if (type === "book") {
      setBooks(bs => bs.filter(b => b.id !== id));
      if (USE_SB) await SB.delete("books", id);
    }
    if (type === "member") {
      setBooks(bs => bs.filter(b => b.memberid !== id));
      setMembers(ms => ms.filter(m => m.id !== id));
      if (USE_SB) {
        await SB.deleteWhere("books", "memberid", id);
        await SB.delete("members", id);
      }
      if (id === user.id) { setUser(null); setScreen("login"); }
    }
    setConfirmDel(null); showToast("Deleted successfully", "error");
  }

  function toggleBingoSquare(idx) {
    const current = userBingo[user.id] || {};
    const updated = { ...current, [idx]: !current[idx] };
    setUserBingo({ ...userBingo, [user.id]: updated });
    if (updated[idx]) showToast("Bingo square marked complete! 🎯");
  }

  /* ── CALCULATIONS FOR RESTORED OLD PAGES ── */
  const mFin = books.filter(b => b.status === "Finished" && b.endmonth === selMonth);
  const mPages = mFin.reduce((a, b) => a + (parseInt(b.totalpages) || 0), 0);
  const gCounts = mFin.reduce((a, b) => { a[b.genre] = (a[b.genre] || 0) + 1; return a; }, {});
  const topG = Object.entries(gCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const actR = new Set(mFin.map(b => b.memberid)).size;
  const prevM = MONTHS[MONTHS.indexOf(selMonth) - 1] || MONTHS[11];
  const mStats = members.map(m => {
    const cur = books.filter(b => b.memberid === m.id && b.status === "Finished" && b.endmonth === selMonth);
    const prv = books.filter(b => b.memberid === m.id && b.status === "Finished" && b.endmonth === prevM);
    const imp = prv.length > 0 ? Math.round(((cur.length - prv.length) / prv.length) * 100) : cur.length > 0 ? 100 : 0;
    return { ...m, curB: cur.length, curP: cur.reduce((a, b) => a + (parseInt(b.totalpages) || 0), 0), prvB: prv.length, imp };
  });
  const yLine = MONTHS.map(mo => ({ l: mo.slice(0, 3), v: books.filter(b => b.status === "Finished" && b.endmonth === mo).length }));
  const allG = books.reduce((a, b) => { if (b.status === "Finished") a[b.genre] = (a[b.genre] || 0) + 1; return a; }, {});
  const gColors = ["#C9A84C", "#7B2D2D", "#1A472A", "#0E1A40", "#B8540A", "#5C2D91", "#2E7D32", "#1565C0"];
  const gSlices = Object.entries(allG).slice(0, 7).map(([g, v], i) => ({ g, v, c: gColors[i % 8] }));
  const board = members.map(m => {
    const mf = books.filter(b => b.memberid === m.id && b.status === "Finished");
    return { ...m, bR: mf.length, pR: mf.reduce((a, b) => a + (parseInt(b.totalpages) || 0), 0) };
  }).sort((a, b) => b.bR - a.bR);

  const upcomingBirthdays = members.filter(m => {
    if (!m.birthdaymonth || !m.birthdaydate) return false;
    const now = new Date();
    const bday = new Date(now.getFullYear(), MONTHS.indexOf(m.birthdaymonth), parseInt(m.birthdaydate));
    if (bday < now) bday.setFullYear(now.getFullYear() + 1);
    const diff = (bday - now) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  }).sort((a, b) => {
    const now = new Date();
    const d1 = new Date(now.getFullYear(), MONTHS.indexOf(a.birthdaymonth), parseInt(a.birthdaydate));
    const d2 = new Date(now.getFullYear(), MONTHS.indexOf(b.birthdaymonth), parseInt(b.birthdaydate));
    if (d1 < now) d1.setFullYear(now.getFullYear() + 1);
    if (d2 < now) d2.setFullYear(now.getFullYear() + 1);
    return d1 - d2;
  });

  /* ── 3-SECTION CATEGORIZED SIDEBAR NAVIGATION ── */
  const NAV_SECTIONS = [
    {
      group: "📖 MY STUDY",
      items: [
        { id: "dashboard", icon: "📖", lb: "My Dashboard" },
        { id: "myshelf", icon: "📚", lb: "My Bookshelf" },
        { id: "streak", icon: "🔥", lb: "Daily Streak" },
        { id: "timer", icon: "⏱️", lb: "Reading Timer" },
        { id: "buddy", icon: "🤝", lb: "Monthly Buddy" }
      ]
    },
    {
      group: "🏰 THE GREAT HALL",
      items: [
        { id: "monthly", icon: "🌙", lb: "Monthly Spells" },
        { id: "quotes", icon: "✨", lb: "The Pensieve (Quotes)" },
        { id: "forum", icon: "💬", lb: "Discussion Forum" },
        { id: "reviews", icon: "🌟", lb: "Book Reviews" },
        { id: "greathall", icon: "🏰", lb: "Member Directory" }
      ]
    },
    {
      group: "⭐ QUESTS & EVENTS",
      items: [
        { id: "calendar", icon: "📅", lb: "Calendar & Events" },
        { id: "bingo", icon: "🎯", lb: "Book Bingo (4x4)" },
        { id: "challenges", icon: "🏅", lb: "Challenges" },
        { id: "leaderboard", icon: "🏆", lb: "Leaderboard" },
        { id: "yearly", icon: "⭐", lb: "Yearly Stats" },
        { id: "wrapped", icon: "🎁", lb: "Reading Wrapped" }
      ]
    }
  ];

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    :root{--bg:#060402;--surf:#0D0A06;--card:#130F09;--card2:#1A140D;--bdr:rgba(201,168,76,.14);--bdr2:rgba(201,168,76,.28);--gold:#C9A84C;--text:#EDE8DF;--sub:rgba(237,232,223,.48);--mut:rgba(237,232,223,.22);}
    body{font-family:'Crimson Pro',Georgia,serif;background:var(--bg);color:var(--text);font-size:15px;}
    ::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-track{background:var(--surf);}::-webkit-scrollbar-thumb{background:rgba(201,168,76,.28);border-radius:2px;}
    button,input,select,textarea{font-family:'Crimson Pro',Georgia,serif;outline:none;}
    select option{background:#0D0A06;}
    @keyframes glw{0%,100%{text-shadow:0 0 18px rgba(201,168,76,.25)}50%{text-shadow:0 0 38px rgba(201,168,76,.7)}}
  `;
  const card = { background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 14 };

  if (screen !== "app") return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{css}</style>
      <div style={{ background: "rgba(13,10,6,.97)", border: "1px solid var(--bdr2)", borderRadius: 22, padding: "38px 42px", width: 420, textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🧙‍♂️</div>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", letterSpacing: 2, marginBottom: 20 }}>BOOK WIZARDS</div>
        <FL ch="Email Address" />
        <FI value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="wizard@email.com" />
        {loginErr && <div style={{ color: "#E07070", fontSize: 12, marginBottom: 10 }}>{loginErr}</div>}
        <GB ch="⚡ Enter Sanctum" onClick={doLogin} full />
        <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 14 }}>Tip: Enter any registered email to test.</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <style>{css}</style>

      {/* ── SIDEBAR ── */}
      <div style={{ width: sideOpen ? 230 : 60, background: "var(--surf)", borderRight: "1px solid var(--bdr)", position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 100, display: "flex", flexDirection: "column", transition: "width .22s ease", overflowX: "hidden" }}>
        <div style={{ padding: "15px 13px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(201,168,76,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🧙‍♂️</div>
          {sideOpen && <div><div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: "#C9A84C" }}>BOOK WIZARDS</div><div style={{ fontSize: 9, color: "var(--mut)", letterSpacing: 2 }}>READING CLUB</div></div>}
          <button style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--sub)", cursor: "pointer" }} onClick={() => setSideOpen(o => !o)}>{sideOpen ? "◀" : "▶"}</button>
        </div>

        <div style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
          {NAV_SECTIONS.map((section, idx) => (
            <div key={idx} style={{ marginBottom: 16 }}>
              {sideOpen && <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(201,168,76,.6)", letterSpacing: "1px", padding: "4px 8px", marginBottom: 4, fontFamily: "'Cinzel',serif" }}>{section.group}</div>}
              {section.items.map(n => (
                <div key={n.id} onClick={() => setPage(n.id)} title={n.lb}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 9, marginBottom: 2, cursor: "pointer", background: page === n.id ? "rgba(201,168,76,.1)" : "transparent", borderLeft: page === n.id ? "2px solid #C9A84C" : "2px solid transparent", color: page === n.id ? "#C9A84C" : "var(--sub)" }}>
                  <span style={{ fontSize: 15 }}>{n.icon}</span>
                  {sideOpen && <span style={{ fontSize: 13, fontFamily: "'Cinzel',serif", whiteSpace: "nowrap" }}>{n.lb}</span>}
                </div>
              ))}
            </div>
          ))}
          {user?.isadmin && (
            <div onClick={() => setPage("admin")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 9, marginTop: 8, paddingTop: 12, borderTop: "1px solid var(--bdr)", cursor: "pointer", color: page === "admin" ? "#C9A84C" : "rgba(224,112,112,.6)" }}>
              <span style={{ fontSize: 15 }}>⚙️</span>{sideOpen && <span style={{ fontSize: 12, fontFamily: "'Cinzel',serif" }}>Admin Panel</span>}
            </div>
          )}
        </div>

        <div style={{ padding: "12px 10px", borderTop: "1px solid var(--bdr)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => { setPe({ ...user }); setShowProfEdit(true); }}>
            <Av m={user} size={32} />
            {sideOpen && <div style={{ overflow: "hidden", flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{user.name.split(" ")[0]}</div><div style={{ fontSize: 10, color: "#C9A84C" }}>Day {(user.streak_count || 0)} Streak 🔥</div></div>}
          </div>
          {sideOpen && <button style={{ marginTop: 8, width: "100%", padding: "5px", background: "transparent", border: "1px solid var(--bdr)", borderRadius: 6, color: "var(--sub)", fontSize: 11, cursor: "pointer" }} onClick={() => { setUser(null); setScreen("login"); }}>Sign Out 🌀</button>}
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div style={{ marginLeft: sideOpen ? 230 : 60, flex: 1, padding: "26px 30px", transition: "margin-left .22s ease" }}>

        {/* TOP MOMENTUM BANNER */}
        <div style={{ background: "linear-gradient(90deg,rgba(201,168,76,.15),rgba(201,168,76,.03))", border: "1px solid rgba(201,168,76,.3)", borderRadius: 12, padding: "12px 18px", marginBottom: 22, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>📢</span>
            <span style={{ fontFamily: "'Cinzel',serif", fontSize: 14, color: "#C9A84C", fontWeight: 600 }}>
              {momentumHighlights[highlightIdx]}
            </span>
          </div>
          <button onClick={() => checkinToday()} style={{ background: "#C9A84C", color: "#000", border: "none", padding: "6px 14px", borderRadius: 8, fontWeight: "bold", cursor: "pointer", fontSize: 12, fontFamily: "'Cinzel',serif" }}>
            ✅ I Read Today
          </button>
        </div>

        {/* ── DASHBOARD ── */}
        {page === "dashboard" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C" }}>My Dashboard 📖</h1>
              <p style={{ color: "var(--sub)", fontSize: 14, fontStyle: "italic" }}>"{rand(QUOTES).q}"</p>
            </div>

            {currentBuddy && (
              <div onClick={() => setPage("buddy")} style={{ background: "var(--card2)", border: "1px solid rgba(201,168,76,.4)", borderRadius: 14, padding: 16, marginBottom: 18, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
                <Av m={currentBuddy} size={46} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "rgba(201,168,76,.8)", letterSpacing: 1, textTransform: "uppercase" }}>🤝 {selMonth} Buddy Assigned</div>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: 16, color: "#C9A84C" }}>You are paired with {currentBuddy.name}!</div>
                  <div style={{ fontSize: 12, color: "var(--sub)" }}>Tap to inspect what your buddy is reading and start your discussion.</div>
                </div>
                <GB ch="View Buddy →" sm ghost />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
              {[{ n: fin.length, l: "Books Finished", c: "#C9A84C" }, { n: rdg.length, l: "Reading Now", c: "#6B9FD4" }, { n: `${user.streak_count || 0} 🔥`, l: "Daily Streak", c: "#E07070" }, { n: `${goalPct}%`, l: "2026 Goal Progress", c: "#6FAF7B" }].map((s, i) => (
                <div key={i} style={{ ...card, padding: "15px 17px" }}><div style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: s.c }}>{s.n}</div><div style={{ fontSize: 12, color: "var(--sub)", marginTop: 4 }}>{s.l}</div></div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 16 }}>
              <div style={{ background: "linear-gradient(135deg,#0C0906,#191208)", border: "1px solid rgba(201,168,76,.18)", borderRadius: 14, padding: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: 15, color: "#C9A84C" }}>2026 Reading Quest</div>
                  <GB ch="✏️ Edit" sm ghost onClick={() => { setGoalVal(String(target)); setShowGoal(true); }} />
                </div>
                <div style={{ fontSize: 13, color: "var(--sub)", marginBottom: 12 }}>{fin.length} of {target} books · {goalPct}% complete</div>
                <PBar p={goalPct} h={9} />
              </div>

              <div style={{ ...card, padding: 18 }}>
                <SH ch="📖 Book of the Month" action={user?.isadmin && <GB ch="Set" sm ghost onClick={() => { const t = prompt("Enter Book Title:"); if (t) { setBotm({ title: t, setBy: user.name, month: MONTHS[new Date().getMonth()] }); showToast("Book of the Month set! 📖"); } }} />} />
                {botm ? (
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <Cover title={botm.title} size={50} r={6} />
                    <div><div style={{ fontFamily: "'Cinzel',serif", fontSize: 14 }}>{botm.title}</div><div style={{ fontSize: 11, color: "var(--sub)" }}>Set by {botm.setBy}</div></div>
                  </div>
                ) : <Nil icon="📖" msg="No Book of the Month set yet" />}
              </div>
            </div>

            <div style={{ ...card, padding: 18, marginBottom: 18 }}>
              <SH ch="Currently Reading 🌙" action={<GB ch="+ Add Book" sm ghost onClick={() => { setBf(eBook); setEditBook(null); setShowBookMod(true); }} />} />
              {rdg.length === 0 ? <Nil icon="🌙" msg="No active books. Add what you are reading today!" /> : rdg.map(b => (
                <div key={b.id} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                  <Cover title={b.title} author={b.author} customCover={b.customcover} size={40} r={5} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13 }}>{b.title}</div>
                    <div style={{ fontSize: 11, color: "var(--sub)" }}>{b.author} • <span style={{ color: "#C9A84C" }}>{b.mood || "Cozy Potion ☕"}</span></div>
                    <PBar p={b.pct} c="#6B9FD4" h={5} />
                  </div>
                  <span style={{ fontSize: 11, color: "var(--mut)" }}>{b.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MY BOOKSHELF (WITH RESTORED "NOT STARTED" / WANT TO READ TAB) ── */}
        {page === "myshelf" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C" }}>My Bookshelf 📚</h1>
              <div style={{ display: "flex", gap: 10 }}>
                <GB ch="📬 Recommend Book" sm ghost onClick={() => setShowRecommend(true)} />
                <GB ch="+ Add Book" sm onClick={() => { setBf(eBook); setEditBook(null); setShowBookMod(true); }} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {["Reading", "Finished", "Not Started"].map(t => (
                  <button key={t} onClick={() => setShelfTab(t)} style={{ padding: "6px 14px", borderRadius: 16, border: "1px solid", cursor: "pointer", borderColor: shelfTab === t ? "#C9A84C" : "var(--bdr)", background: shelfTab === t ? "rgba(201,168,76,.1)" : "transparent", color: shelfTab === t ? "#C9A84C" : "var(--sub)" }}>
                    {t} ({myBooks.filter(b => b.status === t).length})
                  </button>
                ))}
              </div>
              <div style={{ width: 220 }}>
                <FI value={shelfSearch} onChange={e => setShelfSearch(e.target.value)} placeholder="🔍 Search title..." style={{ marginBottom: 0 }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14 }}>
              {myBooks.filter(b => b.status === shelfTab).filter(b => {
                const q = shelfSearch.trim().toLowerCase();
                if (!q) return true;
                return (b.title || "").toLowerCase().includes(q) || (b.author || "").toLowerCase().includes(q);
              }).map(b => (
                <div key={b.id} style={{ ...card, padding: 12, textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><Cover title={b.title} author={b.author} customCover={b.customcover} size={80} r={6} /></div>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, height: 32, overflow: "hidden" }}>{b.title}</div>
                  <div style={{ fontSize: 11, color: "var(--sub)", marginBottom: 4 }}>{b.author}</div>
                  <div style={{ fontSize: 10, color: "#C9A84C", marginBottom: 8 }}>{b.mood || "Cozy Potion ☕"}</div>
                  {b.status === "Reading" && <PBar p={b.pct} h={5} />}
                  {b.status === "Finished" && <Stars v={b.rating} sz={12} />}
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <button style={{ flex: 1, padding: "4px", background: "rgba(201,168,76,.07)", border: "1px solid var(--bdr)", borderRadius: 6, color: "#C9A84C", fontSize: 10, cursor: "pointer" }} onClick={() => { setEditBook(b); setBf({ ...b }); setShowBookMod(true); }}>✏️ Edit</button>
                    <button style={{ padding: "4px 8px", background: "rgba(180,40,40,.1)", border: "1px solid rgba(180,40,40,.3)", borderRadius: 6, color: "#E07070", fontSize: 10, cursor: "pointer" }} onClick={() => setConfirmDel({ type: "book", id: b.id, name: b.title })}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MONTHLY SPELLS / COMMUNITY INSIGHTS (RESTORED FROM V7) ── */}
        {page === "monthly" && (
          <div>
            <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", marginBottom: 4 }}>Monthly Spells & Insights 🌙</h1>
            <p style={{ color: "var(--sub)", fontSize: 13, marginBottom: 16 }}>Community reading magic and stats by month</p>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 20 }}>
              {MONTHS.map(m => <button key={m} onClick={() => setSelMonth(m)} style={{ padding: "5px 11px", borderRadius: 16, border: "1px solid", fontSize: 11, cursor: "pointer", borderColor: selMonth === m ? "#C9A84C" : "var(--bdr)", background: selMonth === m ? "rgba(201,168,76,.1)" : "transparent", color: selMonth === m ? "#C9A84C" : "var(--sub)" }}>{m.slice(0, 3)}</button>)}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
              {[{ n: mFin.length, l: "Books Read", c: "#C9A84C" }, { n: mPages.toLocaleString(), l: "Pages Read", c: "#6B9FD4" }, { n: actR, l: "Active Wizards", c: "#6FAF7B" }, { n: topG, l: "Top Genre", c: "#9B84D4" }].map((s, i) => (
                <div key={i} style={{ ...card, padding: "13px 15px" }}><div style={{ fontFamily: "'Cinzel',serif", fontSize: 20, color: s.c }}>{s.n}</div><div style={{ fontSize: 11, color: "var(--sub)", marginTop: 4 }}>{s.l}</div></div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div style={{ ...card, padding: 16 }}>
                <SH ch="🏅 Top 5 — Most Books" />
                {mStats.filter(m => m.curB > 0).sort((a, b) => b.curB - a.curB).slice(0, 5).map((m, i) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, borderBottom: "1px solid var(--bdr)", paddingBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                    <Av m={m} size={26} />
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontFamily: "'Cinzel',serif" }}>{m.name}</div></div>
                    <span style={{ fontFamily: "'Cinzel',serif", fontSize: 16, color: "#C9A84C" }}>{m.curB}</span>
                  </div>
                ))}
              </div>

              <div style={{ ...card, padding: 16 }}>
                <SH ch="📜 Top 5 — Most Pages" />
                {mStats.filter(m => m.curP > 0).sort((a, b) => b.curP - a.curP).slice(0, 5).map((m, i) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, borderBottom: "1px solid var(--bdr)", paddingBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                    <Av m={m} size={26} />
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontFamily: "'Cinzel',serif" }}>{m.name}</div></div>
                    <span style={{ fontFamily: "'Cinzel',serif", fontSize: 16, color: "#6B9FD4" }}>{m.curP.toLocaleString()} pp</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ ...card, padding: 16 }}>
                <SH ch="🚀 Most Improved (vs Last Month)" />
                {mStats.filter(m => m.curB > 0).sort((a, b) => b.imp - a.imp).slice(0, 5).map((m, i) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <Av m={m} size={26} />
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontFamily: "'Cinzel',serif" }}>{m.name}</div><div style={{ fontSize: 11, color: "var(--sub)" }}>{m.prvB} → {m.curB} books</div></div>
                    <span style={{ color: m.imp >= 0 ? "#6FAF7B" : "#E07070", fontWeight: "bold" }}>{m.imp >= 0 ? "+" : ""}{m.imp}%</span>
                  </div>
                ))}
              </div>

              <div style={{ ...card, padding: 16 }}>
                <SH ch="📊 Member Contribution" />
                {mStats.filter(m => m.curB > 0).map(m => {
                  const p = mFin.length > 0 ? Math.round((m.curB / mFin.length) * 100) : 0;
                  return (
                    <div key={m.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                        <span>{m.name}</span><span style={{ color: "#C9A84C" }}>{m.curB} ({p}%)</span>
                      </div>
                      <PBar p={p} c={abg(m.name)} h={5} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── THE PENSIEVE (QUOTE FEED) ── */}
        {page === "quotes" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C" }}>The Pensieve ✨</h1>
                <p style={{ color: "var(--sub)", fontSize: 13, marginTop: 4 }}>Share a favorite line or quote from your current read in 10 seconds.</p>
              </div>
              <GB ch="+ Drop a Quote" sm onClick={() => setShowQuoteMod(true)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {quotes.map(q => {
                const author = members.find(m => m.id === q.postedBy);
                return (
                  <div key={q.id} style={{ ...card, padding: 20, background: "linear-gradient(135deg,#130F09,#19130A)" }}>
                    <div style={{ fontSize: 16, fontStyle: "italic", lineHeight: 1.6, color: "var(--text)", marginBottom: 12 }}>"{q.quote}"</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--bdr)", paddingTop: 12 }}>
                      <div><span style={{ fontFamily: "'Cinzel',serif", fontSize: 13, color: "#C9A84C" }}>— {q.authorName}</span>{q.bookTitle && <span style={{ fontSize: 11, color: "var(--sub)", marginLeft: 6 }}>({q.bookTitle})</span>}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Av m={author} size={20} /><span style={{ fontSize: 11, color: "var(--mut)" }}>{author?.name || "A Wizard"}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MONTHLY BUDDY SHUFFLE ── */}
        {page === "buddy" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C" }}>Monthly Reading Buddy 🤝</h1>
                <p style={{ color: "var(--sub)", fontSize: 13, marginTop: 4 }}>Buddies are shuffled randomly on the 1st of every month!</p>
              </div>
              <FS ch={MONTHS.map(m => <option key={m}>{m}</option>)} value={selMonth} onChange={e => setSelMonth(e.target.value)} style={{ width: 140, marginBottom: 0 }} />
            </div>

            {currentBuddy ? (
              <div style={{ ...card, padding: 24, textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
                <div style={{ fontSize: 11, color: "var(--sub)", letterSpacing: 2, marginBottom: 12 }}>YOUR ASSIGNED BUDDY FOR {selMonth.toUpperCase()}</div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><Av m={currentBuddy} size={84} /></div>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 22, color: "#C9A84C" }}>{currentBuddy.name}</div>
                <div style={{ fontSize: 12, color: "var(--sub)", marginBottom: 18 }}>📍 {currentBuddy.city}, {currentBuddy.country}</div>

                <div style={{ background: "var(--card2)", borderRadius: 12, padding: 16, textAlign: "left", marginBottom: 18, border: "1px solid var(--bdr)" }}>
                  <div style={{ fontSize: 11, fontWeight: "bold", color: "#C9A84C", marginBottom: 6, textTransform: "uppercase" }}>📖 What your buddy is reading right now:</div>
                  {books.filter(b => b.memberid === currentBuddy.id && b.status === "Reading").slice(0, 2).map(b => (
                    <div key={b.id} style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
                      <Cover title={b.title} size={32} r={4} />
                      <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontFamily: "'Cinzel',serif" }}>{b.title}</div><div style={{ fontSize: 11, color: "var(--sub)" }}>{b.author}</div></div>
                      <span style={{ fontSize: 11, color: "#6B9FD4" }}>{b.pct}%</span>
                    </div>
                  ))}
                  {books.filter(b => b.memberid === currentBuddy.id && b.status === "Reading").length === 0 && (
                    <div style={{ fontSize: 12, color: "var(--mut)" }}>No book logged yet for this month. Send an owl to pick a book together!</div>
                  )}
                </div>

                <GB ch={`💬 Start Discussion with ${currentBuddy.name.split(" ")[0]}`} full onClick={() => {
                  setNewPost({ title: `🤝 ${selMonth} Buddy Read: [Our Book Title]`, body: `Hey @${currentBuddy.name}! Which book should we pick together for this month?`, bookTitle: "" });
                  setShowNewPost(true); setPage("forum");
                }} />
              </div>
            ) : <Nil icon="🤝" msg="Add more wizards to the club to enable monthly buddy pairing!" />}
          </div>
        )}

        {/* ── FORUM ── */}
        {page === "forum" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
              <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C" }}>Discussion Forum 💬</h1>
              <GB ch="+ New Discussion" sm onClick={() => setShowNewPost(true)} />
            </div>
            {forums.map((p, i) => (
              <div key={i} style={{ ...card, padding: 16, marginBottom: 10 }}>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 15, color: "var(--text)" }}>{p.title}</div>
                <div style={{ fontSize: 13, color: "var(--sub)", margin: "6px 0" }}>{p.body}</div>
                <div style={{ fontSize: 11, color: "var(--mut)" }}>— Posted on {p.date}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── BOOK REVIEWS ── */}
        {page === "reviews" && (
          <div>
            <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", marginBottom: 16 }}>Book Reviews 🌟</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
              {books.filter(b => b.status === "Finished" && b.review).map(b => (
                <div key={b.id} style={{ ...card, padding: 16 }}>
                  <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                    <Cover title={b.title} size={44} r={4} />
                    <div><div style={{ fontFamily: "'Cinzel',serif", fontSize: 14 }}>{b.title}</div><Stars v={b.rating} sz={13} /></div>
                  </div>
                  <div style={{ fontSize: 13, fontStyle: "italic", color: "var(--sub)", marginBottom: 10 }}>"{b.review}"</div>
                  <div style={{ fontSize: 11, color: "#C9A84C" }}>— Reviewed by {b.membername}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── THE GREAT HALL (MEMBER DIRECTORY - RESTORED FROM V7) ── */}
        {page === "greathall" && (
          <div>
            <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", marginBottom: 16 }}>The Great Hall 🏰</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14 }}>
              {members.map(m => {
                const mf = books.filter(b => b.memberid === m.id && b.status === "Finished").length;
                const mr = books.filter(b => b.memberid === m.id && b.status === "Reading").length;
                return (
                  <div key={m.id} style={{ ...card, padding: 16, textAlign: "center", cursor: "pointer" }} onClick={() => setViewMember(m)}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><Av m={m} size={60} /></div>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 14, fontWeight: "bold" }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: "var(--sub)", marginBottom: 10 }}>📍 {m.city}, {m.country}</div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 16, borderTop: "1px solid var(--bdr)", paddingTop: 10 }}>
                      <div><div style={{ fontFamily: "'Cinzel',serif", fontSize: 16, color: "#C9A84C" }}>{mf}</div><div style={{ fontSize: 10, color: "var(--sub)" }}>read</div></div>
                      <div><div style={{ fontFamily: "'Cinzel',serif", fontSize: 16, color: "#6B9FD4" }}>{mr}</div><div style={{ fontSize: 10, color: "var(--sub)" }}>reading</div></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CALENDAR & EVENTS (WITH BIRTHDAY WIZARD PHOTO & WRITTEN MESSAGE) ── */}
        {page === "calendar" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C" }}>Calendar & Events 📅</h1>
              <div style={{ display: "flex", gap: 8 }}>
                {user?.isadmin && <GB ch="+ Add Club Event" sm onClick={() => setShowEventMod(true)} />}
                {user?.isadmin && <GB ch="🎨 Edit Theme" sm ghost onClick={() => { setThemeForm(monthlyThemes[selMonth] || DEFAULT_THEMES[selMonth]); setShowThemeEdit(true); }} />}
              </div>
            </div>

            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
              {MONTHS.map(m => <button key={m} onClick={() => setSelMonth(m)} style={{ padding: "5px 11px", borderRadius: 16, border: "1px solid", fontSize: 11, cursor: "pointer", borderColor: selMonth === m ? "#C9A84C" : "var(--bdr)", background: selMonth === m ? "rgba(201,168,76,.1)" : "transparent", color: selMonth === m ? "#C9A84C" : "var(--sub)" }}>{m.slice(0, 3)}</button>)}
            </div>

            <div style={{ background: "linear-gradient(135deg,#0C0906,#191208)", border: "1px solid rgba(201,168,76,.18)", borderRadius: 14, padding: 20, marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 40 }}>{(monthlyThemes[selMonth] || DEFAULT_THEMES[selMonth]).emoji}</div>
              <div>
                <div style={{ fontSize: 10, color: "var(--sub)", letterSpacing: 2 }}>{selMonth.toUpperCase()} SPELL THEME</div>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color: "#C9A84C" }}>{(monthlyThemes[selMonth] || DEFAULT_THEMES[selMonth]).title}</div>
                <div style={{ fontSize: 12, color: "var(--sub)" }}>{(monthlyThemes[selMonth] || DEFAULT_THEMES[selMonth]).desc}</div>
              </div>
            </div>

            <div style={{ ...card, padding: 18, marginBottom: 16 }}>
              <SH ch={`🗓️ Select a date in ${selMonth} to inspect Birthdays & Events`} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => {
                  const hasBday = members.some(m => m.birthdaymonth === selMonth && parseInt(m.birthdaydate) === d);
                  const hasEv = events.some(e => e.month === selMonth && parseInt(e.date) === d);
                  const isSel = selDay === d;
                  return (
                    <div key={d} onClick={() => setSelDay(d)} style={{ minHeight: 46, borderRadius: 8, padding: 4, cursor: "pointer", border: isSel ? "2px solid #C9A84C" : "1px solid var(--bdr)", background: isSel ? "rgba(201,168,76,.12)" : "var(--card2)", textAlign: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: isSel ? "bold" : "normal", color: isSel ? "#C9A84C" : "var(--text)" }}>{d}</div>
                      <div style={{ display: "flex", justifyContent: "center", gap: 3, marginTop: 2 }}>
                        {hasBday && <span style={{ fontSize: 10 }}>🎂</span>}
                        {hasEv && <span style={{ fontSize: 10 }}>🗓️</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SELECTED DAY INSPECTION DRAWER (SHOWING PHOTO & CUSTOM MESSAGE FOR BIRTHDAYS) */}
            <div style={{ ...card, padding: 20, background: "rgba(201,168,76,.04)", border: "1px solid rgba(201,168,76,.3)" }}>
              <h3 style={{ fontFamily: "'Cinzel',serif", fontSize: 16, color: "#C9A84C", marginBottom: 12 }}>
                📍 Events for {selMonth} {selDay}, {YEAR}
              </h3>

              {members.filter(m => m.birthdaymonth === selMonth && parseInt(m.birthdaydate) === selDay).map(m => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, background: "var(--card)", borderRadius: 12, marginBottom: 10, border: "1px solid rgba(201,168,76,.2)" }}>
                  <Av m={m} size={50} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 15, color: "#C9A84C" }}>🎂 Happy Birthday, {m.name}!</div>
                    <div style={{ fontSize: 12, color: "var(--sub)", fontStyle: "italic", marginTop: 3 }}>
                      "May your new year be filled with magical chapters and endless page-turners!"
                    </div>
                  </div>
                </div>
              ))}

              {events.filter(e => e.month === selMonth && parseInt(e.date) === selDay).map(e => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, background: "var(--card)", borderRadius: 12, marginBottom: 10, border: "1px solid var(--bdr)" }}>
                  <div>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 14, color: "var(--text)" }}>🗓️ {e.title}</div>
                    <div style={{ fontSize: 12, color: "var(--sub)", marginTop: 2 }}>⏰ Time: {e.time}</div>
                  </div>
                  {e.link && (
                    <a href={e.link} target="_blank" rel="noreferrer" style={{ textDecoration: "none", padding: "8px 16px", background: "#C9A84C", color: "#000", fontWeight: "bold", borderRadius: "8px", fontSize: 12, fontFamily: "'Cinzel',serif" }}>
                      🚀 Join Meeting
                    </a>
                  )}
                </div>
              ))}

              {members.filter(m => m.birthdaymonth === selMonth && parseInt(m.birthdaydate) === selDay).length === 0 &&
                events.filter(e => e.month === selMonth && parseInt(e.date) === selDay).length === 0 && (
                  <div style={{ color: "var(--sub)", fontSize: 13 }}>No birthdays or meetings scheduled for this date. Quiet day to read!</div>
                )}
            </div>
          </div>
        )}

        {/* ── 4x4 INTERACTIVE BOOK BINGO ── */}
        {page === "bingo" && (
          <div>
            <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", marginBottom: 16 }}>Book Bingo (4x4) 🎯</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, maxWidth: 640, margin: "0 auto" }}>
              {BINGO_SQUARES.map((square, i) => {
                const isDone = (userBingo[user.id] || {})[i];
                return (
                  <div key={i} onClick={() => toggleBingoSquare(i)}
                    style={{ ...card, padding: 16, minHeight: 110, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", cursor: "pointer", border: isDone ? "2px solid #6FAF7B" : "1px solid var(--bdr)", background: isDone ? "rgba(111,175,123,.1)" : "var(--card)", transition: "all .15s" }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{isDone ? "✅" : "🎯"}</div>
                    <div style={{ fontSize: 12, fontFamily: "'Cinzel',serif", color: isDone ? "#6FAF7B" : "var(--text)" }}>{square}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── READING CHALLENGES (RESTORED FROM V7) ── */}
        {page === "challenges" && (
          <div>
            <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", marginBottom: 4 }}>Reading Challenges 🏅</h1>
            <p style={{ color: "var(--sub)", fontSize: 13, marginBottom: 16 }}>Complete challenges to earn points and badges</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
              {CHALLENGES.map(ch => {
                const done = completedChallenges.some(c => c.memberId === user.id && c.challengeId === ch.id);
                return (
                  <div key={ch.id} style={{ ...card, padding: 18, border: done ? "1px solid #6FAF7B" : "1px solid var(--bdr)" }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{ch.emoji}</div>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 14, fontWeight: "bold" }}>{ch.title}</div>
                    <div style={{ fontSize: 12, color: "var(--sub)", margin: "6px 0 12px" }}>{ch.desc}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#C9A84C", fontWeight: "bold" }}>+{ch.points} pts</span>
                      {done ? <span style={{ color: "#6FAF7B", fontSize: 12 }}>✅ Done</span> : (
                        <GB ch="Mark Done" sm onClick={() => {
                          setCompletedChallenges(c => [...c, { memberId: user.id, challengeId: ch.id }]);
                          showToast(`Challenge completed! +${ch.points} pts 🏅`);
                        }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── LEADERBOARD (RESTORED FROM V7) ── */}
        {page === "leaderboard" && (
          <div>
            <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", marginBottom: 16 }}>Leaderboard 🏆</h1>
            <div style={{ maxWidth: 640, margin: "0 auto" }}>
              {board.map((m, i) => (
                <div key={m.id} style={{ ...card, padding: 14, display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                  <span style={{ fontSize: 18, width: 28 }}>{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                  <Av m={m} size={40} />
                  <div style={{ flex: 1 }}><div style={{ fontFamily: "'Cinzel',serif", fontSize: 14, fontWeight: "bold" }}>{m.name}</div><div style={{ fontSize: 11, color: "var(--sub)" }}>{m.pR.toLocaleString()} pages read</div></div>
                  <span style={{ fontFamily: "'Cinzel',serif", fontSize: 20, color: "#C9A84C" }}>{m.bR} books</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── YEARLY STATS (RESTORED WITH LINE & DONUT CHARTS FROM V7) ── */}
        {page === "yearly" && (
          <div>
            <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", marginBottom: 16 }}>Yearly Stats ⭐</h1>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div style={{ ...card, padding: 18 }}>
                <SH ch="📈 Books Read Per Month" />
                <LineChart data={yLine} h={120} />
              </div>
              <div style={{ ...card, padding: 18 }}>
                <SH ch="🎭 Genre Distribution" />
                <div style={{ display: "flex", justifyContent: "center" }}><Donut slices={gSlices} sz={120} /></div>
              </div>
            </div>

            <div style={{ ...card, padding: 18 }}>
              <SH ch="🎯 Member 2026 Goal Progress" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
                {members.map(m => {
                  const mf = books.filter(b => b.memberid === m.id && b.status === "Finished").length;
                  const pct = Math.min(100, Math.round((mf / (parseInt(m.yearlytarget) || 12)) * 100));
                  return (
                    <div key={m.id} style={{ padding: 12, background: "var(--card2)", borderRadius: 10, border: "1px solid var(--bdr)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <Av m={m} size={30} />
                        <div><div style={{ fontFamily: "'Cinzel',serif", fontSize: 13 }}>{m.name}</div><div style={{ fontSize: 10, color: "var(--sub)" }}>{mf} / {m.yearlytarget || 12} books</div></div>
                      </div>
                      <PBar p={pct} h={6} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── READING WRAPPED (RESTORED FROM V7) ── */}
        {page === "wrapped" && (
          <div>
            <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", marginBottom: 16 }}>Reading Wrapped 🎁</h1>
            <div style={{ ...card, padding: 30, textAlign: "center", maxWidth: 520, margin: "0 auto", background: "linear-gradient(135deg,#130F09,#1C150D)" }}>
              <Av m={user} size={70} />
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 22, color: "#C9A84C", margin: "14px 0 6px" }}>{user.name}'s 2026 Wrapped</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 20 }}>
                {[{ n: fin.length, l: "Books Read" }, { n: pagesRead.toLocaleString(), l: "Pages Read" }, { n: user.streak_count || 0, l: "Day Streak" }].map((s, i) => (
                  <div key={i} style={{ padding: 14, background: "var(--card2)", borderRadius: 10 }}>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 20, color: "#C9A84C" }}>{s.n}</div>
                    <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 4 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── READING TIMER (RESTORED FROM V7) ── */}
        {page === "timer" && (
          <div>
            <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", marginBottom: 16 }}>Reading Timer ⏱️</h1>
            <div style={{ ...card, padding: 30, textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 48, color: "#C9A84C", marginBottom: 20 }}>{fmtTimer(timerSecs)}</div>
              <FI value={timerBook} onChange={e => setTimerBook(e.target.value)} placeholder="What book are you reading?" style={{ marginBottom: 20 }} />
              <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                {!timerRunning ? <GB ch="▶ Start" onClick={() => setTimerRunning(true)} /> : <GB ch="⏸ Pause" ghost onClick={() => setTimerRunning(false)} />}
                <GB ch="⏹ Reset" ghost onClick={() => { setTimerRunning(false); setTimerSecs(0); }} />
                {timerSecs > 0 && !timerRunning && <GB ch="✅ Log Session" onClick={() => { showToast(`Logged ${fmtTimer(timerSecs)} reading! 📚`); setTimerSecs(0); }} />}
              </div>
            </div>
          </div>
        )}

        {/* ── DAILY STREAK PAGE ── */}
        {page === "streak" && (
          <div>
            <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", marginBottom: 16 }}>Daily Streak 🔥</h1>
            <div style={{ ...card, padding: 30, textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 50, marginBottom: 10 }}>🔥</div>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 32, color: "#C9A84C" }}>{user.streak_count || 0} Days in a Row</div>
              <p style={{ color: "var(--sub)", fontSize: 13, margin: "10px 0 20px" }}>Consistency counts more than speed! Log at least 1 page a day.</p>
              <GB ch="✅ Log Today's Reading" onClick={() => checkinToday()} />
            </div>
          </div>
        )}

        {/* ── ADMIN PANEL (RESTORED FROM V7) ── */}
        {page === "admin" && user?.isadmin && (
          <div>
            <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", marginBottom: 16 }}>Admin Panel ⚙️</h1>
            <div style={{ ...card, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--card2)", borderBottom: "1px solid var(--bdr)" }}>
                    {["Wizard", "Email", "City", "Streak", "Books", "Actions"].map(h => (
                      <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: "rgba(201,168,76,.8)", fontFamily: "'Cinzel',serif", fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} style={{ borderBottom: "1px solid var(--bdr)" }}>
                      <td style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}><Av m={m} size={28} /><span>{m.name}</span></td>
                      <td style={{ padding: "12px 14px", color: "var(--sub)" }}>{m.email}</td>
                      <td style={{ padding: "12px 14px" }}>{m.city}</td>
                      <td style={{ padding: "12px 14px" }}>{m.streak_count || 0} 🔥</td>
                      <td style={{ padding: "12px 14px" }}>{books.filter(b => b.memberid === m.id && b.status === "Finished").length}</td>
                      <td style={{ padding: "12px 14px" }}>
                        {m.id !== user.id && <GB ch="🗑️" sm red onClick={() => setConfirmDel({ type: "member", id: m.id, name: m.name })} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ── MODALS ── */}

      {showQuoteMod && (
        <Modal title="✨ Share a Quote in The Pensieve" ch={
          <div>
            <FL ch="Your Favorite Line *" />
            <FT value={newQuote.quote} onChange={e => setNewQuote(q => ({ ...q, quote: e.target.value }))} placeholder="Words are our most inexhaustible source of magic..." style={{ height: 100 }} />
            <FL ch="Author Name *" />
            <FI value={newQuote.authorName} onChange={e => setNewQuote(q => ({ ...q, authorName: e.target.value }))} placeholder="Albus Dumbledore" />
            <FL ch="Book Title (optional)" />
            <FI value={newQuote.bookTitle} onChange={e => setNewQuote(q => ({ ...q, bookTitle: e.target.value }))} placeholder="Harry Potter" />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <GB ch="Cancel" ghost onClick={() => setShowQuoteMod(false)} />
              <GB ch="Drop Quote ✨" onClick={() => {
                if (!newQuote.quote || !newQuote.authorName) { showToast("Please fill the quote and author!", "error"); return; }
                setQuotes(qs => [{ id: "q" + Date.now(), quote: newQuote.quote, authorName: newQuote.authorName, bookTitle: newQuote.bookTitle, postedBy: user.id, date: selMonth }, ...qs]);
                setShowQuoteMod(false);
                setNewQuote({ quote: "", bookTitle: "", authorName: "" });
                showToast("Quote added to The Pensieve! ✨");
              }} />
            </div>
          </div>
        } onClose={() => setShowQuoteMod(false)} />
      )}

      {showEventMod && (
        <Modal title="🗓️ Add Club Event" ch={
          <div>
            <FL ch="Event Title" />
            <FI value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} placeholder="Friday Book Club Discussion" />
            <FL ch="Date (Number)" />
            <FI type="number" value={eventForm.date} onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))} placeholder="15" />
            <FL ch="Time" />
            <FI value={eventForm.time} onChange={e => setEventForm(f => ({ ...f, time: e.target.value }))} placeholder="6:00 PM" />
            <FL ch="Meeting Link (Google Meet / Zoom)" />
            <FI value={eventForm.link} onChange={e => setEventForm(f => ({ ...f, link: e.target.value }))} placeholder="https://meet.google.com/..." />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <GB ch="Cancel" ghost onClick={() => setShowEventMod(false)} />
              <GB ch="Save Event 📅" onClick={() => {
                setEvents(ev => [...ev, { id: "e" + Date.now(), month: selMonth, date: parseInt(eventForm.date) || 1, title: eventForm.title, time: eventForm.time, link: eventForm.link }]);
                setShowEventMod(false);
                showToast("Event added to Calendar! 📅");
              }} />
            </div>
          </div>
        } onClose={() => setShowEventMod(false)} />
      )}

      {showThemeEdit && (
        <Modal title={`🎨 Edit Spell Theme (${selMonth})`} ch={
          <div>
            <FL ch="Emoji" /><FI value={themeForm.emoji} onChange={e => setThemeForm(t => ({ ...t, emoji: e.target.value }))} />
            <FL ch="Title" /><FI value={themeForm.title} onChange={e => setThemeForm(t => ({ ...t, title: e.target.value }))} />
            <FL ch="Description" /><FT value={themeForm.desc} onChange={e => setThemeForm(t => ({ ...t, desc: e.target.value }))} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <GB ch="Cancel" ghost onClick={() => setShowThemeEdit(false)} />
              <GB ch="Save Theme ✨" onClick={() => {
                setMonthlyThemes(mt => ({ ...mt, [selMonth]: themeForm }));
                setShowThemeEdit(false);
                showToast(`${selMonth} theme updated! 🎨`);
              }} />
            </div>
          </div>
        } onClose={() => setShowThemeEdit(false)} />
      )}

      {/* BOOK ADD/EDIT MODAL (NOW WITH MOOD / POTION TAGS & NOT STARTED STATUS) */}
      {showBookMod && (
        <Modal title="✨ Add Book to Shelf" ch={
          <div>
            <FL ch="Book Title *" /><FI value={bf.title} onChange={e => setBf(b => ({ ...b, title: e.target.value }))} />
            <FL ch="Author" /><FI value={bf.author} onChange={e => setBf(b => ({ ...b, author: e.target.value }))} />
            <FL ch="Mood / Potion Tag *" />
            <FS ch={MOODS.map(m => <option key={m}>{m}</option>)} value={bf.mood} onChange={e => setBf(b => ({ ...b, mood: e.target.value }))} />
            <FL ch="Total Pages" /><FI type="number" value={bf.totalPages} onChange={e => setBf(b => ({ ...b, totalPages: e.target.value }))} />
            <FL ch="Pages Read" /><FI type="number" value={bf.finishedPages} onChange={e => setBf(b => ({ ...b, finishedPages: e.target.value }))} />
            <FL ch="Status" />
            <FS ch={["Not Started", "Reading", "Finished"].map(s => <option key={s}>{s}</option>)} value={bf.status} onChange={e => setBf(b => ({ ...b, status: e.target.value }))} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <GB ch="Cancel" ghost onClick={() => setShowBookMod(false)} />
              <GB ch="Save Book 📚" onClick={saveBook} />
            </div>
          </div>
        } onClose={() => setShowBookMod(false)} />
      )}

      {showRecommend && (
        <Modal title="📬 Recommend a Book" ch={
          <div>
            <FL ch="Recommend to Member" />
            <FS ch={members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)} />
            <FL ch="Book Title" /><FI value={recForm.bookTitle} onChange={e => setRecForm(r => ({ ...r, bookTitle: e.target.value }))} />
            <FL ch="Why are you recommending this?" /><FT value={recForm.note} onChange={e => setRecForm(r => ({ ...r, note: e.target.value }))} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <GB ch="Cancel" ghost onClick={() => setShowRecommend(false)} />
              <GB ch="Send Owl 📬" onClick={() => { setShowRecommend(false); showToast("Recommendation sent! 📬"); }} />
            </div>
          </div>
        } onClose={() => setShowRecommend(false)} />
      )}

      {showGoal && (
        <Modal title="🎯 Edit 2026 Reading Goal" ch={
          <div>
            <FL ch="Target Books" />
            <FI type="number" value={goalVal} onChange={e => setGoalVal(e.target.value)} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <GB ch="Cancel" ghost onClick={() => setShowGoal(false)} />
              <GB ch="Save Target 🎯" onClick={saveGoal} />
            </div>
          </div>
        } onClose={() => setShowGoal(false)} />
      )}

      {viewMember && (
        <Modal title={`🧙 ${viewMember.name}`} ch={
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Av m={viewMember} size={80} /></div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 20 }}>{viewMember.name}</div>
            <div style={{ fontSize: 13, color: "var(--sub)", margin: "6px 0 16px" }}>📍 {viewMember.city}, {viewMember.country}</div>
            <GB ch="Close" ghost onClick={() => setViewMember(null)} />
          </div>
        } onClose={() => setViewMember(null)} />
      )}

      {confirmDel && <Confirm msg={`Delete "${confirmDel.name}"?`} onYes={doDelete} onNo={() => setConfirmDel(null)} />}

      {toast.msg && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "rgba(26,58,26,.97)", border: "1px solid #6FAF7B", borderRadius: 12, padding: "12px 24px", zIndex: 9999, fontFamily: "'Cinzel',serif", fontSize: 13, color: "#6FAF7B", boxShadow: "0 8px 32px rgba(0,0,0,.6)" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}