import { useState, useEffect, useMemo, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════
   📚 BOOK WIZARDS — v18 (LOCKED BUDDIES, FOOLPROOF LOGIN & BOOK SAVING)
   ═══════════════════════════════════════════════════════════════ */

const SUPABASE_URL = "https://nnxbappmomgnxqjtwaya.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ueGJhcHBtb21nbnhxanR3YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMjAzNzIsImV4cCI6MjA5Mjc5NjM3Mn0.xK3hK3_CETJQ-qpvzu3K3eYNf3An7LfayXjN27S2czM";
const USE_SB = true;

const EJS_SERVICE = "YOUR_EMAILJS_SERVICE_ID";
const EJS_TEMPLATE = "YOUR_EMAILJS_TEMPLATE_ID";
const EJS_KEY = "YOUR_EMAILJS_PUBLIC_KEY";

const LOGO = "/logo.png";

/* ─── LOCALSTORAGE HYDRATION HELPERS (0ms Instant Loading) ────*/
function loadLocal(key, defaultVal) {
  try {
    const item = localStorage.getItem("BW_" + key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}
function saveLocal(key, val) {
  try {
    localStorage.setItem("BW_" + key, JSON.stringify(val));
  } catch (e) { }
}

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
    return res.ok && Array.isArray(res.data) ? res.data : null;
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

async function sendWelcomeEmail(m) {
  if (EJS_SERVICE === "YOUR_EMAILJS_SERVICE_ID") return;
  try {
    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EJS_SERVICE, template_id: EJS_TEMPLATE, user_id: EJS_KEY,
        template_params: {
          to_name: m.name, to_email: m.email, member_id: m.id,
          city: m.city, country: m.country,
          handbook_link: "https://your-google-drive-link-to-handbook.pdf"
        }
      })
    });
  } catch { }
}

/* ─── CONSTANTS & EXPANDED FAMOUS QUOTES ─────────────────────*/
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
  { q: "A book must be the axe for the frozen sea within us.", a: "Franz Kafka" },
  { q: "Books are the mirrors of the soul.", a: "Virginia Woolf" },
  { q: "You think your pain and your heartbreak are unprecedented in the history of the world, but then you read.", a: "James Baldwin" },
  { q: "If there's a book that you want to read, but it hasn't been written yet, then you must write it.", a: "Toni Morrison" },
  { q: "I can never read all the books I want; I can never be all the people I want and live all the lives I want.", a: "Sylvia Plath" },
  { q: "If you only read the books that everyone else is reading, you can only think what everyone else is thinking.", a: "Haruki Murakami" },
  { q: "We read books to find out who we are. What other people, real or imaginary, do and think and feel is an essential guide.", a: "Ursula K. Le Guin" },
  { q: "It is what you read when you don't have to that determines what you will be when you can't help it.", a: "Oscar Wilde" },
  { q: "When I look back, I am so impressed again with the life-giving power of literature.", a: "Maya Angelou" },
  { q: "I have always imagined that Paradise will be a kind of library.", a: "Jorge Luis Borges" },
  { q: "Words are our most inexhaustible source of magic.", a: "Albus Dumbledore" },
  { q: "A reader lives a thousand lives before he dies.", a: "George R.R. Martin" }
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

/* ─── SAFE SUPABASE FIELD GETTERS & ROBUST MONTH MATCHING ─────*/
const getMemberId = (m) => String(m?.id || m?.ID || m?.memberid || m?.member_id || "").trim();
const getMemberName = (m) => m?.name || m?.Name || m?.email || "Wizard";
const getBookMemberId = (b) => String(b?.memberid || b?.memberId || b?.member_id || b?.user_id || b?.userid || "").trim();
const getBookPages = (b) => parseInt(b?.totalpages || b?.totalPages || b?.total_pages) || 0;

const matchMonth = (b, targetMonth) => {
  if (!b || !targetMonth) return false;
  const target = targetMonth.trim().toLowerCase();
  const rawMo = (b?.endmonth || b?.endMonth || b?.end_month || b?.month || "").trim().toLowerCase();
  if (rawMo && rawMo === target) return true;
  const rawDate = b?.enddate || b?.endDate || b?.end_date || b?.date || "";
  if (rawDate) {
    const d = new Date(rawDate);
    if (!isNaN(d) && MONTHS[d.getMonth()].toLowerCase() === target) return true;
  }
  return false;
};

const isStatus = (b, expected) => {
  const st = (b?.status || b?.Status || "").trim().toLowerCase();
  const exp = expected.trim().toLowerCase();
  if (exp === "to be read") return st === "to be read" || st === "not started" || st === "want to read";
  if (exp === "dnf") return st === "dnf" || st === "did not finish";
  return st === exp;
};

/* ─── UTILS ──────────────────────────────────────────────────*/
const abg = n => ["#7B2D2D", "#1A472A", "#0E1A40", "#5C2D91", "#B8540A", "#1565C0", "#2E7D32", "#6D2D92"][(n?.charCodeAt(0) || 0) % 8];
const ini = n => (n || "?").split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();
const fmt = d => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const nextId = ms => { const n = ms.map(m => parseInt((getMemberId(m) || "BW000").replace(/\D/g, "")) || 0); return `BW${String(Math.max(0, ...n) + 1).padStart(3, "0")}`; };
const rand = arr => arr[Math.floor(Math.random() * arr.length)];
const today = () => new Date().toISOString().slice(0, 10);

/* ─── 100% DETERMINISTIC MONTHLY BUDDY SHUFFLE (STRICTLY SORTED BY ID FIRST) ────*/
function getMonthlyBuddy(userId, monthName, membersList) {
  if (!membersList || membersList.length <= 1) return null;
  // Step 1: Strictly sort members alphabetically by unique ID so array order never changes
  const sorted = [...membersList].sort((a, b) => getMemberId(a).localeCompare(getMemberId(b)));
  const otherMembers = sorted.filter(m => getMemberId(m) !== userId);
  if (otherMembers.length === 0) return null;
  // Step 2: Use stable seed math
  const seedStr = userId + monthName + YEAR;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % otherMembers.length;
  return otherMembers[idx];
}

function getMonthlyBuddyPairs(monthName, membersList) {
  if (!membersList || membersList.length <= 1) return [];
  // Step 1: Strictly sort members alphabetically by unique ID
  const sorted = [...membersList].sort((a, b) => getMemberId(a).localeCompare(getMemberId(b)));
  const seed = monthName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) + YEAR;
  const shuffled = [...sorted];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (seed + i * 31) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const pairs = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    const m1 = shuffled[i];
    const m2 = shuffled[i + 1] || shuffled[0];
    pairs.push({ m1, m2 });
  }
  return pairs;
}

/* ─── PARTICLE ANIMATIONS (FLOWING STARS) ────────────────────*/
function Particles() {
  const ps = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    d: 2.2 + Math.random() * 4,
    dl: Math.random() * 5,
    e: ["✨", "⭐", "💫", "⚡", "🌟", "☄️"][i % 6]
  }));
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <style>{`
        @keyframes fp{0%{opacity:0;transform:translateY(0) rotate(0)}15%{opacity:.85}100%{opacity:0;transform:translateY(-110vh) rotate(400deg)}}
        @keyframes glw{0%,100%{text-shadow:0 0 18px rgba(201,168,76,.25)}50%{text-shadow:0 0 38px rgba(201,168,76,.7),0 0 70px rgba(201,168,76,.3)}}
        @keyframes fiu{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        @keyframes pls{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
      `}</style>
      {ps.map(p => (
        <div key={p.id} style={{ position: "absolute", left: `${p.x}%`, bottom: -24, fontSize: 14, animation: `fp ${p.d}s ${p.dl}s infinite ease-in`, opacity: 0 }}>
          {p.e}
        </div>
      ))}
    </div>
  );
}

