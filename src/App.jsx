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
// Items in the list are either type:"shot" or type:"turn"
// A "turn" item holds the backsight data for a new instrument position
function mkShot() { return { id: uid(), type: "shot", code: "", rod: "", note: "", inchesAbove: "", required: false }; }
function mkTurn() { return { id: uid(), type: "turn", label: "", ref: null, bsRod: "", note: "" }; }

// ── Code Search Dropdown ──────────────────────────────────────────────────────
function CodeSearch({ value, onChange }) {
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
    const match = GPS_CODES.find(x => x.c === value);
    if (match && !focused) setQ(match.c);
  }, [value, focused]);

  function select(code) {
    onChange(code);
    setQ(code);
    setOpen(false);
    setFocused(false);
  }

  function handleInput(e) {
    setQ(e.target.value.toUpperCase());
    setOpen(true);
    const exact = GPS_CODES.find(x => x.c === e.target.value.toUpperCase());
    if (exact) onChange(exact.c);
    else onChange("");
  }

  return (
    <div ref={ref} style={{ position: "relative", flex: "0 0 90px" }}>
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
              <div style={S.dropCode}>{x.c}</div>
              <div style={S.dropDesc}>{x.d}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  // ── Project state
  const [view, setView] = useState("setup"); // "setup" | "field" | "summary"
  const TODAY = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const TODAY_ISO = new Date().toISOString().slice(0, 10);
  // ── Persistent state (auto-saved to localStorage) ───────────────────────────
  const STORAGE_KEY = "laser_level_v1";
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
    { ...mkShot(), code: "C",    note: "Contour 1",          inchesAbove: "", required: true },
    { ...mkShot(), code: "C",    note: "Contour 2",          inchesAbove: "", required: true },
    { ...mkShot(), code: "C",    note: "Contour 3",          inchesAbove: "" },
    { ...mkShot(), code: "B1",   note: "Soil boring 1",      inchesAbove: "", required: true },
    { ...mkShot(), code: "B2",   note: "Soil boring 2",      inchesAbove: "", required: true },
    { ...mkShot(), code: "B3",   note: "Soil boring 3",      inchesAbove: "", required: true },
    { ...mkShot(), code: "BLDE", note: "Existing Building",  inchesAbove: "" },
    { ...mkShot(), code: "FFE",  note: "Finished Floor Ht.", inchesAbove: "" },
    { ...mkShot(), code: "BS",   note: "Building sewer",     inchesAbove: "" },
    { ...mkShot(), code: "SEPT", note: "Septic Tank",        inchesAbove: "" },
    { ...mkShot(), code: "SPOT", note: "Spot elevation",     inchesAbove: "" },
  ];

  const [proj, setProj]   = useState(() => loadSaved("proj",   { name: "", surveyor: "" }));
  const [bm,   setBm]     = useState(() => loadSaved("bm",     { code: "BM1", label: "BM #1", elev: "100.00", desc: "" }));
  const [initBS, setInitBS] = useState(() => loadSaved("initBS", ""));
  const [items, setItems]  = useState(() => loadSaved("items",  DEFAULT_ITEMS));
  // Which shot is selected as the backsight reference point
  const [refShotId, setRefShotId] = useState(() => loadSaved("refShotId", null));
  const [toast, setToast] = useState(null);
  const listEnd = useRef();

  function toast_(msg) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  // ── Compute derived HI chain through the list ─────────────────────────────
  const derived = useCallback(() => {
    let currentHI = null;
    const labelElev = {};
    const bmElev = parseFloat(bm.elev);
    if (!isNaN(bmElev)) labelElev[bm.label || bm.code] = bmElev;
    if (!isNaN(bmElev)) labelElev["BASE"] = bmElev;

    currentHI = hi(bm.elev, initBS);

    return items.map(item => {
      if (item.type === "turn") {
        let refE = null;
        if (item.ref === "BASE" || item.ref === (bm.label || bm.code)) {
          refE = parseFloat(bm.elev);
        } else {
          refE = labelElev[item.ref] ?? null;
        }
        currentHI = hi(refE, item.bsRod);
        return { type: "turn", hiVal: currentHI, refElev: refE };
      } else {
        const e = elev(currentHI, item.rod);
        if (e != null && (item.note || item.code)) {
          labelElev[item.note || item.code] = e;
        }
        return { type: "shot", hiVal: currentHI, elev: e };
      }
    });
  }, [bm, items, initBS]);
  const d = derived();

  // ── Auto-save to localStorage on every state change ──────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ proj, bm, initBS, items, refShotId }));
    } catch (e) { console.warn("Save failed:", e); }
  }, [proj, bm, initBS, items]);

  // ── Clear session (new job) ───────────────────────────────────────────────
  function clearSession() {
    if (!window.confirm("Start a new job? This will clear all current field data.")) return;
    localStorage.removeItem(STORAGE_KEY);
    setProj({ name: "", surveyor: "" });
    setBm({ code: "BM1", label: "BM #1", elev: "100.00", desc: "" });
    setInitBS("");
    setRefShotId(null);
    setItems(DEFAULT_ITEMS);
    setView("setup");
    toast_("Session cleared — ready for new job");
  }

  // ── Available backsight reference points at position i (turns only) ───────
  function bsOptions(itemIdx) {
    const opts = [{ value: "BASE", label: `${bm.code} — ${bm.label || "Base BM"}` }];
    items.slice(0, itemIdx).forEach(item => {
      if (item.type === "shot" && (item.label || item.code)) {
        opts.push({ value: item.label || item.code, label: `${item.code ? item.code + " — " : ""}${item.label || item.code}` });
      }
    });
    return opts;
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  function updItem(id, field, val) {
    setItems(prev => prev.map(x => x.id === id ? { ...x, [field]: val } : x));
  }
  function addShot() {
    const s = mkShot();
    setItems(prev => [...prev, s]);
    setTimeout(() => listEnd.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }
  function addTurn() {
    const t = mkTurn();
    setItems(prev => [...prev, t]);
    setTimeout(() => listEnd.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }
  function removeItem(id) {
    const item = items.find(x => x.id === id);
    if (item?.required) {
      toast_("This row is required — clear the rod reading instead, or keep it blank");
      return;
    }
    setItems(prev => prev.filter(x => x.id !== id));
  }

  // ── Summary rows ──────────────────────────────────────────────────────────
  function summaryRows() {
    const rows = [];
    const bmElev = parseFloat(bm.elev);
    rows.push({ code: bm.code, label: bm.label || "Base BM", elev: isNaN(bmElev) ? null : bmElev, setup: "Initial", desc: bm.desc, isBM: true });
    let setupNum = 1;
    items.forEach((item, i) => {
      if (item.type === "turn") {
        setupNum++;
      } else {
        rows.push({
          code: item.code || "—",
          label: item.note || item.code || "",
          elev: d[i]?.elev,
          setup: `Setup ${setupNum}`,
          rod: item.rod,
          desc: item.note,
          inchesAbove: item.inchesAbove || "",
        });
      }
    });
    return rows;
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  function exportCSV() {
    const rows = summaryRows();
    const lines = [
      `"ELEVATION DATA — ${proj.name || "Survey"}","Date: ${TODAY_ISO}","Surveyor: ${proj.surveyor || "—"}"`,
      `"Base BM: ${bm.code} = ${parseFloat(bm.elev).toFixed(2)} ft","${bm.desc || ""}"`,
      ``,
      `"CAD Code","Point / Description","Setup","Rod (ft)","Elevation (ft)","In. Above Grade"`,
      ...rows.map(r => [`"${r.code}"`,`"${r.label}"`,`"${r.setup}"`, r.rod || "", r.elev != null ? fmt(r.elev) : "", r.inchesAbove ? r.inchesAbove + `"` : ""].join(","))
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(proj.name || "survey").replace(/\s+/g, "_")}_${TODAY_ISO}.csv`;
    a.click();
    toast_("CSV downloaded");
  }

  // ── Print ─────────────────────────────────────────────────────────────────
  function openPrint() {
    const rows = summaryRows();
    const trs = rows.map(r => `
      <tr${r.isBM ? ' class="bm"' : ""}>
        <td class="cd">${r.code}</td>
        <td>${r.label}</td>
        <td>${r.setup}</td>
        <td class="n">${r.rod || ""}</td>
        <td class="n elev">${r.elev != null ? fmt(r.elev) : "–"}</td>
        <td class="n">${r.inchesAbove ? r.inchesAbove + '"' : ""}</td>
      </tr>`).join("");
    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Elevation Data</title>
<style>
@page{size:landscape;margin:.5in}
body{font-family:'Courier New',monospace;font-size:10pt;color:#111;margin:0;padding:0}
.topbar{background:#1a1a1a;color:#fff;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.topbar h2{margin:0;font-size:13pt;text-transform:uppercase;letter-spacing:.08em;color:#fbbf24}
.close-btn{background:#d97706;color:#fff;border:none;padding:8px 18px;font-size:13pt;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit}
.main{padding:12px 16px}
.meta{font-size:9pt;color:#555;margin-bottom:12px}
table{width:100%;border-collapse:collapse}
th{background:#374151;color:#fff;padding:6px 8px;font-size:8.5pt;text-align:left;text-transform:uppercase;letter-spacing:.06em}
td{padding:5px 8px;border-bottom:1px solid #ddd;font-size:9.5pt}
tr:nth-child(even) td{background:#f7f7f7}
tr.bm td{background:#e8f0ff;font-weight:700}
.cd{font-weight:700;color:#003080;min-width:52px}
.n{text-align:right}
.elev{font-weight:700;color:#1a5c1a;font-size:10.5pt}
.foot{margin-top:16px;font-size:8pt;color:#999;border-top:1px solid #ddd;padding-top:5px}
@media print{.topbar{display:none}}
</style></head><body>
<div class="topbar">
  <h2>Elevation Data — ${proj.name || "Survey"}</h2>
  <button class="close-btn" onclick="window.close()">✕ Close</button>
</div>
<div class="main">
<div class="meta">Date: ${new Date().toLocaleDateString()} &nbsp;|&nbsp; Surveyor: ${proj.surveyor || "—"} &nbsp;|&nbsp; Base: ${bm.code} = ${parseFloat(bm.elev).toFixed(2)} ft${bm.desc ? " (" + bm.desc + ")" : ""}</div>
<table>
<thead><tr><th>Code</th><th>Description / Label</th><th>Setup</th><th style="text-align:right">Rod (ft)</th><th style="text-align:right">Elevation (ft)</th><th style="text-align:right">In. Above Grade</th></tr></thead>
<tbody>${trs}</tbody></table>
<div class="foot">Topcon RLH5A · Decimal feet to 0.01 · ${new Date().toLocaleDateString()} · Base ${bm.code} = ${parseFloat(bm.elev).toFixed(2)} ft assumed</div>
</div>
</body></html>`);
    w.document.close();
  }


  // ─────────────────────────────────────────────────────────────────────────
  // SETUP SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (view === "setup") return (
    <div style={S.page}>
      <div style={S.setupHdr}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={S.logo}>⬛ LASER LEVEL</div>
          <button onClick={clearSession} style={{background:"#374151",border:"none",color:"#fbbf24",
            borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer",
            letterSpacing:"0.05em"}}>NEW JOB</button>
        </div>
        <div style={S.logoSub}>Topcon RLH5A · Field Elevation Collector</div>
        {items.some(x=>x.rod) && (
          <div style={{fontSize:10,color:"#4ade80",marginTop:6,fontWeight:700}}>
            ✓ Session auto-saved · {items.filter(x=>x.rod).length} shots recorded
          </div>
        )}
      </div>

      <div style={S.setupBody}>
        {/* Project */}
        <div style={S.block}>
          <div style={S.blockLabel}>Project</div>
          <input style={S.inp} placeholder="Project name" value={proj.name}
            onChange={e => setProj(p => ({...p, name: e.target.value}))} />
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
            <div>
              <div style={S.fieldLabel}>Date</div>
              <div style={{...S.inp, color:"#166534", fontWeight:700, fontSize:13}}>{TODAY}</div>
            </div>
            <div>
              <div style={S.fieldLabel}>Surveyor</div>
              <input style={S.inp} placeholder="Name" value={proj.surveyor}
                onChange={e => setProj(p => ({...p, surveyor: e.target.value}))} />
            </div>
          </div>
        </div>

        <button style={S.goBtn} onClick={() => setView("field")}>
          Start Shooting →
        </button>
        <div style={{fontSize:11,color:"#6b7280",textAlign:"center",marginTop:10}}>
          Set your reference elevation after shooting
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // FIELD SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (view === "field") {
    const initHI = hi(bm.elev, initBS);
    return (
      <div style={S.page}>
        {/* Sticky header — large safe tap zones */}
        <div style={S.fieldHdr}>
          <button style={S.hdrBack} onClick={() => setView("setup")}>← Back</button>
          <div style={S.hdrMid}>
            <div style={S.hdrTitle}>{proj.name || "Field Entry"}</div>
            <div style={S.hdrSub}>
              {initHI != null
                ? <span style={{color:"#166534",fontWeight:700}}>HI = {fmt(initHI)} ft</span>
                : <span style={{color:"#b45309"}}>⚠ Set reference below</span>}
            </div>
          </div>
          <button style={S.hdrSum} onClick={() => setView("summary")}>Sum →</button>
        </div>

        {/* Shot list */}
        <div style={S.shotList}>
          {/* Column headers */}
          <div style={S.colHdr}>
            <span style={{flex:"0 0 90px"}}>CODE</span>
            <span style={{flex:1}}>DESCRIPTION / NOTES</span>
            <span style={{width:76,textAlign:"right"}}>ROD (ft)</span>
            <span style={{width:80,textAlign:"right"}}>ELEV (ft)</span>
            <span style={{width:32}}></span>
          </div>

          {items.map((item, i) => {
            const dv = d[i];

            // ── TURN DIVIDER ────────────────────────────────────────────
            if (item.type === "turn") {
              const opts = bsOptions(i);
              const refE = item.ref === "BASE" ? parseFloat(bm.elev)
                : (() => {
                    // find elevation of chosen ref
                    let e = null;
                    for (let j = 0; j < i; j++) {
                      if (items[j].type === "shot") {
                        const refLabel = items[j].label || items[j].code;
                        if (refLabel === item.ref) { e = d[j]?.elev; break; }
                      }
                    }
                    return e ?? (item.ref === (bm.label || bm.code) ? parseFloat(bm.elev) : null);
                  })();
              const turnHI = hi(refE, item.bsRod);
              return (
                <div key={item.id} style={S.turnBlock}>
                  <div style={S.turnLabel}>
                    <span style={S.turnIcon}>⟳</span>
                    <span>INSTRUMENT TURN — New Setup</span>
                    <button style={S.removeBtn} onClick={() => removeItem(item.id)}>✕</button>
                  </div>
                  <div style={S.turnBody}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:6}}>
                      <div>
                        <div style={S.fieldLabel}>Backsight to</div>
                        <select style={S.sel} value={item.ref || ""}
                          onChange={e => updItem(item.id, "ref", e.target.value || null)}>
                          <option value="">— pick point —</option>
                          {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={S.fieldLabel}>BS Rod (ft)</div>
                        <input style={{...S.inp,...S.rodStyle}} inputMode="decimal" placeholder="0.00"
                          value={item.bsRod} onChange={e => updItem(item.id, "bsRod", e.target.value)} />
                      </div>
                    </div>
                    <div style={S.turnHIrow}>
                      {item.ref && refE != null && <span>Ref: {fmt(refE)} ft &nbsp;→&nbsp;</span>}
                      <span style={{ color: turnHI != null ? "#166534" : "#b45309", fontWeight: 700 }}>
                        {turnHI != null ? `New HI = ${fmt(turnHI)} ft` : "Enter backsight above"}
                      </span>
                    </div>
                    {item.note !== undefined && (
                      <input style={{...S.inp,marginTop:6,fontSize:13}} placeholder="Setup note (optional)"
                        value={item.note} onChange={e => updItem(item.id, "note", e.target.value)} />
                    )}
                  </div>
                </div>
              );
            }

            // ── SHOT ROW ────────────────────────────────────────────────
            const elevation = dv?.elev;
            const hasElev = elevation != null;
            const isBM = isBMCode(item.code);
            const isReq = item.required === true;
            const rodMissing = isReq && (!item.rod || item.rod.trim() === "");
            const rodHasValue = item.rod && item.rod.trim() !== "" && item.rod.trim() !== "0.00" && item.rod.trim() !== "0";
            const bmIncomplete = isBM && rodHasValue && (!item.inchesAbove || item.inchesAbove.trim() === "");
            return (
              <div key={item.id} style={{...S.shotRow, flexWrap:"wrap",
                background: isBM ? "#eff6ff" : isReq ? "#f0fdf4" : "transparent",
                borderLeft: isReq ? "3px solid #d97706" : "3px solid transparent"}}>
                {/* Main row */}
                <div style={{display:"flex",alignItems:"center",gap:6,width:"100%"}}>
                  <CodeSearch value={item.code}
                    onChange={v => updItem(item.id, "code", v)} />
                  <input
                    style={S.noteInp}
                    placeholder={GPS_CODES.find(x=>x.c===item.code)?.d || "Description / notes"}
                    value={item.note}
                    onChange={e => updItem(item.id, "note", e.target.value)}
                  />
                  <input
                    style={{...S.rodInp, border: rodMissing ? "2px solid #b91c1c" : "2px solid #d97706"}}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={item.rod}
                    onChange={e => updItem(item.id, "rod", e.target.value)}
                  />
                  <div style={{ ...S.elevCell, color: hasElev ? "#166534" : item.rod ? "#b45309" : "#9ca3af" }}>
                    {hasElev ? fmt(elevation) : item.rod ? "…" : "—"}
                  </div>
                  {isReq
                    ? <span style={S.reqLock} title="Required — delete to remove">🔒</span>
                    : <button style={S.removeBtn} onClick={() => removeItem(item.id)}>✕</button>}
                </div>
                {/* Required rod missing warning */}
                {isReq && rodMissing && (
                  <div style={S.reqWarn}>⚠ required — enter rod reading or delete this row</div>
                )}
                {/* BM extra field — inches above grade */}
                {isBM && (
                  <div style={S.bmExtraRow}>
                    <span style={S.bmExtraLabel}>📐 Inches above grade</span>
                    <input
                      style={{...S.rodInp, width:80, border: bmIncomplete ? "2px solid #b91c1c" : "2px solid #3b82f6"}}
                      inputMode="decimal"
                      placeholder='0.0"'
                      value={item.inchesAbove}
                      onChange={e => updItem(item.id, "inchesAbove", e.target.value)}
                    />
                    {bmIncomplete && <span style={{fontSize:10,color:"#b91c1c",fontWeight:700,marginLeft:4}}>required</span>}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── REFERENCE ELEVATION PANEL (at bottom, after shots) ── */}
          {(() => {
            // Build list of shots that have a rod reading — these can be the reference
            const shotOptions = items
              .filter(x => x.type === "shot" && x.rod && x.rod.trim() !== "")
              .map(x => ({ id: x.id, label: `${x.code}${x.note ? " — " + x.note : ""}`, rod: x.rod, code: x.code, note: x.note }));

            // Find the currently selected reference shot
            const refShot = refShotId ? items.find(x => x.id === refShotId) : null;

            // When a ref shot is selected, sync its data into bm (except elev)
            function selectRefShot(id) {
              setRefShotId(id);
              const shot = items.find(x => x.id === id);
              if (shot) {
                setInitBS(shot.rod);
                setBm(b => ({ ...b, code: shot.code || b.code, label: shot.note || b.label, desc: shot.note || b.desc }));
              }
            }

            return (
              <div style={S.refPanel}>
                <div style={S.refPanelTitle}>📍 Set Reference Elevation</div>
                <div style={{fontSize:11,color:"#6b7280",marginBottom:10}}>
                  After shooting, pick the rod reading that will become your reference elevation (e.g. 100.00 ft).
                </div>

                {/* Step 1: pick which shot */}
                <div style={{marginBottom:10}}>
                  <div style={S.fieldLabel}>Step 1 — Pick your reference shot</div>
                  <select style={{...S.sel, fontSize:14, padding:"11px 10px"}}
                    value={refShotId || ""}
                    onChange={e => e.target.value ? selectRefShot(e.target.value) : setRefShotId(null)}>
                    <option value="">— select a shot —</option>
                    {shotOptions.map(o => (
                      <option key={o.id} value={o.id}>{o.label} (rod: {o.rod})</option>
                    ))}
                  </select>
                </div>

                {/* Read-only info when a shot is selected */}
                {refShot && (
                  <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#166534",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Selected shot</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                      <div>
                        <div style={S.fieldLabel}>Code</div>
                        <div style={{fontSize:15,fontWeight:700,color:"#111"}}>{refShot.code || "—"}</div>
                      </div>
                      <div>
                        <div style={S.fieldLabel}>Notes</div>
                        <div style={{fontSize:14,color:"#374151"}}>{refShot.note || "—"}</div>
                      </div>
                      <div>
                        <div style={S.fieldLabel}>Backsight rod</div>
                        <div style={{fontSize:16,fontWeight:700,color:"#92400e"}}>{refShot.rod} ft</div>
                      </div>
                    </div>
                  </div>
                )}

                {shotOptions.length === 0 && (
                  <div style={{fontSize:12,color:"#9ca3af",textAlign:"center",padding:"6px 0 10px"}}>
                    No rod readings yet — shoot first, then set reference here
                  </div>
                )}

                {/* Step 2: elevation input — ALWAYS visible so you can type your ref elevation */}
                <div style={S.bsBanner}>
                  <div style={S.bsBannerLabel}>
                    {refShot
                      ? `Step 2 — Rod ${refShot.rod} ft equals what elevation?`
                      : "Step 2 — Enter reference elevation (ft)"}
                  </div>
                  <div style={{fontSize:11,color:"#374151",margin:"4px 0 8px"}}>
                    {refShot
                      ? `Type the elevation this rod reading (${refShot.rod} ft) represents`
                      : "e.g. 100.00 or 950.00 — pick a shot above first, or type directly"}
                  </div>
                  <input
                    style={{...S.inp, ...S.rodStyle, fontSize:24, padding:"14px 12px",
                      border:"3px solid #d97706", borderRadius:10}}
                    inputMode="decimal"
                    placeholder="100.00"
                    value={bm.elev}
                    onChange={e => setBm(b => ({...b, elev: e.target.value}))}
                  />
                  {initHI != null && (
                    <div style={S.hiDisplay}>HI = {fmt(initHI)} ft &nbsp;✓ elevations live</div>
                  )}
                </div>
              </div>
            );
          })()}

          <div ref={listEnd} />
        </div>

        {/* Bottom action bar */}
        <div style={S.actionBar}>
          <button style={S.addShotBtn} onClick={addShot}>+ Shot</button>
          <button style={S.addTurnBtn} onClick={addTurn}>⟳ Turn</button>
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
          <button style={S.hdrBack} onClick={() => setView("field")}>← Back</button>
          <div style={S.hdrMid}>
            <div style={S.hdrTitle}>Summary</div>
            <div style={S.hdrSub}>{rows.length} points · {TODAY}</div>
          </div>
          <div style={{width:70}}/>
        </div>

        <div style={S.exportBar}>
          <button style={S.expBtn} onClick={exportCSV}>↓ CSV</button>
          <button style={S.expBtn} onClick={openPrint}>⎙ Print / PDF</button>
        </div>

        <div style={{overflowX:"auto",flex:1}}>
          <table style={S.tbl}>
            <thead>
              <tr>
                <th style={S.th}>Code</th>
                <th style={S.th}>Description</th>
                <th style={S.th}>Setup</th>
                <th style={{...S.th,textAlign:"right"}}>Rod</th>
                <th style={{...S.th,textAlign:"right"}}>Elev (ft)</th>
                <th style={{...S.th,textAlign:"right"}}>In. Above</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i) => (
                <tr key={i} style={{background: r.isBM?"#dbeafe": i%2===0?"#ffffff":"#f9f7f4"}}>
                  <td style={{...S.td,color:"#1d4ed8",fontWeight:700}}>{r.code}</td>
                  <td style={{...S.td,fontSize:12}}>{r.label || "—"}</td>
                  <td style={{...S.td,fontSize:11,color:"#6b7280"}}>{r.setup}</td>
                  <td style={{...S.td,textAlign:"right",color:"#374151"}}>{r.rod||""}</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:700,
                    color: r.elev!=null?"#166534":"#b45309"}}>
                    {r.elev!=null?fmt(r.elev):"–"}
                  </td>
                  <td style={{...S.td,textAlign:"right",color:"#1d4ed8",fontWeight:700}}>
                    {r.inchesAbove ? `${r.inchesAbove}"` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {toast && <div style={S.toast}>{toast}</div>}
      </div>
    );
  }
}

// ── Styles — HIGH CONTRAST OUTDOOR / SUNLIGHT THEME ─────────────────────────
// White background, near-black text, bold accent colors that don't wash out
const BASE = { fontFamily:"'IBM Plex Mono','Courier New',monospace" };
const S = {
  page: { ...BASE, background:"#f5f0e8", minHeight:"100vh", color:"#111111",
    display:"flex", flexDirection:"column", maxWidth:480, margin:"0 auto" },

  // Setup screen
  setupHdr: { background:"#1a1a1a", borderBottom:"4px solid #d97706",
    paddingTop:"max(24px, calc(env(safe-area-inset-top) + 12px))",
    paddingBottom:"18px", paddingLeft:"20px", paddingRight:"20px",
    textAlign:"center" },
  logo: { fontSize:21, fontWeight:700, color:"#fbbf24", letterSpacing:"0.12em" },
  logoSub: { fontSize:11, color:"#9ca3af", marginTop:4 },
  setupBody: { padding:"16px 14px", flex:1 },
  block: { background:"#ffffff", border:"2px solid #d1cfc8", borderRadius:10,
    padding:"14px", marginBottom:14, boxShadow:"0 1px 4px rgba(0,0,0,.08)" },
  blockLabel: { fontSize:10, fontWeight:700, color:"#92400e", textTransform:"uppercase",
    letterSpacing:"0.1em", marginBottom:10 },
  fieldLabel: { fontSize:9, fontWeight:700, color:"#6b7280", textTransform:"uppercase",
    letterSpacing:"0.1em", marginBottom:4 },
  inp: { background:"#ffffff", border:"2px solid #9ca3af", borderRadius:8,
    color:"#111111", padding:"10px 12px", fontSize:15, width:"100%",
    outline:"none", fontFamily:"inherit" },
  rodStyle: { color:"#92400e", fontWeight:700, fontSize:18, textAlign:"right",
    letterSpacing:"0.04em", border:"2px solid #d97706", background:"#fffbeb" },
  bsBanner: { background:"#eff6ff", border:"2px solid #3b82f6", borderRadius:8, padding:"12px" },
  bsBannerLabel: { fontSize:10, color:"#1d4ed8", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" },
  hiDisplay: { marginTop:8, fontSize:18, fontWeight:700, color:"#166534", textAlign:"right" },
  goBtn: { width:"100%", background:"#d97706", color:"#ffffff", border:"none",
    borderRadius:12, padding:16, fontSize:17, fontWeight:700, cursor:"pointer",
    letterSpacing:"0.08em", textTransform:"uppercase", marginTop:4,
    boxShadow:"0 2px 8px rgba(217,119,6,.4)" },

  // Field header — dark bar stays readable against bright sky
  fieldHdr: { background:"#1a1a1a", borderBottom:"3px solid #d97706",
    paddingTop:"max(10px, env(safe-area-inset-top))",
    paddingBottom:"10px", paddingLeft:"8px", paddingRight:"8px",
    display:"flex", alignItems:"center", gap:4,
    position:"sticky", top:0, zIndex:10 },
  // Large tap targets — minimum 44px height, pushed away from screen edges
  hdrBack: { background:"#d97706", border:"none", color:"#ffffff",
    fontSize:14, fontWeight:700, cursor:"pointer",
    padding:"10px 14px", borderRadius:8, lineHeight:1, whiteSpace:"nowrap",
    minWidth:72, textAlign:"center" },
  hdrMid: { flex:1, textAlign:"center", padding:"0 4px" },
  hdrTitle: { fontSize:13, fontWeight:700, color:"#ffffff" },
  hdrSub: { fontSize:10, color:"#d1d5db", marginTop:1 },
  hdrSum: { background:"#d97706", border:"none", color:"#ffffff",
    fontSize:14, fontWeight:700, cursor:"pointer",
    padding:"10px 14px", borderRadius:8, lineHeight:1, whiteSpace:"nowrap",
    fontFamily:"inherit", minWidth:64, textAlign:"center" },

  // Reference elevation panel at bottom of shot list
  refPanel: { margin:"16px 8px 8px", background:"#ffffff", border:"2px solid #1d4ed8",
    borderRadius:12, padding:"14px", boxShadow:"0 2px 8px rgba(0,0,0,.1)" },
  refPanelTitle: { fontSize:12, fontWeight:700, color:"#1d4ed8", textTransform:"uppercase",
    letterSpacing:"0.08em", marginBottom:6 },

  // Shot list
  shotList: { flex:1, overflowY:"auto", paddingBottom:"calc(90px + env(safe-area-inset-bottom))" },
  colHdr: { display:"flex", alignItems:"center", gap:6, padding:"6px 10px 5px",
    background:"#e5e1d8", borderBottom:"2px solid #c4bfb5",
    fontSize:9, fontWeight:700, color:"#4b5563", textTransform:"uppercase",
    letterSpacing:"0.08em" },
  shotRow: { display:"flex", alignItems:"center", gap:6, padding:"10px 10px",
    borderBottom:"2px solid #e5e1d8", background:"transparent" },

  // Code search
  codeInp: { background:"#fffbeb", border:"2px solid #d97706", borderRadius:6,
    color:"#92400e", padding:"10px 7px", fontSize:14, fontWeight:700,
    width:"100%", outline:"none", fontFamily:"inherit", textAlign:"center",
    letterSpacing:"0.05em", textTransform:"uppercase" },
  dropdown: { position:"absolute", top:"100%", left:0, width:210, background:"#ffffff",
    border:"2px solid #1a1a1a", borderRadius:10, zIndex:50,
    boxShadow:"0 8px 24px rgba(0,0,0,.25)", maxHeight:300, overflowY:"auto" },
  dropRow: { display:"block", padding:"11px 14px", borderBottom:"1px solid #e5e7eb",
    cursor:"pointer", textAlign:"left", width:"100%", background:"transparent" },
  dropCode: { fontSize:16, fontWeight:700, color:"#92400e", letterSpacing:"0.05em",
    lineHeight:1.2 },
  dropDesc: { fontSize:11, color:"#6b7280", marginTop:2, lineHeight:1.3 },

  noteInp: { flex:1, background:"transparent", border:"none", borderBottom:"2px solid #d1d5db",
    borderRadius:0, color:"#111111", padding:"10px 6px", fontSize:13,
    outline:"none", fontFamily:"inherit" },
  rodInp: { width:76, background:"#fffbeb", border:"2px solid #d97706", borderRadius:6,
    color:"#92400e", padding:"10px 7px", fontSize:16, fontWeight:700, textAlign:"right",
    outline:"none", fontFamily:"inherit" },
  elevCell: { width:80, textAlign:"right", fontSize:15, fontWeight:700,
    letterSpacing:"0.02em", paddingRight:4 },
  removeBtn: { background:"#f3f4f6", border:"1px solid #d1d5db", color:"#6b7280",
    fontSize:16, cursor:"pointer", padding:"6px 9px", lineHeight:1, borderRadius:6,
    minWidth:32, textAlign:"center" },

  // Turn block
  turnBlock: { margin:"6px 8px", borderRadius:10, overflow:"hidden",
    border:"3px solid #d97706" },
  turnLabel: { background:"#d97706", padding:"8px 12px", display:"flex",
    alignItems:"center", gap:8, fontSize:10, fontWeight:700, color:"#ffffff",
    textTransform:"uppercase", letterSpacing:"0.1em" },
  turnIcon: { fontSize:14 },
  turnBody: { background:"#fffbeb", padding:"10px 12px" },
  turnHIrow: { fontSize:12, color:"#374151", marginTop:4, fontWeight:600 },
  sel: { background:"#ffffff", border:"2px solid #9ca3af", borderRadius:8,
    color:"#111111", padding:"9px 10px", fontSize:13, width:"100%",
    outline:"none", fontFamily:"inherit" },

  // Required shot row
  reqLock: { fontSize:14, padding:"6px 9px", cursor:"default", userSelect:"none",
    background:"#fef3c7", border:"1px solid #d97706", borderRadius:6, lineHeight:1 },
  reqWarn: { width:"100%", padding:"3px 10px 7px 12px", fontSize:11, color:"#b91c1c",
    letterSpacing:"0.02em", fontWeight:700 },
  // BM top row in field list
  bmRow: { background:"#eff6ff", borderBottom:"3px solid #3b82f6", padding:"10px 10px 10px 12px",
    display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 },
  bmRowLeft: { display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 },
  bmCodeBadge: { background:"#1d4ed8", color:"#ffffff", padding:"5px 10px", borderRadius:6,
    fontSize:13, fontWeight:700, letterSpacing:"0.05em", flexShrink:0 },
  bmRowRight: { display:"flex", gap:14, alignItems:"flex-end", flexShrink:0 },
  // BM extra inches-above-grade sub-row
  bmExtraRow: { display:"flex", alignItems:"center", gap:8, padding:"8px 10px 10px 12px",
    width:"100%", background:"#dbeafe", borderTop:"1px solid #93c5fd" },
  bmExtraLabel: { fontSize:11, color:"#1d4ed8", flex:1, fontWeight:700 },

  // Action bar
  actionBar: { position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
    width:"100%", maxWidth:480, background:"#1a1a1a",
    borderTop:"3px solid #d97706",
    paddingTop:"10px", paddingLeft:"14px", paddingRight:"14px",
    paddingBottom:"max(10px, env(safe-area-inset-bottom))",
    display:"flex", gap:10, zIndex:20 },
  addShotBtn: { flex:2, background:"#d97706", color:"#ffffff", border:"none",
    borderRadius:10, padding:15, fontSize:16, fontWeight:700, cursor:"pointer",
    boxShadow:"0 2px 6px rgba(217,119,6,.5)" },
  addTurnBtn: { flex:1, background:"#374151", color:"#fbbf24",
    border:"2px solid #d97706", borderRadius:10, padding:15,
    fontSize:14, fontWeight:700, cursor:"pointer" },

  // Summary
  exportBar: { display:"flex", gap:10, padding:"12px 12px",
    borderBottom:"2px solid #d1cfc8", alignItems:"center", background:"#ffffff" },
  expBtn: { background:"#374151", border:"none", borderRadius:8,
    color:"#ffffff", padding:"13px 22px", fontSize:15, fontWeight:700, cursor:"pointer",
    fontFamily:"inherit", flex:1 },
  driveLink: { color:"#1d4ed8", fontSize:13, textDecoration:"none", marginLeft:4, fontWeight:700 },
  tbl: { width:"100%", borderCollapse:"collapse", fontSize:13 },
  th: { padding:"8px 12px", textAlign:"left", fontSize:9, fontWeight:700,
    color:"#374151", textTransform:"uppercase", letterSpacing:"0.1em",
    borderBottom:"2px solid #374151", background:"#e5e1d8",
    position:"sticky", top:0 },
  td: { padding:"9px 12px", borderBottom:"1px solid #e5e1d8", verticalAlign:"middle",
    background:"#ffffff" },

  toast: { position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)",
    background:"#1a1a1a", border:"2px solid #d97706", borderRadius:10,
    padding:"12px 22px", fontSize:14, color:"#ffffff", zIndex:200,
    whiteSpace:"nowrap", boxShadow:"0 4px 16px rgba(0,0,0,.4)", fontWeight:700 },
};
