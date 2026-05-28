import { useState, useEffect, useCallback, useRef } from "react";

// ─── SUPABASE CONFIG ───────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TABLE = "fitness_tracker";
const ROW_ID = "anton";

async function dbLoad() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${ROW_ID}&select=blob`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  if (!rows.length) return null;
  try { return JSON.parse(rows[0].blob); } catch { return null; }
}

async function dbSave(data) {
  const blob = JSON.stringify(data);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ id: ROW_ID, blob }),
  });
  return res.ok;
}

// ─── DATE UTILS ────────────────────────────────────────────────────────────────
function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function todayStr() { return toDateStr(new Date()); }
function yesterdayStr() { const d = new Date(); d.setDate(d.getDate() - 1); return toDateStr(d); }
function parseDateStr(str) { const [y, m, d] = str.split("-").map(Number); return new Date(y, m - 1, d); }

function formatDateLabel(dateStr) {
  if (dateStr === todayStr()) return "Today";
  if (dateStr === yesterdayStr()) return "Yesterday";
  return parseDateStr(dateStr).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
function formatDateFull(dateStr) {
  return parseDateStr(dateStr).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
function fmt(n) { return Number(n).toLocaleString(); }

// ─── MACRO CALC ────────────────────────────────────────────────────────────────
function calcTargets(weight, bf, goalPct, activity, height) {
  if (!weight || !bf) return null;
  const lean = weight * (1 - bf / 100);
  const bmr = 370 + 21.6 * lean;
  const tdee = bmr * activity;
  const targetCal = Math.round(tdee * (1 + goalPct / 100));
  const targetProt = Math.round(lean * 2.2);
  return { targetCal, targetProt, lean: Math.round(lean * 10) / 10, tdee: Math.round(tdee) };
}

// ─── THEME ─────────────────────────────────────────────────────────────────────
const C = {
  bg: "#f5f0e8", card: "#ede7d9", accent: "#c47c2b",
  text: "#2c2417", muted: "#8a7560", border: "#d4c4a8",
  progress: "#4caf50", progressBg: "#d4c4a8",
  green: "#4caf50", red: "#e53935",
};

const S = {
  app: { fontFamily: "'Georgia', serif", background: C.bg, minHeight: "100vh", color: C.text, width: "100%", maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", textAlign: "left" },
  header: { padding: "16px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 28, fontWeight: "bold", margin: 0, letterSpacing: -0.5, color: C.text, fontFamily: "'Georgia', serif" },
  subtitle: { fontSize: 13, color: C.muted, marginTop: 2 },
  headerRight: { background: C.card, borderRadius: 12, padding: "10px 14px", textAlign: "right", minWidth: 80, border: `1px solid ${C.border}` },
  headerNum: { fontSize: 26, fontWeight: "bold", color: C.accent, lineHeight: 1, display: "block" },
  headerLabel: { fontSize: 11, color: C.muted, display: "block" },
  tabs: { display: "flex", padding: "12px 20px 0", borderBottom: `1px solid ${C.border}`, marginTop: 12 },
  tab: { fontSize: 14, padding: "0 0 10px", cursor: "pointer", border: "none", background: "none", color: C.muted, borderBottom: "2px solid transparent", fontFamily: "'Georgia', serif", whiteSpace: "nowrap", flex: 1, textAlign: "center" },
  tabActive: { color: C.text, borderBottom: `2px solid ${C.accent}`, fontWeight: "600" },
  body: { flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px 20px 32px" },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.2, color: C.muted, fontWeight: "600", marginBottom: 10, fontFamily: "system-ui, sans-serif" },
  card: { background: C.card, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}`, marginBottom: 10 },
  input: { width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 16, fontFamily: "'Georgia', serif", color: C.text, boxSizing: "border-box", outline: "none" },
  inputRow: { display: "flex", gap: 10 },
  inputHalf: { flex: 1 },
  label: { fontSize: 13, color: C.muted, marginBottom: 4, display: "block" },
  btn: { background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "14px 20px", fontSize: 15, fontFamily: "'Georgia', serif", cursor: "pointer", fontWeight: "600", width: "100%" },
  btnSmall: { background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px 18px", fontSize: 15, fontFamily: "'Georgia', serif", cursor: "pointer", fontWeight: "600", whiteSpace: "nowrap" },
  btnOutline: { background: "transparent", color: C.accent, border: `1px solid ${C.accent}`, borderRadius: 10, padding: "10px 16px", fontSize: 13, fontFamily: "'Georgia', serif", cursor: "pointer", fontWeight: "600" },
  btnOutlineSmall: { background: "transparent", color: C.accent, border: `1px solid ${C.accent}`, borderRadius: 10, padding: "12px 18px", fontSize: 15, fontFamily: "'Georgia', serif", cursor: "pointer", fontWeight: "600", whiteSpace: "nowrap" },
  hint: { fontSize: 12, color: C.muted, marginTop: 6 },
  progressBar: { height: 8, borderRadius: 4, background: C.progressBg, marginTop: 6, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4, background: C.progress, transition: "width 0.3s" },
  statRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 },
  statLabel: { fontSize: 15 },
  statVal: { fontSize: 15, fontWeight: "bold" },
  statTarget: { fontSize: 15, color: C.muted },
  avgGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 },
  avgCard: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", textAlign: "center" },
  avgNum: { fontSize: 18, fontWeight: "bold", color: C.accent, display: "block" },
  avgLabel: { fontSize: 11, color: C.muted, marginTop: 1, display: "block" },
  mealItem: { padding: "6px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  mealName: { fontSize: 15, fontWeight: "600", color: C.text },
  mealKcal: { fontSize: 13, fontWeight: "bold", color: C.accent, display: "block", textAlign: "right" },
  mealProt: { fontSize: 13, color: C.muted, display: "block", textAlign: "right" },
  targetGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  targetCard: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px" },
  targetNum: { fontSize: 28, fontWeight: "bold", color: C.accent, lineHeight: 1 },
  targetLabel: { fontSize: 13, color: C.text, marginTop: 4 },
  targetSub: { fontSize: 11, color: C.muted },
  select: { width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 16, fontFamily: "'Georgia', serif", color: C.text, boxSizing: "border-box", outline: "none", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238a7560' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" },
  footer: { textAlign: "center", padding: "12px 20px", fontSize: 11, color: C.muted, borderTop: `1px solid ${C.border}` },
  dateInput: { width: "100%", maxWidth: "100%", minWidth: 0, WebkitAppearance: "none", appearance: "none", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 16, fontFamily: "'Georgia', serif", color: C.text, boxSizing: "border-box", outline: "none" },
};

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const ACTIVITY_OPTIONS = [
  { label: "Sedentary (×1.2)", value: 1.2 },
  { label: "Lightly active (×1.375)", value: 1.375 },
  { label: "Moderately active (×1.55)", value: 1.55 },
  { label: "Very active (×1.725)", value: 1.725 },
  { label: "Extra active (×1.9)", value: 1.9 },
];

const MUSCLE_GROUP_OPTIONS = [
  "Calves", "Cardio", "Chest", "Core", "Back",
  "Biceps", "Forearms", "Glutes", "Hamstrings",
  "Lats", "Quads", "Shoulders", "Traps", "Triceps"
];

// ─── GYM SLOT HELPERS ─────────────────────────────────────────────────────────
function emptySlot() { return { exercise: "", muscles: [], reps: "", weight: "", notes: "", showNew: false, newName: "" }; }

// ─── MUSCLE GROUP PICKER ───────────────────────────────────────────────────────
function MuscleGroupPicker({ selected, onChange, allGroups }) {
  const [showNew, setShowNew] = useState(false);
  const [newVal, setNewVal] = useState("");
  const allOptions = [...new Set([...MUSCLE_GROUP_OPTIONS, ...allGroups])].sort();

  function toggle(g) {
    if (selected.includes(g)) onChange(selected.filter(x => x !== g));
    else onChange([...selected, g]);
  }
  function addNew() {
    const v = newVal.trim();
    if (!v) return;
    onChange([...selected, v]);
    setNewVal("");
    setShowNew(false);
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
        {allOptions.map(g => (
          <button key={g} onClick={() => toggle(g)} style={{
            padding: "5px 10px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontFamily: "'Georgia', serif",
            background: selected.includes(g) ? C.accent : C.bg,
            color: selected.includes(g) ? "#fff" : C.muted,
            border: `1px solid ${selected.includes(g) ? C.accent : C.border}`,
            transition: "all 0.15s"
          }}>{g}</button>
        ))}
        <button onClick={() => setShowNew(!showNew)} style={{
          padding: "5px 10px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontFamily: "'Georgia', serif",
          background: "transparent", color: C.accent, border: `1px dashed ${C.accent}`
        }}>+ New</button>
      </div>
      {showNew && (
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <input style={{ ...S.input, flex: 1 }} placeholder="New muscle group..." value={newVal}
            onChange={e => setNewVal(e.target.value)} onKeyDown={e => e.key === "Enter" && addNew()} autoFocus />
          <button style={S.btnSmall} onClick={addNew}>Add</button>
        </div>
      )}
      {selected.length > 0 && (
        <div style={{ fontSize: 12, color: C.accent, marginTop: 4 }}>
          Selected: {selected.join(", ")}
        </div>
      )}
    </div>
  );
}

// ─── PROGRESS CHART ────────────────────────────────────────────────────────────
function ProgressChart({ weightLog, mealLog, gymLog }) {
  const entries = Object.entries(weightLog).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
  if (entries.length < 1) {
    return <div style={{ ...S.card, textAlign: "center", color: C.muted, padding: 40 }}>Log weight entries to see progress</div>;
  }
  const weights = entries.map(([, v]) => v.weight);
  const leans = entries.map(([, v]) => v.weight * (1 - v.bf / 100));
  const minW = Math.min(...weights, ...leans) * 0.97;
  const maxW = Math.max(...weights, ...leans) * 1.02;
  const deficitData = entries.map(([date, v]) => {
    const t = calcTargets(v.weight, v.bf, v.goalPct, v.activity, v.height);
    if (!t) return null;
    const meals = mealLog[date] || [];
    const actual = meals.reduce((s, m) => s + m.cal, 0);
    if (!actual) return null;
    const pct = Math.round(((actual - t.targetCal) / t.targetCal) * 100);
    const goalDir = v.goalPct < 0 ? "deficit" : v.goalPct > 0 ? "surplus" : "maintain";
    let color;
    if (goalDir === "maintain") color = Math.abs(pct) <= 5 ? C.green : C.red;
    else if (goalDir === "deficit") color = pct <= 0 ? C.green : C.red;
    else color = pct >= 0 ? C.green : C.red;
    return { pct, color };
  });
  const allPcts = deficitData.filter(Boolean).map(d => Math.abs(d.pct));
  const maxPct = allPcts.length ? Math.max(...allPcts, 20) : 20;
  const W = 370, H = 230, PAD = { t: 20, r: 55, b: 40, l: 45 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;
  const n = entries.length;
  const minDate = parseDateStr(entries[0][0]);
  const maxDate = parseDateStr(entries[n - 1][0]);
  const totalMs = Math.max(maxDate - minDate, 1);
  const xFromDate = (dateStr) => PAD.l + ((parseDateStr(dateStr) - minDate) / totalMs) * chartW;
  const totalDays = totalMs / (1000 * 60 * 60 * 24);
  const yScaleW = (v) => PAD.t + chartH - ((v - minW) / (maxW - minW)) * chartH;
  const yScalePct = (v) => PAD.t + chartH / 2 - (v / maxPct) * (chartH / 2);
  const weightPath = entries.map(([date], i) => `${i === 0 ? "M" : "L"}${xFromDate(date)},${yScaleW(weights[i])}`).join(" ");
  const leanPath = entries.map(([date], i) => `${i === 0 ? "M" : "L"}${xFromDate(date)},${yScaleW(leans[i])}`).join(" ");
  const wLabels = [minW, (minW + maxW) / 2, maxW].map(v => Math.round(v * 10) / 10);
  const pctLabels = [-maxPct, 0, maxPct];
  const zeroY = yScalePct(0);
  const barW = Math.max(4, Math.min((chartW / totalDays) * 0.6, chartW / Math.max(n, 1)));
  const dateLabels = [];
  if (n > 0) dateLabels.push({ date: entries[0][0], label: formatDateFull(entries[0][0]), anchor: "start" });
  if (n > 1) dateLabels.push({ date: entries[n - 1][0], label: formatDateFull(entries[n - 1][0]), anchor: "end" });

  return (
    <div>
      <div style={{ fontSize: 11, letterSpacing: 1.2, color: C.muted, fontWeight: 600, marginBottom: 10, fontFamily: "system-ui" }}>LAST 14 DAYS</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", overflow: "visible" }}>
        {wLabels.map((v, i) => (
          <g key={`wl${i}`}>
            <line x1={PAD.l} x2={W - PAD.r} y1={yScaleW(v)} y2={yScaleW(v)} stroke={C.border} strokeDasharray="3,3" strokeWidth={1} />
            <text x={PAD.l - 4} y={yScaleW(v) + 4} textAnchor="end" fontSize={9} fill={C.muted}>{v}</text>
          </g>
        ))}
        {pctLabels.map((v, i) => (
          <text key={`pl${i}`} x={W - PAD.r + 4} y={yScalePct(v) + 4} textAnchor="start" fontSize={9} fill={C.muted}>{v > 0 ? `+${v}%` : `${v}%`}</text>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={zeroY} y2={zeroY} stroke={C.muted} strokeDasharray="2,4" strokeWidth={1} opacity={0.4} />
        {deficitData.map((d, i) => {
          if (!d) return null;
          const x = xFromDate(entries[i][0]) - barW / 2;
          const barH = Math.abs(yScalePct(d.pct) - zeroY);
          const y = d.pct >= 0 ? zeroY - barH : zeroY;
          return <rect key={`bar${i}`} x={x} y={y} width={barW} height={Math.max(barH, 1)} fill={d.color} opacity={0.75} rx={2} />;
        })}
        <path d={leanPath} fill="none" stroke={C.green} strokeWidth={2} strokeDasharray="5,4" />
        {leans.map((l, i) => <circle key={`ln${i}`} cx={xFromDate(entries[i][0])} cy={yScaleW(l)} r={3} fill={C.green} />)}
        <path d={weightPath} fill="none" stroke={C.accent} strokeWidth={2.5} />
        {weights.map((w, i) => <circle key={`wt${i}`} cx={xFromDate(entries[i][0])} cy={yScaleW(w)} r={4} fill={C.accent} />)}
        {entries.map(([date]) => {
          const hasGym = gymLog[date] && gymLog[date].exercises && gymLog[date].exercises.length > 0;
          if (!hasGym) return null;
          return <text key={`gym${date}`} x={xFromDate(date)} y={PAD.t - 6} textAnchor="middle" fontSize={10} fill={C.accent}>★</text>;
        })}
        {dateLabels.map(({ date, label, anchor }) => (
          <text key={`dl${date}`} x={xFromDate(date)} y={H - 4} textAnchor={anchor} fontSize={9} fill={C.muted}>{label}</text>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
        {[
          { color: C.accent, label: "Weight", dash: false, bar: false },
          { color: C.green, label: "Lean Mass", dash: true, bar: false },
          { color: C.green, label: "On-target", dash: false, bar: true },
          { color: C.red, label: "Off-target", dash: false, bar: true },
          { color: C.accent, label: "Gym day", star: true },
        ].map(({ color, label, dash, bar, star }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}>
            {star ? <span style={{ color: C.accent, fontSize: 13 }}>★</span>
              : bar ? <div style={{ width: 10, height: 12, background: color, borderRadius: 2, opacity: 0.8 }} />
              : <svg width={22} height={10}><line x1={0} y1={5} x2={22} y2={5} stroke={color} strokeWidth={2} strokeDasharray={dash ? "4,3" : "none"} /></svg>}
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function FitnessTracker() {
  const [tab, setTab] = useState("weight");
  const [activeDate, setActiveDate] = useState(todayStr());
  const [mealLog, setMealLog] = useState({});
  const [weightLog, setWeightLog] = useState({});
  const [gymLog, setGymLog] = useState({});
  const [mealInput, setMealInput] = useState("");
  const [form, setForm] = useState({ weight: "", bf: "", goalPct: "-18", activity: 1.55, height: "177" });
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState(""); // "", "saving", "saved", "error"
  const [uploadMsg, setUploadMsg] = useState("");
  const fileInputRef = useRef(null);
  const saveTimerRef = useRef(null);

  const [gymSessionActive, setGymSessionActive] = useState(false);
  const [gymSlots, setGymSlots] = useState([emptySlot()]);

  // ── Load from Supabase on mount ──
  useEffect(() => {
    (async () => {
      const data = await dbLoad();
      if (data) {
        if (data.mealLog) setMealLog(data.mealLog);
        if (data.gymLog) setGymLog(data.gymLog);
        if (data.weightLog) {
          setWeightLog(data.weightLog);
          const dates = Object.keys(data.weightLog).sort();
          if (dates.length) {
            const last = data.weightLog[dates[dates.length - 1]];
            setForm({ weight: String(last.weight), bf: String(last.bf), goalPct: String(last.goalPct), activity: last.activity, height: String(last.height) });
          }
        }
      }
      setLoaded(true);
    })();
  }, []);

  // ── When activeDate changes, pre-fill form from that date or nearest prior ──
  useEffect(() => {
    if (!loaded) return;
    const entry = weightLog[activeDate];
    if (entry) {
      setForm({ weight: String(entry.weight), bf: String(entry.bf), goalPct: String(entry.goalPct), activity: entry.activity, height: String(entry.height) });
    } else {
      const prior = Object.keys(weightLog).filter(d => d <= activeDate).sort();
      if (prior.length) {
        const last = weightLog[prior[prior.length - 1]];
        setForm(f => ({ ...f, weight: String(last.weight), bf: String(last.bf), goalPct: String(last.goalPct), activity: last.activity, height: String(last.height) }));
      }
    }
  }, [activeDate, loaded]);

  // ── Debounced save to Supabase ──
  const scheduleSave = useCallback((ml, wl, gl) => {
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const ok = await dbSave({ mealLog: ml, weightLog: wl, gymLog: gl });
      setSaveStatus(ok ? "saved" : "error");
      setTimeout(() => setSaveStatus(""), 2000);
    }, 800);
  }, []);

  const saveMealLog = useCallback((log) => {
    setMealLog(log);
    scheduleSave(log, weightLog, gymLog);
  }, [weightLog, gymLog, scheduleSave]);

  const saveWeightLog = useCallback((log) => {
    setWeightLog(log);
    scheduleSave(mealLog, log, gymLog);
  }, [mealLog, gymLog, scheduleSave]);

  const saveGymLog = useCallback((log) => {
    setGymLog(log);
    scheduleSave(mealLog, weightLog, log);
  }, [mealLog, weightLog, scheduleSave]);

  // ── Derived state ──
  const activeDateEntry = (() => {
    const prior = Object.keys(weightLog).filter(d => d <= activeDate).sort();
    return prior.length ? weightLog[prior[prior.length - 1]] : null;
  })();

  const targets = activeDateEntry ? calcTargets(activeDateEntry.weight, activeDateEntry.bf, activeDateEntry.goalPct, activeDateEntry.activity, activeDateEntry.height) : null;
  const activeMeals = mealLog[activeDate] || [];
  const activeCal = activeMeals.reduce((s, m) => s + m.cal, 0);
  const activeProt = activeMeals.reduce((s, m) => s + m.prot, 0);
  const activeGym = gymLog[activeDate] || { exercises: [] };

  const latestWeightEntry = (() => {
    const dates = Object.keys(weightLog).sort();
    return dates.length ? weightLog[dates[dates.length - 1]] : null;
  })();

  const allExercises = [...new Set(
    Object.values(gymLog).flatMap(day => (day.exercises || []).map(e => e.name))
  )].sort();

  const allHistoricMuscleGroups = [...new Set(
    Object.values(gymLog).flatMap(day => (day.exercises || []).flatMap(e => e.muscleGroups || []))
  )].sort();

  function getLastSetForExercise(exerciseName, currentGymLog) {
    const allDates = Object.keys(currentGymLog).sort().reverse();
    for (const date of allDates) {
      const exercises = currentGymLog[date]?.exercises || [];
      const ex = exercises.find(e => e.name === exerciseName);
      if (ex && ex.sets && ex.sets.length > 0) return ex.sets[ex.sets.length - 1];
    }
    return null;
  }

  function addMeal() {
    const parts = mealInput.split(",").map(s => s.trim());
    if (parts.length < 3) return;
    const [name, calStr, protStr] = parts;
    const cal = parseInt(calStr), prot = parseInt(protStr);
    if (!name || isNaN(cal) || isNaN(prot)) return;
    saveMealLog({ ...mealLog, [activeDate]: [...(mealLog[activeDate] || []), { name, cal, prot }] });
    setMealInput("");
  }

  function logMorning() {
    const weight = parseFloat(form.weight), bf = parseFloat(form.bf);
    const goalPct = parseFloat(form.goalPct), height = parseFloat(form.height);
    if (!weight || !bf) return;
    saveWeightLog({ ...weightLog, [activeDate]: { weight, bf, goalPct, activity: parseFloat(form.activity), height } });
  }

  function updateSlot(idx, updates) {
    setGymSlots(slots => slots.map((s, i) => i === idx ? { ...s, ...updates } : s));
  }

  function handleSlotExerciseChange(idx, name, currentGymLog) {
    const allEntries = Object.values(currentGymLog).flatMap(day => day.exercises || []);
    const match = allEntries.filter(e => e.name === name).pop();
    const muscles = match ? (match.muscleGroups || []) : [];
    const lastSet = getLastSetForExercise(name, currentGymLog);
    updateSlot(idx, { exercise: name, muscles, reps: lastSet ? String(lastSet.reps) : "", weight: lastSet ? String(lastSet.weight) : "", notes: "" });
  }

  function addGymSet() {
    const currentDay = gymLog[activeDate] || { exercises: [] };
    let exercises = [...(currentDay.exercises || [])];
    let anyLogged = false;
    for (const slot of gymSlots) {
      const exerciseName = slot.showNew ? slot.newName.trim() : slot.exercise;
      if (!exerciseName || !slot.reps || !slot.weight) continue;
      const reps = parseInt(slot.reps);
      const weight = parseFloat(slot.weight);
      if (isNaN(reps) || isNaN(weight)) continue;
      const newSet = { reps, weight, notes: slot.notes.trim() };
      const existingIdx = exercises.findIndex(e => e.name === exerciseName);
      if (existingIdx >= 0) {
        exercises[existingIdx] = { ...exercises[existingIdx], sets: [...exercises[existingIdx].sets, newSet] };
      } else {
        exercises.push({ name: exerciseName, muscleGroups: slot.muscles, sets: [newSet] });
      }
      anyLogged = true;
    }
    if (!anyLogged) return;
    saveGymLog({ ...gymLog, [activeDate]: { exercises } });
    setGymSlots(slots => slots.map(slot => {
      const resolvedName = slot.showNew ? slot.newName.trim() : slot.exercise;
      return { ...slot, exercise: resolvedName || slot.exercise, showNew: false, newName: "", notes: "" };
    }));
  }

  // ── Upload JSON backup ──
  function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.mealLog || !data.weightLog) throw new Error("Invalid format");
        const ml = data.mealLog;
        const wl = data.weightLog;
        const gl = data.gymLog || {};
        setMealLog(ml); setWeightLog(wl); setGymLog(gl);
        const dates = Object.keys(wl).sort();
        if (dates.length) {
          const last = wl[dates[dates.length - 1]];
          setForm({ weight: String(last.weight), bf: String(last.bf), goalPct: String(last.goalPct), activity: last.activity, height: String(last.height) });
        }
        scheduleSave(ml, wl, gl);
        setUploadMsg("Data restored successfully.");
      } catch { setUploadMsg("Upload failed — invalid file."); }
      setTimeout(() => setUploadMsg(""), 3000);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ── Download JSON backup ──
  function handleDownload() {
    const data = { mealLog, weightLog, gymLog };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = todayStr().replace(/-/g, "").slice(2); // YYMMDD
    a.href = url;
    a.download = `fitness-backup-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Rolling averages ──
  const rollingAvg = (() => {
    const days = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(parseDateStr(activeDate)); d.setDate(d.getDate() - i);
      const ds = toDateStr(d);
      if (mealLog[ds]) days.push(ds);
    }
    if (days.length < 7) return null;
    const avgCal = Math.round(days.reduce((s, d) => s + (mealLog[d] || []).reduce((a, m) => a + m.cal, 0), 0) / 7);
    const avgProt = Math.round(days.reduce((s, d) => s + (mealLog[d] || []).reduce((a, m) => a + m.prot, 0), 0) / 7);
    const ts = days.map(d => {
      const prior = Object.keys(weightLog).filter(x => x <= d).sort();
      if (!prior.length) return null;
      const e = weightLog[prior[prior.length - 1]];
      return calcTargets(e.weight, e.bf, e.goalPct, e.activity, e.height)?.targetCal;
    }).filter(Boolean);
    const avgTarget = ts.length ? Math.round(ts.reduce((a, b) => a + b, 0) / ts.length) : null;
    return { avgCal, avgProt, avgTarget };
  })();

  const weekToDate = (() => {
    const ref = parseDateStr(activeDate);
    const dow = ref.getDay();
    const mondayOffset = dow === 0 ? 6 : dow - 1;
    const monday = new Date(ref); monday.setDate(ref.getDate() - mondayOffset);
    const days = [];
    const cursor = new Date(monday);
    while (cursor < ref) {
      const ds = toDateStr(cursor);
      if (mealLog[ds]) days.push(ds);
      cursor.setDate(cursor.getDate() + 1);
    }
    if (!days.length) return null;
    const avgCal = Math.round(days.reduce((s, d) => s + (mealLog[d] || []).reduce((a, m) => a + m.cal, 0), 0) / days.length);
    const avgProt = Math.round(days.reduce((s, d) => s + (mealLog[d] || []).reduce((a, m) => a + m.prot, 0), 0) / days.length);
    const ts = days.map(d => {
      const prior = Object.keys(weightLog).filter(x => x <= d).sort();
      if (!prior.length) return null;
      const e = weightLog[prior[prior.length - 1]];
      return calcTargets(e.weight, e.bf, e.goalPct, e.activity, e.height)?.targetCal;
    }).filter(Boolean);
    const avgTarget = ts.length ? Math.round(ts.reduce((a, b) => a + b, 0) / ts.length) : null;
    return { avgCal, avgProt, avgTarget, days: days.length };
  })();

  const dateLabel = formatDateLabel(activeDate);
  const isToday = activeDate === todayStr();
  const allDays = [...new Set([...Object.keys(mealLog), ...Object.keys(weightLog), ...Object.keys(gymLog)])].sort((a, b) => b.localeCompare(a));

  if (!loaded) {
    return (
      <div style={{ ...S.app, justifyContent: "center", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 16, color: C.muted }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={S.app}>
      {/* ── Header ── */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Fitness Tracker</h1>
          <div style={S.subtitle}>
            {latestWeightEntry
              ? `${latestWeightEntry.weight} kg · ${latestWeightEntry.bf}% BF · ${latestWeightEntry.goalPct > 0 ? "+" : ""}${latestWeightEntry.goalPct}% goal`
              : "Log morning stats to begin"}
          </div>
          {saveStatus && (
            <div style={{ fontSize: 11, color: saveStatus === "error" ? C.red : C.muted, marginTop: 2 }}>
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : "Save failed"}
            </div>
          )}
        </div>
        <div style={S.headerRight}>
          <span style={S.headerNum}>{fmt(activeCal)}</span>
          <span style={S.headerLabel}>Kcal {dateLabel}</span>
          <span style={{ ...S.headerNum, marginTop: 6 }}>{fmt(activeProt)}g</span>
          <span style={S.headerLabel}>Protein</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={S.tabs}>
        {["weight", "meals", "gym", "progress", "log"].map(t => (
          <button key={t} style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div style={S.body}>
        {/* ── Weight Tab ── */}
        {tab === "weight" && (
          <>
            <div style={S.section}>
              <div style={S.sectionLabel}>MORNING CHECK-IN</div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Date{activeDate === todayStr() ? " (Today)" : activeDate === yesterdayStr() ? " (Yesterday)" : ""}</label>
                <input type="date" style={S.dateInput} value={activeDate} max={todayStr()} onChange={e => e.target.value && setActiveDate(e.target.value)} />
              </div>
              <div style={S.inputRow}>
                <div style={S.inputHalf}>
                  <label style={S.label}>Weight</label>
                  <div style={{ position: "relative" }}>
                    <input style={{ ...S.input, paddingRight: 36 }} type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} placeholder="77.6" />
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 13 }}>kg</span>
                  </div>
                </div>
                <div style={S.inputHalf}>
                  <label style={S.label}>Body Fat</label>
                  <div style={{ position: "relative" }}>
                    <input style={{ ...S.input, paddingRight: 36 }} type="number" value={form.bf} onChange={e => setForm(f => ({ ...f, bf: e.target.value }))} placeholder="13" />
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 13 }}>%</span>
                  </div>
                </div>
              </div>
              <div style={{ ...S.inputRow, marginTop: 10 }}>
                <div style={S.inputHalf}>
                  <label style={S.label}>Goal</label>
                  <div style={{ position: "relative" }}>
                    <input style={{ ...S.input, paddingRight: 36 }} type="number" value={form.goalPct} onChange={e => setForm(f => ({ ...f, goalPct: e.target.value }))} placeholder="-18" />
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 13 }}>%</span>
                  </div>
                </div>
                <div style={S.inputHalf}>
                  <label style={S.label}>Height</label>
                  <div style={{ position: "relative" }}>
                    <input style={{ ...S.input, paddingRight: 36 }} type="number" value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} placeholder="177" />
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 13 }}>cm</span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={S.label}>Activity Level</label>
                <select style={S.select} value={form.activity} onChange={e => setForm(f => ({ ...f, activity: parseFloat(e.target.value) }))}>
                  {ACTIVITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <button style={{ ...S.btn, marginTop: 16 }} onClick={logMorning}>Log {isToday ? "Morning" : dateLabel} Stats</button>
              <div style={S.hint}>Defaults to previous values · re-logging replaces previous entry</div>
            </div>
            {targets && (
              <div style={S.section}>
                <div style={S.sectionLabel}>{isToday ? "TODAY'S TARGETS" : `${dateLabel.toUpperCase()}'S TARGETS`}</div>
                <div style={S.targetGrid}>
                  <div style={S.targetCard}><div style={S.targetNum}>{fmt(targets.targetCal)}</div><div style={S.targetLabel}>Target Calories</div><div style={S.targetSub}>Kcal / Day</div></div>
                  <div style={S.targetCard}><div style={S.targetNum}>{fmt(targets.targetProt)}g</div><div style={S.targetLabel}>Target Protein</div><div style={S.targetSub}>Per Day</div></div>
                  <div style={S.targetCard}><div style={S.targetNum}>{fmt(targets.tdee)}</div><div style={S.targetLabel}>TDEE</div><div style={S.targetSub}>Kcal Maintenance</div></div>
                  <div style={S.targetCard}><div style={S.targetNum}>{targets.lean} kg</div><div style={S.targetLabel}>Lean Mass</div><div style={S.targetSub}>Current Estimate</div></div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Meals Tab ── */}
        {tab === "meals" && (
          <>
            <div style={S.section}>
              <div style={S.sectionLabel}>ADD MEAL</div>
              <div style={S.inputRow}>
                <input style={{ ...S.input, flex: 1, minWidth: 0 }} placeholder="Meal name, Calories, Protein(g)" value={mealInput}
                  onChange={e => setMealInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addMeal()} />
                <button style={S.btnSmall} onClick={addMeal}>Add</button>
              </div>
              <div style={S.hint}>e.g. Oats, 320, 12</div>
              {!isToday && <div style={{ ...S.hint, color: C.accent, marginTop: 8 }}>Logging for {dateLabel} — change date in Weight tab</div>}
            </div>
            {targets && (
              <div style={S.section}>
                <div style={S.sectionLabel}>{isToday ? "TODAY VS TARGET" : `${dateLabel.toUpperCase()} VS TARGET`}</div>
                <div style={S.card}>
                  <div style={S.statRow}>
                    <span style={S.statLabel}>Calories</span>
                    <span>
                      <span style={{ ...S.statVal, color: activeCal > targets.targetCal ? C.red : C.text }}>{fmt(activeCal)} Kcal</span>
                      <span style={S.statTarget}> / {fmt(targets.targetCal)} Kcal</span>
                    </span>
                  </div>
                  <div style={S.progressBar}>
                    <div style={{ ...S.progressFill, width: `${Math.min(100, (activeCal / targets.targetCal) * 100)}%`, background: activeCal > targets.targetCal ? C.red : C.progress }} />
                  </div>
                  <div style={{ ...S.statRow, marginTop: 12 }}>
                    <span style={S.statLabel}>Protein</span>
                    <span>
                      <span style={{ ...S.statVal, color: activeProt >= targets.targetProt ? C.accent : C.text }}>{fmt(activeProt)}g</span>
                      <span style={S.statTarget}> / {fmt(targets.targetProt)}g</span>
                    </span>
                  </div>
                  <div style={S.progressBar}>
                    <div style={{ ...S.progressFill, width: `${Math.min(100, (activeProt / targets.targetProt) * 100)}%` }} />
                  </div>
                </div>
              </div>
            )}
            <div style={S.section}>
              <div style={S.sectionLabel}>7-DAY ROLLING AVERAGE</div>
              {rollingAvg ? (
                <div style={S.avgGrid}>
                  <div style={S.avgCard}><span style={S.avgNum}>{fmt(rollingAvg.avgCal)}</span><span style={S.avgLabel}>Kcal/Day</span></div>
                  <div style={S.avgCard}><span style={S.avgNum}>{fmt(rollingAvg.avgProt)}g</span><span style={S.avgLabel}>Protein/Day</span></div>
                  {rollingAvg.avgTarget && <div style={S.avgCard}><span style={S.avgNum}>{fmt(rollingAvg.avgTarget)}</span><span style={S.avgLabel}>Kcal Target</span></div>}
                </div>
              ) : <div style={{ ...S.card, color: C.muted, fontSize: 14 }}>Appears once 7 complete days prior to today are logged.</div>}
            </div>
            <div style={S.section}>
              <div style={S.sectionLabel}>WEEK TO DATE AVERAGE</div>
              {weekToDate ? (
                <div style={S.avgGrid}>
                  <div style={S.avgCard}><span style={S.avgNum}>{fmt(weekToDate.avgCal)}</span><span style={S.avgLabel}>Kcal/Day</span></div>
                  <div style={S.avgCard}><span style={S.avgNum}>{fmt(weekToDate.avgProt)}g</span><span style={S.avgLabel}>Protein/Day</span></div>
                  {weekToDate.avgTarget && <div style={S.avgCard}><span style={S.avgNum}>{fmt(weekToDate.avgTarget)}</span><span style={S.avgLabel}>Kcal Target</span></div>}
                  <div style={{ gridColumn: "1 / -1" }}><span style={{ ...S.hint, display: "block", textAlign: "center" }}>Mon to yesterday · {weekToDate.days} day{weekToDate.days !== 1 ? "s" : ""}</span></div>
                </div>
              ) : <div style={{ ...S.card, color: C.muted, fontSize: 14 }}>Appears once meals are logged from earlier this week.</div>}
            </div>
            <div style={S.section}>
              <div style={S.sectionLabel}>{isToday ? "TODAY'S MEALS" : `${dateLabel.toUpperCase()}'S MEALS`}</div>
              {activeMeals.length === 0 ? (
                <div style={{ color: C.muted, fontSize: 14 }}>No meals logged yet.</div>
              ) : (
                <div style={S.card}>
                  {activeMeals.map((m, i) => (
                    <div key={i} style={{ ...S.mealItem, borderBottom: i < activeMeals.length - 1 ? `1px solid ${C.border}` : "none" }}>
                      <div style={S.mealName}>{m.name}</div>
                      <div>
                        <span style={S.mealKcal}>{fmt(m.cal)} Kcal</span>
                        <span style={S.mealProt}>{m.prot}g</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Gym Tab ── */}
        {tab === "gym" && (
          <>
            {!isToday && <div style={{ ...S.hint, color: C.accent, marginBottom: 12 }}>Logging for {dateLabel} — change date in Weight tab</div>}
            <div style={{ marginBottom: 20 }}>
              <button
                style={{ ...S.btn, background: gymSessionActive ? "transparent" : C.accent, color: gymSessionActive ? C.accent : "#fff", border: gymSessionActive ? `1px solid ${C.accent}` : "none" }}
                onClick={() => {
                  if (gymSessionActive) setGymSlots([emptySlot()]);
                  setGymSessionActive(a => !a);
                }}
              >
                {gymSessionActive ? "End Gym Session" : "Start Gym Session"}
              </button>
            </div>

            {gymSessionActive && (
              <div style={S.section}>
                <div style={S.sectionLabel}>LOG A SET</div>
                {gymSlots.map((slot, si) => (
                  <div key={si}>
                    {si > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 12px" }}>
                        <div style={{ flex: 1, height: 1, background: C.border }} />
                        <span style={{ fontSize: 11, color: C.muted, letterSpacing: 0.8, fontFamily: "system-ui" }}>SUPERSET {si + 1}</span>
                        <div style={{ flex: 1, height: 1, background: C.border }} />
                      </div>
                    )}
                    <div style={{ marginBottom: 10 }}>
                      <label style={S.label}>Exercise</label>
                      {!slot.showNew ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <select style={{ ...S.select, flex: 1, minWidth: 0 }} value={slot.exercise} onChange={e => handleSlotExerciseChange(si, e.target.value, gymLog)}>
                            <option value="">Select exercise...</option>
                            {allExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                          </select>
                          <button style={S.btnSmall} onClick={() => updateSlot(si, { showNew: true, exercise: "", muscles: [], reps: "", weight: "" })}>+ New</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8 }}>
                          <input style={{ ...S.input, flex: 1 }} placeholder="Exercise name..." value={slot.newName}
                            onChange={e => updateSlot(si, { newName: e.target.value })} autoFocus />
                          <button style={S.btnOutlineSmall} onClick={() => updateSlot(si, { showNew: false, newName: "" })}>Cancel</button>
                        </div>
                      )}
                    </div>
                    {(slot.exercise || slot.showNew) && (
                      <div style={{ marginBottom: 10 }}>
                        <label style={S.label}>Muscle Groups</label>
                        <MuscleGroupPicker selected={slot.muscles} onChange={muscles => updateSlot(si, { muscles })} allGroups={allHistoricMuscleGroups} />
                      </div>
                    )}
                    <div style={{ ...S.inputRow, marginBottom: 10 }}>
                      <div style={S.inputHalf}>
                        <label style={S.label}>Reps</label>
                        <input style={S.input} type="number" placeholder="8" value={slot.reps}
                          onChange={e => updateSlot(si, { reps: e.target.value })} onKeyDown={e => e.key === "Enter" && addGymSet()} />
                      </div>
                      <div style={S.inputHalf}>
                        <label style={S.label}>Weight</label>
                        <div style={{ position: "relative" }}>
                          <input style={{ ...S.input, paddingRight: 36 }} type="number" placeholder="80" value={slot.weight}
                            onChange={e => updateSlot(si, { weight: e.target.value })} onKeyDown={e => e.key === "Enter" && addGymSet()} />
                          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 13 }}>kg</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ marginBottom: si === gymSlots.length - 1 ? 10 : 0 }}>
                      <label style={S.label}>Notes <span style={{ color: C.muted, fontWeight: "normal" }}>(optional)</span></label>
                      <input style={S.input} placeholder="e.g. hard, focus on form..." value={slot.notes}
                        onChange={e => updateSlot(si, { notes: e.target.value })} onKeyDown={e => e.key === "Enter" && addGymSet()} />
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
                  {gymSlots.length < 3 && (
                    <button onClick={() => setGymSlots(slots => [...slots, emptySlot()])} style={{
                      flex: 1, padding: "10px 14px", borderRadius: 10, fontSize: 13, cursor: "pointer",
                      fontFamily: "'Georgia', serif", background: "transparent", color: C.accent,
                      border: `1px dashed ${C.accent}`
                    }}>+ Add superset</button>
                  )}
                  {gymSlots.length > 1 && (
                    <button onClick={() => setGymSlots(slots => slots.slice(0, -1))} style={{
                      flex: 1, padding: "10px 14px", borderRadius: 10, fontSize: 13, cursor: "pointer",
                      fontFamily: "'Georgia', serif", background: "transparent", color: C.muted,
                      border: `1px dashed ${C.border}`
                    }}>− Remove superset</button>
                  )}
                </div>
                <button style={S.btn} onClick={addGymSet}>Log Set</button>
              </div>
            )}

            <div style={S.section}>
              <div style={S.sectionLabel}>{isToday ? "TODAY'S SESSION" : `${dateLabel.toUpperCase()}'S SESSION`}</div>
              {activeGym.exercises.length === 0 ? (
                <div style={{ color: C.muted, fontSize: 14 }}>No sets logged yet.</div>
              ) : activeGym.exercises.map((ex, ei) => (
                <div key={ei} style={{ ...S.card, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <div style={{ fontSize: 16, fontWeight: "bold" }}>{ex.name}</div>
                    {ex.muscleGroups?.length > 0 && <div style={{ fontSize: 11, color: C.muted }}>{ex.muscleGroups.join(", ")}</div>}
                  </div>
                  {ex.sets.map((set, si) => (
                    <div key={si} style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "5px 0", borderTop: si > 0 ? `1px solid ${C.border}` : "none" }}>
                      <span style={{ fontSize: 12, color: C.muted, minWidth: 36 }}>Set {si + 1}</span>
                      <span style={{ fontSize: 14, fontWeight: "bold", color: C.accent }}>{set.weight}kg</span>
                      <span style={{ fontSize: 14 }}>× {set.reps}</span>
                      {set.notes && <span style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>{set.notes}</span>}
                    </div>
                  ))}
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
                    {ex.sets.length} set{ex.sets.length !== 1 ? "s" : ""} · {ex.sets.reduce((s, set) => s + set.reps, 0)} total reps
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Progress Tab ── */}
        {tab === "progress" && (
          <div style={S.section}>
            <ProgressChart weightLog={weightLog} mealLog={mealLog} gymLog={gymLog} />
          </div>
        )}

        {/* ── Log Tab ── */}
        {tab === "log" && (
          <>
            <div style={S.section}>
              <div style={S.sectionLabel}>DATA</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={{ ...S.btnOutline, flex: 1 }} onClick={() => fileInputRef.current?.click()}>⬆ Upload</button>
                <input ref={fileInputRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleUpload} />
                <button style={{ ...S.btnOutline, flex: 1 }} onClick={handleDownload}>⬇ Download</button>
              </div>
              {uploadMsg && <div style={{ ...S.hint, color: uploadMsg.includes("success") ? C.green : C.red, marginTop: 8 }}>{uploadMsg}</div>}
            </div>
            {allDays.length === 0 ? (
              <div style={{ color: C.muted, fontSize: 14 }}>No data logged yet.</div>
            ) : allDays.slice(0, 30).map(date => {
              const meals = mealLog[date] || [];
              const wEntry = weightLog[date];
              const gymEntry = gymLog[date];
              const dayKcal = meals.reduce((s, m) => s + m.cal, 0);
              const dayProt = meals.reduce((s, m) => s + m.prot, 0);
              const t = wEntry ? calcTargets(wEntry.weight, wEntry.bf, wEntry.goalPct, wEntry.activity, wEntry.height) : null;
              const hasGym = gymEntry && gymEntry.exercises && gymEntry.exercises.length > 0;
              return (
                <div key={date} style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingBottom: 4 }}>
                    <div style={{ fontSize: 16, fontWeight: "bold" }}>
                      {hasGym && <span style={{ color: C.accent, marginRight: 6 }}>★</span>}
                      {formatDateFull(date)}
                    </div>
                    {meals.length > 0 && <div style={{ fontSize: 13, color: C.muted }}>{fmt(dayKcal)} Kcal · {dayProt}g</div>}
                  </div>
                  <div style={{ height: 3, background: C.accent, borderRadius: 2, marginBottom: 10 }} />
                  <div style={S.card}>
                    {wEntry && (
                      <div style={{ paddingBottom: (meals.length || hasGym) ? 10 : 0, marginBottom: (meals.length || hasGym) ? 10 : 0, borderBottom: (meals.length || hasGym) ? `1px solid ${C.border}` : "none" }}>
                        <div style={{ fontSize: 11, letterSpacing: 1, color: C.muted, fontWeight: 600, marginBottom: 6, fontFamily: "system-ui" }}>MORNING CHECK-IN</div>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13 }}><span style={{ color: C.muted }}>Weight </span><strong>{wEntry.weight} kg</strong></span>
                          <span style={{ fontSize: 13 }}><span style={{ color: C.muted }}>BF </span><strong>{wEntry.bf}%</strong></span>
                          <span style={{ fontSize: 13 }}><span style={{ color: C.muted }}>Goal </span><strong>{wEntry.goalPct > 0 ? "+" : ""}{wEntry.goalPct}%</strong></span>
                          {t && <span style={{ fontSize: 13 }}><span style={{ color: C.muted }}>Target </span><strong>{fmt(t.targetCal)} Kcal · {t.targetProt}g</strong></span>}
                        </div>
                      </div>
                    )}
                    {meals.length > 0 && (
                      <div style={{ paddingBottom: hasGym ? 10 : 0, marginBottom: hasGym ? 10 : 0, borderBottom: hasGym ? `1px solid ${C.border}` : "none" }}>
                        {meals.map((m, i) => (
                          <div key={i} style={{ ...S.mealItem, borderBottom: i < meals.length - 1 ? `1px solid ${C.border}` : "none" }}>
                            <div style={S.mealName}>{m.name}</div>
                            <div>
                              <span style={S.mealKcal}>{fmt(m.cal)} Kcal</span>
                              <span style={S.mealProt}>{m.prot}g</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {hasGym && (
                      <div>
                        <div style={{ fontSize: 11, letterSpacing: 1, color: C.muted, fontWeight: 600, marginBottom: 8, fontFamily: "system-ui" }}>GYM SESSION</div>
                        {gymEntry.exercises.map((ex, ei) => (
                          <div key={ei} style={{ marginBottom: ei < gymEntry.exercises.length - 1 ? 10 : 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                              <div style={{ fontSize: 13, fontWeight: "bold" }}>{ex.name}</div>
                              {ex.muscleGroups?.length > 0 && <div style={{ fontSize: 11, color: C.muted, textAlign: "right" }}>{ex.muscleGroups.join(", ")}</div>}
                            </div>
                            {ex.sets.map((set, si) => (
                              <div key={si} style={{ fontSize: 12, lineHeight: 1.9 }}>
                                <span style={{ color: C.muted }}>Set {si + 1}: </span>
                                <strong>{set.weight}kg × {set.reps}</strong>
                                {set.notes && <span style={{ color: C.muted, fontStyle: "italic" }}> — {set.notes}</span>}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <div style={S.footer}>Fitness Tracker v2 · Powered by Claude</div>
    </div>
  );
}
