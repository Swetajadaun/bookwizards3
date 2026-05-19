import { useState, useEffect, useMemo, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════
   📚 BOOK WIZARDS — v5 (Fresh Start)
   • Supabase backend — all data saved permanently
   • Members can delete themselves
   • Admin can delete anyone
   • Real book covers via Google Books API
   • Harry Potter magical dark theme
   • 2026 reading goals
   ═══════════════════════════════════════════════════════════════ */

// ── PASTE YOUR SUPABASE CREDENTIALS HERE ──────────────────────

const SUPABASE_URL = "https://nnxbappmomgnxqjtwaya.supabase.co";   // e.g. https://xxxx.supabase.co
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ueGJhcHBtb21nbnhxanR3YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMjAzNzIsImV4cCI6MjA5Mjc5NjM3Mn0.xK3hK3_CETJQ-qpvzu3K3eYNf3An7LfayXjN27S2czM"; // long ey... key


// ── PASTE YOUR EMAILJS CREDENTIALS HERE ───────────────────────
const EJS_SERVICE = "YOUR_EMAILJS_SERVICE_ID";
const EJS_TEMPLATE = "YOUR_EMAILJS_TEMPLATE_ID";
const EJS_KEY = "YOUR_EMAILJS_PUBLIC_KEY";


// ── PASTE YOUR BOOK WIZARDS LOGO URL HERE ─────────────────────
const LOGO = "/logo.png"; // upload logo to imgur.com and paste link


/* ─── SUPABASE HELPERS ────────────────────────────────────────*/
const SB = {
  async select(table, filter = "") {
    try {
      const url = `${SUPABASE_URL}/rest/v1/${table}?select=*${filter}`;
      const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    } catch { return []; }
  },
  async insert(table, row) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(row)
      });
      return await r.json();
    } catch { return null; }
  },
  async update(table, row, id) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: "PATCH",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(row)
      });
    } catch { }
  },
  async delete(table, id) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
    } catch { }
  },
  async deleteWhere(table, col, val) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
    } catch { }
  }
};

const USE_SB = SUPABASE_URL !== "YOUR_SUPABASE_URL";

/* ─── EMAIL ───────────────────────────────────────────────────*/
async function sendWelcomeEmail(m) {
  if (EJS_SERVICE === "YOUR_EMAILJS_SERVICE_ID") return;
  try {
    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EJS_SERVICE, template_id: EJS_TEMPLATE, user_id: EJS_KEY,
        template_params: { to_name: m.name, to_email: m.email, member_id: m.id, city: m.city, country: m.country }
      })
    });
  } catch { }
}

/* ─── CONSTANTS ───────────────────────────────────────────────*/
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const GENRES = ["Literary Fiction", "Historical Fiction", "Fantasy", "Science Fiction", "Thriller", "Mystery", "Non-Fiction", "Biography", "Memoir", "Self-Help", "Science", "Philosophy", "Poetry", "Romance", "Classic", "Children", "Graphic Novel", "Short Stories", "History", "Psychology"];
const LANGS = ["English", "Hindi", "Bengali", "Tamil", "Telugu", "Marathi", "Kannada", "Malayalam", "Gujarati", "Punjabi", "Urdu", "French", "German", "Spanish", "Portuguese", "Japanese", "Korean", "Arabic", "Russian", "Sanskrit"];
const COUNTRIES = ["India", "United States", "United Kingdom", "Canada", "Australia", "UAE", "Singapore", "Germany", "France", "Netherlands", "New Zealand", "Sweden", "South Africa", "Japan", "Brazil", "Other"];

const STATE_CITIES = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Tirupati", "Kakinada", "Rajahmundry", "Kadapa", "Anantapur", "Chittoor"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang", "Ziro", "Bomdila"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur", "Karimganj"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Purnia", "Arrah", "Begusarai", "Katihar", "Chapra", "Samastipur", "Hajipur", "Siwan", "Motihari", "Sasaram"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg", "Rajnandgaon", "Jagdalpur", "Raigarh", "Ambikapur"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Gandhinagar", "Anand", "Nadiad", "Morbi", "Surendranagar", "Bharuch", "Navsari", "Valsad", "Porbandar"],
  "Haryana": ["Faridabad", "Gurgaon", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula", "Bhiwani", "Sirsa", "Bahadurgarh", "Jind", "Kaithal", "Rewari"],
  "Himachal Pradesh": ["Shimla", "Mandi", "Solan", "Dharamshala", "Kullu", "Baddi", "Palampur", "Nahan", "Chamba", "Una", "Bilaspur", "Hamirpur"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh", "Giridih", "Chaibasa", "Daltonganj"],
  "Karnataka": ["Bangalore", "Mysore", "Hubli", "Dharwad", "Mangalore", "Belgaum", "Gulbarga", "Davangere", "Bellary", "Shimoga", "Tumkur", "Bijapur", "Raichur", "Bidar", "Udupi", "Hassan"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Kollam", "Thrissur", "Palakkad", "Malappuram", "Alappuzha", "Kannur", "Kasaragod", "Kottayam", "Wayanad"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa", "Singrauli", "Burhanpur", "Khandwa", "Bhind", "Chhindwara", "Guna", "Shivpuri", "Vidisha"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur", "Kalyan", "Vasai-Virar", "Pimpri-Chinchwad", "Kolhapur", "Amravati", "Nanded", "Sangli", "Malegaon", "Jalgaon", "Akola", "Latur", "Dhule", "Ahmednagar", "Chandrapur", "Satara", "Ratnagiri", "Wardha", "Shirdi"],
  "Manipur": ["Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Senapati"],
  "Meghalaya": ["Shillong", "Tura", "Jowai", "Nongstoin"],
  "Mizoram": ["Aizawl", "Lunglei", "Saiha", "Champhai"],
  "Nagaland": ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Brahmapur", "Sambalpur", "Puri", "Balasore", "Bhadrak", "Jharsuguda", "Angul", "Paradip"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Hoshiarpur", "Batala", "Pathankot", "Moga", "Abohar", "Phagwara", "Muktsar", "Firozpur", "Kapurthala"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur", "Bhilwara", "Alwar", "Bharatpur", "Sikar", "Pali", "Sri Ganganagar", "Tonk", "Beawar", "Churu", "Jhunjhunu"],
  "Sikkim": ["Gangtok", "Namchi", "Gyalshing", "Mangan"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Tiruppur", "Vellore", "Erode", "Thoothukudi", "Dindigul", "Thanjavur", "Sivakasi", "Nagercoil", "Kanchipuram", "Hosur"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Khammam", "Karimnagar", "Ramagundam", "Mahbubnagar", "Nalgonda", "Adilabad", "Suryapet", "Jagtial", "Mancherial", "Siddipet"],
  "Tripura": ["Agartala", "Dharmanagar", "Udaipur", "Kailasahar", "Belonia"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Varanasi", "Meerut", "Prayagraj", "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Gorakhpur", "Noida", "Firozabad", "Jhansi", "Muzaffarnagar", "Mathura", "Rampur", "Shahjahanpur", "Mau", "Hapur", "Etawah", "Mirzapur", "Bulandshahr", "Hardoi", "Fatehpur", "Raebareli", "Sitapur", "Bahraich", "Unnao", "Lakhimpur", "Banda", "Pilibhit", "Barabanki", "Gonda", "Mainpuri", "Deoria", "Basti", "Ballia", "Greater Noida", "Vrindavan", "Ayodhya"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Kashipur", "Rishikesh", "Kotdwar", "Ramnagar", "Mussoorie", "Nainital", "Almora", "Pithoragarh"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Bardhaman", "Barasat", "Bhatpara", "Kharagpur", "Jalpaiguri", "Haldia", "Krishnanagar"],
  "Delhi": ["New Delhi", "Dwarka", "Rohini", "Janakpuri", "Laxmi Nagar", "Shahdara", "Vasant Kunj", "Saket", "Pitampura", "Mayur Vihar", "Karol Bagh", "Connaught Place", "Nehru Place", "Preet Vihar", "Vikaspuri"],
  "Jammu & Kashmir": ["Srinagar", "Jammu", "Anantnag", "Sopore", "Baramulla", "Kathua", "Udhampur"],
  "Ladakh": ["Leh", "Kargil"],
  "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"],
  "Chandigarh": ["Chandigarh"],
  "Andaman & Nicobar": ["Port Blair"],
};
const STATES = Object.keys(STATE_CITIES).sort();

const QUOTES = [
  { q: "Words are our most inexhaustible source of magic.", a: "Albus Dumbledore" },
  { q: "It is our choices that show what we truly are.", a: "Albus Dumbledore" },
  { q: "A reader lives a thousand lives before he dies.", a: "George R.R. Martin" },
  { q: "There is no friend as loyal as a book.", a: "Ernest Hemingway" },
  { q: "Reading is dreaming with open eyes.", a: "Unknown" },
  { q: "Not all those who wander are lost.", a: "J.R.R. Tolkien" },
  { q: "So many books, so little time.", a: "Frank Zappa" },
];

/* ─── UTILS ───────────────────────────────────────────────────*/
const abg = n => ["#7B2D2D", "#1A472A", "#0E1A40", "#5C2D91", "#B8540A", "#1565C0", "#2E7D32", "#6D2D92"][(n?.charCodeAt(0) || 0) % 8];
const ini = n => (n || "?").split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();
const fmt = d => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const nextId = ms => { const n = ms.map(m => parseInt((m.id || "BW000").replace(/\D/g, "")) || 0); return `BW${String(Math.max(0, ...n) + 1).padStart(3, "0")}`; };
const rand = arr => arr[Math.floor(Math.random() * arr.length)];

/* ─── COMPONENTS ──────────────────────────────────────────────*/

// Cache to avoid re-fetching same book covers
const coverCache = {};

// Book cover - uses Open Library (no rate limit) with Google Books fallback
function Cover({ title, author, size = 80, r = 8 }) {
  const [src, setSrc] = useState(null);
  const [done, setDone] = useState(false);
  const cacheKey = (title || "").toLowerCase().trim();

  useEffect(() => {
    if (!title) { setDone(true); return; }
    // Return cached result immediately
    if (coverCache[cacheKey] !== undefined) {
      setSrc(coverCache[cacheKey] || null);
      setDone(true);
      return;
    }
    setSrc(null); setDone(false);

    // Try Open Library first - free, no rate limits
    const q = encodeURIComponent(title);
    fetch(`https://openlibrary.org/search.json?title=${q}&limit=3&fields=cover_i`)
      .then(x => x.json())
      .then(d => {
        // Find first result with a cover
        const item = (d.docs || []).find(x => x.cover_i);
        if (item?.cover_i) {
          const url = `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`;
          coverCache[cacheKey] = url;
          setSrc(url);
          setDone(true);
        } else {
          // Fallback: try Google Books with delay to avoid rate limit
          setTimeout(() => {
            const gq = encodeURIComponent(`${title} ${author || ""}`);
            fetch(`https://www.googleapis.com/books/v1/volumes?q=${gq}&maxResults=1`)
              .then(x => x.json())
              .then(d2 => {
                const img = d2.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
                const url = img ? img.replace("http://", "https://") : "";
                coverCache[cacheKey] = url;
                setSrc(url || null);
                setDone(true);
              })
              .catch(() => { coverCache[cacheKey] = ""; setDone(true); });
          }, Math.random() * 2000); // random delay to spread out requests
        }
      })
      .catch(() => { coverCache[cacheKey] = ""; setDone(true); });
  }, [cacheKey]);

  const bg = ["#7B2D2D", "#1A472A", "#0E1A40", "#5C2D91", "#B8540A", "#1565C0"][(title?.charCodeAt(0) || 0) % 6];
  return (
    <div style={{ width: size, height: size * 1.44, borderRadius: r, overflow: "hidden", flexShrink: 0, boxShadow: "2px 5px 16px rgba(0,0,0,0.55)", position: "relative", background: bg }}>
      {!done && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: size * .18, opacity: .5, animation: "sh 1.5s infinite" }}>✨</span></div>}
      {src && <img src={src} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={() => { coverCache[cacheKey] = ""; setSrc(null); setDone(true); }} />}
      {done && !src && (
        <div style={{ width: "100%", height: "100%", background: `linear-gradient(155deg,${bg},${bg}99)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <div style={{ fontWeight: 900, fontSize: size * .26, color: "rgba(255,255,255,.88)", fontFamily: "serif" }}>{ini(title)}</div>
          <div style={{ fontSize: size * .08, color: "rgba(255,255,255,.45)", textAlign: "center", padding: "0 6px", lineHeight: 1.2 }}>{(title || "").slice(0, 18)}</div>
          <div style={{ fontSize: size * .14, opacity: .3 }}>📚</div>
        </div>
      )}
    </div>
  );
}

// Avatar
function Av({ m, size = 36 }) {
  if (m?.photo) return <img src={m.photo} alt={m?.name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid #C9A84C", flexShrink: 0 }} />;
  return <div style={{ width: size, height: size, borderRadius: "50%", background: abg(m?.name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * .36, fontWeight: 700, color: "#fff", flexShrink: 0, border: "2px solid rgba(201,168,76,.4)" }}>{ini(m?.name)}</div>;
}

// Progress bar
function PBar({ p = 0, c = "#C9A84C", h = 7 }) {
  return <div style={{ height: h, background: "rgba(255,255,255,.07)", borderRadius: h, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(100, Math.max(0, p))}%`, background: c, borderRadius: h, transition: "width .7s ease" }} /></div>;
}

// Stars
function Stars({ v = 0, onChange, sz = 15 }) {
  const [hov, setHov] = useState(0);
  return <div style={{ display: "flex", gap: 2 }}>{[1, 2, 3, 4, 5].map(s => <span key={s} style={{ fontSize: sz, cursor: onChange ? "pointer" : "default", color: (hov || v) >= s ? "#C9A84C" : "rgba(255,255,255,.12)", transition: "color .1s" }} onMouseEnter={() => onChange && setHov(s)} onMouseLeave={() => setHov(0)} onClick={() => onChange && onChange(s)}>★</span>)}</div>;
}

// Floating particles
function Particles() {
  const ps = Array.from({ length: 12 }, (_, i) => ({ id: i, x: Math.random() * 100, d: 2.5 + Math.random() * 4, dl: Math.random() * 5, e: ["✨", "⭐", "💫", "⚡", "🌟"][i % 5] }));
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <style>{`
        @keyframes fp{0%{opacity:0;transform:translateY(0) rotate(0)}15%{opacity:.7}100%{opacity:0;transform:translateY(-110vh) rotate(400deg)}}
        @keyframes glw{0%,100%{text-shadow:0 0 18px rgba(201,168,76,.25)}50%{text-shadow:0 0 38px rgba(201,168,76,.7),0 0 70px rgba(201,168,76,.3)}}
        @keyframes fiu{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        @keyframes pls{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes sh{0%,100%{opacity:.25}50%{opacity:1}}
        @keyframes si{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:none}}
      `}</style>
      {ps.map(p => <div key={p.id} style={{ position: "absolute", left: `${p.x}%`, bottom: -20, fontSize: 11, animation: `fp ${p.d}s ${p.dl}s infinite ease-in`, opacity: 0 }}>{p.e}</div>)}
    </div>
  );
}

// Line chart
function LineChart({ data, c = "#C9A84C", h = 100 }) {
  const max = Math.max(...data.map(d => d.v), 1);
  if (data.length < 2) return null;
  const pts = data.map((d, i) => [6 + (i / (data.length - 1)) * 88, h - 8 - ((d.v / max) * (h - 20))]);
  const path = "M " + pts.map(([x, y]) => `${x}% ${y}`).join(" L ");
  const area = path + ` L ${pts[pts.length - 1][0]}% ${h} L ${pts[0][0]}% ${h} Z`;
  return (
    <svg width="100%" height={h} style={{ overflow: "visible" }}>
      <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity={.35} /><stop offset="100%" stopColor={c} stopOpacity={0} /></linearGradient></defs>
      <path d={area} fill="url(#cg)" />
      <path d={path} fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => <g key={i}><circle cx={`${x}%`} cy={y} r={3.5} fill={c} stroke="rgba(0,0,0,.4)" strokeWidth={1.5} />{data[i].v > 0 && <text x={`${x}%`} y={y - 7} textAnchor="middle" fontSize={8} fill={c} fontWeight="bold">{data[i].v}</text>}<text x={`${x}%`} y={h + 2} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,.35)">{data[i].l}</text></g>)}
    </svg>
  );
}

// Donut
function Donut({ slices, sz = 110 }) {
  const tot = slices.reduce((a, s) => a + s.v, 0) || 1; let cum = 0; const r = 42, cx = 55, cy = 55, sw = 14;
  return (
    <svg width={sz} height={sz} viewBox="0 0 110 110">
      {slices.map((s, i) => { const sa = cum / tot * 2 * Math.PI - Math.PI / 2; cum += s.v; const ea = cum / tot * 2 * Math.PI - Math.PI / 2; const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa), x2 = cx + r * Math.cos(ea), y2 = cy + r * Math.sin(ea), lg = s.v / tot > .5 ? 1 : 0; return <path key={i} d={`M${x1} ${y1} A${r} ${r} 0 ${lg} 1 ${x2} ${y2}`} fill="none" stroke={s.c} strokeWidth={sw} strokeLinecap="round" opacity={.85} />; })}
      <text x={55} y={51} textAnchor="middle" fontSize={16} fontWeight="bold" fill="#C9A84C">{tot}</text>
      <text x={55} y={64} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,.35)">books</text>
    </svg>
  );
}

