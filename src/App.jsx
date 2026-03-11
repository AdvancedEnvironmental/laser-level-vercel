import { useState, useRef, useEffect, useCallback } from "react";

// ── GPS / CAD Codes ───────────────────────────────────────────────────────────
const GPS_CODES = [
  {c:"B1",d:"Soil boring 1"},{c:"B2",d:"Soil boring 2"},{c:"B3",d:"Soil boring 3"},
  {c:"B4",d:"Soil boring 4"},{c:"B5",d:"Soil boring 5"},{c:"B6",d:"Soil boring 6"},
  {c:"B7",d:"Soil boring 7"},{c:"B8",d:"Soil boring 8"},{c:"B9",d:"Soil boring 9"},
  {c:"BED",d:"Bed outline"},{c:"BLDE",d:"Existing Building"},{c:"BLDN",d:"New Building"},
  {c:"BLUF",d:"Bluff line"},{c:"BM1",d:"Benchmark #1"},{c:"BM2",d:"Benchmark #2"},
  {c:"BM3",d:"Benchmark #3"},{c:"BS",d:"Building sewer"},{c:"C",d:"Contour lines"},
  {c:"CIST",d:"Cistern"},{c:"CL",d:"Road Centerline"},{c:"CO",d:"Sanitary Cleanout"},
  {c:"CONC",d:"Concrete"},{c:"CULV",d:"Culvert"},{c:"DRNG",d:"Drainage Route or path"},
  {c:"DB",d:"Drop box / distribution box"},{c:"DECK",d:"Deck"},
  {c:"DFE",d:"Drainfield existing"},{c:"DIST",d:"Disturbed area"},
  {c:"DRYW",d:"Drywell"},{c:"DT",d:"Dose Tank"},{c:"D",d:"Driveway"},
  {c:"E",d:"Electric"},{c:"EM",d:"Electric Meter"},{c:"EP",d:"Edge of Pavement"},
  {c:"FE",d:"Field edge"},{c:"FEMA",d:"Flood Line"},{c:"FENC",d:"Fence"},
  {c:"FFE",d:"Finished Floor Height"},{c:"FO",d:"Fiber Optic"},{c:"FORC",d:"Forcemain"},
  {c:"G",d:"Gas Line"},{c:"GATE",d:"Gate"},{c:"GB",d:"Grade Break"},
  {c:"GCP",d:"Ground Control Point"},{c:"HT",d:"Holding tank"},{c:"HYD",d:"Hydrant"},
  {c:"INLT",d:"Inlet"},{c:"LAWN",d:"Lawn edge"},{c:"LINE",d:"Generic Line"},
  {c:"LP",d:"LP Tank"},{c:"MH",d:"Manhole"},{c:"MOND",d:"Mound Perimeter"},
  {c:"MONU",d:"Survey Monument"},{c:"OBSP",d:"Observation Pipes"},
  {c:"OHW",d:"Overhead Wire"},{c:"OTLT",d:"Outlet"},{c:"PIPE",d:"Buried Pipeline"},
  {c:"PL",d:"Existing Property Line"},{c:"PLM",d:"Property Line Marker"},
  {c:"PLNW",d:"Proposed Property Line"},{c:"POST",d:"Post"},{c:"RD",d:"Road Edge"},
  {c:"RET",d:"Retaining Wall"},{c:"ROW",d:"Right Of Way"},{c:"RR",d:"Railroad"},
  {c:"SB",d:"Setback Line"},{c:"SEPT",d:"Septic Tank"},{c:"SIGN",d:"Signpost"},
  {c:"SHED",d:"Shed"},{c:"SPOT",d:"Spot elevation"},{c:"SPRK",d:"Sprinkler"},
  {c:"ST",d:"Existing Tank"},{c:"STP",d:"Proposed Tank"},{c:"SW",d:"Sidewalk"},
  {c:"TC",d:"Tree - Coniferous"},{c:"TD",d:"Tree - Deciduous"},{c:"TEL",d:"Telephone Line"},
  {c:"TREN",d:"Trench centerline"},{c:"TRLN",d:"Tree Line"},{c:"UP",d:"Utility Pole"},
  {c:"VD",d:"Drainfield Vent"},{c:"VT",d:"Tank Vent"},{c:"W",d:"Well - In Use"},
  {c:"WATR",d:"Water edge"},{c:"WELA",d:"Abandoned Well"},{c:"WET",d:"Wetland Line"},
  {c:"WL",d:"Water line - private"},{c:"WLKO",d:"Basement Walkout grade"},
];

// ── Math ──────────────────────────────────────────────────────────────────────
function hi(bmElev, bs) {
  const e = parseFloat(bmElev), b = parseFloat(bs);
  return isNaN(e) || isNaN(b) ? null : parseFloat((e + b).toFixed(4));
}
function elev(hiVal, fs) {
  const f = parseFloat(fs);
  return hiVal == null || isNaN(f) ? null : parseFloat((hiVal - f).toFixed(4));
}
function f2(v) { return v == null || isNaN(v) ? null : Number(v).toFixed(2); }
function fmt(v) { return f2(v) ?? "–"; }

