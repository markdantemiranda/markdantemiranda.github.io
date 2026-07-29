(function () {
  "use strict";

  const dataEl = document.getElementById("dashboard-data");
  if (!dataEl) return;
  const DATA = JSON.parse(dataEl.textContent);

  const css = getComputedStyle(document.documentElement);
  const v = (name) => css.getPropertyValue(name).trim();

  const COLORS = {
    text: v("--text-primary") || "#f4f4f5",
    textSecondary: v("--text-secondary") || "#a1a1aa",
    textTertiary: v("--text-tertiary") || "#71717a",
    grid: "rgba(255, 255, 255, 0.06)",
    tooltipBg: v("--bg-surface") || "#1f1f23",
    tooltipBorder: v("--stroke-primary") || "#2a2a30",
    info: v("--tone-info") || "#e85ab8",
    success: v("--tone-success") || "#22c55e",
    warning: v("--tone-warning") || "#f59e0b",
    danger: v("--tone-danger") || "#ef4444",
    neutral: v("--tone-neutral") || "#71717a",
  };

  if (typeof Chart === "undefined") {
    console.error("Chart.js failed to load");
    return;
  }

  Chart.defaults.color = COLORS.textSecondary;
  Chart.defaults.font.family =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif';
  Chart.defaults.font.size = 12;
  Chart.defaults.borderColor = COLORS.grid;
  Chart.defaults.plugins.legend.labels.boxWidth = 10;
  Chart.defaults.plugins.legend.labels.boxHeight = 10;
  Chart.defaults.plugins.legend.labels.padding = 12;
  Chart.defaults.plugins.tooltip.backgroundColor = COLORS.tooltipBg;
  Chart.defaults.plugins.tooltip.borderColor = COLORS.tooltipBorder;
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.titleColor = COLORS.text;
  Chart.defaults.plugins.tooltip.bodyColor = COLORS.textSecondary;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 4;
  Chart.defaults.plugins.tooltip.displayColors = true;

  const cartesianAxis = {
    grid: { color: COLORS.grid, drawBorder: false },
    border: { display: false },
    ticks: { color: COLORS.textTertiary },
  };
  const catAxis = { ...cartesianAxis, grid: { display: false } };

  const toneToColor = (t) =>
    ({ success: COLORS.success, warning: COLORS.warning, danger: COLORS.danger,
       info: COLORS.info, neutral: COLORS.neutral }[t] || COLORS.info);

  const on = (id) => document.getElementById(id);

  // -- Responses per year (bar) --------------------------------------------
  if (on("chart-year") && DATA.responses_by_year) {
    new Chart(on("chart-year"), {
      type: "bar",
      data: {
        labels: DATA.responses_by_year.map((r) => String(r.year)),
        datasets: [{
          label: "Responses",
          data: DATA.responses_by_year.map((r) => r.count),
          backgroundColor: COLORS.info,
          borderRadius: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: catAxis,
          y: { ...cartesianAxis, beginAtZero: true,
               ticks: { ...cartesianAxis.ticks, precision: 0 } },
        },
      },
    });
  }

  // -- Reasons (horizontal bar) --------------------------------------------
  if (on("chart-reasons") && DATA.reasons) {
    new Chart(on("chart-reasons"), {
      type: "bar",
      data: {
        labels: DATA.reasons.map((r) => r.label),
        datasets: [{
          label: "Mentions",
          data: DATA.reasons.map((r) => r.count),
          backgroundColor: COLORS.warning,
          borderRadius: 2,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ...cartesianAxis, beginAtZero: true,
               ticks: { ...cartesianAxis.ticks, precision: 0 } },
          y: catAxis,
        },
      },
    });
  }

  // -- Supervisor 100% stacked (positive/neutral/negative) -----------------
  if (on("chart-supervisor") && DATA.supervisor) {
    const labels = DATA.supervisor.map((s) => s.question);
    const totals = DATA.supervisor.map((s) => s.n || 1);
    const pct = (arr) => arr.map((v, i) => Math.round((v * 1000) / totals[i]) / 10);
    new Chart(on("chart-supervisor"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Positive",  data: pct(DATA.supervisor.map((s) => s.positive)),
            backgroundColor: COLORS.success },
          { label: "Neutral",   data: pct(DATA.supervisor.map((s) => s.neutral)),
            backgroundColor: COLORS.neutral },
          { label: "Negative",  data: pct(DATA.supervisor.map((s) => s.negative)),
            backgroundColor: COLORS.danger },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const q = DATA.supervisor[ctx.dataIndex];
                const raw = [q.positive, q.neutral, q.negative][ctx.datasetIndex];
                return `${ctx.dataset.label}: ${raw} (${ctx.parsed.x}%)`;
              },
            },
          },
        },
        scales: {
          x: { ...cartesianAxis, stacked: true, min: 0, max: 100,
               ticks: { ...cartesianAxis.ticks,
                        callback: (val) => `${val}%` } },
          y: { ...catAxis, stacked: true },
        },
      },
    });
  }

  // -- Cooperation & communication (horizontal, color by tone) -------------
  const scoreChart = (canvasId, rows) => {
    if (!on(canvasId) || !rows) return;
    new Chart(on(canvasId), {
      type: "bar",
      data: {
        labels: rows.map((r) => r.question),
        datasets: [{
          label: "Avg score",
          data: rows.map((r) => r.avg),
          backgroundColor: rows.map((r) => toneToColor(r.tone)),
          borderRadius: 2,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const r = rows[ctx.dataIndex];
                return `${r.avg.toFixed(2)} / 5  (n=${r.n})`;
              },
            },
          },
        },
        scales: {
          x: { ...cartesianAxis, min: 0, max: 5,
               ticks: { ...cartesianAxis.ticks, stepSize: 1 } },
          y: catAxis,
        },
      },
    });
  };
  scoreChart("chart-coop",     DATA.coop_comm);
  scoreChart("chart-training", DATA.training);
  scoreChart("chart-comp",     DATA.compensation);

  // -- Workload distribution (horizontal bar) ------------------------------
  if (on("chart-workload") && DATA.workload) {
    new Chart(on("chart-workload"), {
      type: "bar",
      data: {
        labels: DATA.workload.map((w) => w.label),
        datasets: [{
          label: "Responses",
          data: DATA.workload.map((w) => w.count),
          backgroundColor: COLORS.info,
          borderRadius: 2,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ...cartesianAxis, beginAtZero: true,
               ticks: { ...cartesianAxis.ticks, precision: 0 } },
          y: catAxis,
        },
      },
    });
  }

  // -- Would-recommend donut ------------------------------------------------
  if (on("chart-recommend") && DATA.recommend) {
    const paletteByLabel = {
      "Yes": COLORS.success,
      "Yes with caveat": v("--tone-warning") || COLORS.warning,
      "Depends on role or person": COLORS.neutral,
      "Company yes / department no": COLORS.info,
      "No": COLORS.danger,
    };
    new Chart(on("chart-recommend"), {
      type: "doughnut",
      data: {
        labels: DATA.recommend.map((r) => r.label),
        datasets: [{
          data: DATA.recommend.map((r) => r.count),
          backgroundColor: DATA.recommend.map((r) => paletteByLabel[r.label] || COLORS.neutral),
          borderColor: COLORS.tooltipBg,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total ? Math.round((ctx.parsed * 100) / total) : 0;
                return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }
})();