/* ─── SPLASH SCREEN ──────────────────────────────────────────*/
function Splash({ onDone }) {
  const [p, setP] = useState(0);
  const q = rand(QUOTES);
  useEffect(() => {
    const ts = [
      setTimeout(() => setP(1), 300),
      setTimeout(() => setP(2), 1100),
      setTimeout(() => setP(3), 2100),
      setTimeout(() => onDone(), 3900)
    ];
    return () => ts.forEach(clearTimeout);
  }, [onDone]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#050302", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, overflow: "hidden" }}>
      <Particles />
      <div style={{ textAlign: "center", position: "relative", zIndex: 1, padding: 32 }}>
        <div style={{ marginBottom: 14, transition: "opacity .6s", opacity: p >= 1 ? 1 : 0 }}>
          <img src={LOGO} alt="BW" style={{ width: 88, height: 88, objectFit: "contain", borderRadius: 14 }} onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "block"; }} />
          <div style={{ display: "none", fontSize: 68, animation: "pls 2s infinite" }}>🧙‍♂️</div>
        </div>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 40, fontWeight: 900, letterSpacing: 4, transition: "all .8s", opacity: p >= 1 ? 1 : 0, transform: p >= 1 ? "none" : "translateY(18px)", background: "linear-gradient(135deg,#8B6914,#C9A84C,#F5E6A0,#C9A84C,#8B6914)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: p >= 2 ? "glw 2.2s infinite" : "none" }}>BOOK WIZARDS</div>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: "rgba(201,168,76,.55)", letterSpacing: 6, marginTop: 5, transition: "opacity .8s", opacity: p >= 2 ? 1 : 0 }}>READING · MAGIC · COMMUNITY</div>
        <div style={{ marginTop: 26, maxWidth: 360, transition: "opacity .8s", opacity: p >= 3 ? 1 : 0 }}>
          <div style={{ color: "rgba(255,255,255,.55)", fontStyle: "italic", fontSize: 14, lineHeight: 1.9 }}>"{q.q}"</div>
          <div style={{ color: "rgba(201,168,76,.45)", fontSize: 11, marginTop: 6, letterSpacing: 2 }}>— {q.a}</div>
        </div>
      </div>
    </div>
  );
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
  if (m?.photo) return <img src={m.photo} alt={getMemberName(m)} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid #C9A84C", flexShrink: 0 }} />;
  return <div style={{ width: size, height: size, borderRadius: "50%", background: abg(getMemberName(m)), display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * .36, fontWeight: 700, color: "#fff", flexShrink: 0, border: "2px solid rgba(201,168,76,.4)" }}>{ini(getMemberName(m))}</div>;
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

/* ─── OBJECTIVE BRIEFING HEADER COMPONENT (ON EVERY TAB) ─────*/
function PageHeader({ title, icon, briefing, action }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", display: "flex", alignItems: "center", gap: 8 }}>
          <span>{icon}</span>
          <span>{title}</span>
        </h1>
        {action}
      </div>
      {briefing && (
        <p style={{ color: "var(--sub)", fontSize: 13, lineHeight: 1.5, background: "rgba(201,168,76,.04)", borderLeft: "2px solid #C9A84C", padding: "8px 12px", borderRadius: "0 8px 8px 0" }}>
          {briefing}
        </p>
      )}
    </div>
  );
}