// ── ID factory ────────────────────────────────────────────────────────────────
let _uid = 1;
const uid = () => _uid++;
const BM_CODES = new Set(["BM1","BM2","BM3"]);
function isBMCode(code) { return BM_CODES.has(code); }

// ── Item factories ────────────────────────────────────────────────────────────
function mkShot() { return { id: uid(), type: "shot", code: "", rod: "", note: "", inchesAbove: "" }; }
function mkTurn() { return { id: uid(), type: "turn", label: "", ref: null, bsRod: "", note: "" }; }

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          "#eef0f4",
  surface:     "#ffffff",
  surfaceAlt:  "#f5f7fa",
  chrome:      "#1c2333",
  chromeAlt:   "#263047",
  border:      "#dde1e8",
  borderMid:   "#b8c0ce",
  borderStrong:"#7d8fa8",
  accent:      "#2563eb",
  accentDim:   "#1e4fc7",
  accentMid:   "#dbeafe",
  accentText:  "#1d4ed8",
  elevGood:    "#0d7050",
  elevWait:    "#b45309",
  elevNone:    "#94a3b8",
  rodBg:       "#f0f6ff",
  rodBorder:   "#3b82f6",
  rodText:     "#1e3a5f",
  textPrimary: "#0f172a",
  textSecond:  "#475569",
  textMuted:   "#94a3b8",
  success:     "#16a34a",
  warn:        "#d97706",
  danger:      "#dc2626",
};
const MONO = "'IBM Plex Mono','Courier New',monospace";

