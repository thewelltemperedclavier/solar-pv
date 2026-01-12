// js/viz.js
// Loads CA ZIP/ZCTA-like boundaries (GeoJSON) + joins your ../data/solar.csv by ZIP,
// then renders an interactive choropleth with zoom/pan, tooltip, and a metric dropdown.

(async function () {
  // 1) Your data (relative to /dashboard/index.html)
  const SOLAR_CSV_URL = "../data/solar.csv";

  // 2) California ZIP boundaries (remote GeoJSON)
  // You already have California “code” here: we fetch CA ZIP polygons from GitHub.
  // If you found a different CA GeoJSON, paste its *RAW* link into this string.
  const CA_ZIPS_GEOJSON_URL =
    "https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ca_california_zip_codes_geo.min.json";

  // --- Minimal dashboard styling (so you don't have to touch style.css) ---
  // If your style.css already defines these classes, this will largely match it.
  const style = document.createElement("style");
  style.textContent = `
    :root { --bg:#fbfbfc; --ink:#111827; --muted:#6b7280; --card:#ffffff; --stroke:#e5e7eb; }
    body { margin:0; background:var(--bg); color:var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
    .wrap { max-width: 1100px; margin: 28px auto; padding: 0 18px; }
    .card { background:var(--card); border:1px solid var(--stroke); border-radius:18px;
      box-shadow: 0 10px 30px rgba(17,24,39,.06); overflow:hidden; }
    .topbar { display:flex; gap:12px; align-items:center; justify-content:space-between;
      padding:14px 16px; border-bottom:1px solid var(--stroke); }
    .title { font-weight:650; letter-spacing:-.01em; }
    .controls { display:flex; gap:10px; align-items:center; color:var(--muted); font-size: 13px; }
    select { border:1px solid var(--stroke); border-radius:12px; padding:8px 10px; background:#fff; color:var(--ink); }
    #chart { position:relative; }
    svg { display:block; width:100%; height:auto; }
    .tooltip {
      position:absolute; pointer-events:none; opacity:0;
      background:#fff; border:1px solid var(--stroke); border-radius:12px;
      padding:10px 12px; box-shadow: 0 12px 26px rgba(17,24,39,.12);
      font-size: 12px; line-height: 1.35;
      transform: translate(12px, 12px);
      min-width: 180px;
    }
    .tooltip .zip { font-weight:650; margin-bottom:6px; }
    .tooltip .row { display:flex; justify-content:space-between; gap:10px; color:var(--muted); }
    .tooltip .row b { color:var(--ink); font-weight:600; }
    .hint { padding:10px 16px; color:var(--muted); font-size: 12px; border-top:1px solid var(--stroke); }
    .legend text { user-select:none; }
  `;
  document.head.appendChild(style);

  // --- Metrics (matches your solar.csv columns) ---
  const metrics = {
    total_subsidy:      { label: "Total subsidy ($)",        fmt: d3.format("$,.0f") },
    total_kW:           { label: "Total capacity (kW)",      fmt: d3.format(",.0f") },
    project_count:      { label: "Project count",            fmt: d3.format(",") },
    low_income_subsidy: { label: "Low-income subsidy ($)",   fmt: d3.format("$,.0f") },
    low_income_kW:      { label: "Low-income capacity (kW)", fmt: d3.format(",.0f") },
    low_projects:       { label: "Low-income projects",      fmt: d3.format(",") },
    equity_share:       { label: "Equity share",             fmt: d => d3.format(".1%")(d) },
  };

  // --- DOM checks ---
  const elChart = document.getElementById("chart");
  const elMetric = document.getElementById("metric");
  const elTT = document.getElementById("tt");

  if (!elChart || !elMetric || !elTT) {
    console.error("Missing required elements: #chart, #metric, #tt");
    return;
  }

  // Populate dropdown
  elMetric.innerHTML = "";
  for (const [k, meta] of Object.entries(metrics)) {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = meta.label;
    elMetric.appendChild(opt);
  }
  elMetric.value = "total_subsidy";

  // --- Helpers ---
  function zip5(v) {
    const s = String(v ?? "").trim();
    if (!s) return null;
    const digits = s.replace(/\D/g, "");
    if (!digits) return null;
    return digits.padStart(5, "0").slice(0, 5);
  }

  function getZipFromFeature(f) {
    const p = f.properties || {};
    const candidates = [
      p.ZCTA5CE10, p.ZCTA5CE20, p.ZCTA5CE,
      p.ZIP_CODE, p.ZIPCODE, p.ZIP, p.zip, p.zipcode,
      p.GEOID10, p.GEOID20, p.GEOID, p.postalCode, p.POSTALCODE
    ];
    const found = candidates.find(v => v != null && String(v).trim() !== "");
    return zip5(found);
  }

  function fmtSmartNumber(x) {
    if (x == null || Number.isNaN(x)) return "—";
    const ax = Math.abs(x);
    if (ax >= 1e9) return d3.format(",.2s")(x).replace("G", "B");
    if (ax >= 1e6) return d3.format(",.2s")(x);
    return d3.format(",")(x);
  }

  function showTooltip(event, zip, row, metricKey) {
    const m = metrics[metricKey];
    const val = row ? row[metricKey] : null;

    const [mx, my] = d3.pointer(event, elChart);

    elTT.style.opacity = "1";
    elTT.style.left = `${mx}px`;
    elTT.style.top = `${my}px`;

    elTT.innerHTML = `
      <div class="zip">ZIP ${zip ?? "—"}</div>
      <div class="row"><span>${m.label}</span><b>${(val == null || Number.isNaN(val)) ? "—" : m.fmt(val)}</b></div>
      <div style="height:8px"></div>
      <div class="row"><span>Total subsidy</span><b>${row ? d3.format("$,.0f")(row.total_subsidy) : "—"}</b></div>
      <div class="row"><span>Total kW</span><b>${row ? d3.format(",.0f")(row.total_kW) : "—"}</b></div>
      <div class="row"><span>Projects</span><b>${row ? d3.format(",")(row.project_count) : "—"}</b></div>
    `;
  }

  function hideTooltip() {
    elTT.style.opacity = "0";
  }

  // --- Sizing ---
  let width = 900;
  let height = 650;

  function computeSize() {
    const rect = elChart.getBoundingClientRect();
    width = Math.max(320, Math.round(rect.width || 900));
    height = Math.round(Math.min(760, width * 0.70));
  }

  // --- Render state ---
  let geo = null;
  let byZip = null;
  let svg = null;
  let g = null;
  let projection = null;
  let path = null;
  let legendG = null;

  function buildSvg() {
    elChart.querySelectorAll("svg").forEach(n => n.remove());

    svg = d3.select(elChart)
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`);

    g = svg.append("g");

    legendG = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(16, ${height - 16})`);

    svg.call(
      d3.zoom()
        .scaleExtent([1, 10])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );
  }

  function attachRowsToFeatures() {
    for (const f of geo.features) {
      const z = getZipFromFeature(f);
      f.properties.__zip = z;
      f.properties.__row = z ? byZip.get(z) : undefined;
    }
  }

  function drawLegend(colorScale, metricKey, values) {
    legendG.selectAll("*").remove();

    const m = metrics[metricKey];
    const hasValues = values.length > 0;

    const pad = 10;
    const boxW = 300;
    const boxH = 76;

    const box = legendG.append("g").attr("transform", `translate(0, ${-boxH})`);

    box.append("rect")
      .attr("x", 0).attr("y", 0)
      .attr("width", boxW).attr("height", boxH)
      .attr("rx", 12)
      .attr("fill", "#fff")
      .attr("stroke", "#e5e7eb")
      .attr("opacity", 0.95);

    box.append("text")
      .attr("x", pad).attr("y", 22)
      .attr("font-size", 12)
      .attr("fill", "#111827")
      .attr("font-weight", 600)
      .text(m.label);

    if (!hasValues) {
      box.append("text")
        .attr("x", pad).attr("y", 46)
        .attr("font-size", 11)
        .attr("fill", "#6b7280")
        .text("No data values found for this metric.");
      return;
    }

    const colors = colorScale.range();
    const thresholds = colorScale.quantiles();

    const swatchY = 32;
    const swatchSize = 12;
    const swatchGap = 6;

    const row = box.append("g").attr("transform", `translate(${pad}, ${swatchY})`);

    row.selectAll("rect")
      .data(colors)
      .join("rect")
      .attr("x", (_, i) => i * (swatchSize + swatchGap))
      .attr("y", 0)
      .attr("width", swatchSize)
      .attr("height", swatchSize)
      .attr("rx", 3)
      .attr("fill", d => d)
      .attr("stroke", "#e5e7eb");

    const firstHi = thresholds[0];
    const lastLo = thresholds[thresholds.length - 1];

    box.append("text")
      .attr("x", pad).attr("y", 64)
      .attr("font-size", 11)
      .attr("fill", "#6b7280")
      .text(`≤ ${fmtSmartNumber(firstHi)}   …   > ${fmtSmartNumber(lastLo)}`);
  }

  function render(metricKey) {
    const values = geo.features
      .map(f => f.properties.__row?.[metricKey])
      .filter(v => v != null && !Number.isNaN(v));

    const color = d3.scaleQuantile()
      .domain(values.length ? values : [0])
      .range(d3.quantize(t => d3.interpolateBlues(0.15 + 0.75 * t), 7));

    g.selectAll("path.zip")
      .data(geo.features)
      .join("path")
      .attr("class", "zip")
      .attr("d", path)
      .attr("fill", f => {
        const v = f.properties.__row?.[metricKey];
        return (v == null || Number.isNaN(v)) ? "#f3f4f6" : color(v);
      })
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 0.6)
      .on("mousemove", (event, f) => {
        showTooltip(event, f.properties.__zip, f.properties.__row, metricKey);
      })
      .on("mouseleave", hideTooltip);

    drawLegend(color, metricKey, values);
  }

  // --- Init ---
  try {
    computeSize();
    buildSvg();

    const [geoJson, solarRows] = await Promise.all([
      d3.json(CA_ZIPS_GEOJSON_URL),
      d3.csv(SOLAR_CSV_URL, d3.autoType),
    ]);

    geo = geoJson;

    // lookup: ZIP -> row
    byZip = new Map(
      solarRows
        .map(d => ({ ...d, ZIP: zip5(d.ZIP) }))
        .filter(d => d.ZIP)
        .map(d => [d.ZIP, d])
    );

    projection = d3.geoMercator().fitSize([width, height], geo);
    path = d3.geoPath(projection);

    attachRowsToFeatures();
    render(elMetric.value);

    elMetric.addEventListener("change", () => render(elMetric.value));

    // Resize: simple and robust
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        computeSize();
        buildSvg();
        projection = d3.geoMercator().fitSize([width, height], geo);
        path = d3.geoPath(projection);
        render(elMetric.value);
      }, 120);
    });
  } catch (err) {
    console.error(err);
    alert(
      "Map failed to load.\n\n" +
      "Most common cause: opening the HTML as file:// instead of running a local server.\n" +
      "Run: python3 -m http.server 8000\n" +
      "Then open: http://localhost:8000/dashboard/\n\n" +
      "Check DevTools Console for the exact error."
    );
  }
})();