// Form helpers
const IS = { width: "100%", padding: "10px 13px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(201,168,76,.18)", borderRadius: 9, color: "#EDE8DF", fontSize: 13, marginBottom: 12, fontFamily: "inherit", outline: "none", transition: "border-color .2s" };
const onF = e => e.target.style.borderColor = "rgba(201,168,76,.65)";
const onB = e => e.target.style.borderColor = "rgba(201,168,76,.18)";
function FI({ ...p }) { return <input {...p} style={{ ...IS, ...(p.style || {}) }} onFocus={onF} onBlur={onB} />; }
function FS({ ch, ...p }) { return <select {...p} style={{ ...IS, ...(p.style || {}) }}>{ch}</select>; }
function FT({ ...p }) { return <textarea {...p} style={{ ...IS, height: 76, resize: "vertical", ...(p.style || {}) }} onFocus={onF} onBlur={onB} />; }
function FL({ ch }) { return <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(201,168,76,.65)", textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 4, fontFamily: "'Cinzel',serif" }}>{ch}</div>; }
function GB({ ch, onClick, ghost, full, sm, red, style: s = {} }) {
  const base = { padding: sm ? "6px 13px" : "10px 20px", borderRadius: 9, fontWeight: 700, fontSize: sm ? 11 : 13, border: "none", cursor: "pointer", transition: "all .18s", fontFamily: "'Cinzel',serif", letterSpacing: .4, ...s };
  if (red) return <button onClick={onClick} style={{ ...base, background: "rgba(180,40,40,.15)", border: "1px solid rgba(180,40,40,.4)", color: "#E07070" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(180,40,40,.3)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(180,40,40,.15)"}>{ch}</button>;
  if (ghost) return <button onClick={onClick} style={{ ...base, background: "transparent", border: "1px solid rgba(201,168,76,.35)", color: "rgba(201,168,76,.7)" }}>{ch}</button>;
  return <button onClick={onClick} style={{ ...base, background: "linear-gradient(135deg,#A07820,#C9A84C,#A07820)", color: "#0B0806", width: full ? "100%" : "auto", boxShadow: "0 3px 16px rgba(201,168,76,.28)" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"} onMouseLeave={e => e.currentTarget.style.transform = ""}>{ch}</button>;
}

function SH({ ch, action }) { return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><h3 style={{ fontFamily: "'Cinzel',serif", fontSize: 15, color: "#C9A84C", letterSpacing: .4 }}>{ch}</h3>{action}</div>; }
function Nil({ icon, msg }) { return <div style={{ textAlign: "center", padding: "36px 16px", color: "rgba(255,255,255,.18)" }}><div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div><div style={{ fontSize: 12, fontFamily: "'Cinzel',serif" }}>{msg}</div></div>; }

function Modal({ title, ch, onClose, wide = false }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600, backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div style={{ background: "#0C0906", border: "1px solid rgba(201,168,76,.25)", borderRadius: 18, padding: "30px 34px", width: wide ? 660 : 500, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 0 70px rgba(201,168,76,.08)", position: "relative" }} onClick={e => e.stopPropagation()}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,#C9A84C,transparent)", borderRadius: "18px 18px 0 0" }} />
        <h2 style={{ fontFamily: "'Cinzel',serif", fontSize: 19, color: "#C9A84C", marginBottom: 18, letterSpacing: .8 }}>{title}</h2>
        {ch}
      </div>
    </div>
  );
}

// Confirm dialog
function Confirm({ msg, onYes, onNo }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 700, backdropFilter: "blur(10px)" }} onClick={onNo}>
      <div style={{ background: "#0C0906", border: "1px solid rgba(180,40,40,.4)", borderRadius: 16, padding: 28, maxWidth: 360, textAlign: "center", boxShadow: "0 0 50px rgba(180,40,40,.15)" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: 14, color: "#EDE8DF", lineHeight: 1.7, marginBottom: 20 }}>{msg}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <GB ch="Cancel" ghost onClick={onNo} />
          <GB ch="Yes, Delete" red onClick={onYes} />
        </div>
      </div>
    </div>
  );
}

/* ─── SPLASH ──────────────────────────────────────────────────*/
function Splash({ onDone }) {
  const [p, setP] = useState(0);
  const q = rand(QUOTES);
  useEffect(() => {
    const ts = [setTimeout(() => setP(1), 300), setTimeout(() => setP(2), 1100), setTimeout(() => setP(3), 2100), setTimeout(() => onDone(), 3900)];
    return () => ts.forEach(clearTimeout);
  }, []);
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

/* ═══════════════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════════════ */
export default function App() {
  const [splash, setSplash] = useState(() => {
    // Don't show splash if user is already logged in
    return !localStorage.getItem("bw_user");
  });
  const [screen, setScreen] = useState(() => {
    return localStorage.getItem("bw_user") ? "app" : "login";
  });
  const [page, setPage] = useState("dashboard");
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("bw_user");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sideOpen, setSideOpen] = useState(true);
  const [shelfTab, setShelfTab] = useState("Reading");
  const [selMonth, setSelMonth] = useState(MONTHS[new Date().getMonth()]);
  const [viewMember, setViewMember] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null); // {type,id,name}
  const [showGoal, setShowGoal] = useState(false);
  const [goalVal, setGoalVal] = useState("");
  const [showBookMod, setShowBookMod] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [showProfEdit, setShowProfEdit] = useState(false);
  const [pe, setPe] = useState({});
  const [welcomeMsg, setWelcomeMsg] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "success" });

  // registration
  const eReg = { name: "", email: "", phone: "", birthdayMonth: "January", birthdayDate: "", state: "", city: "", country: "India", postalAddress: "", instagramLink: "", goodreadsLink: "", bio: "", photo: "" };
  const [reg, setReg] = useState(eReg);
  const [regErr, setRegErr] = useState("");
  const [photoPrev, setPhotoPrev] = useState("");

  // book form
  const eBook = { title: "", author: "", genre: "Literary Fiction", origLang: "English", readLang: "English", startDate: "", startMonth: "", endDate: "", endMonth: "", totalPages: "", finishedPages: "", status: "Not Started", rating: 0, review: "" };
  const [bf, setBf] = useState(eBook);

  const regCities = reg.state ? (STATE_CITIES[reg.state] || []).sort() : [];

  /* ── DATA LOAD ── */
  const loadData = useCallback(async () => {
    if (!USE_SB) return;
    const [ms, bs] = await Promise.all([SB.select("members"), SB.select("books")]);
    setMembers(ms); setBooks(bs);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Keep localStorage in sync when user changes
  useEffect(() => {
    if (user) localStorage.setItem("bw_user", JSON.stringify(user));
    else localStorage.removeItem("bw_user");
  }, [user]);

  // ── TOAST NOTIFICATION ──
  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), 3000);
  }

  const myBooks = useMemo(() => books.filter(b => b.memberid === user?.id), [books, user]);
  const fin = myBooks.filter(b => b.status === "Finished");
  const rdg = myBooks.filter(b => b.status === "Reading");
  const ns = myBooks.filter(b => b.status === "Not Started");
  const target = parseInt(user?.yearlytarget) || 12;
  const goalPct = Math.min(100, Math.round((fin.length / target) * 100));
  const pagesRead = fin.reduce((a, b) => a + (parseInt(b.totalpages) || 0), 0);

  /* ── LOGIN ── */
  async function doLogin() {
    setLoading(true); setLoginErr("");
    if (USE_SB) { await loadData(); }
    const found = members.find(m => (m.email || "").toLowerCase().trim() === loginEmail.toLowerCase().trim());
    if (!found) { setLoginErr("⚡ No wizard found. Please register!"); setLoading(false); return; }
    setUser(found);
    localStorage.setItem("bw_user", JSON.stringify(found));
    setScreen("app"); setLoading(false);
  }

  /* ── REGISTER ── */
  async function doRegister() {
    if (!reg.name || !reg.email) { setRegErr("Name and email are required."); return; }
    if (!reg.bio) { setRegErr("Please write a short bio."); return; }
    if (!reg.photo) { setRegErr("Please upload your photo."); return; }
    if (members.find(m => (m.email || "").toLowerCase() === reg.email.toLowerCase())) { setRegErr("Email already registered!"); return; }
    setLoading(true);
    let latestMembers = members;
    if (USE_SB) { latestMembers = await SB.select("members"); setMembers(latestMembers); }
    const newM = {
      id: nextId(latestMembers),
      name: reg.name, email: reg.email, phone: reg.phone,
      birthdaymonth: reg.birthdayMonth, birthdaydate: reg.birthdayDate,
      state: reg.state, city: reg.city, country: reg.country,
      postaladdress: reg.postalAddress,
      instagramlink: reg.instagramLink, goodreadslink: reg.goodreadsLink,
      bio: reg.bio, photo: reg.photo,
      yearlytarget: 12, joindate: new Date().toISOString().slice(0, 10), isadmin: false
    };
    if (USE_SB) { await SB.insert("members", newM); await loadData(); }
    else { setMembers(ms => [...ms, newM]); }
    await sendWelcomeEmail({ ...newM, id: newM.id });
    setNewMemberName(newM.name);
    setUser(newM);
    setLoading(false);
    setWelcomeMsg(true);
    setTimeout(() => { setWelcomeMsg(false); setScreen("app"); }, 4000);
  }

  /* ── SAVE BOOK ── */
  async function saveBook() {
    if (!bf.title) { showToast("Please enter a book title!", "error"); return; }
    if (saving) return;
    setSaving(true);
    try {
      const tp = parseInt(bf.totalPages) || 0;
      const fp = parseInt(bf.finishedPages) || 0;
      const pct = tp > 0 ? Math.round((fp / tp) * 100) : 0;
      const bk = {
        id: editBook ? editBook.id : "b" + Date.now(),
        memberid: user.id, membername: user.name,
        title: bf.title, author: bf.author, genre: bf.genre,
        origlang: bf.origLang, readlang: bf.readLang,
        startdate: bf.startDate, startmonth: bf.startDate ? MONTHS[new Date(bf.startDate).getMonth()] : "",
        enddate: bf.endDate, endmonth: bf.endDate ? MONTHS[new Date(bf.endDate).getMonth()] : "",
        totalpages: tp, finishedpages: fp, pct,
        status: bf.status, rating: bf.rating, review: bf.review
      };
      if (USE_SB) {
        if (editBook) await SB.update("books", bk, bk.id);
        else await SB.insert("books", bk);
        await loadData();
      } else {
        if (editBook) setBooks(bs => bs.map(b => b.id === editBook.id ? bk : b));
        else setBooks(bs => [...bs, bk]);
      }
      const wasEdit = !!editBook;
      setShowBookMod(false);
      setEditBook(null);
      setBf(eBook);
      showToast(wasEdit ? "Book updated! 📚" : "Book added to your shelf! ✨");
    } catch (e) {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  /* ── SAVE GOAL ── */
  async function saveGoal() {
    const updated = { ...user, yearlytarget: parseInt(goalVal) || 12 };
    if (USE_SB) { await SB.update("members", { yearlytarget: updated.yearlytarget }, user.id); await loadData(); }
    else setMembers(ms => ms.map(m => m.id === user.id ? updated : m));
    setUser(updated);
    localStorage.setItem("bw_user", JSON.stringify(updated));
    setShowGoal(false);
    showToast("Reading goal updated! 🎯");
  }

  /* ── SAVE PROFILE ── */
  async function saveProfile() {
    const updated = { ...user, ...pe };
    if (USE_SB) { await SB.update("members", pe, user.id); await loadData(); }
    else setMembers(ms => ms.map(m => m.id === user.id ? updated : m));
    setUser(updated);
    localStorage.setItem("bw_user", JSON.stringify(updated));
    setShowProfEdit(false);
    showToast("Profile saved successfully! ✨");
  }

  /* ── DELETE ── */
  async function doDelete() {
    const { type, id, memberId } = confirmDel;
    if (type === "book") {
      if (USE_SB) await SB.delete("books", id);
      else setBooks(bs => bs.filter(b => b.id !== id));
    }
    if (type === "member") {
      // delete all their books first
      if (USE_SB) { await SB.deleteWhere("books", "memberid", id); await SB.delete("members", id); await loadData(); }
      else { setBooks(bs => bs.filter(b => b.memberid !== id)); setMembers(ms => ms.filter(m => m.id !== id)); }
      if (id === user.id) { setUser(null); setScreen("login"); }
    }
    if (USE_SB) await loadData();
    setConfirmDel(null);
  }

  /* ── PHOTO ── */
  function handlePhoto(e, cb) {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = ev => cb(ev.target.result);
    rd.readAsDataURL(f);
  }

  /* ── MONTHLY ── */
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

  /* ── YEARLY ── */
  const yLine = MONTHS.map(mo => ({ l: mo.slice(0, 3), v: books.filter(b => b.status === "Finished" && b.endmonth === mo).length }));
  const allG = books.reduce((a, b) => { if (b.status === "Finished") a[b.genre] = (a[b.genre] || 0) + 1; return a; }, {});
  const gColors = ["#C9A84C", "#7B2D2D", "#1A472A", "#0E1A40", "#B8540A", "#5C2D91", "#2E7D32", "#1565C0"];
  const gSlices = Object.entries(allG).slice(0, 7).map(([g, v], i) => ({ g, v, c: gColors[i % 8] }));
  const board = members.map(m => { const mf = books.filter(b => b.memberid === m.id && b.status === "Finished"); return { ...m, bR: mf.length, pR: mf.reduce((a, b) => a + (parseInt(b.totalpages) || 0), 0) }; }).sort((a, b) => b.bR - a.bR);

  /* ── CSS ── */
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    :root{--bg:#060402;--surf:#0D0A06;--card:#130F09;--card2:#1A140D;--bdr:rgba(201,168,76,.14);--bdr2:rgba(201,168,76,.28);--gold:#C9A84C;--gold2:#E8D28A;--text:#EDE8DF;--sub:rgba(237,232,223,.48);--mut:rgba(237,232,223,.22);}
    body{font-family:'Crimson Pro',Georgia,serif;background:var(--bg);color:var(--text);font-size:15px;}
    ::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-track{background:var(--surf);}::-webkit-scrollbar-thumb{background:rgba(201,168,76,.28);border-radius:2px;}
    button,input,select,textarea{font-family:'Crimson Pro',Georgia,serif;outline:none;}
    select option{background:#0D0A06;}
    a{color:var(--gold);text-decoration:none;}a:hover{text-decoration:underline;}
  `;
  const card = { background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 14 };

  const NAV = [
    { id: "dashboard", icon: "📖", lb: "My Dashboard" },
    { id: "myshelf", icon: "📚", lb: "My Bookshelf" },
    { id: "readinglog", icon: "📜", lb: "Reading Scroll" },
    { id: "monthly", icon: "🌙", lb: "Monthly Spells" },
    { id: "yearly", icon: "⭐", lb: "Yearly Stats" },
    { id: "greathall", icon: "🏰", lb: "Great Hall" },
    { id: "leaderboard", icon: "🏆", lb: "Leaderboard" },
  ];

  /* ════════════════════════════════════════════════════════════
     SCREENS
  ════════════════════════════════════════════════════════════ */
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

  if (screen !== "app") return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <style>{css}</style>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 20% 50%,rgba(123,45,45,.07) 0%,transparent 60%),radial-gradient(ellipse at 80% 30%,rgba(14,26,64,.1) 0%,transparent 60%)" }} />
      <Particles />
      <div style={{ position: "relative", zIndex: 1, background: "rgba(13,10,6,.97)", border: "1px solid var(--bdr2)", borderRadius: 22, padding: "38px 42px", width: screen === "register" ? 550 : 450, maxWidth: "95vw", maxHeight: "95vh", overflowY: "auto", boxShadow: "0 0 90px rgba(201,168,76,.07),0 32px 64px rgba(0,0,0,.7)" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,#C9A84C,transparent)", borderRadius: "22px 22px 0 0" }} />

        {/* LOGO + TITLE */}
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ width: 68, height: 68, margin: "0 auto 10px", borderRadius: 13, overflow: "hidden", border: "1px solid var(--bdr2)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(201,168,76,.07)" }}>
            <img src={LOGO} alt="BW" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={e => { e.target.style.display = "none"; e.target.parentNode.innerHTML = "<span style='font-size:34px'>🧙‍♂️</span>"; }} />
          </div>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", letterSpacing: 2, animation: "glw 3s infinite" }}>BOOK WIZARDS</div>
          <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 3, letterSpacing: 3, fontFamily: "'Cinzel',serif" }}>READING · MAGIC · COMMUNITY</div>
        </div>

        {/* LOGIN */}
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

        {/* REGISTER */}
        {screen === "register" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
              {/* photo */}
              <div style={{ gridColumn: "1/-1", marginBottom: 12 }}>
                <FL ch="Your Photo * (mandatory)" />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(201,168,76,.08)", border: "2px solid rgba(201,168,76,.3)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {photoPrev ? <img src={photoPrev} alt="p" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 26 }}>🧙</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input type="file" accept="image/*" onChange={e => handlePhoto(e, v => { setPhotoPrev(v); setReg(r => ({ ...r, photo: v })); })} style={{ display: "none" }} id="rph" />
                    <label htmlFor="rph" style={{ display: "block", padding: "8px 13px", background: "rgba(201,168,76,.07)", border: "1px solid rgba(201,168,76,.28)", borderRadius: 9, color: "#C9A84C", fontSize: 12, cursor: "pointer", textAlign: "center", fontFamily: "'Cinzel',serif" }}>📷 Upload Photo</label>
                    <div style={{ fontSize: 10, color: "var(--mut)", marginTop: 3 }}>Clear face photo required</div>
                  </div>
                </div>
              </div>

              <div style={{ gridColumn: "1/-1" }}><FL ch="Full Name *" /><FI value={reg.name} onChange={e => setReg(r => ({ ...r, name: e.target.value }))} placeholder="Priya Sharma" /></div>
              <div style={{ gridColumn: "1/-1" }}><FL ch="Gmail Address *" /><FI type="email" value={reg.email} onChange={e => setReg(r => ({ ...r, email: e.target.value }))} placeholder="priya@gmail.com" /></div>
              <div><FL ch="Phone" /><FI value={reg.phone} onChange={e => setReg(r => ({ ...r, phone: e.target.value }))} placeholder="9876543210" /></div>
              <div><FL ch="Country" /><FS ch={COUNTRIES.map(c => <option key={c}>{c}</option>)} value={reg.country} onChange={e => setReg(r => ({ ...r, country: e.target.value, state: "", city: "" }))} /></div>

              {reg.country === "India" ? (<>
                <div><FL ch="State *" /><FS ch={[<option key="" value="">— Select —</option>, ...STATES.map(s => <option key={s}>{s}</option>)]} value={reg.state} onChange={e => setReg(r => ({ ...r, state: e.target.value, city: "" }))} /></div>
                <div><FL ch="City *" /><FS ch={[<option key="" value="">{reg.state ? "— Select —" : "Select state first"}</option>, ...(regCities.map(c => <option key={c}>{c}</option>))]} value={reg.city} onChange={e => setReg(r => ({ ...r, city: e.target.value }))} disabled={!reg.state} /></div>
              </>) : (
                <div style={{ gridColumn: "1/-1" }}><FL ch="City" /><FI value={reg.city} onChange={e => setReg(r => ({ ...r, city: e.target.value }))} placeholder="Your city" /></div>
              )}

              <div style={{ gridColumn: "1/-1" }}><FL ch="Postal Address *" /><FT value={reg.postalAddress} onChange={e => setReg(r => ({ ...r, postalAddress: e.target.value }))} placeholder="House No, Street, Area, City, Pin Code" style={{ height: 64 }} /></div>
              <div><FL ch="Birthday Month" /><FS ch={MONTHS.map(m => <option key={m}>{m}</option>)} value={reg.birthdayMonth} onChange={e => setReg(r => ({ ...r, birthdayMonth: e.target.value }))} /></div>
              <div><FL ch="Birthday Date" /><FI type="number" min="1" max="31" value={reg.birthdayDate} onChange={e => setReg(r => ({ ...r, birthdayDate: e.target.value }))} placeholder="15" /></div>
              <div><FL ch="Instagram" /><FI value={reg.instagramLink} onChange={e => setReg(r => ({ ...r, instagramLink: e.target.value }))} placeholder="instagram.com/username" /></div>
              <div><FL ch="Goodreads" /><FI value={reg.goodreadsLink} onChange={e => setReg(r => ({ ...r, goodreadsLink: e.target.value }))} placeholder="goodreads.com/user" /></div>
              <div style={{ gridColumn: "1/-1" }}><FL ch="Your Bio * (about you as a reader)" /><FT value={reg.bio} onChange={e => setReg(r => ({ ...r, bio: e.target.value }))} placeholder="I love reading literary fiction and historical novels..." style={{ height: 80 }} /></div>
            </div>
            {regErr && <div style={{ color: "#E07070", fontSize: 12, margin: "6px 0", textAlign: "center" }}>{regErr}</div>}
            <GB ch={loading ? "🌀 Registering..." : "🧙 Join Book Wizards"} onClick={doRegister} full style={{ marginTop: 10 }} />
            <div style={{ textAlign: "center", marginTop: 10, fontSize: 13, color: "var(--sub)" }}>
              Already a wizard?{" "}
              <button style={{ background: "none", border: "none", color: "#C9A84C", fontWeight: 700, fontSize: 13, cursor: "pointer" }} onClick={() => setScreen("login")}>Sign In</button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  /* ════════════════════════════════════════════════════════════
     MAIN APP SHELL
  ════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <style>{css}</style>

      {/* SIDEBAR */}
      <div style={{ width: sideOpen ? 224 : 60, background: "var(--surf)", borderRight: "1px solid var(--bdr)", position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 100, display: "flex", flexDirection: "column", transition: "width .22s ease", overflow: "hidden" }}>
        <div style={{ padding: "15px 13px", borderBottom: "1px solid var(--bdr)", display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, overflow: "hidden", flexShrink: 0, border: "1px solid var(--bdr2)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(201,168,76,.07)" }}>
            <img src={LOGO} alt="BW" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={e => { e.target.parentNode.innerHTML = "<span style='font-size:20px;display:flex;width:100%;height:100%;align-items:center;justify-content:center'>🧙‍♂️</span>"; }} />
          </div>
          {sideOpen && <div style={{ overflow: "hidden" }}><div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: "#C9A84C", letterSpacing: .8, whiteSpace: "nowrap" }}>BOOK WIZARDS</div><div style={{ fontSize: 9, color: "var(--mut)", letterSpacing: 2 }}>READING CLUB</div></div>}
          <button style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--sub)", fontSize: 13, cursor: "pointer", flexShrink: 0 }} onClick={() => setSideOpen(o => !o)}>{sideOpen ? "◀" : "▶"}</button>
        </div>

        <div style={{ flex: 1, padding: "9px 7px", overflowY: "auto" }}>
          {NAV.map(n => (
            <div key={n.id} onClick={() => setPage(n.id)} title={n.lb}
              style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", borderRadius: 9, marginBottom: 2, cursor: "pointer", background: page === n.id ? "rgba(201,168,76,.1)" : "transparent", borderLeft: page === n.id ? "2px solid #C9A84C" : "2px solid transparent", color: page === n.id ? "#C9A84C" : "var(--sub)", transition: "all .14s" }}
              onMouseEnter={e => { if (page !== n.id) { e.currentTarget.style.background = "rgba(201,168,76,.05)"; e.currentTarget.style.color = "rgba(201,168,76,.65)"; } }}
              onMouseLeave={e => { if (page !== n.id) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--sub)"; } }}
            >
              <span style={{ fontSize: 15, flexShrink: 0 }}>{n.icon}</span>
              {sideOpen && <span style={{ fontSize: 12, fontWeight: page === n.id ? 700 : 400, fontFamily: "'Cinzel',serif", letterSpacing: .3, whiteSpace: "nowrap" }}>{n.lb}</span>}
            </div>
          ))}

          {/* Admin section */}
          {user?.isadmin && sideOpen && <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--bdr)" }}>
            <div style={{ fontSize: 9, color: "var(--mut)", fontFamily: "'Cinzel',serif", letterSpacing: 2, padding: "0 9px 6px" }}>ADMIN</div>
            <div onClick={() => setPage("admin")} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", borderRadius: 9, cursor: "pointer", background: page === "admin" ? "rgba(201,168,76,.1)" : "transparent", color: page === "admin" ? "#C9A84C" : "var(--sub)", transition: "all .14s" }}>
              <span style={{ fontSize: 15 }}>⚙️</span>
              <span style={{ fontSize: 12, fontFamily: "'Cinzel',serif" }}>Admin Panel</span>
            </div>
          </div>}
        </div>

        {/* USER */}
        <div style={{ padding: "11px 9px", borderTop: "1px solid var(--bdr)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", borderRadius: 9, padding: "6px 6px", transition: "background .14s" }} onClick={() => { setPe({ ...user }); setShowProfEdit(true); }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,.06)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <Av m={user} size={32} />
            {sideOpen && <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "'Cinzel',serif" }}>{user.name.split(" ")[0]}</div>
              <div style={{ fontSize: 9, color: "#C9A84C" }}>{user.id} · tap to edit</div>
            </div>}
          </div>
          {sideOpen && <button style={{ marginTop: 7, width: "100%", padding: "6px", background: "transparent", border: "1px solid var(--bdr)", borderRadius: 8, color: "var(--sub)", fontSize: 11, cursor: "pointer" }} onClick={() => { setUser(null); localStorage.removeItem("bw_user"); setScreen("login"); }}>Sign Out 🌀</button>}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ marginLeft: sideOpen ? 224 : 60, flex: 1, padding: "26px 30px", transition: "margin-left .22s ease" }}>

        {/* ── DASHBOARD ── */}
        {page === "dashboard" && (
          <div style={{ animation: "fiu .35s ease" }}>
            <div style={{ marginBottom: 22 }}>
              <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", letterSpacing: .8, marginBottom: 3 }}>My Dashboard 📖</h1>
              <p style={{ color: "var(--sub)", fontSize: 14, fontStyle: "italic" }}>"{rand(QUOTES).q}"</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
              {[{ n: fin.length, l: "Books Finished", c: "#C9A84C" }, { n: rdg.length, l: "Reading Now", c: "#6B9FD4" }, { n: ns.length, l: "Want to Read", c: "#9B84D4" }, { n: pagesRead.toLocaleString(), l: "Pages Read", c: "#6FAF7B" }].map((s, i) => (
                <div key={i} style={{ ...card, padding: "15px 17px" }}>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: s.c, lineHeight: 1 }}>{s.n}</div>
                  <div style={{ fontSize: 12, color: "var(--sub)", marginTop: 4 }}>{s.l}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 16 }}>
              {/* goal */}
              <div style={{ background: "linear-gradient(135deg,#0C0906,#191208)", border: "1px solid rgba(201,168,76,.18)", borderRadius: 14, padding: 22, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", right: -8, top: -8, fontSize: 80, opacity: .04 }}>🎯</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: 15, color: "#C9A84C" }}>2026 Reading Quest</div>
                  <GB ch="✏️ Edit" sm ghost onClick={() => { setGoalVal(String(target)); setShowGoal(true); }} />
                </div>
                <div style={{ fontSize: 13, color: "var(--sub)", marginBottom: 12 }}>{fin.length} of {target} books · {goalPct}% complete</div>
                <div style={{ height: 9, background: "rgba(255,255,255,.06)", borderRadius: 5, overflow: "hidden", marginBottom: 14 }}>
                  <div style={{ height: "100%", width: `${goalPct}%`, background: "linear-gradient(90deg,#8B6914,#C9A84C,#E8D28A)", borderRadius: 5, transition: "width .8s ease" }} />
                </div>
                <div style={{ display: "flex", gap: 20 }}>
                  {[{ n: target - fin.length, l: "books left" }, { n: pagesRead.toLocaleString(), l: "pages read" }, { n: rdg.length, l: "in progress" }].map((s, i) => (
                    <div key={i}><div style={{ fontFamily: "'Cinzel',serif", fontSize: 17, color: "#C9A84C" }}>{s.n}</div><div style={{ fontSize: 10, color: "var(--mut)" }}>{s.l}</div></div>
                  ))}
                </div>
              </div>

              {/* currently reading */}
              <div style={{ ...card, padding: 18 }}>
                <SH ch="Currently Reading 🌙" />
                {rdg.length === 0 ? <Nil icon="🌙" msg="Nothing in progress" /> : rdg.slice(0, 3).map(b => (
                  <div key={b.id} style={{ display: "flex", gap: 9, marginBottom: 11, paddingBottom: 11, borderBottom: "1px solid var(--bdr)" }}>
                    <Cover title={b.title} author={b.author} size={34} r={5} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.title}</div>
                      <div style={{ fontSize: 11, color: "var(--sub)", marginBottom: 4 }}>{b.author}</div>
                      <PBar p={b.pct} c="#6B9FD4" h={4} />
                      <div style={{ fontSize: 10, color: "var(--mut)", marginTop: 2 }}>{b.pct}% · {b.finishedpages}/{b.totalpages}pp</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* recently finished */}
            <div style={{ ...card, padding: 18 }}>
              <SH ch="Recently Finished ✨" action={<button style={{ background: "none", border: "none", color: "#C9A84C", fontSize: 12, cursor: "pointer", fontFamily: "'Cinzel',serif" }} onClick={() => setPage("myshelf")}>All →</button>} />
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
                {fin.slice(-8).reverse().map(b => (
                  <div key={b.id} style={{ flexShrink: 0, textAlign: "center", width: 62 }}>
                    <Cover title={b.title} author={b.author} size={50} r={7} />
                    <div style={{ fontSize: 9, color: "var(--sub)", marginTop: 4, lineHeight: 1.2, height: 20, overflow: "hidden" }}>{b.title.slice(0, 16)}</div>
                    <Stars v={b.rating} sz={9} />
                  </div>
                ))}
                {fin.length === 0 && <Nil icon="📚" msg="No finished books yet" />}
              </div>
            </div>
          </div>
        )}

        {/* ── MY SHELF ── */}
        {page === "myshelf" && (
          <div style={{ animation: "fiu .35s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
              <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", letterSpacing: .8 }}>My Bookshelf 📚</h1>
              <GB ch="+ Add Book" onClick={() => { setBf(eBook); setEditBook(null); setShowBookMod(true); }} />
            </div>
            <div style={{ display: "flex", gap: 7, marginBottom: 18 }}>
              {["Reading", "Finished", "Not Started"].map(t => (
                <button key={t} onClick={() => setShelfTab(t)} style={{ padding: "6px 16px", borderRadius: 18, border: "1px solid", fontSize: 12, fontFamily: "'Cinzel',serif", cursor: "pointer", transition: "all .14s", borderColor: shelfTab === t ? "#C9A84C" : "var(--bdr2)", background: shelfTab === t ? "rgba(201,168,76,.1)" : "transparent", color: shelfTab === t ? "#C9A84C" : "var(--sub)" }}>
                  {t} ({myBooks.filter(b => b.status === t).length})
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(148px,1fr))", gap: 14 }}>
              {myBooks.filter(b => b.status === shelfTab).map(b => (
                <div key={b.id} style={{ ...card, overflow: "hidden", cursor: "pointer", transition: "transform .18s,box-shadow .18s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 14px 36px rgba(0,0,0,.5)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                  <div style={{ display: "flex", justifyContent: "center", padding: "13px 13px 6px", background: "var(--card2)" }}><Cover title={b.title} author={b.author} size={78} r={7} /></div>
                  <div style={{ padding: "9px 11px 11px" }}>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, lineHeight: 1.35, marginBottom: 2, height: 30, overflow: "hidden" }}>{b.title}</div>
                    <div style={{ fontSize: 11, color: "var(--sub)", marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.author}</div>
                    <div style={{ fontSize: 9, padding: "2px 7px", borderRadius: 9, background: "rgba(201,168,76,.1)", color: "#C9A84C", display: "inline-block", marginBottom: 6 }}>{b.genre}</div>
                    {b.status === "Reading" && <><PBar p={b.pct} c="#6B9FD4" h={4} /><div style={{ fontSize: 9, color: "var(--mut)", marginTop: 2 }}>{b.pct}%</div></>}
                    {b.status === "Finished" && <Stars v={b.rating} sz={11} />}
                    <div style={{ display: "flex", gap: 5, marginTop: 7 }}>
                      <button style={{ flex: 1, padding: "4px", background: "rgba(201,168,76,.07)", border: "1px solid var(--bdr)", borderRadius: 6, color: "#C9A84C", fontSize: 10, cursor: "pointer" }} onClick={() => { setEditBook(b); setBf({ ...b, totalPages: b.totalpages, finishedPages: b.finishedpages, origLang: b.origlang, readLang: b.readlang, startDate: b.startdate, startMonth: b.startmonth, endDate: b.enddate, endMonth: b.endmonth }); setShowBookMod(true); }}>✏️ Edit</button>
                      <button style={{ padding: "4px 6px", background: "rgba(180,40,40,.1)", border: "1px solid rgba(180,40,40,.3)", borderRadius: 6, color: "#E07070", fontSize: 10, cursor: "pointer" }} onClick={() => setConfirmDel({ type: "book", id: b.id, name: b.title })}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ border: "1.5px dashed var(--bdr2)", borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 190, cursor: "pointer", color: "var(--mut)", gap: 7, fontSize: 12, fontFamily: "'Cinzel',serif", transition: "all .18s" }}
                onClick={() => { setBf(eBook); setEditBook(null); setShowBookMod(true); }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#C9A84C"; e.currentTarget.style.color = "#C9A84C"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--bdr2)"; e.currentTarget.style.color = "var(--mut)"; }}>
                <span style={{ fontSize: 26 }}>✨</span><span>Add Book</span>
              </div>
            </div>
          </div>
        )}

        {/* ── READING SCROLL ── */}
        {page === "readinglog" && (
          <div style={{ animation: "fiu .35s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
              <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", letterSpacing: .8 }}>Reading Scroll 📜</h1>
              <GB ch="+ Log Book" onClick={() => { setBf(eBook); setEditBook(null); setShowBookMod(true); }} />
            </div>
            <div style={{ ...card, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background: "var(--card2)", borderBottom: "1px solid var(--bdr)" }}>
                    {["", "Title", "Author", "Genre", "Orig", "Read", "Started", "Ended", "Pages", "Read", "%", "⭐", "Review", "Status", ""].map((h, i) => <th key={i} style={{ padding: "9px 11px", textAlign: "left", color: "rgba(201,168,76,.6)", fontFamily: "'Cinzel',serif", fontSize: 9, letterSpacing: .5, whiteSpace: "nowrap" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {myBooks.map(b => (
                      <tr key={b.id} style={{ borderBottom: "1px solid rgba(201,168,76,.06)", transition: "background .12s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,.03)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "8px 11px" }}><Cover title={b.title} author={b.author} size={26} r={4} /></td>
                        <td style={{ padding: "8px 11px", fontFamily: "'Cinzel',serif", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</td>
                        <td style={{ padding: "8px 11px", color: "var(--sub)", whiteSpace: "nowrap" }}>{b.author}</td>
                        <td style={{ padding: "8px 11px" }}><span style={{ padding: "1px 6px", borderRadius: 8, background: "rgba(201,168,76,.08)", color: "#C9A84C", fontSize: 9 }}>{b.genre}</span></td>
                        <td style={{ padding: "8px 11px", color: "var(--sub)", fontSize: 11 }}>{b.origlang}</td>
                        <td style={{ padding: "8px 11px", color: "var(--sub)", fontSize: 11 }}>{b.readlang}</td>
                        <td style={{ padding: "8px 11px", color: "var(--sub)", fontSize: 10, whiteSpace: "nowrap" }}>{b.startdate ? fmt(b.startdate) : "—"}</td>
                        <td style={{ padding: "8px 11px", color: "var(--sub)", fontSize: 10, whiteSpace: "nowrap" }}>{b.enddate ? fmt(b.enddate) : "—"}</td>
                        <td style={{ padding: "8px 11px", textAlign: "right" }}>{b.totalpages || "—"}</td>
                        <td style={{ padding: "8px 11px", textAlign: "right", color: "var(--sub)" }}>{b.finishedpages || "—"}</td>
                        <td style={{ padding: "8px 11px", minWidth: 70 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,.06)", borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", width: `${b.pct}%`, background: b.status === "Finished" ? "#6FAF7B" : b.status === "Reading" ? "#6B9FD4" : "var(--bdr)", borderRadius: 2 }} /></div>
                            <span style={{ fontSize: 9, color: "var(--mut)" }}>{b.pct}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "8px 11px" }}><Stars v={b.rating} sz={10} /></td>
                        <td style={{ padding: "8px 11px", maxWidth: 100, color: "var(--sub)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: "italic" }}>{b.review || "—"}</td>
                        <td style={{ padding: "8px 11px" }}><span style={{ padding: "2px 7px", borderRadius: 9, fontSize: 9, fontWeight: 700, whiteSpace: "nowrap", background: b.status === "Finished" ? "rgba(111,175,123,.15)" : b.status === "Reading" ? "rgba(107,159,212,.15)" : "rgba(255,255,255,.04)", color: b.status === "Finished" ? "#6FAF7B" : b.status === "Reading" ? "#6B9FD4" : "var(--mut)" }}>{b.status}</span></td>
                        <td style={{ padding: "8px 11px" }}>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button style={{ background: "none", border: "none", color: "#C9A84C", fontSize: 12, cursor: "pointer" }} onClick={() => { setEditBook(b); setBf({ ...b, totalPages: b.totalpages, finishedPages: b.finishedpages, origLang: b.origlang, readLang: b.readlang, startDate: b.startdate, startMonth: b.startmonth, endDate: b.enddate, endMonth: b.endmonth }); setShowBookMod(true); }}>✏️</button>
                            <button style={{ background: "none", border: "none", color: "#E07070", fontSize: 12, cursor: "pointer" }} onClick={() => setConfirmDel({ type: "book", id: b.id, name: b.title })}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {myBooks.length === 0 && <Nil icon="📜" msg="Your scroll is empty. Add your first book!" />}
            </div>
          </div>
        )}

        {/* ── MONTHLY ── */}
        {page === "monthly" && (
          <div style={{ animation: "fiu .35s ease" }}>
            <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", letterSpacing: .8, marginBottom: 3 }}>Monthly Spells 🌙</h1>
            <p style={{ color: "var(--sub)", fontSize: 13, marginBottom: 16 }}>Community reading magic by month</p>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 20 }}>
              {MONTHS.map(m => <button key={m} onClick={() => setSelMonth(m)} style={{ padding: "5px 11px", borderRadius: 16, border: "1px solid", fontSize: 11, fontFamily: "'Cinzel',serif", cursor: "pointer", transition: "all .14s", borderColor: selMonth === m ? "#C9A84C" : "var(--bdr)", background: selMonth === m ? "rgba(201,168,76,.1)" : "transparent", color: selMonth === m ? "#C9A84C" : "var(--sub)" }}>{m.slice(0, 3)}</button>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
              {[{ n: mFin.length, l: "Books Read", c: "#C9A84C" }, { n: mPages.toLocaleString(), l: "Pages Read", c: "#6B9FD4" }, { n: actR, l: "Active Wizards", c: "#6FAF7B" }, { n: topG, l: "Top Genre", c: "#9B84D4" }].map((s, i) => (
                <div key={i} style={{ ...card, padding: "13px 15px" }}><div style={{ fontFamily: "'Cinzel',serif", fontSize: typeof s.n === "string" && s.n.length > 10 ? 12 : 20, color: s.c, lineHeight: 1 }}>{s.n}</div><div style={{ fontSize: 11, color: "var(--sub)", marginTop: 4 }}>{s.l}</div></div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div style={{ ...card, padding: 16 }}>
                <SH ch="🏅 Top 5 — Most Books" />
                {mStats.filter(m => m.curB > 0).sort((a, b) => b.curB - a.curB).slice(0, 5).map((m, i) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9, paddingBottom: 9, borderBottom: "1px solid var(--bdr)" }}>
                    <div style={{ fontSize: i < 3 ? 17 : 12, width: 22, textAlign: "center" }}>{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</div>
                    <Av m={m} size={24} /><div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Cinzel',serif" }}>{m.name}</div><div style={{ fontSize: 10, color: "var(--sub)" }}>{m.city}</div></div>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color: "#C9A84C" }}>{m.curB}</div>
                  </div>
                ))}
                {mStats.filter(m => m.curB > 0).length === 0 && <Nil icon="📚" msg={`No data for ${selMonth}`} />}
              </div>
              <div style={{ ...card, padding: 16 }}>
                <SH ch="📜 Top 5 — Most Pages" />
                {mStats.filter(m => m.curP > 0).sort((a, b) => b.curP - a.curP).slice(0, 5).map((m, i) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9, paddingBottom: 9, borderBottom: "1px solid var(--bdr)" }}>
                    <div style={{ fontSize: i < 3 ? 17 : 12, width: 22, textAlign: "center" }}>{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</div>
                    <Av m={m} size={24} /><div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Cinzel',serif" }}>{m.name}</div><div style={{ fontSize: 10, color: "var(--sub)" }}>{m.city}</div></div>
                    <div style={{ textAlign: "right" }}><div style={{ fontFamily: "'Cinzel',serif", fontSize: 17, color: "#6B9FD4" }}>{m.curP.toLocaleString()}</div><div style={{ fontSize: 9, color: "var(--mut)" }}>pp</div></div>
                  </div>
                ))}
                {mStats.filter(m => m.curP > 0).length === 0 && <Nil icon="📜" msg={`No data for ${selMonth}`} />}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ ...card, padding: 16 }}>
                <SH ch="🚀 Most Improved" />
                <div style={{ fontSize: 11, color: "var(--sub)", marginBottom: 9 }}>vs {prevM}</div>
                {mStats.filter(m => m.curB > 0).sort((a, b) => b.imp - a.imp).slice(0, 5).map((m, i) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9, paddingBottom: 9, borderBottom: "1px solid var(--bdr)" }}>
                    <div style={{ fontSize: 11, width: 16, color: "var(--sub)" }}>{i + 1}</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Cinzel',serif" }}>{m.name}</div><div style={{ fontSize: 10, color: "var(--sub)" }}>{m.prvB}→{m.curB} books</div></div>
                    <div style={{ padding: "2px 8px", borderRadius: 16, fontWeight: 700, fontSize: 11, background: m.imp > 0 ? "rgba(111,175,123,.15)" : "rgba(224,112,112,.1)", color: m.imp > 0 ? "#6FAF7B" : "#E07070" }}>{m.imp > 0 ? "+" : ""}{m.imp}%</div>
                  </div>
                ))}
                {mStats.filter(m => m.curB > 0).length === 0 && <Nil icon="📈" msg="No data" />}
              </div>
              <div style={{ ...card, padding: 16 }}>
                <SH ch="📊 Contribution" />
                {mStats.filter(m => m.curB > 0).map(m => {
                  const p = mFin.length > 0 ? Math.round((m.curB / mFin.length) * 100) : 0;
                  return <div key={m.id} style={{ marginBottom: 9 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}><span style={{ fontFamily: "'Cinzel',serif", fontSize: 11 }}>{m.name}</span><span style={{ color: "#C9A84C", fontWeight: 700 }}>{m.curB} ({p}%)</span></div><PBar p={p} c={abg(m.name)} h={5} /></div>;
                })}
                {mStats.filter(m => m.curB > 0).length === 0 && <Nil icon="📊" msg="No activity" />}
              </div>
            </div>
          </div>
        )}

        {/* ── YEARLY ── */}
        {page === "yearly" && (
          <div style={{ animation: "fiu .35s ease" }}>
            <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", letterSpacing: .8, marginBottom: 3 }}>Yearly Stats ⭐</h1>
            <p style={{ color: "var(--sub)", fontSize: 13, marginBottom: 20 }}>Community reading constellation for 2026</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
              {[{ n: books.filter(b => b.status === "Finished").length, l: "Total Finished", c: "#6FAF7B" }, { n: books.filter(b => b.status === "Reading").length, l: "Being Read", c: "#6B9FD4" }, { n: members.length, l: "Members", c: "#C9A84C" }, { n: books.filter(b => b.status === "Finished").reduce((a, b) => a + (parseInt(b.totalpages) || 0), 0).toLocaleString(), l: "Community Pages", c: "#9B84D4" }].map((s, i) => (
                <div key={i} style={{ ...card, padding: "13px 15px" }}><div style={{ fontFamily: "'Cinzel',serif", fontSize: typeof s.n === "string" && s.n.length > 6 ? 16 : 22, color: s.c, lineHeight: 1 }}>{s.n}</div><div style={{ fontSize: 11, color: "var(--sub)", marginTop: 4 }}>{s.l}</div></div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
              <div style={{ ...card, padding: 20 }}><SH ch="📈 Books Per Month" /><LineChart data={yLine} h={110} /></div>
              <div style={{ ...card, padding: 20 }}>
                <SH ch="🎭 Genres" />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <Donut slices={gSlices} sz={110} />
                  <div style={{ width: "100%" }}>{gSlices.slice(0, 5).map(s => <div key={s.g} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: s.c, flexShrink: 0 }} /><div style={{ fontSize: 10, color: "var(--sub)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.g}</div><div style={{ fontSize: 10, fontWeight: 700, color: s.c }}>{s.v}</div></div>)}</div>
                </div>
              </div>
            </div>
            <div style={{ ...card, padding: 20 }}>
              <SH ch="🎯 Member Goal Progress — 2026" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 11 }}>
                {members.map(m => {
                  const mf = books.filter(b => b.memberid === m.id && b.status === "Finished").length;
                  const p = Math.min(100, Math.round((mf / (parseInt(m.yearlytarget) || 12)) * 100));
                  return (
                    <div key={m.id} style={{ background: "var(--card2)", border: "1px solid", borderColor: m.id === user.id ? "rgba(201,168,76,.35)" : "var(--bdr)", borderRadius: 11, padding: 13 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
                        <Av m={m} size={30} />
                        <div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Cinzel',serif", color: m.id === user.id ? "#C9A84C" : "var(--text)" }}>{m.name}{m.id === user.id ? " ⚡" : ""}</div><div style={{ fontSize: 10, color: "var(--sub)" }}>{m.city}</div></div>
                        <div style={{ textAlign: "right" }}><div style={{ fontFamily: "'Cinzel',serif", fontSize: 17, color: "#C9A84C" }}>{mf}</div><div style={{ fontSize: 9, color: "var(--mut)" }}>/ {m.yearlytarget || 12}</div></div>
                      </div>
                      <PBar p={p} c={p >= 100 ? "#6FAF7B" : "#C9A84C"} h={5} />
                      <div style={{ fontSize: 10, color: "var(--sub)", marginTop: 3 }}>{p}% complete</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── GREAT HALL ── */}
        {page === "greathall" && (
          <div style={{ animation: "fiu .35s ease" }}>
            <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", letterSpacing: .8, marginBottom: 3 }}>The Great Hall 🏰</h1>
            <p style={{ color: "var(--sub)", fontSize: 13, marginBottom: 16 }}>{members.length} wizards from across the world</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
              {[{ n: members.length, l: "Total Members", c: "#C9A84C" }, { n: books.filter(b => b.status === "Finished").length, l: "Books Finished", c: "#6FAF7B" }, { n: books.filter(b => b.status === "Reading").length, l: "Being Read", c: "#6B9FD4" }, { n: books.filter(b => b.status === "Finished").reduce((a, b) => a + (parseInt(b.totalpages) || 0), 0).toLocaleString(), l: "Total Pages", c: "#9B84D4" }].map((s, i) => (
                <div key={i} style={{ ...card, padding: "13px 15px" }}><div style={{ fontFamily: "'Cinzel',serif", fontSize: typeof s.n === "string" && s.n.length > 6 ? 16 : 20, color: s.c, lineHeight: 1 }}>{s.n}</div><div style={{ fontSize: 11, color: "var(--sub)", marginTop: 4 }}>{s.l}</div></div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(188px,1fr))", gap: 12 }}>
              {members.map(m => {
                const mf = books.filter(b => b.memberid === m.id && b.status === "Finished").length;
                const mr = books.filter(b => b.memberid === m.id && b.status === "Reading").length;
                return (
                  <div key={m.id} style={{ ...card, borderColor: m.id === user.id ? "rgba(201,168,76,.35)" : "var(--bdr)", padding: 16, textAlign: "center", transition: "transform .18s,box-shadow .18s", cursor: "pointer", position: "relative" }}
                    onClick={() => setViewMember(m)}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,.45)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                    {m.id === user.id && <div style={{ position: "absolute", top: 7, right: 7, fontSize: 9, padding: "1px 6px", borderRadius: 8, background: "rgba(201,168,76,.14)", color: "#C9A84C", fontFamily: "'Cinzel',serif" }}>You</div>}
                    <div style={{ margin: "0 auto 9px", width: 56, height: 56 }}><Av m={m} size={56} /></div>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{m.name}</div>
                    <div style={{ fontSize: 10, color: "var(--sub)", marginBottom: 5 }}>📍 {m.city}, {m.country}</div>
                    <div style={{ fontSize: 9, color: "var(--mut)", marginBottom: 7 }}>{m.id}</div>
                    {m.bio && <div style={{ fontSize: 10, color: "var(--sub)", fontStyle: "italic", marginBottom: 7, lineHeight: 1.4 }}>"{(m.bio || "").slice(0, 52)}..."</div>}
                    <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 5 }}>
                      <div><div style={{ fontFamily: "'Cinzel',serif", fontSize: 15, color: "#C9A84C" }}>{mf}</div><div style={{ fontSize: 9, color: "var(--mut)" }}>read</div></div>
                      <div><div style={{ fontFamily: "'Cinzel',serif", fontSize: 15, color: "#6B9FD4" }}>{mr}</div><div style={{ fontSize: 9, color: "var(--mut)" }}>reading</div></div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 7 }}>
                      {m.instagramlink && <a href={m.instagramlink.startsWith("http") ? m.instagramlink : `https://${m.instagramlink}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 15, textDecoration: "none" }}>📸</a>}
                      {m.goodreadslink && <a href={m.goodreadslink.startsWith("http") ? m.goodreadslink : `https://${m.goodreadslink}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 15, textDecoration: "none" }}>📗</a>}
                    </div>
                    {m.birthdaymonth && <div style={{ fontSize: 9, color: "var(--sub)", marginTop: 5 }}>🎂 {m.birthdaymonth} {m.birthdaydate}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── LEADERBOARD ── */}
        {page === "leaderboard" && (
          <div style={{ animation: "fiu .35s ease" }}>
            <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", letterSpacing: .8, marginBottom: 3 }}>Leaderboard 🏆</h1>
            <p style={{ color: "var(--sub)", fontSize: 13, marginBottom: 20 }}>Top readers in Book Wizards</p>
            <div style={{ maxWidth: 600 }}>
              {board.map((m, i) => {
                const isMe = m.id === user.id;
                const p = Math.min(100, Math.round((m.bR / (parseInt(m.yearlytarget) || 12)) * 100));
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 17px", marginBottom: 8, background: isMe ? "rgba(201,168,76,.06)" : "var(--card)", border: "1px solid", borderColor: isMe ? "rgba(201,168,76,.35)" : "var(--bdr)", borderRadius: 12, transition: "transform .14s", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "translateX(3px)"}
                    onMouseLeave={e => e.currentTarget.style.transform = ""}>
                    <div style={{ fontSize: i < 3 ? 24 : 14, width: 30, textAlign: "center", color: i === 0 ? "#F5C842" : i === 1 ? "#B8C8D8" : i === 2 ? "#C07840" : "var(--sub)" }}>{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</div>
                    <Av m={m} size={38} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, fontFamily: "'Cinzel',serif", color: isMe ? "#C9A84C" : "var(--text)" }}>{m.name}{isMe ? " ⚡" : ""}</div>
                      <div style={{ fontSize: 11, color: "var(--sub)", marginBottom: 3 }}>📍 {m.city}, {m.country}</div>
                      <div style={{ display: "flex", gap: 5, alignItems: "center" }}><PBar p={p} c={i === 0 ? "#F5C842" : "#C9A84C"} h={4} /><span style={{ fontSize: 9, color: "var(--mut)", whiteSpace: "nowrap" }}>{p}%</span></div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: i === 0 ? "#F5C842" : i === 1 ? "#B8C8D8" : i === 2 ? "#C07840" : "#C9A84C", lineHeight: 1 }}>{m.bR}</div>
                      <div style={{ fontSize: 9, color: "var(--mut)" }}>books</div>
                      <div style={{ fontSize: 10, color: "var(--sub)", marginTop: 1 }}>{m.pR.toLocaleString()} pp</div>
                    </div>
                  </div>
                );
              })}
              {board.length === 0 && <Nil icon="🏆" msg="No members yet" />}
            </div>
          </div>
        )}

        {/* ── ADMIN ── */}
        {page === "admin" && user?.isadmin && (
          <div style={{ animation: "fiu .35s ease" }}>
            <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 24, color: "#C9A84C", letterSpacing: .8, marginBottom: 3 }}>Admin Panel ⚙️</h1>
            <p style={{ color: "var(--sub)", fontSize: 13, marginBottom: 20 }}>Manage all Book Wizards members</p>
            <div style={{ ...card, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background: "var(--card2)", borderBottom: "1px solid var(--bdr)" }}>
                    {["", "ID", "Name", "Email", "City", "Country", "Phone", "Birthday", "Goal", "Joined", "Books", "Actions"].map(h => <th key={h} style={{ padding: "9px 11px", textAlign: "left", color: "rgba(201,168,76,.6)", fontFamily: "'Cinzel',serif", fontSize: 9, letterSpacing: .4, whiteSpace: "nowrap" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {members.map(m => {
                      const mf = books.filter(b => b.memberid === m.id && b.status === "Finished").length;
                      return (
                        <tr key={m.id} style={{ borderBottom: "1px solid rgba(201,168,76,.06)", transition: "background .12s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,.03)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "8px 11px" }}><Av m={m} size={26} /></td>
                          <td style={{ padding: "8px 11px", color: "#C9A84C", fontFamily: "'Cinzel',serif", fontSize: 11 }}>{m.id}</td>
                          <td style={{ padding: "8px 11px", fontWeight: 600 }}>{m.name}</td>
                          <td style={{ padding: "8px 11px", color: "var(--sub)" }}>{m.email}</td>
                          <td style={{ padding: "8px 11px", color: "var(--sub)" }}>{m.city}</td>
                          <td style={{ padding: "8px 11px", color: "var(--sub)" }}>{m.country}</td>
                          <td style={{ padding: "8px 11px", color: "var(--sub)" }}>{m.phone || "—"}</td>
                          <td style={{ padding: "8px 11px", color: "var(--sub)", whiteSpace: "nowrap" }}>{m.birthdaydate} {m.birthdaymonth}</td>
                          <td style={{ padding: "8px 11px", textAlign: "center" }}>{m.yearlytarget || 12}</td>
                          <td style={{ padding: "8px 11px", color: "var(--sub)", whiteSpace: "nowrap", fontSize: 10 }}>{fmt(m.joindate)}</td>
                          <td style={{ padding: "8px 11px", textAlign: "center", color: "#C9A84C", fontWeight: 700 }}>{mf}</td>
                          <td style={{ padding: "8px 11px" }}>
                            {m.id !== user.id && <GB ch="🗑️ Delete" sm red onClick={() => setConfirmDel({ type: "member", id: m.id, name: m.name })} />}
                            {m.id === user.id && <span style={{ fontSize: 10, color: "var(--mut)" }}>You</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {members.length === 0 && <Nil icon="🧙" msg="No members yet" />}
            </div>
          </div>
        )}

      </div>

      {/* ══ MODALS ══════════════════════════════════════════════ */}

      {/* View member */}
      {viewMember && (
        <Modal title={`🧙 ${viewMember.name}`} ch={
          <div>
            <div style={{ display: "flex", gap: 18, marginBottom: 18 }}>
              <div style={{ textAlign: "center", minWidth: 120 }}>
                <Av m={viewMember} size={80} />
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: "#C9A84C", marginTop: 8 }}>{viewMember.id}</div>
                <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 3 }}>{viewMember.city}, {viewMember.country}</div>
                {viewMember.bio && <div style={{ fontSize: 11, color: "var(--sub)", fontStyle: "italic", marginTop: 7, lineHeight: 1.5 }}>"{viewMember.bio}"</div>}
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 8 }}>
                  {viewMember.instagramlink && <a href={viewMember.instagramlink.startsWith("http") ? viewMember.instagramlink : `https://${viewMember.instagramlink}`} target="_blank" rel="noreferrer" style={{ fontSize: 18 }}>📸</a>}
                  {viewMember.goodreadslink && <a href={viewMember.goodreadslink.startsWith("http") ? viewMember.goodreadslink : `https://${viewMember.goodreadslink}`} target="_blank" rel="noreferrer" style={{ fontSize: 18 }}>📗</a>}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, color: "#C9A84C", marginBottom: 10 }}>Books by {viewMember.name.split(" ")[0]}</div>
                <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                  {books.filter(b => b.memberid === viewMember.id).slice(0, 10).map(b => (
                    <div key={b.id} style={{ textAlign: "center", width: 52 }}>
                      <Cover title={b.title} author={b.author} size={42} r={5} />
                      <div style={{ fontSize: 8, color: "var(--sub)", marginTop: 3, lineHeight: 1.2, height: 18, overflow: "hidden" }}>{b.title.slice(0, 14)}</div>
                      <div style={{ fontSize: 7, padding: "1px 4px", borderRadius: 6, background: b.status === "Finished" ? "rgba(111,175,123,.15)" : b.status === "Reading" ? "rgba(107,159,212,.15)" : "rgba(255,255,255,.04)", color: b.status === "Finished" ? "#6FAF7B" : b.status === "Reading" ? "#6B9FD4" : "var(--mut)", marginTop: 1 }}>{b.status}</div>
                    </div>
                  ))}
                  {books.filter(b => b.memberid === viewMember.id).length === 0 && <Nil icon="📚" msg="No books yet" />}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                {(user?.isadmin || viewMember.id === user?.id) && viewMember.id !== user?.id && (
                  <GB ch="🗑️ Delete Member" red onClick={() => { setViewMember(null); setConfirmDel({ type: "member", id: viewMember.id, name: viewMember.name }); }} />
                )}
              </div>
              <GB ch="Close" ghost onClick={() => setViewMember(null)} />
            </div>
          </div>
        } onClose={() => setViewMember(null)} wide />
      )}

      {/* Goal modal */}
      {showGoal && (
        <Modal title="🎯 Set 2026 Reading Goal" ch={
          <div>
            <FL ch="How many books in 2026?" />
            <FI type="number" value={goalVal} onChange={e => setGoalVal(e.target.value)} min="1" max="365" placeholder="24" />
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
              {[12, 24, 36, 52, 100].map(n => <button key={n} onClick={() => setGoalVal(String(n))} style={{ padding: "5px 12px", borderRadius: 16, border: "1px solid", fontSize: 11, cursor: "pointer", fontFamily: "'Cinzel',serif", borderColor: parseInt(goalVal) === n ? "#C9A84C" : "var(--bdr)", background: parseInt(goalVal) === n ? "rgba(201,168,76,.1)" : "transparent", color: parseInt(goalVal) === n ? "#C9A84C" : "var(--sub)" }}>{n} books</button>)}
            </div>
            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
              <GB ch="Cancel" ghost onClick={() => setShowGoal(false)} />
              <GB ch="Save Goal ⚡" onClick={saveGoal} />
            </div>
          </div>
        } onClose={() => setShowGoal(false)} />
      )}

      {/* Profile edit modal */}
      {showProfEdit && (
        <Modal title="✏️ Edit My Profile" ch={
          <div>
            <div style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: 4 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
                {/* photo */}
                <div style={{ gridColumn: "1/-1", marginBottom: 12 }}>
                  <FL ch="Photo" />
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 58, height: 58, borderRadius: "50%", overflow: "hidden", border: "2px solid #C9A84C", flexShrink: 0 }}>
                      {pe.photo ? <img src={pe.photo} alt="p" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Av m={user} size={58} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input type="file" accept="image/*" onChange={e => handlePhoto(e, v => setPe(p => ({ ...p, photo: v })))} style={{ display: "none" }} id="eph" />
                      <label htmlFor="eph" style={{ display: "block", padding: "7px 12px", background: "rgba(201,168,76,.07)", border: "1px solid rgba(201,168,76,.25)", borderRadius: 8, color: "#C9A84C", fontSize: 11, cursor: "pointer", textAlign: "center", fontFamily: "'Cinzel',serif" }}>📷 Change Photo</label>
                    </div>
                  </div>
                </div>
                <div><FL ch="Name" /><FI value={pe.name || ""} onChange={e => setPe(p => ({ ...p, name: e.target.value }))} /></div>
                <div><FL ch="Phone" /><FI value={pe.phone || ""} onChange={e => setPe(p => ({ ...p, phone: e.target.value }))} /></div>
                <div><FL ch="Birthday Month" /><FS ch={MONTHS.map(m => <option key={m}>{m}</option>)} value={pe.birthdaymonth || "January"} onChange={e => setPe(p => ({ ...p, birthdaymonth: e.target.value }))} /></div>
                <div><FL ch="Birthday Date" /><FI type="number" min="1" max="31" value={pe.birthdaydate || ""} onChange={e => setPe(p => ({ ...p, birthdaydate: e.target.value }))} /></div>
                <div><FL ch="Country" /><FS ch={COUNTRIES.map(c => <option key={c}>{c}</option>)} value={pe.country || "India"} onChange={e => setPe(p => ({ ...p, country: e.target.value, state: "", city: "" }))} /></div>
                {(pe.country || "India") === "India" ? (
                  <>
                    <div><FL ch="State" /><FS ch={[<option key="" value="">— Select —</option>, ...STATES.map(s => <option key={s}>{s}</option>)]} value={pe.state || ""} onChange={e => setPe(p => ({ ...p, state: e.target.value, city: "" }))} /></div>
                    <div><FL ch="City" /><FS ch={[<option key="" value="">— Select —</option>, ...(STATE_CITIES[pe.state] || []).sort().map(c => <option key={c}>{c}</option>)]} value={pe.city || ""} onChange={e => setPe(p => ({ ...p, city: e.target.value }))} disabled={!pe.state} /></div>
                  </>
                ) : (
                  <div><FL ch="City" /><FI value={pe.city || ""} onChange={e => setPe(p => ({ ...p, city: e.target.value }))} /></div>
                )}
                <div style={{ gridColumn: "1/-1" }}><FL ch="Postal Address" /><FT value={pe.postaladdress || ""} onChange={e => setPe(p => ({ ...p, postaladdress: e.target.value }))} style={{ height: 60 }} /></div>
                <div><FL ch="Instagram" /><FI value={pe.instagramlink || ""} onChange={e => setPe(p => ({ ...p, instagramlink: e.target.value }))} /></div>
                <div><FL ch="Goodreads" /><FI value={pe.goodreadslink || ""} onChange={e => setPe(p => ({ ...p, goodreadslink: e.target.value }))} /></div>
                <div style={{ gridColumn: "1/-1" }}><FL ch="Bio" /><FT value={pe.bio || ""} onChange={e => setPe(p => ({ ...p, bio: e.target.value }))} style={{ height: 72 }} /></div>
                <div style={{ gridColumn: "1/-1" }}><FL ch="2026 Reading Goal" /><FI type="number" value={pe.yearlytarget || 12} onChange={e => setPe(p => ({ ...p, yearlytarget: e.target.value }))} /></div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
              <GB ch="🗑️ Delete My Account" red onClick={() => { setShowProfEdit(false); setConfirmDel({ type: "member", id: user.id, name: user.name }); }} />
              <div style={{ display: "flex", gap: 9 }}>
                <GB ch="Cancel" ghost onClick={() => setShowProfEdit(false)} />
                <GB ch="Save Changes ✨" onClick={saveProfile} />
              </div>
            </div>
          </div>
        } onClose={() => setShowProfEdit(false)} wide />
      )}

      {/* Add/edit book modal */}
      {showBookMod && (
        <Modal title={editBook ? "✏️ Edit Book" : "✨ Add Book"} ch={
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px", maxHeight: "58vh", overflowY: "auto", paddingRight: 4 }}>
              <div style={{ gridColumn: "1/-1" }}><FL ch="Book Title *" /><FI value={bf.title} onChange={e => setBf(b => ({ ...b, title: e.target.value }))} placeholder="The God of Small Things" /></div>
              <div><FL ch="Author" /><FI value={bf.author} onChange={e => setBf(b => ({ ...b, author: e.target.value }))} placeholder="Arundhati Roy" /></div>
              <div><FL ch="Genre" /><FS ch={GENRES.map(g => <option key={g}>{g}</option>)} value={bf.genre} onChange={e => setBf(b => ({ ...b, genre: e.target.value }))} /></div>
              <div><FL ch="Original Language" /><FS ch={LANGS.map(l => <option key={l}>{l}</option>)} value={bf.origLang} onChange={e => setBf(b => ({ ...b, origLang: e.target.value }))} /></div>
              <div><FL ch="Reading Language" /><FS ch={LANGS.map(l => <option key={l}>{l}</option>)} value={bf.readLang} onChange={e => setBf(b => ({ ...b, readLang: e.target.value }))} /></div>
              <div><FL ch="Start Date" /><FI type="date" value={bf.startDate} onChange={e => setBf(b => ({ ...b, startDate: e.target.value, startMonth: e.target.value ? MONTHS[new Date(e.target.value).getMonth()] : "" }))} /></div>
              <div><FL ch="End Date" /><FI type="date" value={bf.endDate} onChange={e => setBf(b => ({ ...b, endDate: e.target.value, endMonth: e.target.value ? MONTHS[new Date(e.target.value).getMonth()] : "" }))} /></div>
              <div><FL ch="Total Pages" /><FI type="number" value={bf.totalPages} onChange={e => setBf(b => ({ ...b, totalPages: e.target.value }))} placeholder="320" /></div>
              <div><FL ch="Pages Read" /><FI type="number" value={bf.finishedPages} onChange={e => setBf(b => ({ ...b, finishedPages: e.target.value }))} placeholder="0" /></div>
              <div><FL ch="Status" /><FS ch={["Not Started", "Reading", "Finished"].map(s => <option key={s}>{s}</option>)} value={bf.status} onChange={e => setBf(b => ({ ...b, status: e.target.value }))} /></div>
              <div><FL ch="Rating" /><div style={{ marginTop: 8 }}><Stars v={bf.rating} onChange={v => setBf(b => ({ ...b, rating: v }))} sz={22} /></div></div>
              <div style={{ gridColumn: "1/-1" }}><FL ch="Review / Notes" /><FT value={bf.review} onChange={e => setBf(b => ({ ...b, review: e.target.value }))} placeholder="Your thoughts..." /></div>
              {bf.title && (
                <div style={{ gridColumn: "1/-1", display: "flex", gap: 11, alignItems: "center", padding: 11, background: "var(--card2)", borderRadius: 9, border: "1px solid var(--bdr)" }}>
                  <Cover title={bf.title} author={bf.author} size={46} r={6} />
                  <div><div style={{ fontFamily: "'Cinzel',serif", fontSize: 13 }}>{bf.title}</div><div style={{ fontSize: 11, color: "var(--sub)", marginTop: 2 }}>{bf.author}</div></div>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", marginTop: 16 }}>
              <GB ch="Cancel" ghost onClick={() => { setShowBookMod(false); setEditBook(null); }} />
              <GB ch={saving ? "Saving... 🌀" : editBook ? "Save Changes ✨" : "Add to Shelf ⚡"} onClick={saveBook} style={{ opacity: saving ? .7 : 1, cursor: saving ? "not-allowed" : "pointer" }} />
            </div>
          </div>
        } onClose={() => { setShowBookMod(false); setEditBook(null); }} wide />
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <Confirm
          msg={`Are you sure you want to delete "${confirmDel.name}"?${confirmDel.type === "member" ? " This will also delete all their books and cannot be undone." : ""}`}
          onYes={doDelete}
          onNo={() => setConfirmDel(null)}
        />
      )}

      {/* Toast notification */}
      {toast.msg && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: toast.type === "success" ? "rgba(26,58,26,.97)" : "rgba(58,26,26,.97)", border: `1px solid ${toast.type === "success" ? "#6FAF7B" : "#E07070"}`, borderRadius: 12, padding: "12px 24px", zIndex: 9999, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 32px rgba(0,0,0,.6)", fontFamily: "'Cinzel',serif", fontSize: 13, color: toast.type === "success" ? "#6FAF7B" : "#E07070", whiteSpace: "nowrap", animation: "fiu .3s ease" }}>
          <span>{toast.type === "success" ? "✅" : "❌"}</span>{toast.msg}
        </div>
      )}
    </div>
  );
}