/* ─── CHARTS ─────────────────────────────────────────────────*/
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
  const [splash, setSplash] = useState(true);
  const [screen, setScreen] = useState(() => loadLocal("screen", "login"));
  const [loading, setLoading] = useState(false);
  const [welcomeMsg, setWelcomeMsg] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");

  const [page, setPage] = useState(() => loadLocal("page", "dashboard"));
  const [user, setUserState] = useState(() => loadLocal("user", null));
  const [members, setMembersState] = useState(() => loadLocal("members", []));
  const [books, setBooksState] = useState(() => loadLocal("books", []));
  const [events, setEvents] = useState(() => loadLocal("events", [
    { id: "e1", month: "August", date: 15, title: "Friday Book Club Discussion", time: "6:00 PM", link: "https://meet.google.com/abc-defg-hij" }
  ]));

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

  const eReg = { name: "", email: "", phone: "", birthdayMonth: "January", birthdayDate: "", state: "", city: "", country: "India", postalAddress: "", instagramLink: "", goodreadsLink: "", bio: "", photo: "" };
  const [reg, setReg] = useState(eReg);
  const [regErr, setRegErr] = useState("");
  const [photoPrev, setPhotoPrev] = useState("");
  const regCities = reg.state ? (STATE_CITIES[reg.state] || []).sort() : [];

  const [quotes, setQuotesState] = useState(() => loadLocal("quotes", [
    { id: "q1", authorName: "Albus Dumbledore", quote: "Words are, in my not-so-humble opinion, our most inexhaustible source of magic.", bookTitle: "Harry Potter", postedBy: "BW001", date: "August 2026" }
  ]));
  const [newQuote, setNewQuote] = useState({ quote: "", bookTitle: "", authorName: "" });
  const [showQuoteMod, setShowQuoteMod] = useState(false);

  const [userBingo, setUserBingoState] = useState(() => loadLocal("userBingo", {}));
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSecs, setTimerSecs] = useState(0);
  const [timerBook, setTimerBook] = useState("");

  const [forums, setForumsState] = useState(() => loadLocal("forums", [
    { id: "p1", authorId: "BW001", title: "Thoughts on The God of Small Things?", body: "How did everyone interpret the ending chapters?", date: "1 Aug 2026", replies: [] }
  ]));
  const [openPost, setOpenPost] = useState(null);
  const [newReply, setNewReply] = useState("");
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", body: "", bookTitle: "" });

  const [completedChallenges, setCompletedChallengesState] = useState(() => loadLocal("completedChallenges", []));
  const [botm, setBotmState] = useState(() => loadLocal("botm", null));
  const [showRecommend, setShowRecommend] = useState(false);
  const [recForm, setRecForm] = useState({ toMemberId: "", bookTitle: "", bookAuthor: "", note: "" });
  const [recommendations, setRecommendations] = useState([]);
  const [monthlyThemes, setMonthlyThemesState] = useState(() => loadLocal("monthlyThemes", DEFAULT_THEMES));
  const [themeForm, setThemeForm] = useState({ emoji: "", title: "", desc: "" });

  const eBook = { title: "", author: "", genre: "Fiction", mood: "Cozy Potion ☕", origLang: "English", readLang: "English", totalPages: "", finishedPages: "", status: "Reading", rating: 0, review: "", customCover: "" };
  const [bf, setBf] = useState(eBook);

  /* ── 0ms INSTANT SYNC WRAPPERS ── */
  const setUser = (u) => { setUserState(u); saveLocal("user", u); };
  const setMembers = (ms) => {
    setMembersState(prev => {
      const next = typeof ms === "function" ? ms(prev) : ms;
      saveLocal("members", next);
      return next;
    });
  };
  const setBooks = (bs) => {
    setBooksState(prev => {
      const next = typeof bs === "function" ? bs(prev) : bs;
      saveLocal("books", next);
      return next;
    });
  };
  const setQuotes = (qs) => {
    setQuotesState(prev => {
      const next = typeof qs === "function" ? qs(prev) : qs;
      saveLocal("quotes", next);
      return next;
    });
  };
  const setForums = (fs) => {
    setForumsState(prev => {
      const next = typeof fs === "function" ? fs(prev) : fs;
      saveLocal("forums", next);
      return next;
    });
  };
  const setUserBingo = (ub) => {
    setUserBingoState(prev => {
      const next = typeof ub === "function" ? ub(prev) : ub;
      saveLocal("userBingo", next);
      return next;
    });
  };
  const setCompletedChallenges = (cc) => {
    setCompletedChallengesState(prev => {
      const next = typeof cc === "function" ? cc(prev) : cc;
      saveLocal("completedChallenges", next);
      return next;
    });
  };
  const setBotm = (val) => { setBotmState(val); saveLocal("botm", val); };
  const setMonthlyThemes = (mt) => {
    setMonthlyThemesState(prev => {
      const next = typeof mt === "function" ? mt(prev) : mt;
      saveLocal("monthlyThemes", next);
      return next;
    });
  };

  useEffect(() => { saveLocal("page", page); }, [page]);
  useEffect(() => { saveLocal("screen", screen); }, [screen]);

  /* ── FILTERED BOOK LISTS & TARGETS ── */
  const myBooks = useMemo(() => books.filter(b => getBookMemberId(b) === getMemberId(user)), [books, user]);
  const fin = useMemo(() => myBooks.filter(b => isStatus(b, "Finished")), [myBooks]);
  const rdg = useMemo(() => myBooks.filter(b => isStatus(b, "Reading")), [myBooks]);
  const tbr = useMemo(() => myBooks.filter(b => isStatus(b, "To Be Read")), [myBooks]);
  const dnf = useMemo(() => myBooks.filter(b => isStatus(b, "DNF")), [myBooks]);

  const target = parseInt(user?.yearlytarget) || 12;
  const goalPct = Math.min(100, Math.round((fin.length / target) * 100));
  const pagesRead = fin.reduce((a, b) => a + getBookPages(b), 0);

  /* ── ASSIGNED BUDDY & ALL BUDDY PAIRS FOR THIS MONTH ── */
  const currentBuddy = useMemo(() => {
    if (!user || members.length <= 1) return null;
    return getMonthlyBuddy(getMemberId(user), selMonth, members);
  }, [user, selMonth, members]);

  const allMonthBuddyPairs = useMemo(() => {
    return getMonthlyBuddyPairs(selMonth, members);
  }, [selMonth, members]);

  /* ── ROTATING AUTHOR QUOTE ON LOGIN ── */
  const [quoteIdx, setQuoteIdx] = useState(0);
  useEffect(() => {
    const qTimer = setInterval(() => {
      setQuoteIdx(i => (i + 1) % QUOTES.length);
    }, 4500);
    return () => clearInterval(qTimer);
  }, []);

  /* ── BIRTHDAY ALERTS (ONLY SHOWS BIRTHDAY ON TOP RIBBON) ── */
  const birthdaysToday = useMemo(() => {
    const tdMonth = MONTHS[new Date().getMonth()];
    const tdDay = new Date().getDate();
    return members.filter(m => m.birthdaymonth === tdMonth && parseInt(m.birthdaydate) === tdDay);
  }, [members]);

  /* ── TIMER EFFECT ── */
  useEffect(() => {
    let interval;
    if (timerRunning) { interval = setInterval(() => setTimerSecs(s => s + 1), 1000); }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const fmtTimer = s => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  /* ── BACKGROUND SUPABASE SYNC (0ms HYDRATION) ── */
  const loadData = useCallback(async () => {
    if (!USE_SB) return;
    try {
      const [ms, bs] = await Promise.all([SB.select("members"), SB.select("books")]);
      if (ms && ms.length > 0) setMembers(ms);
      if (bs && bs.length > 0) setBooks(bs);
      if (user && ms) {
        const fresh = ms.find(m => getMemberId(m) === getMemberId(user));
        if (fresh) setUser(fresh);
      }
    } catch (e) { console.error("Load error:", e); }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), 3500);
  }

  function handlePhoto(e, cb) {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = ev => cb(ev.target.result);
    rd.readAsDataURL(f);
  }

  async function doLogin() {
    setLoading(true); setLoginErr("");
    try {
      let lm = members;
      if (USE_SB) {
        const freshMembers = await SB.select("members");
        if (freshMembers && freshMembers.length > 0) {
          lm = freshMembers;
          setMembers(lm);
        }
      }
      const email = loginEmail.toLowerCase().trim();
      const found = lm.find(m => (m.email || m.Email || "").toLowerCase().trim() === email);
      if (!found) {
        setLoginErr("⚡ No wizard found with that email. Please Request Admission below!");
        setLoading(false);
        return;
      }
      setUser(found);
      setScreen("app");
    } catch (e) {
      console.error("Login error:", e);
      setLoginErr("⚡ Connection error. Please check your internet and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function doRegister() {
    if (!reg.name || !reg.email) { setRegErr("Name and email are required."); return; }
    if (!reg.bio) { setRegErr("Please write a short bio."); return; }
    if (!reg.photo) { setRegErr("Please upload your photo."); return; }
    setLoading(true);
    let lm = members;
    if (USE_SB) {
      const res = await SB.select("members");
      if (res) { lm = res; setMembers(lm); }
    }
    if (lm.find(m => (m.email || m.Email || "").toLowerCase() === reg.email.toLowerCase())) {
      setRegErr("Email already registered!"); setLoading(false); return;
    }
    const newM = {
      id: nextId(lm), name: reg.name, email: reg.email, phone: reg.phone,
      birthdaymonth: reg.birthdayMonth, birthdaydate: reg.birthdayDate,
      state: reg.state, city: reg.city, country: reg.country,
      postaladdress: reg.postalAddress, instagramlink: reg.instagramLink,
      goodreadslink: reg.goodreadsLink, bio: reg.bio, photo: reg.photo,
      yearlytarget: 12, joindate: today(), isadmin: false, streak_count: 0
    };
    if (USE_SB) { await SB.insert("members", newM); await loadData(); } else setMembers(ms => [...ms, newM]);
    await sendWelcomeEmail(newM);
    setNewMemberName(getMemberName(newM)); setUser(newM); setLoading(false); setWelcomeMsg(true);
    setTimeout(() => { setWelcomeMsg(false); setScreen("app"); }, 4000);
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
    setMembers(ms => ms.map(m => getMemberId(m) === getMemberId(user) ? updated : m));
    if (USE_SB) await SB.update("members", { last_checkin: td, streak_count: newStreak }, getMemberId(user));
    showToast(`Awesome! Streak updated to ${newStreak} ${newStreak === 1 ? "day" : "days in a row"}! 🔥`);
  }

  async function saveBook() {
    if (!bf.title) { showToast("Please enter a book title!", "error"); return; }
    if (bf.status === "Finished" && (!bf.review || !bf.review.trim())) {
      showToast("Please share a quick review or reaction (even 1–2 words!) before marking as Finished ⭐", "error");
      return;
    }
    const tp = parseInt(bf.totalPages) || 0;
    const fp = parseInt(bf.finishedPages) || 0;
    const pct = tp > 0 ? Math.min(100, Math.round((fp / tp) * 100)) : 0;
    const wasEdit = !!editBook;
    const bk = {
      id: editBook ? editBook.id : "b" + Date.now(),
      memberid: getMemberId(user), membername: getMemberName(user),
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
    setUser(updated); setMembers(ms => ms.map(m => getMemberId(m) === getMemberId(user) ? updated : m));
    if (USE_SB) await SB.update("members", { yearlytarget: updated.yearlytarget }, getMemberId(user));
    setShowGoal(false); showToast("Reading goal updated! 🎯");
  }

  async function saveProfile() {
    const updated = { ...user, ...pe };
    setUser(updated); setMembers(ms => ms.map(m => getMemberId(m) === getMemberId(user) ? updated : m));
    if (USE_SB) await SB.update("members", pe, getMemberId(user));
    setShowProfEdit(false); showToast("Profile saved! ✨");
  }

  async function doDelete() {
    const { type, id } = confirmDel;
    if (type === "book") {
      setBooks(bs => bs.filter(b => b.id !== id));
      if (USE_SB) await SB.delete("books", id);
    }
    if (type === "member") {
      setBooks(bs => bs.filter(b => getBookMemberId(b) !== id));
      setMembers(ms => ms.filter(m => getMemberId(m) !== id));
      if (USE_SB) {
        await SB.deleteWhere("books", "memberid", id);
        await SB.delete("members", id);
      }
      if (id === getMemberId(user)) { setUser(null); setScreen("login"); }
    }
    setConfirmDel(null); showToast("Deleted successfully", "error");
  }

  function toggleBingoSquare(idx) {
    const uId = getMemberId(user);
    const current = userBingo[uId] || {};
    const updated = { ...current, [idx]: !current[idx] };
    setUserBingo({ ...userBingo, [uId]: updated });
    if (updated[idx]) showToast("Bingo square marked complete! 🎯");
  }

  /* ── SAFE STAT CALCULATIONS USING matchMonth ── */
  const mFin = useMemo(() => books.filter(b => isStatus(b, "Finished") && matchMonth(b, selMonth)), [books, selMonth]);
  const mPages = useMemo(() => mFin.reduce((a, b) => a + getBookPages(b), 0), [mFin]);
  const gCounts = useMemo(() => mFin.reduce((a, b) => { a[b.genre] = (a[b.genre] || 0) + 1; return a; }, {}), [mFin]);
  const topG = useMemo(() => Object.entries(gCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—", [gCounts]);
  const actR = useMemo(() => new Set(mFin.map(b => getBookMemberId(b))).size, [mFin]);
  const prevM = MONTHS[MONTHS.indexOf(selMonth) - 1] || MONTHS[11];

  const mStats = useMemo(() => members.map(m => {
    const mId = getMemberId(m);
    const cur = books.filter(b => getBookMemberId(b) === mId && isStatus(b, "Finished") && matchMonth(b, selMonth));
    const prv = books.filter(b => getBookMemberId(b) === mId && isStatus(b, "Finished") && matchMonth(b, prevM));
    const imp = prv.length > 0 ? Math.round(((cur.length - prv.length) / prv.length) * 100) : cur.length > 0 ? 100 : 0;
    return { ...m, curB: cur.length, curP: cur.reduce((a, b) => a + getBookPages(b), 0), prvB: prv.length, imp };
  }), [members, books, selMonth, prevM]);

  const yLine = useMemo(() => MONTHS.map(mo => ({ l: mo.slice(0, 3), v: books.filter(b => isStatus(b, "Finished") && matchMonth(b, mo)).length })), [books]);
  const allG = useMemo(() => books.reduce((a, b) => { if (isStatus(b, "Finished")) a[b.genre] = (a[b.genre] || 0) + 1; return a; }, {}), [books]);
  const gColors = ["#C9A84C", "#7B2D2D", "#1A472A", "#0E1A40", "#B8540A", "#5C2D91", "#2E7D32", "#1565C0"];
  const gSlices = useMemo(() => Object.entries(allG).slice(0, 7).map(([g, v], i) => ({ g, v, c: gColors[i % 8] })), [allG]);

  const board = useMemo(() => members.map(m => {
    const mId = getMemberId(m);
    const mf = books.filter(b => getBookMemberId(b) === mId && isStatus(b, "Finished"));
    return { ...m, bR: mf.length, pR: mf.reduce((a, b) => a + getBookPages(b), 0) };
  }).sort((a, b) => b.bR - a.bR), [members, books]);

  const avgBookLength = useMemo(() => {
    const allFin = books.filter(b => isStatus(b, "Finished"));
    if (!allFin.length) return 0;
    const tot = allFin.reduce((a, b) => a + getBookPages(b), 0);
    return Math.round(tot / allFin.length);
  }, [books]);

  const activeCommunityPct = useMemo(() => {
    if (!members.length) return 0;
    const active = members.filter(m => parseInt(m.streak_count) > 0 || books.some(b => getBookMemberId(b) === getMemberId(m))).length;
    return Math.round((active / members.length) * 100);
  }, [members, books]);

  /* ── COMMUNITY HONOR RIBBONS (CELEBRATING STEADY/CONSISTENT READERS) ── */
  const honorRibbons = useMemo(() => {
    if (!members.length) return [];
    const highestStreak = [...members].sort((a, b) => (parseInt(b.streak_count) || 0) - (parseInt(a.streak_count) || 0))[0];
    const topContributor = [...members].sort((a, b) => {
      const aQ = quotes.filter(q => q.postedBy === getMemberId(a)).length;
      const bQ = quotes.filter(q => q.postedBy === getMemberId(b)).length;
      return bQ - aQ;
    })[0];
    const mostSteady = [...members].sort((a, b) => {
      const aP = books.filter(bk => getBookMemberId(bk) === getMemberId(a)).reduce((sum, bk) => sum + getBookPages(bk), 0);
      const bP = books.filter(bk => getBookMemberId(bk) === getMemberId(b)).reduce((sum, bk) => sum + getBookPages(bk), 0);
      return bP - aP;
    })[0];

    return [
      { title: "🔥 The Consistency Crown", member: highestStreak, desc: `${highestStreak?.streak_count || 0} consecutive days logged` },
      { title: "✨ The Pensieve Laureate", member: topContributor, desc: "Shared the most thoughts & quotes" },
      { title: "🌱 Steady Traveler", member: mostSteady, desc: "Dedicated page-by-page progress" }
    ];
  }, [members, quotes, books]);

  const NAV_SECTIONS = [
    {
      group: "📖 MY STUDY",
      items: [
        { id: "dashboard", icon: "📖", lb: "My Dashboard" },
        { id: "myshelf", icon: "📚", lb: "My Bookshelf" },
        { id: "streak", icon: "🔥", lb: "Daily Streak" },
        { id: "timer", icon: "⏱️", lb: "Reading Timer" },
        { id: "buddy", icon: "🤝", lb: "My Monthly Buddy" }
      ]
    },
    {
      group: "🏰 THE GREAT HALL",
      items: [
        { id: "monthly", icon: "🌙", lb: "Monthly Spells" },
        { id: "quotes", icon: "✨", lb: "The Pensieve (Quotes)" },
        { id: "clubbuddies", icon: "🤝", lb: "Club Buddy Pairs" },
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

  if (splash) return <div><style>{css}</style><Splash onDone={() => setSplash(false)} /></div>;

  if (welcomeMsg) return (
    <div style={{ position: "fixed", inset: 0, background: "#060402", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
      <style>{css}</style><Particles />
      <div style={{ textAlign: "center", position: "relative", zIndex: 1, animation: "fiu .5s ease" }}>
        <div style={{ fontSize: 68, marginBottom: 16 }}>⚡</div>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: "rgba(201,168,76,.55)", letterSpacing: 8, marginBottom: 10 }}>WELCOME TO</div>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 32, color: "#C9A84C", letterSpacing: 3, animation: "glw 2s infinite", marginBottom: 8 }}>BOOK WIZARDS</div>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color: "var(--text)", fontStyle: "italic", marginBottom: 12 }}>"{newMemberName}, your journey begins now."</div>
        <div style={{ color: "var(--sub)", fontSize: 14, maxWidth: 360, lineHeight: 1.8 }}>Your acceptance scroll has been sent to your email.<br />Welcome to the magical reading community! ✨</div>
      </div>
    </div>
  );

  if (screen !== "app") {
    const quoteOfDay = QUOTES[quoteIdx % QUOTES.length];
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <style>{css}</style>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 20% 50%,rgba(123,45,45,.07) 0%,transparent 60%),radial-gradient(ellipse at 80% 30%,rgba(14,26,64,.1) 0%,transparent 60%)" }} />
        <Particles />
        <div style={{ position: "relative", zIndex: 1, background: "rgba(13,10,6,.97)", border: "1px solid var(--bdr2)", borderRadius: 22, padding: "38px 42px", width: screen === "register" ? 550 : 450, maxWidth: "95vw", maxHeight: "95vh", overflowY: "auto", boxShadow: "0 0 90px rgba(201,168,76,.07),0 32px 64px rgba(0,0,0,.7)" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,#C9A84C,transparent)", borderRadius: "22px 22px 0 0" }} />
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{ width: 68, height: 68, margin: "0 auto 10px", borderRadius: 13, overflow: "hidden", border: "1px solid var(--bdr2)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(201,168,76,.07)" }}>
              <img src={LOGO} alt="BW" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={e => { e.target.style.display = "none"; e.target.parentNode.innerHTML = "<span style='font-size:34px'>🧙‍♂️</span>"; }} />
            </div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", letterSpacing: 2, animation: "glw 3s infinite" }}>BOOK WIZARDS</div>
            <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 3, letterSpacing: 3, fontFamily: "'Cinzel',serif" }}>READING · MAGIC · COMMUNITY</div>

            {/* ── ROTATING AUTHOR QUOTE ON LOGIN ── */}
            <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(201,168,76,.15)", borderRadius: 10, minHeight: 64, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 13, fontStyle: "italic", color: "rgba(255,255,255,.7)", lineHeight: 1.5 }}>"{quoteOfDay.q}"</div>
              <div style={{ fontSize: 11, color: "#C9A84C", marginTop: 4 }}>— {quoteOfDay.a}</div>
            </div>
          </div>

          {screen === "login" && (
            <>
              <FL ch="Email Address" />
              <FI value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="wizard@email.com" type="email" onKeyDown={e => e.key === "Enter" && doLogin()} />
              {loginErr && <div style={{ color: "#E07070", fontSize: 12, marginBottom: 10, textAlign: "center" }}>{loginErr}</div>}
              <GB ch={loading ? "🌀 Summoning..." : "⚡ Enter the Library"} onClick={doLogin} full />
              <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "var(--sub)" }}>
                New wizard?{" "}
                <button style={{ background: "none", border: "none", color: "#C9A84C", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Cinzel',serif" }} onClick={() => setScreen("register")}>Request Admission</button>
              </div>
            </>
          )}

          {screen === "register" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
                <div style={{ gridColumn: "1/-1", marginBottom: 12 }}>
                  <FL ch="Your Photo * (mandatory)" />
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(201,168,76,.08)", border: "2px solid rgba(201,168,76,.3)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {photoPrev ? <img src={photoPrev} alt="p" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 26 }}>🧙</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input type="file" accept="image/*" onChange={e => handlePhoto(e, v => { setPhotoPrev(v); setReg(r => ({ ...r, photo: v })); })} style={{ display: "none" }} id="rph" />
                      <label htmlFor="rph" style={{ display: "block", padding: "8px 13px", background: "rgba(201,168,76,.07)", border: "1px solid rgba(201,168,76,.28)", borderRadius: 9, color: "#C9A84C", fontSize: 12, cursor: "pointer", textAlign: "center", fontFamily: "'Cinzel',serif" }}>📷 Upload Photo</label>
                    </div>
                  </div>
                </div>
                <div style={{ gridColumn: "1/-1" }}><FL ch="Full Name *" /><FI value={reg.name} onChange={e => setReg(r => ({ ...r, name: e.target.value }))} placeholder="Priya Sharma" /></div>
                <div style={{ gridColumn: "1/-1" }}><FL ch="Gmail Address *" /><FI type="email" value={reg.email} onChange={e => setReg(r => ({ ...r, email: e.target.value }))} placeholder="priya@gmail.com" /></div>
                <div><FL ch="Phone" /><FI value={reg.phone} onChange={e => setReg(r => ({ ...r, phone: e.target.value }))} placeholder="9876543210" /></div>
                <div><FL ch="Country" /><FS ch={COUNTRIES.map(c => <option key={c}>{c}</option>)} value={reg.country} onChange={e => setReg(r => ({ ...r, country: e.target.value, state: "", city: "" }))} /></div>
                {reg.country === "India" ? (<>
                  <div><FL ch="State *" /><FS ch={[<option key="" value="">— Select —</option>, ...STATES.map(s => <option key={s}>{s}</option>)]} value={reg.state} onChange={e => setReg(r => ({ ...r, state: e.target.value, city: "" }))} /></div>
                  <div><FL ch="City *" /><FS ch={[<option key="" value="">{reg.state ? "— Select —" : "Select state first"}</option>, ...regCities.map(c => <option key={c}>{c}</option>)]} value={reg.city} onChange={e => setReg(r => ({ ...r, city: e.target.value }))} disabled={!reg.state} /></div>
                </>) : (
                  <div style={{ gridColumn: "1/-1" }}><FL ch="City" /><FI value={reg.city} onChange={e => setReg(r => ({ ...r, city: e.target.value }))} placeholder="Your city" /></div>
                )}
                <div style={{ gridColumn: "1/-1" }}><FL ch="Postal Address *" /><FT value={reg.postalAddress} onChange={e => setReg(r => ({ ...r, postalAddress: e.target.value }))} placeholder="House No, Street, Area, City, Pin Code" style={{ height: 64 }} /></div>
                <div><FL ch="Birthday Month" /><FS ch={MONTHS.map(m => <option key={m}>{m}</option>)} value={reg.birthdayMonth} onChange={e => setReg(r => ({ ...r, birthdayMonth: e.target.value }))} /></div>
                <div><FL ch="Birthday Date" /><FI type="number" min="1" max="31" value={reg.birthdayDate} onChange={e => setReg(r => ({ ...r, birthdayDate: e.target.value }))} placeholder="15" /></div>
                <div><FL ch="Instagram" /><FI value={reg.instagramLink} onChange={e => setReg(r => ({ ...r, instagramLink: e.target.value }))} placeholder="instagram.com/username" /></div>
                <div><FL ch="Goodreads" /><FI value={reg.goodreadsLink} onChange={e => setReg(r => ({ ...r, goodreadsLink: e.target.value }))} placeholder="goodreads.com/user" /></div>
                <div style={{ gridColumn: "1/-1" }}><FL ch="Your Bio *" /><FT value={reg.bio} onChange={e => setReg(r => ({ ...r, bio: e.target.value }))} placeholder="I love reading literary fiction..." style={{ height: 80 }} /></div>
              </div>
              {regErr && <div style={{ color: "#E07070", fontSize: 12, margin: "6px 0", textAlign: "center" }}>{regErr}</div>}
              <GB ch={loading ? "🌀 Summoning Acceptance Scroll..." : "🧙 Request Admission"} onClick={doRegister} full style={{ marginTop: 10 }} />
              <div style={{ textAlign: "center", marginTop: 10, fontSize: 13, color: "var(--sub)" }}>
                Already a wizard?{" "}
                <button style={{ background: "none", border: "none", color: "#C9A84C", fontWeight: 700, fontSize: 13, cursor: "pointer" }} onClick={() => setScreen("login")}>Sign In</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

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
            {sideOpen && <div style={{ overflow: "hidden", flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{getMemberName(user).split(" ")[0]}</div><div style={{ fontSize: 10, color: "#C9A84C" }}>Day {(user.streak_count || 0)} Streak 🔥</div></div>}
          </div>
          {sideOpen && <button style={{ marginTop: 8, width: "100%", padding: "5px", background: "transparent", border: "1px solid var(--bdr)", borderRadius: 6, color: "var(--sub)", fontSize: 11, cursor: "pointer" }} onClick={() => { setUser(null); setScreen("login"); }}>Sign Out 🌀</button>}
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div style={{ marginLeft: sideOpen ? 230 : 60, flex: 1, padding: "26px 30px", transition: "margin-left .22s ease" }}>

        {/* TOP RIBBON — BIRTHDAY CELEBRATIONS ONLY */}
        {birthdaysToday.length > 0 && (
          <div style={{ background: "linear-gradient(90deg,rgba(201,168,76,.2),rgba(201,168,76,.05))", border: "1px solid rgba(201,168,76,.4)", borderRadius: 12, padding: "12px 18px", marginBottom: 22, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>🎂</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#C9A84C", fontWeight: "bold", letterSpacing: 1 }}>TODAY'S BIRTHDAY CELEBRATION</div>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 15, color: "var(--text)" }}>
                Happy Birthday to {birthdaysToday.map(m => getMemberName(m)).join(", ")}! Wish them a magical reading year! ✨
              </div>
            </div>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {page === "dashboard" && (
          <div>
            <PageHeader
              title="My Dashboard"
              icon="📖"
              briefing="Your personal command center. Track your yearly target, monitor active books, and check in your daily reading."
            />

            {currentBuddy && (
              <div onClick={() => setPage("buddy")} style={{ background: "var(--card2)", border: "1px solid rgba(201,168,76,.4)", borderRadius: 14, padding: 16, marginBottom: 18, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
                <Av m={currentBuddy} size={46} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "rgba(201,168,76,.8)", letterSpacing: 1, textTransform: "uppercase" }}>🤝 {selMonth} Buddy Assigned</div>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: 16, color: "#C9A84C" }}>You are paired with {getMemberName(currentBuddy)}!</div>
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
                <SH ch="📖 Book of the Month" action={user?.isadmin && <GB ch="Set" sm ghost onClick={() => { const t = prompt("Enter Book Title:"); if (t) { setBotm({ title: t, setBy: getMemberName(user), month: MONTHS[new Date().getMonth()] }); showToast("Book of the Month set! 📖"); } }} />} />
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

        {/* ── MY BOOKSHELF ── */}
        {page === "myshelf" && (
          <div>
            <PageHeader
              title="My Bookshelf"
              icon="📚"
              briefing="Manage your personal library. Categorize books by Reading, Finished, To Be Read, or DNF. Sharing a quick review is mandatory when marking a book Finished!"
              action={
                <div style={{ display: "flex", gap: 10 }}>
                  <GB ch="📬 Recommend Book" sm ghost onClick={() => setShowRecommend(true)} />
                  <GB ch="+ Add Book" sm onClick={() => { setBf(eBook); setEditBook(null); setShowBookMod(true); }} />
                </div>
              }
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Reading", "Finished", "To Be Read", "DNF"].map(t => (
                  <button key={t} onClick={() => setShelfTab(t)} style={{ padding: "6px 14px", borderRadius: 16, border: "1px solid", cursor: "pointer", borderColor: shelfTab === t ? "#C9A84C" : "var(--bdr)", background: shelfTab === t ? "rgba(201,168,76,.1)" : "transparent", color: shelfTab === t ? "#C9A84C" : "var(--sub)" }}>
                    {t} ({myBooks.filter(b => isStatus(b, t)).length})
                  </button>
                ))}
              </div>
              <div style={{ width: 220 }}>
                <FI value={shelfSearch} onChange={e => setShelfSearch(e.target.value)} placeholder="🔍 Search title..." style={{ marginBottom: 0 }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14 }}>
              {myBooks.filter(b => isStatus(b, shelfTab)).filter(b => {
                const q = shelfSearch.trim().toLowerCase();
                if (!q) return true;
                return (b.title || "").toLowerCase().includes(q) || (b.author || "").toLowerCase().includes(q);
              }).map(b => (
                <div key={b.id} style={{ ...card, padding: 12, textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><Cover title={b.title} author={b.author} customCover={b.customcover} size={80} r={6} /></div>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, height: 32, overflow: "hidden" }}>{b.title}</div>
                  <div style={{ fontSize: 11, color: "var(--sub)", marginBottom: 4 }}>{b.author}</div>
                  <div style={{ fontSize: 10, color: "#C9A84C", marginBottom: 8 }}>{b.mood || "Cozy Potion ☕"}</div>
                  {isStatus(b, "Reading") && <PBar p={b.pct} h={5} />}
                  {isStatus(b, "Finished") && <Stars v={b.rating} sz={12} />}
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <button style={{ flex: 1, padding: "4px", background: "rgba(201,168,76,.07)", border: "1px solid var(--bdr)", borderRadius: 6, color: "#C9A84C", fontSize: 10, cursor: "pointer" }} onClick={() => { setEditBook(b); setBf({ ...b }); setShowBookMod(true); }}>✏️ Edit</button>
                    <button style={{ padding: "4px 8px", background: "rgba(180,40,40,.1)", border: "1px solid rgba(180,40,40,.3)", borderRadius: 6, color: "#E07070", fontSize: 10, cursor: "pointer" }} onClick={() => setConfirmDel({ type: "book", id: b.id, name: b.title })}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── DAILY STREAK PAGE ── */}
        {page === "streak" && (
          <div>
            <PageHeader
              title="Daily Streak"
              icon="🔥"
              briefing="Build a lifelong reading habit. Logging even 1 page a day keeps your streak alive and earns Consistency Honors!"
            />
            <div style={{ ...card, padding: 30, textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 50, marginBottom: 10 }}>🔥</div>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 32, color: "#C9A84C" }}>{user.streak_count || 0} Days in a Row</div>
              <p style={{ color: "var(--sub)", fontSize: 13, margin: "10px 0 20px" }}>Consistency counts more than speed! Log at least 1 page a day.</p>
              <GB ch="✅ Log Today's Reading" onClick={() => checkinToday()} />
            </div>
          </div>
        )}

        {/* ── READING TIMER ── */}
        {page === "timer" && (
          <div>
            <PageHeader
              title="Reading Timer"
              icon="⏱️"
              briefing="Use the Pomodoro technique (25 min reading, 5 min break) for deep focus. Track exactly how much time you dedicate to each chapter."
            />
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

        {/* ── MY MONTHLY BUDDY (`📖 MY STUDY`) ── */}
        {page === "buddy" && (
          <div>
            <PageHeader
              title="My Monthly Buddy"
              icon="🤝"
              briefing="Every month, you are randomly paired with a club wizard! Connect, pick a shared book, and discuss your reading journeys together."
              action={
                <FS ch={MONTHS.map(m => <option key={m}>{m}</option>)} value={selMonth} onChange={e => setSelMonth(e.target.value)} style={{ width: 140, marginBottom: 0 }} />
              }
            />

            {currentBuddy ? (
              <div style={{ ...card, padding: 24, textAlign: "center", maxWidth: 580, margin: "0 auto" }}>
                <div style={{ fontSize: 11, color: "var(--sub)", letterSpacing: 2, marginBottom: 12 }}>YOUR ASSIGNED BUDDY FOR {selMonth.toUpperCase()}</div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><Av m={currentBuddy} size={84} /></div>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 22, color: "#C9A84C" }}>{getMemberName(currentBuddy)}</div>
                <div style={{ fontSize: 12, color: "var(--sub)", marginBottom: 18 }}>📍 {currentBuddy.city}, {currentBuddy.country}</div>

                <div style={{ background: "var(--card2)", borderRadius: 12, padding: 16, textAlign: "left", marginBottom: 18, border: "1px solid var(--bdr)" }}>
                  <div style={{ fontSize: 11, fontWeight: "bold", color: "#C9A84C", marginBottom: 6, textTransform: "uppercase" }}>📖 What your buddy is reading right now:</div>
                  {books.filter(b => getBookMemberId(b) === getMemberId(currentBuddy) && isStatus(b, "Reading")).slice(0, 2).map(b => (
                    <div key={b.id} style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
                      <Cover title={b.title} size={32} r={4} />
                      <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontFamily: "'Cinzel',serif" }}>{b.title}</div><div style={{ fontSize: 11, color: "var(--sub)" }}>{b.author}</div></div>
                      <span style={{ fontSize: 11, color: "#6B9FD4" }}>{b.pct}%</span>
                    </div>
                  ))}
                  {books.filter(b => getBookMemberId(b) === getMemberId(currentBuddy) && isStatus(b, "Reading")).length === 0 && (
                    <div style={{ fontSize: 12, color: "var(--mut)" }}>No book logged yet for this month. Send an owl to pick a book together!</div>
                  )}
                </div>

                {/* ── BUDDY ICEBREAKER HANDBOOK ── */}
                <div style={{ background: "rgba(201,168,76,.05)", border: "1px dashed rgba(201,168,76,.3)", borderRadius: 12, padding: 14, textAlign: "left", marginBottom: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: "bold", color: "#C9A84C", marginBottom: 6 }}>💡 BUDDY DISCUSSION STARTERS:</div>
                  <ul style={{ paddingLeft: 18, fontSize: 12, color: "var(--sub)", lineHeight: 1.6 }}>
                    <li>"What were your first impressions of chapter 1?"</li>
                    <li>"Which character do you relate to the most so far?"</li>
                    <li>"Did that plot twist surprise you, or did you see it coming?"</li>
                    <li>"What potion/mood tag would you give this book?"</li>
                  </ul>
                </div>

                <GB ch={`💬 Start Discussion with ${getMemberName(currentBuddy).split(" ")[0]}`} full onClick={() => {
                  setNewPost({ title: `🤝 ${selMonth} Buddy Read: [Our Book Title]`, body: `Hey @${getMemberName(currentBuddy)}! Which book should we pick together for this month?`, bookTitle: "" });
                  setShowNewPost(true); setPage("forum");
                }} />
              </div>
            ) : <Nil icon="🤝" msg="Add more wizards to the club to enable monthly buddy pairing!" />}
          </div>
        )}

        {/* ── MONTHLY SPELLS / COMMUNITY INSIGHTS ── */}
        {page === "monthly" && (
          <div>
            <PageHeader
              title="Monthly Spells & Insights"
              icon="🌙"
              briefing="Explore collective club momentum! Compare monthly statistics, cheer on Most Improved members, and see top genres."
            />
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
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontFamily: "'Cinzel',serif" }}>{getMemberName(m)}</div></div>
                    <span style={{ fontFamily: "'Cinzel',serif", fontSize: 16, color: "#C9A84C" }}>{m.curB}</span>
                  </div>
                ))}
                {mStats.filter(m => m.curB > 0).length === 0 && <Nil icon="📚" msg={`No finished books logged for ${selMonth}`} />}
              </div>

              <div style={{ ...card, padding: 16 }}>
                <SH ch="📜 Top 5 — Most Pages" />
                {mStats.filter(m => m.curP > 0).sort((a, b) => b.curP - a.curP).slice(0, 5).map((m, i) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, borderBottom: "1px solid var(--bdr)", paddingBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                    <Av m={m} size={26} />
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontFamily: "'Cinzel',serif" }}>{getMemberName(m)}</div></div>
                    <span style={{ fontFamily: "'Cinzel',serif", fontSize: 16, color: "#6B9FD4" }}>{m.curP.toLocaleString()} pp</span>
                  </div>
                ))}
                {mStats.filter(m => m.curP > 0).length === 0 && <Nil icon="📜" msg={`No pages logged for ${selMonth}`} />}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ ...card, padding: 16 }}>
                <SH ch="🚀 Most Improved (vs Last Month)" />
                {mStats.filter(m => m.curB > 0).sort((a, b) => b.imp - a.imp).slice(0, 5).map((m, i) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <Av m={m} size={26} />
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontFamily: "'Cinzel',serif" }}>{getMemberName(m)}</div><div style={{ fontSize: 11, color: "var(--sub)" }}>{m.prvB} → {m.curB} books</div></div>
                    <span style={{ color: m.imp >= 0 ? "#6FAF7B" : "#E07070", fontWeight: "bold" }}>{m.imp >= 0 ? "+" : ""}{m.imp}%</span>
                  </div>
                ))}
                {mStats.filter(m => m.curB > 0).length === 0 && <Nil icon="🚀" msg="No comparison stats available yet" />}
              </div>

              <div style={{ ...card, padding: 16 }}>
                <SH ch="📊 Member Contribution" />
                {mStats.filter(m => m.curB > 0).map(m => {
                  const p = mFin.length > 0 ? Math.round((m.curB / mFin.length) * 100) : 0;
                  return (
                    <div key={m.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                        <span>{getMemberName(m)}</span><span style={{ color: "#C9A84C" }}>{m.curB} ({p}%)</span>
                      </div>
                      <PBar p={p} c={abg(getMemberName(m))} h={5} />
                    </div>
                  );
                })}
                {mStats.filter(m => m.curB > 0).length === 0 && <Nil icon="📊" msg="No contribution data for this month" />}
              </div>
            </div>
          </div>
        )}

        {/* ── THE PENSIEVE (QUOTE FEED) ── */}
        {page === "quotes" && (
          <div>
            <PageHeader
              title="The Pensieve"
              icon="✨"
              briefing="A low-pressure sanctuary to share favorite lines or sentences from your current book in 10 seconds."
              action={<GB ch="+ Drop a Quote" sm onClick={() => setShowQuoteMod(true)} />}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {quotes.map(q => {
                const author = members.find(m => getMemberId(m) === q.postedBy);
                return (
                  <div key={q.id} style={{ ...card, padding: 20, background: "linear-gradient(135deg,#130F09,#19130A)" }}>
                    <div style={{ fontSize: 16, fontStyle: "italic", lineHeight: 1.6, color: "var(--text)", marginBottom: 12 }}>"{q.quote}"</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--bdr)", paddingTop: 12 }}>
                      <div><span style={{ fontFamily: "'Cinzel',serif", fontSize: 13, color: "#C9A84C" }}>— {q.authorName}</span>{q.bookTitle && <span style={{ fontSize: 11, color: "var(--sub)", marginLeft: 6 }}>({q.bookTitle})</span>}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Av m={author} size={20} /><span style={{ fontSize: 11, color: "var(--mut)" }}>{getMemberName(author) || "A Wizard"}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CLUB BUDDY PAIRS (`🏰 THE GREAT HALL`) ── */}
        {page === "clubbuddies" && (
          <div>
            <PageHeader
              title="Club Buddy Pairs"
              icon="🤝"
              briefing="See every paired reading couple across the entire community for the selected month."
              action={
                <FS ch={MONTHS.map(m => <option key={m}>{m}</option>)} value={selMonth} onChange={e => setSelMonth(e.target.value)} style={{ width: 140, marginBottom: 0 }} />
              }
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
              {allMonthBuddyPairs.map((pair, idx) => (
                <div key={idx} style={{ ...card, padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Av m={pair.m1} size={36} />
                    <span style={{ fontSize: 14, fontFamily: "'Cinzel',serif", fontWeight: "bold" }}>{getMemberName(pair.m1).split(" ")[0]}</span>
                  </div>
                  <span style={{ color: "#C9A84C", fontSize: 18 }}>🤝</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14, fontFamily: "'Cinzel',serif", fontWeight: "bold" }}>{getMemberName(pair.m2).split(" ")[0]}</span>
                    <Av m={pair.m2} size={36} />
                  </div>
                </div>
              ))}
              {allMonthBuddyPairs.length === 0 && <Nil icon="🤝" msg="No club buddy pairings available yet." />}
            </div>
          </div>
        )}

        {/* ── FORUM ── */}
        {page === "forum" && (
          <div>
            <PageHeader
              title="Discussion Forum"
              icon="💬"
              briefing="Ask questions, debate plot twists, or share book reviews with the entire club."
              action={<GB ch="+ New Discussion" sm onClick={() => setShowNewPost(true)} />}
            />

            {/* ── FORUM PROMPT STARTERS GUIDE ── */}
            <div style={{ background: "var(--card2)", border: "1px solid var(--bdr)", borderRadius: 12, padding: 14, marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: "bold", color: "#C9A84C", marginBottom: 6 }}>💬 GREAT FORUM INITIATING TOPICS:</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12 }}>
                <span style={{ background: "rgba(201,168,76,.1)", padding: "4px 10px", borderRadius: 6, color: "var(--text)" }}>"Did you prefer the ending of X or Y?"</span>
                <span style={{ background: "rgba(201,168,76,.1)", padding: "4px 10px", borderRadius: 6, color: "var(--text)" }}>"What book changed your perspective on life?"</span>
                <span style={{ background: "rgba(201,168,76,.1)", padding: "4px 10px", borderRadius: 6, color: "var(--text)" }}>"Unpopular opinion: [Book Title] was overrated!"</span>
              </div>
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
            <PageHeader
              title="Book Reviews"
              icon="🌟"
              briefing="Every mandatory reaction and thought shared by wizards upon marking a book as Finished."
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
              {books.filter(b => isStatus(b, "Finished") && b.review).map(b => (
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

        {/* ── THE GREAT HALL (MEMBER DIRECTORY & HONOR RIBBONS) ── */}
        {page === "greathall" && (
          <div>
            <PageHeader
              title="The Great Hall"
              icon="🏰"
              briefing="The complete directory of wizards. Inspect member profiles, see active reading shelves, and celebrate Community Honors!"
            />

            {/* ── COMMUNITY HONOR RIBBONS ── */}
            <div style={{ marginBottom: 22 }}>
              <SH ch="🎖️ Community Honor Ribbons" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                {honorRibbons.map((ribbon, i) => (
                  <div key={i} style={{ ...card, padding: 14, background: "linear-gradient(135deg,#161109,#1F180E)", border: "1px solid rgba(201,168,76,.3)", display: "flex", alignItems: "center", gap: 12 }}>
                    <Av m={ribbon.member} size={44} />
                    <div style={{ overflow: "hidden" }}>
                      <div style={{ fontSize: 10, color: "#C9A84C", fontWeight: "bold", letterSpacing: 1 }}>{ribbon.title}</div>
                      <div style={{ fontFamily: "'Cinzel',serif", fontSize: 14, color: "var(--text)", fontWeight: "bold" }}>{getMemberName(ribbon.member)}</div>
                      <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 2 }}>{ribbon.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14 }}>
              {members.map(m => {
                const mId = getMemberId(m);
                const mf = books.filter(b => getBookMemberId(b) === mId && isStatus(b, "Finished")).length;
                const mr = books.filter(b => getBookMemberId(b) === mId && isStatus(b, "Reading")).length;
                return (
                  <div key={m.id} style={{ ...card, padding: 16, textAlign: "center", cursor: "pointer" }} onClick={() => setViewMember(m)}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><Av m={m} size={60} /></div>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 14, fontWeight: "bold" }}>{getMemberName(m)}</div>
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

        {/* ── CALENDAR & EVENTS ── */}
        {page === "calendar" && (
          <div>
            <PageHeader
              title="Calendar & Events"
              icon="📅"
              briefing="Keep track of monthly spell themes, upcoming member birthdays, and official book club video meetings."
              action={
                <div style={{ display: "flex", gap: 8 }}>
                  {user?.isadmin && <GB ch="+ Add Club Event" sm onClick={() => setShowEventMod(true)} />}
                  {user?.isadmin && <GB ch="🎨 Edit Theme" sm ghost onClick={() => { setThemeForm(monthlyThemes[selMonth] || DEFAULT_THEMES[selMonth]); setShowThemeEdit(true); }} />}
                </div>
              }
            />

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

            <div style={{ ...card, padding: 20, background: "rgba(201,168,76,.04)", border: "1px solid rgba(201,168,76,.3)" }}>
              <h3 style={{ fontFamily: "'Cinzel',serif", fontSize: 16, color: "#C9A84C", marginBottom: 12 }}>
                📍 Events for {selMonth} {selDay}, {YEAR}
              </h3>

              {members.filter(m => m.birthdaymonth === selMonth && parseInt(m.birthdaydate) === selDay).map(m => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, background: "var(--card)", borderRadius: 12, marginBottom: 10, border: "1px solid rgba(201,168,76,.2)" }}>
                  <Av m={m} size={50} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 15, color: "#C9A84C" }}>🎂 Happy Birthday, {getMemberName(m)}!</div>
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
            <PageHeader
              title="Book Bingo (4x4)"
              icon="🎯"
              briefing="Complete mini reading spells at your own pace! Tap a square to stamp it with a gold wax seal. How many lines of 4 can you complete this year?"
              action={
                <div style={{ padding: "8px 14px", background: "var(--card2)", border: "1px solid rgba(201,168,76,.3)", borderRadius: 12 }}>
                  <span style={{ fontSize: 11, color: "var(--sub)", textTransform: "uppercase" }}>Progress: </span>
                  <span style={{ fontFamily: "'Cinzel',serif", fontSize: 16, color: "#C9A84C", fontWeight: "bold" }}>
                    {Object.values(userBingo[getMemberId(user)] || {}).filter(Boolean).length} / 16
                  </span>
                </div>
              }
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, maxWidth: 660, margin: "0 auto" }}>
              {BINGO_SQUARES.map((square, i) => {
                const isDone = (userBingo[getMemberId(user)] || {})[i];
                return (
                  <div key={i} onClick={() => toggleBingoSquare(i)}
                    style={{ ...card, padding: 18, minHeight: 120, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", cursor: "pointer", border: isDone ? "2px solid #C9A84C" : "1px solid var(--bdr)", background: isDone ? "linear-gradient(145deg,#1B140A,#251B0D)" : "var(--card)", boxShadow: isDone ? "0 4px 20px rgba(201,168,76,.2)" : "none", transition: "all .2s" }}>
                    <div style={{ fontSize: 26, marginBottom: 8 }}>{isDone ? "✨" : "📜"}</div>
                    <div style={{ fontSize: 13, fontFamily: "'Cinzel',serif", color: isDone ? "#C9A84C" : "var(--text)", lineHeight: 1.4 }}>{square}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── READING CHALLENGES ── */}
        {page === "challenges" && (
          <div>
            <PageHeader
              title="Reading Challenges"
              icon="🏅"
              briefing="Special quests to diversify your reading palette. Complete challenges to earn badges and climb the points leaderboard!"
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
              {CHALLENGES.map(ch => {
                const done = completedChallenges.some(c => c.memberId === getMemberId(user) && c.challengeId === ch.id);
                return (
                  <div key={ch.id} style={{ ...card, padding: 18, border: done ? "1px solid #6FAF7B" : "1px solid var(--bdr)" }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{ch.emoji}</div>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 14, fontWeight: "bold" }}>{ch.title}</div>
                    <div style={{ fontSize: 12, color: "var(--sub)", margin: "6px 0 12px" }}>{ch.desc}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#C9A84C", fontWeight: "bold" }}>+{ch.points} pts</span>
                      {done ? <span style={{ color: "#6FAF7B", fontSize: 12 }}>✅ Done</span> : (
                        <GB ch="Mark Done" sm onClick={() => {
                          setCompletedChallenges(c => [...c, { memberId: getMemberId(user), challengeId: ch.id }]);
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

        {/* ── LEADERBOARD (WITH HONOR RIBBONS INCLUDED) ── */}
        {page === "leaderboard" && (
          <div>
            <PageHeader
              title="Leaderboard"
              icon="🏆"
              briefing="Celebrate community reading achievements. Alongside total books finished, check out our Consistency and Scribe Honors!"
            />

            <div style={{ marginBottom: 20 }}>
              <SH ch="🎖️ Current Honor Ribbons" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                {honorRibbons.map((ribbon, i) => (
                  <div key={i} style={{ ...card, padding: 12, background: "var(--card2)", display: "flex", alignItems: "center", gap: 10 }}>
                    <Av m={ribbon.member} size={36} />
                    <div style={{ overflow: "hidden" }}>
                      <div style={{ fontSize: 10, color: "#C9A84C", fontWeight: "bold" }}>{ribbon.title}</div>
                      <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, fontWeight: "bold" }}>{getMemberName(ribbon.member)}</div>
                      <div style={{ fontSize: 10, color: "var(--sub)" }}>{ribbon.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ maxWidth: 640, margin: "0 auto" }}>
              {board.map((m, i) => (
                <div key={m.id} style={{ ...card, padding: 14, display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                  <span style={{ fontSize: 18, width: 28 }}>{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                  <Av m={m} size={40} />
                  <div style={{ flex: 1 }}><div style={{ fontFamily: "'Cinzel',serif", fontSize: 14, fontWeight: "bold" }}>{getMemberName(m)}</div><div style={{ fontSize: 11, color: "var(--sub)" }}>{m.pR.toLocaleString()} pages read</div></div>
                  <span style={{ fontFamily: "'Cinzel',serif", fontSize: 20, color: "#C9A84C" }}>{m.bR} books</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── YEARLY STATS ── */}
        {page === "yearly" && (
          <div>
            <PageHeader
              title="Yearly Stats"
              icon="⭐"
              briefing="A panoramic view of our community's 2026 reading journey, genre preferences, and individual quest targets."
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 18 }}>
              {[{ n: `${avgBookLength} pp`, l: "Average Book Length", e: "📐" }, { n: `${activeCommunityPct}%`, l: "Community Active Rate", e: "⚡" }, { n: topG, l: "Most Read Genre", e: "🎭" }].map((item, idx) => (
                <div key={idx} style={{ ...card, padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 32 }}>{item.e}</span>
                  <div>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 20, color: "#C9A84C" }}>{item.n}</div>
                    <div style={{ fontSize: 12, color: "var(--sub)", marginTop: 2 }}>{item.l}</div>
                  </div>
                </div>
              ))}
            </div>

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
                  const mId = getMemberId(m);
                  const mf = books.filter(b => getBookMemberId(b) === mId && isStatus(b, "Finished")).length;
                  const pct = Math.min(100, Math.round((mf / (parseInt(m.yearlytarget) || 12)) * 100));
                  return (
                    <div key={m.id} style={{ padding: 12, background: "var(--card2)", borderRadius: 10, border: "1px solid var(--bdr)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <Av m={m} size={30} />
                        <div><div style={{ fontFamily: "'Cinzel',serif", fontSize: 13 }}>{getMemberName(m)}</div><div style={{ fontSize: 10, color: "var(--sub)" }}>{mf} / {m.yearlytarget || 12} books</div></div>
                      </div>
                      <PBar p={pct} h={6} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── READING WRAPPED ── */}
        {page === "wrapped" && (
          <div>
            <PageHeader
              title="Reading Wrapped"
              icon="🎁"
              briefing="Your personalized year-in-review card! Inspect your total pages, completed books, and streak consistency."
            />
            <div style={{ ...card, padding: 30, textAlign: "center", maxWidth: 520, margin: "0 auto", background: "linear-gradient(135deg,#130F09,#1C150D)" }}>
              <Av m={user} size={70} />
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 22, color: "#C9A84C", margin: "14px 0 6px" }}>{getMemberName(user)}'s 2026 Wrapped</div>
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

        {/* ── ADMIN PANEL ── */}
        {page === "admin" && user?.isadmin && (
          <div>
            <PageHeader
              title="Admin Panel"
              icon="⚙️"
              briefing="Manage club members, remove spam accounts, and monitor database records."
            />
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
                      <td style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}><Av m={m} size={28} /><span>{getMemberName(m)}</span></td>
                      <td style={{ padding: "12px 14px", color: "var(--sub)" }}>{m.email}</td>
                      <td style={{ padding: "12px 14px" }}>{m.city}</td>
                      <td style={{ padding: "12px 14px" }}>{m.streak_count || 0} 🔥</td>
                      <td style={{ padding: "12px 14px" }}>{books.filter(b => getBookMemberId(b) === getMemberId(m) && isStatus(b, "Finished")).length}</td>
                      <td style={{ padding: "12px 14px" }}>
                        {getMemberId(m) !== getMemberId(user) && <GB ch="🗑️" sm red onClick={() => setConfirmDel({ type: "member", id: getMemberId(m), name: getMemberName(m) })} />}
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
                setQuotes(qs => [{ id: "q" + Date.now(), quote: newQuote.quote, authorName: newQuote.authorName, bookTitle: newQuote.bookTitle, postedBy: getMemberId(user), date: selMonth }, ...qs]);
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
            <FS ch={["To Be Read", "Reading", "Finished", "DNF"].map(s => <option key={s}>{s}</option>)} value={bf.status} onChange={e => setBf(b => ({ ...b, status: e.target.value }))} />
            <FL ch={bf.status === "Finished" ? "Review / Thoughts * (Required for Finished books)" : "Review / Thoughts (optional)"} />
            <FT value={bf.review} onChange={e => setBf(b => ({ ...b, review: e.target.value }))} placeholder={bf.status === "Finished" ? "Write at least a word or two about what you thought..." : "Your thoughts..."} />
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
            <FS ch={members.map(m => <option key={m.id} value={getMemberName(m)}>{getMemberName(m)}</option>)} />
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
        <Modal title={`🧙 ${getMemberName(viewMember)}`} ch={
          <div>
            <div style={{ display: "flex", gap: 18, marginBottom: 18, flexWrap: "wrap" }}>
              <div style={{ textAlign: "center", minWidth: 120 }}>
                <Av m={viewMember} size={80} />
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: "#C9A84C", marginTop: 8 }}>{getMemberId(viewMember)}</div>
                <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 3 }}>{viewMember.city}, {viewMember.country}</div>
                {viewMember.bio && <div style={{ fontSize: 11, color: "var(--sub)", fontStyle: "italic", marginTop: 7, lineHeight: 1.5 }}>"{viewMember.bio}"</div>}
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 8 }}>
                  {viewMember.instagramlink && <a href={viewMember.instagramlink.startsWith("http") ? viewMember.instagramlink : `https://${viewMember.instagramlink}`} target="_blank" rel="noreferrer" style={{ fontSize: 18 }}>📸</a>}
                  {viewMember.goodreadslink && <a href={viewMember.goodreadslink.startsWith("http") ? viewMember.goodreadslink : `https://${viewMember.goodreadslink}`} target="_blank" rel="noreferrer" style={{ fontSize: 18 }}>📗</a>}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, color: "#C9A84C", marginBottom: 10 }}>Books by {getMemberName(viewMember).split(" ")[0]}</div>
                <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                  {books.filter(b => getBookMemberId(b) === getMemberId(viewMember)).slice(0, 10).map(b => (
                    <div key={b.id} style={{ textAlign: "center", width: 56 }}>
                      <Cover title={b.title} author={b.author} customCover={b.customcover} size={46} r={5} />
                      <div style={{ fontSize: 9, color: "var(--sub)", marginTop: 3, lineHeight: 1.2, height: 22, overflow: "hidden" }}>{b.title.slice(0, 14)}</div>
                      <div style={{ fontSize: 8, padding: "1px 4px", borderRadius: 6, background: isStatus(b, "Finished") ? "rgba(111,175,123,.15)" : isStatus(b, "Reading") ? "rgba(107,159,212,.15)" : "rgba(255,255,255,.04)", color: isStatus(b, "Finished") ? "#6FAF7B" : isStatus(b, "Reading") ? "#6B9FD4" : "var(--mut)", marginTop: 2 }}>{b.status}</div>
                    </div>
                  ))}
                  {books.filter(b => getBookMemberId(b) === getMemberId(viewMember)).length === 0 && <Nil icon="📚" msg="No books yet" />}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>{(user?.isadmin || getMemberId(viewMember) === getMemberId(user)) && getMemberId(viewMember) !== getMemberId(user) && <GB ch="🗑️ Delete Member" red onClick={() => { setViewMember(null); setConfirmDel({ type: "member", id: getMemberId(viewMember), name: getMemberName(viewMember) }); }} />}</div>
              <GB ch="Close" ghost onClick={() => setViewMember(null)} />
            </div>
          </div>
        } onClose={() => setViewMember(null)} wide />
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