// ── Code Search ───────────────────────────────────────────────────────────────
function CodeSearch({ value, onChange, autoFocusOnMount }) {
  const [q, setQ] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef();
  const inputRef = useRef();

  const results = q.length === 0 ? [] : GPS_CODES.filter(x =>
    x.c.toLowerCase().startsWith(q.toLowerCase()) ||
    x.d.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 10);

  useEffect(() => {
    if (autoFocusOnMount) {
      setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 80);
    }
  }, [autoFocusOnMount]);

  useEffect(() => {
    const match = GPS_CODES.find(x => x.c === value);
    if (match && !focused) setQ(match.c);
  }, [value, focused]);

  function select(code) { onChange(code); setQ(code); setOpen(false); setFocused(false); }
  function handleInput(e) {
    setQ(e.target.value.toUpperCase()); setOpen(true);
    const exact = GPS_CODES.find(x => x.c === e.target.value.toUpperCase());
    if (exact) onChange(exact.c); else onChange("");
  }

  return (
    <div ref={ref} style={{ position: "relative", flex: "0 0 84px" }}>
      <input
        ref={inputRef}
        style={S.codeInp}
        value={q}
        placeholder="CODE"
        onChange={handleInput}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={() => { setTimeout(() => { setOpen(false); setFocused(false); }, 180); }}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        maxLength={6}
      />
      {open && results.length > 0 && (
        <div style={S.dropdown}>
          {results.map(x => (
            <div key={x.c} style={S.dropRow} onMouseDown={() => select(x.c)}>
              <span style={S.dropCode}>{x.c}</span>
              <span style={S.dropDesc}>{x.d}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={S.fieldLabel}>{children}</div>;
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("setup");
  const TODAY = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const TODAY_ISO = new Date().toISOString().slice(0, 10);

  const STORAGE_KEY = "laser_level_v2";
  function loadSaved(field, fallback) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed[field] ?? fallback;
    } catch { return fallback; }
  }

  const DEFAULT_ITEMS = [
    { ...mkShot(), code: "BM1",  note: "Benchmark #1",       inchesAbove: "" },
    { ...mkShot(), code: "BM2",  note: "Benchmark #2",       inchesAbove: "" },
    { ...mkShot(), code: "BM3",  note: "Benchmark #3",       inchesAbove: "" },
    { ...mkShot(), code: "C",    note: "Contour 1",          inchesAbove: "" },
    { ...mkShot(), code: "C",    note: "Contour 2",          inchesAbove: "" },
    { ...mkShot(), code: "C",    note: "Contour 3",          inchesAbove: "" },
    { ...mkShot(), code: "B1",   note: "Soil boring 1",      inchesAbove: "" },
    { ...mkShot(), code: "B2",   note: "Soil boring 2",      inchesAbove: "" },
    { ...mkShot(), code: "B3",   note: "Soil boring 3",      inchesAbove: "" },
    { ...mkShot(), code: "BLDE", note: "Existing Building",  inchesAbove: "" },
    { ...mkShot(), code: "FFE",  note: "Finished Floor Ht.", inchesAbove: "" },
    { ...mkShot(), code: "BS",   note: "Building sewer",     inchesAbove: "" },
    { ...mkShot(), code: "SEPT", note: "Septic Tank",        inchesAbove: "" },
    { ...mkShot(), code: "SPOT", note: "Spot elevation",     inchesAbove: "" },
  ];

  const [proj, setProj]           = useState(() => loadSaved("proj",      { name: "", surveyor: "" }));
  const [bm,   setBm]             = useState(() => loadSaved("bm",        { code: "BM1", label: "BM #1", elev: "100.00", desc: "" }));
  const [initBS, setInitBS]       = useState(() => loadSaved("initBS",    ""));
  const [items, setItems]         = useState(() => loadSaved("items",     DEFAULT_ITEMS));
  const [refShotId, setRefShotId] = useState(() => loadSaved("refShotId", null));
  const [jobNotes, setJobNotes]   = useState(() => loadSaved("jobNotes",  ""));
  const [newShotId, setNewShotId] = useState(null);
  const [toast, setToast]         = useState(null);
  const listEnd = useRef();

  function toast_(msg) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  const derived = useCallback(() => {
    let currentHI = null;
    const labelElev = {};
    const bmElev = parseFloat(bm.elev);
    if (!isNaN(bmElev)) { labelElev[bm.label || bm.code] = bmElev; labelElev["BASE"] = bmElev; }
    const refShot = refShotId ? items.find(x => x.id === refShotId) : null;
    const effectiveBS = (initBS && initBS.trim() !== "") ? initBS : (refShot ? refShot.rod : "");
    currentHI = hi(bm.elev, effectiveBS);
    return items.map(item => {
      if (item.type === "turn") {
        let refE = null;
        if (item.ref === "BASE" || item.ref === (bm.label || bm.code)) refE = parseFloat(bm.elev);
        else refE = labelElev[item.ref] ?? null;
        currentHI = hi(refE, item.bsRod);
        return { type: "turn", hiVal: currentHI, refElev: refE };
      } else {
        const e = elev(currentHI, item.rod);
        if (e != null && (item.note || item.code)) labelElev[item.note || item.code] = e;
        return { type: "shot", hiVal: currentHI, elev: e };
      }
    });
  }, [bm, items, initBS, refShotId]);
  const d = derived();

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ proj, bm, initBS, items, refShotId, jobNotes })); }
    catch(e) { console.warn("Save failed:", e); }
  }, [proj, bm, initBS, items, refShotId, jobNotes]);

  function clearSession() {
    if (!window.confirm("Start a new job? This will clear all current field data.")) return;
    localStorage.removeItem(STORAGE_KEY);
    setProj({ name: "", surveyor: "" });
    setBm({ code: "BM1", label: "BM #1", elev: "100.00", desc: "" });
    setInitBS(""); setRefShotId(null); setItems(DEFAULT_ITEMS); setJobNotes("");
    setView("setup");
    toast_("Session cleared — ready for new job");
  }

  function bsOptions(itemIdx) {
    const opts = [{ value: "BASE", label: `${bm.code} — ${bm.label || "Base BM"}` }];
    items.slice(0, itemIdx).forEach(item => {
      if (item.type === "shot" && (item.label || item.code))
        opts.push({ value: item.label || item.code, label: `${item.code ? item.code + " — " : ""}${item.label || item.code}` });
    });
    return opts;
  }

  function updItem(id, field, val) {
    setItems(prev => prev.map(x => x.id === id ? { ...x, [field]: val } : x));
  }
  function addShot() {
    const s = mkShot(); setItems(prev => [...prev, s]); setNewShotId(s.id);
    setTimeout(() => listEnd.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }
  function addTurn() {
    const t = mkTurn(); setItems(prev => [...prev, t]); setNewShotId(null);
    setTimeout(() => listEnd.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }
  function removeItem(id) {
    setItems(prev => prev.filter(x => x.id !== id));
    if (newShotId === id) setNewShotId(null);
  }

  function summaryRows() {
    const rows = [];
    const bmElev = parseFloat(bm.elev);
    if (!refShotId) rows.push({ code: bm.code, label: bm.label || "Base BM", elev: isNaN(bmElev) ? null : bmElev, setup: "Initial", desc: bm.desc, isBM: true });
    let setupNum = 1;
    items.forEach((item, i) => {
      if (item.type === "turn") { setupNum++; }
      else rows.push({ code: item.code || "—", label: item.note || item.code || "", elev: d[i]?.elev, setup: `Setup ${setupNum}`, rod: item.rod, desc: item.note, inchesAbove: item.inchesAbove || "" });
    });
    return rows;
  }

  function exportCSV() {
    const rows = summaryRows();
    const lines = [
      `"ELEVATION DATA — ${proj.name || "Survey"}","Date: ${TODAY_ISO}","Surveyor: ${proj.surveyor || "—"}"`,
      `"Base BM: ${bm.code} = ${parseFloat(bm.elev).toFixed(2)} ft","${bm.desc || ""}"`,
      ``,
      `"CAD Code","Point / Description","Setup","Rod (ft)","Elevation (ft)","In. Above Grade"`,
      ...rows.map(r => [`"${r.code}"`, `"${r.label}"`, `"${r.setup}"`, r.rod || "", r.elev != null ? fmt(r.elev) : "", r.inchesAbove ? r.inchesAbove + `"` : ""].join(",")),
    ];
    if (jobNotes && jobNotes.trim()) {
      lines.push(``); lines.push(`"NOTES"`); lines.push(`"${jobNotes.replace(/"/g, '""')}"`);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(proj.name || "survey").replace(/\s+/g, "_")}_${TODAY_ISO}.csv`;
    a.click(); toast_("CSV downloaded");
  }

  function openPrint() {
    const rows = summaryRows();
    const trs = rows.map(r => `
      <tr${r.isBM ? ' class="bm"' : ""}>
        <td class="cd">${r.code}</td><td>${r.label}</td><td>${r.setup}</td>
        <td class="n">${r.rod || ""}</td>
        <td class="n elev">${r.elev != null ? fmt(r.elev) : "–"}</td>
        <td class="n">${r.inchesAbove ? r.inchesAbove + '"' : ""}</td>
      </tr>`).join("");
    const notesSection = (jobNotes && jobNotes.trim()) ? `
      <div class="notes-block">
        <div class="notes-label">Field Notes</div>
        <div class="notes-text">${jobNotes.replace(/\n/g, "<br>")}</div>
      </div>` : "";
    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Elevation Data</title>
<style>
@page{size:landscape;margin:.5in}
body{font-family:'Courier New',monospace;font-size:10pt;color:#0f172a;margin:0;padding:0;background:#fff}
.topbar{background:#1c2333;color:#fff;padding:10px 16px;display:flex;align-items:center;justify-content:space-between}
.topbar h2{margin:0;font-size:12pt;text-transform:uppercase;letter-spacing:.1em;color:#93c5fd}
.close-btn{background:#2563eb;color:#fff;border:none;padding:7px 16px;font-size:11pt;border-radius:4px;cursor:pointer;font-weight:700;font-family:inherit}
.main{padding:12px 16px}
.meta{font-size:8.5pt;color:#475569;margin-bottom:12px;letter-spacing:.02em}
table{width:100%;border-collapse:collapse}
th{background:#1c2333;color:#93c5fd;padding:6px 10px;font-size:7.5pt;text-align:left;text-transform:uppercase;letter-spacing:.1em;font-weight:700}
td{padding:5px 10px;border-bottom:1px solid #e2e8f0;font-size:9.5pt}
tr:nth-child(even) td{background:#f8fafc}
tr.bm td{background:#eff6ff;font-weight:700}
.cd{font-weight:800;color:#1e40af;min-width:52px;letter-spacing:.04em}
.n{text-align:right;font-variant-numeric:tabular-nums}
.elev{font-weight:800;color:#0d7050;font-size:10.5pt}
.notes-block{margin-top:20px;border-top:2px solid #1c2333;padding-top:12px}
.notes-label{font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#475569;margin-bottom:6px}
.notes-text{font-size:9.5pt;color:#0f172a;white-space:pre-wrap;line-height:1.6;background:#f8fafc;border:1px solid #e2e8f0;padding:10px 12px;border-radius:3px}
.foot{margin-top:14px;font-size:7.5pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:5px}
@media print{.topbar{display:none}}
</style></head><body>
<div class="topbar">
  <h2>Elevation Data — ${proj.name || "Survey"}</h2>
  <button class="close-btn" onclick="window.close()">✕ Close</button>
</div>
<div class="main">
<div class="meta">Date: ${new Date().toLocaleDateString()} &nbsp;·&nbsp; Surveyor: ${proj.surveyor || "—"} &nbsp;·&nbsp; Base: ${bm.code} = ${parseFloat(bm.elev).toFixed(2)} ft${bm.desc ? " (" + bm.desc + ")" : ""}</div>
<table>
<thead><tr><th>Code</th><th>Description / Label</th><th>Setup</th><th style="text-align:right">Rod (ft)</th><th style="text-align:right">Elevation (ft)</th><th style="text-align:right">In. Above Grade</th></tr></thead>
<tbody>${trs}</tbody></table>
${notesSection}
<div class="foot">Topcon RLH5A · Decimal feet to 0.01 · ${new Date().toLocaleDateString()} · Base ${bm.code} = ${parseFloat(bm.elev).toFixed(2)} ft assumed</div>
</div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SETUP SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (view === "setup") return (
    <div style={S.page}>
      <div style={S.setupHdr}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={S.logo}>LASER LEVEL</div>
            <div style={S.logoSub}>Topcon RLH5A · Field Elevation Collector</div>
          </div>
          <button onClick={clearSession} style={S.newJobBtn}>NEW JOB</button>
        </div>
        {items.some(x => x.rod) && (
          <div style={{ fontSize: 10, color: "#4ade80", marginTop: 12, fontWeight: 700, letterSpacing: "0.05em" }}>
            ● SESSION SAVED · {items.filter(x => x.rod).length} SHOTS RECORDED
          </div>
        )}
      </div>

      <div style={S.setupBody}>
        <div style={S.card}>
          <FieldLabel>Project Name</FieldLabel>
          <input style={S.inp} placeholder="Enter project name" value={proj.name}
            onChange={e => setProj(p => ({ ...p, name: e.target.value }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
            <div>
              <FieldLabel>Date</FieldLabel>
              <div style={{ ...S.inp, color: C.elevGood, fontWeight: 700, fontSize: 13 }}>{TODAY}</div>
            </div>
            <div>
              <FieldLabel>Surveyor</FieldLabel>
              <input style={S.inp} placeholder="Name" value={proj.surveyor}
                onChange={e => setProj(p => ({ ...p, surveyor: e.target.value }))} />
            </div>
          </div>
        </div>

        <button style={S.goBtn} onClick={() => setView("field")}>
          START SHOOTING →
        </button>
        <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 10, letterSpacing: "0.03em" }}>
          Reference elevation is set after shooting
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // FIELD SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (view === "field") {
    const refShotForHI = refShotId ? items.find(x => x.id === refShotId) : null;
    const effectiveBS = refShotForHI ? (refShotForHI.rod || "") : (initBS || "");
    const initHI = hi(bm.elev, effectiveBS);

    return (
      <div style={S.page}>
        {/* Sticky top bar */}
        <div style={S.fieldHdr}>
          <button style={S.hdrBtn} onClick={() => setView("setup")}>← Back</button>
          <div style={S.hdrMid}>
            <div style={S.hdrTitle}>{proj.name || "Field Entry"}</div>
            <div style={S.hdrSub}>
              {initHI != null
                ? <span style={{ color: "#4ade80", fontWeight: 700, letterSpacing: "0.04em" }}>HI = {fmt(initHI)} ft</span>
                : <span style={{ color: "#fbbf24", letterSpacing: "0.04em" }}>⚠ SET REFERENCE</span>}
            </div>
          </div>
          <button style={S.hdrBtn} onClick={() => setView("summary")}>Sum →</button>
        </div>

        {/* Column header — sticky below top bar */}
        <div style={S.colHdr}>
          <span style={{ flex: "0 0 84px" }}>CODE</span>
          <span style={{ flex: 1 }}>DESCRIPTION</span>
          <span style={{ width: 72, textAlign: "right" }}>ROD</span>
          <span style={{ width: 68, textAlign: "right" }}>ELEV</span>
          <span style={{ width: 34 }}></span>
        </div>

        {/* Scrollable shot list */}
        <div style={S.shotList}>
          {items.map((item, i) => {
            const dv = d[i];

            // ── TURN ──────────────────────────────────────────────────
            if (item.type === "turn") {
              const opts = bsOptions(i);
              const refE = item.ref === "BASE" ? parseFloat(bm.elev) : (() => {
                let e = null;
                for (let j = 0; j < i; j++) {
                  if (items[j].type === "shot") {
                    const rl = items[j].label || items[j].code;
                    if (rl === item.ref) { e = d[j]?.elev; break; }
                  }
                }
                return e ?? (item.ref === (bm.label || bm.code) ? parseFloat(bm.elev) : null);
              })();
              const turnHI = hi(refE, item.bsRod);
              return (
                <div key={item.id} style={S.turnBlock}>
                  <div style={S.turnHdr}>
                    <span style={{ opacity: 0.7 }}>⟳</span>
                    <span style={{ flex: 1, letterSpacing: "0.08em" }}>INSTRUMENT TURN</span>
                    <button style={S.removeBtnLight} onClick={() => removeItem(item.id)}>✕</button>
                  </div>
                  <div style={S.turnBody}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
                      <div>
                        <FieldLabel>Backsight to</FieldLabel>
                        <select style={S.sel} value={item.ref || ""}
                          onChange={e => updItem(item.id, "ref", e.target.value || null)}>
                          <option value="">— pick point —</option>
                          {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <FieldLabel>BS Rod (ft)</FieldLabel>
                        <input style={S.rodInp} inputMode="decimal" placeholder="0.00"
                          value={item.bsRod} onChange={e => updItem(item.id, "bsRod", e.target.value)} />
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                      {item.ref && refE != null && <span style={{ color: C.textMuted }}>Ref {fmt(refE)} ft → </span>}
                      <span style={{ color: turnHI != null ? C.elevGood : C.warn }}>
                        {turnHI != null ? `HI = ${fmt(turnHI)} ft` : "Enter backsight to compute HI"}
                      </span>
                    </div>
                    <input style={{ ...S.inp, marginTop: 8, fontSize: 13 }}
                      placeholder="Setup note (optional)"
                      value={item.note} onChange={e => updItem(item.id, "note", e.target.value)} />
                  </div>
                </div>
              );
            }

            // ── SHOT ROW ──────────────────────────────────────────────
            const elevation = dv?.elev;
            const hasElev = elevation != null;
            const isBM = isBMCode(item.code);
            const rodHasValue = item.rod && item.rod.trim() !== "" && item.rod.trim() !== "0.00";
            const bmIncomplete = isBM && rodHasValue && (!item.inchesAbove || item.inchesAbove.trim() === "");
            const isNew = item.id === newShotId;

            return (
              <div key={item.id} style={{
                ...S.shotRow,
                background: isBM ? "#f0f6ff" : "transparent",
                borderLeft: isBM ? `3px solid ${C.accent}` : "3px solid transparent",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
                  <CodeSearch value={item.code} onChange={v => updItem(item.id, "code", v)} autoFocusOnMount={isNew} />
                  <input
                    style={S.noteInp}
                    placeholder={GPS_CODES.find(x => x.c === item.code)?.d || "Description"}
                    value={item.note}
                    onChange={e => updItem(item.id, "note", e.target.value)}
                  />
                  <input
                    style={S.rodInp}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={item.rod}
                    onChange={e => updItem(item.id, "rod", e.target.value)}
                  />
                  <div style={{
                    width: 68, textAlign: "right", fontFamily: MONO,
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                    fontVariantNumeric: "tabular-nums",
                    color: hasElev ? C.elevGood : item.rod ? C.elevWait : C.elevNone,
                  }}>
                    {hasElev ? fmt(elevation) : item.rod ? "···" : "—"}
                  </div>
                  <button style={S.removeBtn} onClick={() => removeItem(item.id)}>✕</button>
                </div>

                {isBM && (
                  <div style={S.bmSubRow}>
                    <span style={{ fontSize: 9, color: C.accentText, fontWeight: 700, flex: 1, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      In. Above Grade
                    </span>
                    <input
                      style={{
                        ...S.rodInp, width: 80,
                        borderColor: bmIncomplete ? C.danger : C.accent,
                        background: bmIncomplete ? "#fff5f5" : C.rodBg,
                      }}
                      inputMode="decimal"
                      placeholder='0.0"'
                      value={item.inchesAbove}
                      onChange={e => updItem(item.id, "inchesAbove", e.target.value)}
                    />
                    {bmIncomplete && (
                      <span style={{ fontSize: 9, color: C.danger, fontWeight: 700, marginLeft: 4, letterSpacing: "0.04em" }}>REQUIRED</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── REFERENCE ELEVATION PANEL ── */}
          {(() => {
            const shotOptions = items
              .filter(x => x.type === "shot" && x.rod && x.rod.trim() !== "")
              .map(x => ({ id: x.id, label: `${x.code}${x.note ? " — " + x.note : ""}`, rod: x.rod, code: x.code, note: x.note }));
            const refShot = refShotId ? items.find(x => x.id === refShotId) : null;

            function selectRefShot(id) {
              setRefShotId(id);
              const shot = items.find(x => x.id === id);
              if (shot) {
                setInitBS(shot.rod || "");
                setBm(b => ({ ...b, code: shot.code || b.code, label: shot.note || b.label, desc: shot.note || b.desc }));
              }
            }

            return (
              <div style={S.panel}>
                <div style={S.panelHdr}>SET REFERENCE ELEVATION</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, lineHeight: 1.5 }}>
                  Pick the shot to assign a known elevation to, then enter that elevation below.
                </div>

                <div style={{ marginBottom: 12 }}>
                  <FieldLabel>Step 1 — Reference shot</FieldLabel>
                  <select style={{ ...S.sel, fontSize: 14, padding: "11px 10px" }}
                    value={refShotId ? String(refShotId) : ""}
                    onChange={e => e.target.value ? selectRefShot(Number(e.target.value)) : setRefShotId(null)}>
                    <option value="">— select a shot —</option>
                    {shotOptions.map(o => (
                      <option key={o.id} value={String(o.id)}>{o.label} (rod: {o.rod})</option>
                    ))}
                  </select>
                </div>

                {refShot && (
                  <div style={{
                    background: C.surfaceAlt, border: `1px solid ${C.border}`,
                    borderRadius: 6, padding: "10px 12px", marginBottom: 12,
                    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
                  }}>
                    <div>
                      <FieldLabel>Code</FieldLabel>
                      <div style={{ fontSize: 15, fontWeight: 800, color: C.textPrimary, letterSpacing: "0.04em" }}>{refShot.code || "—"}</div>
                    </div>
                    <div>
                      <FieldLabel>Description</FieldLabel>
                      <div style={{ fontSize: 12, color: C.textSecond, lineHeight: 1.4 }}>{refShot.note || "—"}</div>
                    </div>
                    <div>
                      <FieldLabel>Rod reading</FieldLabel>
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.rodText, fontVariantNumeric: "tabular-nums" }}>{refShot.rod} ft</div>
                    </div>
                  </div>
                )}

                {shotOptions.length === 0 && (
                  <div style={{ fontSize: 12, color: C.textMuted, textAlign: "center", padding: "4px 0 12px", letterSpacing: "0.03em" }}>
                    No rod readings yet — shoot first
                  </div>
                )}

                <div style={S.refElevBlock}>
                  <FieldLabel>
                    {refShotForHI
                      ? `Step 2 — Assign elevation to rod reading ${refShotForHI.rod} ft`
                      : "Step 2 — Enter reference elevation (ft)"}
                  </FieldLabel>
                  <input
                    style={{
                      ...S.rodInp, width: "100%", fontSize: 26, padding: "13px 14px",
                      border: `2px solid ${refShotForHI ? C.accent : C.borderMid}`,
                      borderRadius: 6, opacity: refShotForHI ? 1 : 0.4,
                      textAlign: "right", background: refShotForHI ? C.rodBg : C.surfaceAlt,
                    }}
                    inputMode="decimal"
                    placeholder="100.00"
                    value={bm.elev}
                    onChange={e => setBm(b => ({ ...b, elev: e.target.value }))}
                  />
                  {initHI != null && (
                    <div style={{
                      marginTop: 8, fontSize: 15, fontWeight: 800, color: C.elevGood,
                      textAlign: "right", letterSpacing: "0.05em", fontVariantNumeric: "tabular-nums",
                    }}>
                      ✓ HI = {fmt(initHI)} ft
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── JOB NOTES ── */}
          <div style={{ ...S.panel, borderColor: C.borderMid }}>
            <div style={{ ...S.panelHdr, color: C.textSecond }}>FIELD NOTES</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, lineHeight: 1.5 }}>
              Autosaved · included in CSV &amp; PDF exports
            </div>
            <textarea
              style={S.notesTextarea}
              placeholder="Conditions, observations, sketch notes..."
              value={jobNotes}
              onChange={e => setJobNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div ref={listEnd} />
        </div>

        <div style={S.actionBar}>
          <button style={S.addShotBtn} onClick={addShot}>+ SHOT</button>
          <button style={S.addTurnBtn} onClick={addTurn}>⟳ TURN</button>
        </div>

        {toast && <div style={S.toast}>{toast}</div>}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (view === "summary") {
    const rows = summaryRows();
    return (
      <div style={S.page}>
        <div style={S.fieldHdr}>
          <button style={S.hdrBtn} onClick={() => setView("field")}>← Back</button>
          <div style={S.hdrMid}>
            <div style={S.hdrTitle}>Summary</div>
            <div style={S.hdrSub}>{rows.length} points · {TODAY}</div>
          </div>
          <div style={{ width: 72 }} />
        </div>

        <div style={S.exportBar}>
          <button style={S.expBtn} onClick={exportCSV}>↓ CSV</button>
          <button style={S.expBtn} onClick={openPrint}>⎙ Print / PDF</button>
        </div>

        <div style={{ overflowX: "auto", flex: 1 }}>
          <table style={S.tbl}>
            <thead>
              <tr>
                {["Code", "Description", "Setup", "Rod", "Elev (ft)", "In. Above"].map((h, hi2) => (
                  <th key={h} style={{ ...S.th, textAlign: hi2 >= 3 ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ background: r.isBM ? "#eff6ff" : i % 2 === 0 ? C.surface : C.surfaceAlt }}>
                  <td style={{ ...S.td, color: C.accentText, fontWeight: 800, letterSpacing: "0.04em" }}>{r.code}</td>
                  <td style={{ ...S.td, fontSize: 12, color: C.textSecond }}>{r.label || "—"}</td>
                  <td style={{ ...S.td, fontSize: 11, color: C.textMuted }}>{r.setup}</td>
                  <td style={{ ...S.td, textAlign: "right", fontVariantNumeric: "tabular-nums", color: C.textSecond }}>{r.rod || ""}</td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: r.elev != null ? C.elevGood : C.elevWait }}>
                    {r.elev != null ? fmt(r.elev) : "–"}
                  </td>
                  <td style={{ ...S.td, textAlign: "right", color: C.accentText, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {r.inchesAbove ? `${r.inchesAbove}"` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {jobNotes && jobNotes.trim() && (
          <div style={{ margin: "14px 12px 20px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Field Notes</div>
            <div style={{ fontSize: 13, color: C.textPrimary, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{jobNotes}</div>
          </div>
        )}

        {toast && <div style={S.toast}>{toast}</div>}
      </div>
    );
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: { fontFamily: MONO, background: C.bg, minHeight: "100vh", color: C.textPrimary, display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto" },

  // Setup
  setupHdr: { background: C.chrome, paddingTop: "max(28px, calc(env(safe-area-inset-top) + 14px))", paddingBottom: 20, paddingLeft: 20, paddingRight: 20, borderBottom: `3px solid ${C.accent}` },
  logo: { fontSize: 22, fontWeight: 800, color: "#e2e8f0", letterSpacing: "0.16em", lineHeight: 1.1 },
  logoSub: { fontSize: 10, color: "#475569", marginTop: 4, letterSpacing: "0.06em" },
  newJobBtn: { background: "transparent", border: "1px solid #334155", color: "#64748b", borderRadius: 5, padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: "0.08em", fontFamily: MONO },
  setupBody: { padding: "20px 16px", flex: 1 },

  // Cards
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, marginBottom: 16 },
  panel: { margin: "12px 10px", background: C.surface, border: `1.5px solid ${C.accent}`, borderRadius: 8, padding: "14px 14px" },
  panelHdr: { fontSize: 9, fontWeight: 800, color: C.accentText, letterSpacing: "0.14em", marginBottom: 8 },
  refElevBlock: { background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, marginTop: 4 },

  // Field header
  fieldHdr: { background: C.chrome, borderBottom: `2px solid ${C.accent}`, paddingTop: "max(10px, env(safe-area-inset-top))", paddingBottom: 10, paddingLeft: 8, paddingRight: 8, display: "flex", alignItems: "center", gap: 6, position: "sticky", top: 0, zIndex: 10 },
  hdrBtn: { background: C.accent, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "10px 13px", borderRadius: 6, lineHeight: 1, whiteSpace: "nowrap", minWidth: 68, textAlign: "center", fontFamily: MONO, letterSpacing: "0.03em" },
  hdrMid: { flex: 1, textAlign: "center", padding: "0 4px" },
  hdrTitle: { fontSize: 13, fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.04em" },
  hdrSub: { fontSize: 10, color: "#64748b", marginTop: 2 },

  // Column header
  colHdr: { display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: C.chromeAlt, borderBottom: "1px solid #2d3d57", fontSize: 8, fontWeight: 700, color: "#4e6280", textTransform: "uppercase", letterSpacing: "0.1em", position: "sticky", top: 50, zIndex: 9 },

  // Shot list
  shotList: { flex: 1, overflowY: "auto", paddingBottom: "calc(80px + env(safe-area-inset-bottom))" },
  shotRow: { display: "flex", alignItems: "center", gap: 6, padding: "9px 8px 9px 10px", borderBottom: `1px solid ${C.border}`, overflow: "visible", flexWrap: "wrap" },

  // Inputs
  fieldLabel: { fontSize: 9, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 },
  inp: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, color: C.textPrimary, padding: "10px 12px", fontSize: 14, width: "100%", outline: "none", fontFamily: MONO, boxSizing: "border-box" },
  codeInp: { background: C.rodBg, border: `1.5px solid ${C.rodBorder}`, borderRadius: 5, color: C.rodText, padding: "9px 6px", fontSize: 13, fontWeight: 800, width: "100%", outline: "none", fontFamily: MONO, textAlign: "center", letterSpacing: "0.06em", textTransform: "uppercase" },
  noteInp: { flex: 1, background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, color: C.textPrimary, padding: "9px 6px", fontSize: 12, outline: "none", fontFamily: MONO, minWidth: 0 },
  rodInp: { width: 72, background: C.rodBg, border: `1.5px solid ${C.rodBorder}`, borderRadius: 5, color: C.rodText, padding: "9px 7px", fontSize: 15, fontWeight: 800, textAlign: "right", outline: "none", fontFamily: MONO, flexShrink: 0, fontVariantNumeric: "tabular-nums" },
  sel: { background: C.surface, border: `1px solid ${C.borderMid}`, borderRadius: 5, color: C.textPrimary, padding: "9px 10px", fontSize: 13, width: "100%", outline: "none", fontFamily: MONO },

  // Dropdown
  dropdown: { position: "absolute", top: "100%", left: 0, width: 220, background: C.surface, border: `1px solid ${C.borderStrong}`, borderRadius: 8, zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,.15)", maxHeight: 300, overflowY: "auto" },
  dropRow: { display: "flex", flexDirection: "column", padding: "10px 14px", borderBottom: `1px solid ${C.border}`, cursor: "pointer" },
  dropCode: { fontSize: 14, fontWeight: 800, color: C.accentText, letterSpacing: "0.06em", lineHeight: 1.2 },
  dropDesc: { fontSize: 11, color: C.textMuted, marginTop: 2, lineHeight: 1.3 },

  // BM sub-row
  bmSubRow: { display: "flex", alignItems: "center", gap: 8, padding: "7px 8px 9px 12px", width: "100%", background: C.accentMid, borderTop: "1px solid #bfdbfe", marginTop: 2 },

  // Buttons
  removeBtn: { background: "transparent", border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 13, cursor: "pointer", padding: "8px 9px", lineHeight: 1, borderRadius: 5, minWidth: 34, minHeight: 34, textAlign: "center", flexShrink: 0, fontFamily: MONO },
  removeBtnLight: { background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: 13, cursor: "pointer", padding: "5px 10px", lineHeight: 1, borderRadius: 5, minWidth: 30, fontFamily: MONO },

  // Turn
  turnBlock: { margin: "6px 10px", borderRadius: 7, overflow: "hidden", border: `1.5px solid ${C.accent}` },
  turnHdr: { background: C.accent, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.1em" },
  turnBody: { background: "#f0f7ff", padding: "12px 12px" },

  // Action bar
  actionBar: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: C.chrome, borderTop: `2px solid ${C.accent}`, paddingTop: 10, paddingLeft: 12, paddingRight: 12, paddingBottom: "max(10px, env(safe-area-inset-bottom))", display: "flex", gap: 8, zIndex: 20 },
  addShotBtn: { flex: 2, background: C.accent, color: "#fff", border: "none", borderRadius: 7, padding: 14, fontSize: 14, fontWeight: 800, cursor: "pointer", letterSpacing: "0.1em", fontFamily: MONO },
  addTurnBtn: { flex: 1, background: "transparent", color: "#93c5fd", border: "1.5px solid #334155", borderRadius: 7, padding: 14, fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em", fontFamily: MONO },

  goBtn: { width: "100%", background: C.accent, color: "#fff", border: "none", borderRadius: 7, padding: 16, fontSize: 15, fontWeight: 800, cursor: "pointer", letterSpacing: "0.12em", fontFamily: MONO, marginTop: 4 },

  // Summary
  exportBar: { display: "flex", gap: 8, padding: "10px 12px", borderBottom: `1px solid ${C.border}`, background: C.surface },
  expBtn: { background: C.chrome, border: "none", borderRadius: 6, color: "#e2e8f0", padding: "12px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: MONO, flex: 1, letterSpacing: "0.06em" },
  tbl: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "8px 12px", fontSize: 8, fontWeight: 700, color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.12em", borderBottom: "2px solid #334155", background: C.chrome, position: "sticky", top: 0 },
  td: { padding: "9px 12px", borderBottom: `1px solid ${C.border}`, verticalAlign: "middle", fontVariantNumeric: "tabular-nums" },

  notesTextarea: { width: "100%", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 5, color: C.textPrimary, padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: MONO, resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" },

  toast: { position: "fixed", bottom: 86, left: "50%", transform: "translateX(-50%)", background: C.chrome, border: `1px solid ${C.accent}`, borderRadius: 7, padding: "11px 20px", fontSize: 12, color: "#e2e8f0", zIndex: 200, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,.35)", fontWeight: 700, letterSpacing: "0.05em" },
};
