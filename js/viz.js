// js/viz.js
// Map + Top ZIPs bar chart + Equity scatter
// Data: ../data/solar.csv (ZIP-level aggregates)

(async function () {
  const SOLAR_CSV_URL = "../data/solar.csv";

  // CA ZIP polygons (GeoJSON)
  // Source repo: OpenDataDE/State-zip-code-GeoJSON :contentReference[oaicite:3]{index=3}
  const CA_ZIPS_GEOJSON_URL =
    "https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ca_california_zip_codes_geo.min.json";

  const elMetric = document.getElementById("metric");
  const elZipSearch = document.getElementById("zipSearch");
  const elResetBtn = document.getElementById("resetBtn");

  const elStatus = document.getElementById("status");
  const elKpiCsv = document.getElementById("kpiCsv");
  const elKpiMatched = document.getElementById("kpiMatched");
  const elChip = document.getElementById("activeMetricChip");

  const mapStage = document.getElementById("mapStage");
  const barsStage = document.getElementById("barsStage");
  const scatterStage = document.getElementById("scatterStage");
  const elTt = document.getElementById("tt");
  const legendHost = document.getElementById("legend");

  const metrics = {
    total_subsidy:      { label: "Incentives ($)",            fmt: d3.format("$,.0f") },
    total_kW:           { label: "Capacity (kW)",             fmt: d3.format(",.0f") },
    project_count:      { label: "Projects",                  fmt: d3.format(",") },
    low_income_subsidy: { label: "Low-income incentives ($)", fmt: d3.format("$,.0f") },
    low_income_kW:      { label: "Low-income capacity (kW)",  fmt: d3.format(",.0f") },
    low_projects:       { label: "Low-income projects",       fmt: d3.format(",") },
    equity_share:       { label: "Equity share",              fmt: d => d3.format(".1%")(d) },
  };

  // ---- Helpers
  const zip5 = (v) => {
    const s = String(v ?? "").trim();
    const digits = s.replace(/\D/g, "");
    if (!digits) return null;
    return digits.padStart(5, "0").slice(0, 5);
  };

  const getZipFromFeature = (f) => {
    const p = f.properties || {};
    const candidates = [
      p.ZCTA5CE10, p.ZCTA5CE20, p.ZCTA5CE,
      p.ZIP_CODE, p.ZIPCODE, p.ZIP, p.zip, p.zipcode,
      p.GEOID10, p.GEOID20, p.GEOID,
    ];
    const found = candidates.find(v => v != null && String(v).trim() !== "");
    return zip5(found);
  };

  const setStatus = (msg) => { if (elStatus) elStatus.textContent = msg; };

  // ---- Load data
  let geo, rows, byZip;
  try {
    setStatus("Loading boundaries + CSV…");

    const [geoJson, csvRows] = await Promise.all([
      d3.json(CA_ZIPS_GEOJSON_URL),
      d3.csv(SOLAR_CSV_URL, d3.autoType),
    ]);

    geo = geoJson;
    rows = csvRows.map(d => ({ ...d, ZIP: zip5(d.ZIP) })).filter(d => d.ZIP);
    byZip = new Map(rows.map(d => [d.ZIP, d]));

    // KPIs
    if (elKpiCsv) elKpiCsv.textContent = d3.format(",")(rows.length);

    // Dropdown
    elMetric.innerHTML = "";
    for (const [k, meta] of Object.entries(metrics)) {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = meta.label;
      elMetric.appendChild(opt);
    }
    elMetric.value = "total_subsidy";

    // Build visuals
    const api = buildAll();

    // Wire controls
    elMetric.addEventListener("change", () => api.update(elMetric.value));

    elZipSearch?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const z = zip5(elZipSearch.value);
      if (!z) return;
      api.focusZip(z);
    });

    elResetBtn?.addEventListener("click", () => api.reset());

    // First render
    api.update(elMetric.value);
    setStatus("Loaded.");
  } catch (err) {
    console.error(err);
    setStatus("Failed to load. Open DevTools → Console for details.");
  }

  // ---- Build all charts
  function buildAll() {
    // ===== MAP =====
    const mapW = mapStage.clientWidth;
    const mapH = Math.max(520, Math.round(mapW * 0.62));

    const svgMap = d3.select(mapStage).append("svg")
      .attr("width", mapW)
      .attr("height", mapH)
      .attr("viewBox", `0 0 ${mapW} ${mapH}`);

    const gMap = svgMap.append("g");

    const projection = d3.geoMercator().fitSize([mapW, mapH], geo);
    const path = d3.geoPath(projection);

    // Track which ZIPs exist in both geometry + CSV
    const matched = new Set();
    for (const f of geo.features || []) {
      const z = getZipFromFeature(f);
      if (z && byZip.has(z)) matched.add(z);
    }
    if (elKpiMatched) elKpiMatched.textContent = d3.format(",")(matched.size);

    // Zoom
    const zoom = d3.zoom()
      .scaleExtent([1, 10])
      .on("zoom", (event) => gMap.attr("transform", event.transform));

    svgMap.call(zoom);

    // Draw polygons
    const features = (geo.features || []).map(f => ({ f, zip: getZipFromFeature(f) }));
    const paths = gMap.selectAll("path")
      .data(features)
      .join("path")
      .attr("d", d => path(d.f))
      .attr("fill", "rgba(11,18,32,.06)")
      .attr("stroke", "rgba(11,18,32,.08)")
      .attr("stroke-width", 0.5);

    // ===== LEGEND =====
    const legendSvg = d3.select(legendHost).append("svg")
      .attr("width", 340)
      .attr("height", 46);

    const gLegend = legendSvg.append("g").attr("transform", "translate(6,6)");

    // ===== TOP BARS =====
    const barsW = barsStage.clientWidth;
    const barsH = 320;

    const svgBars = d3.select(barsStage).append("svg")
      .attr("width", barsW)
      .attr("height", barsH)
      .attr("viewBox", `0 0 ${barsW} ${barsH}`);

    const gBars = svgBars.append("g").attr("transform", "translate(12,10)");
    const barsInnerW = barsW - 24;
    const barsInnerH = barsH - 20;

    // ===== SCATTER =====
    const scW = scatterStage.clientWidth;
    const scH = 320;

    const svgSc = d3.select(scatterStage).append("svg")
      .attr("width", scW)
      .attr("height", scH)
      .attr("viewBox", `0 0 ${scW} ${scH}`);

    const gSc = svgSc.append("g").attr("transform", "translate(44,12)");
    const scInnerW = scW - 56;
    const scInnerH = scH - 44;

    const scXA = gSc.append("g").attr("transform", `translate(0,${scInnerH})`);
    const scYA = gSc.append("g");

    // Selection state
    let selectedZip = null;
    let lastMetric = null;

    // Tooltip helpers
    const showTt = (html, x, y) => {
      elTt.innerHTML = html;
      elTt.style.left = `${x}px`;
      elTt.style.top = `${y}px`;
      elTt.style.opacity = 1;
    };
    const hideTt = () => { elTt.style.opacity = 0; };

    paths
      .on("mousemove", (event, d) => {
        const z = d.zip;
        if (!z || !byZip.has(z)) return hideTt();

        const r = byZip.get(z);
        const meta = metrics[lastMetric] || metrics.total_subsidy;
        const v = r[lastMetric];

        showTt(
          `
            <div class="zip">${z}</div>
            <div class="row"><span>${meta.label}</span><b>${meta.fmt(v)}</b></div>
            <div style="height:6px"></div>
            <div class="row"><span>Projects</span><b>${d3.format(",")(r.project_count ?? 0)}</b></div>
            <div class="row"><span>Capacity</span><b>${d3.format(",.0f")(r.total_kW ?? 0)} kW</b></div>
            <div class="row"><span>Low-income share</span><b>${d3.format(".1%")(r.equity_share ?? 0)}</b></div>
          `,
          event.offsetX,
          event.offsetY
        );
      })
      .on("mouseleave", hideTt)
      .on("click", (event, d) => {
        if (!d.zip || !byZip.has(d.zip)) return;
        selectedZip = (selectedZip === d.zip) ? null : d.zip;
        updateSelectionStyles();
        updateSideHighlights();
      });

    function updateSelectionStyles() {
      paths
        .attr("stroke-width", d => (d.zip && d.zip === selectedZip) ? 1.8 : 0.5)
        .attr("stroke", d => (d.zip && d.zip === selectedZip) ? "rgba(31,138,91,.85)" : "rgba(11,18,32,.08)");
    }

    function renderLegend(colorScale, label) {
      gLegend.selectAll("*").remove();

      const colors = colorScale.range();
      const thresholds = colorScale.quantiles?.() ?? [];

      gLegend.append("text")
        .attr("x", 0)
        .attr("y", 10)
        .attr("font-size", 12)
        .attr("fill", "rgba(11,18,32,.72)")
        .text(label);

      const row = gLegend.append("g").attr("transform", "translate(0,18)");
      const w = 18, h = 10, gap = 6;

      row.selectAll("rect")
        .data(colors)
        .join("rect")
        .attr("x", (_, i) => i * (w + gap))
        .attr("y", 0)
        .attr("width", w)
        .attr("height", h)
        .attr("rx", 3)
        .attr("fill", d => d)
        .attr("stroke", "rgba(11,18,32,.10)");

      // tiny range labels
      const t = [d3.min(colorScale.domain()), ...thresholds, d3.max(colorScale.domain())].filter(d => d != null);
      const fmt = (x) => {
        if (label.includes("%")) return d3.format(".0%")(x);
        if (label.includes("$")) return d3.format("$,.0f")(x);
        return d3.format(",.0f")(x);
      };

      gLegend.append("text")
        .attr("x", 0)
        .attr("y", 42)
        .attr("font-size", 11)
        .attr("fill", "rgba(11,18,32,.54)")
        .text(`${fmt(t[0])} → ${fmt(t[t.length - 1])}`);
    }

    function renderBars(metricKey) {
      gBars.selectAll("*").remove();

      const meta = metrics[metricKey];
      const data = rows
        .filter(d => d[metricKey] != null && !Number.isNaN(d[metricKey]))
        .sort((a, b) => d3.descending(a[metricKey], b[metricKey]))
        .slice(0, 12);

      const y = d3.scaleBand()
        .domain(data.map(d => d.ZIP))
        .range([0, barsInnerH - 18])
        .padding(0.2);

      const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[metricKey]) || 1])
        .nice()
        .range([0, barsInnerW - 56]);

      gBars.append("g")
        .attr("transform", `translate(0,${barsInnerH - 18})`)
        .call(d3.axisBottom(x).ticks(4).tickFormat(meta.fmt))
        .call(g => g.selectAll("text").attr("font-size", 11).attr("fill", "rgba(11,18,32,.54)"))
        .call(g => g.selectAll("path,line").attr("stroke", "rgba(11,18,32,.12)"));

      gBars.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .call(g => g.selectAll("text").attr("font-size", 11).attr("fill", "rgba(11,18,32,.72)"))
        .call(g => g.select(".domain").remove());

      const bars = gBars.selectAll("rect.bar")
        .data(data, d => d.ZIP)
        .join("rect")
        .attr("class", "bar")
        .attr("x", 1)
        .attr("y", d => y(d.ZIP))
        .attr("height", y.bandwidth())
        .attr("width", d => x(d[metricKey]))
        .attr("rx", 6)
        .attr("fill", d => (d.ZIP === selectedZip) ? "rgba(31,138,91,.55)" : "rgba(43,108,176,.30)")
        .attr("stroke", "rgba(11,18,32,.10)");

      bars
        .on("mousemove", (event, d) => {
          showTt(
            `<div class="zip">${d.ZIP}</div><div class="row"><span>${meta.label}</span><b>${meta.fmt(d[metricKey])}</b></div>`,
            event.offsetX + (barsStage.offsetLeft - mapStage.offsetLeft),
            event.offsetY + (barsStage.offsetTop - mapStage.offsetTop)
          );
        })
        .on("mouseleave", hideTt)
        .on("click", (_, d) => {
          selectedZip = (selectedZip === d.ZIP) ? null : d.ZIP;
          updateSelectionStyles();
          updateSideHighlights();
          renderBars(metricKey);
          renderScatter(metricKey);
        });
    }

    function renderScatter(metricKey) {
      gSc.selectAll("circle").remove();

      const meta = metrics[metricKey];
      const data = rows.filter(d => d.equity_share != null && d[metricKey] != null);

      const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.equity_share) || 1])
        .nice()
        .range([0, scInnerW]);

      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[metricKey]) || 1])
        .nice()
        .range([scInnerH, 0]);

      scXA.call(d3.axisBottom(x).ticks(4).tickFormat(d3.format(".0%")))
        .call(g => g.selectAll("text").attr("font-size", 11).attr("fill", "rgba(11,18,32,.54)"))
        .call(g => g.selectAll("path,line").attr("stroke", "rgba(11,18,32,.12)"));

      scYA.call(d3.axisLeft(y).ticks(4).tickFormat(meta.fmt))
        .call(g => g.selectAll("text").attr("font-size", 11).attr("fill", "rgba(11,18,32,.54)"))
        .call(g => g.selectAll("path,line").attr("stroke", "rgba(11,18,32,.12)"));

      gSc.selectAll("circle")
        .data(data, d => d.ZIP)
        .join("circle")
        .attr("cx", d => x(d.equity_share))
        .attr("cy", d => y(d[metricKey]))
        .attr("r", d => (d.ZIP === selectedZip) ? 5.5 : 3.2)
        .attr("fill", d => (d.ZIP === selectedZip) ? "rgba(31,138,91,.65)" : "rgba(43,108,176,.35)")
        .attr("stroke", "rgba(11,18,32,.14)")
        .on("mousemove", (event, d) => {
          showTt(
            `
              <div class="zip">${d.ZIP}</div>
              <div class="row"><span>${meta.label}</span><b>${meta.fmt(d[metricKey])}</b></div>
              <div class="row"><span>Equity share</span><b>${d3.format(".1%")(d.equity_share)}</b></div>
            `,
            event.offsetX + (scatterStage.offsetLeft - mapStage.offsetLeft),
            event.offsetY + (scatterStage.offsetTop - mapStage.offsetTop)
          );
        })
        .on("mouseleave", hideTt)
        .on("click", (_, d) => {
          selectedZip = (selectedZip === d.ZIP) ? null : d.ZIP;
          updateSelectionStyles();
          updateSideHighlights();
          renderBars(metricKey);
          renderScatter(metricKey);
        });
    }

    function updateChoropleth(metricKey) {
      lastMetric = metricKey;
      const meta = metrics[metricKey];

      const values = features
        .map(d => d.zip && byZip.get(d.zip)?.[metricKey])
        .filter(v => v != null && !Number.isNaN(v));

      const domain = d3.extent(values);
      const color = d3.scaleQuantile()
        .domain(values)
        .range([
          "rgba(43,108,176,.10)",
          "rgba(43,108,176,.18)",
          "rgba(43,108,176,.28)",
          "rgba(31,138,91,.32)",
          "rgba(31,138,91,.48)",
          "rgba(31,138,91,.62)",
        ]);

      paths
        .attr("fill", d => {
          if (!d.zip) return "rgba(11,18,32,.04)";
          const r = byZip.get(d.zip);
          const v = r?.[metricKey];
          if (v == null || Number.isNaN(v)) return "rgba(11,18,32,.04)";
          return color(v);
        });

      // chip + legend label
      if (elChip) elChip.textContent = meta.label;
      renderLegend(color, meta.label);
      renderBars(metricKey);
      renderScatter(metricKey);

      return { domain };
    }

    function updateSideHighlights() {
      // no-op for now; bars/scatter rerender handle highlighting
    }

    function focusZip(zip) {
      // try to find the matching feature; if missing, do nothing
      const f = features.find(d => d.zip === zip);
      if (!f) return;

      selectedZip = zip;
      updateSelectionStyles();
      updateSideHighlights();

      // zoom to bounds
      const b = path.bounds(f.f);
      const dx = b[1][0] - b[0][0];
      const dy = b[1][1] - b[0][1];
      const cx = (b[0][0] + b[1][0]) / 2;
      const cy = (b[0][1] + b[1][1]) / 2;

      const scale = Math.max(1, Math.min(10, 0.85 / Math.max(dx / mapW, dy / mapH)));
      const tx = mapW / 2 - scale * cx;
      const ty = mapH / 2 - scale * cy;

      svgMap.transition().duration(450).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }

    function reset() {
      selectedZip = null;
      updateSelectionStyles();
      svgMap.transition().duration(350).call(zoom.transform, d3.zoomIdentity);
      if (elZipSearch) elZipSearch.value = "";
      if (lastMetric) {
        renderBars(lastMetric);
        renderScatter(lastMetric);
      }
    }

    return {
      update: (metricKey) => updateChoropleth(metricKey),
      focusZip,
      reset,
    };
  }
})();
