const chartOptions = document.getElementById("chartOptions");
const parkCountButton = document.getElementById("parkCountButton");
const chartSection = document.getElementById("parkCountChartSection");
const chartContainer = document.getElementById("parkCountChartContainer");
const chartCanvas = document.getElementById("parkCountChart");
const chartStatus = document.getElementById("chartStatus");

let parkCountChart = null;
let chartRows = [];

function resetCharts() {
  if (parkCountChart) {
    parkCountChart.destroy();
    parkCountChart = null;
  }

  chartRows = [];
  resetParkSizeChart();
  chartOptions.hidden = true;
  chartSection.hidden = true;
  chartStatus.textContent = "";
  parkCountButton.textContent = "Show park count by authority";
  parkCountButton.setAttribute("aria-expanded", "false");
}

function prepareCharts(authorityRows) {
  chartRows = [...authorityRows].sort(
        (a, b) => b.stats.parkCount - a.stats.parkCount
        );
  chartOptions.hidden = false;
}

parkCountButton.addEventListener("click", () => {
  if (!chartSection.hidden) {
    parkCountChart.destroy();
    parkCountChart = null;
    chartSection.hidden = true;
    chartStatus.textContent = "Chart hidden.";
    parkCountButton.textContent = "Show park count by authority";
    parkCountButton.setAttribute("aria-expanded", "false");
    return;
  }

  if (typeof Chart === "undefined") {
    chartStatus.textContent = "The chart library could not be loaded.";
    return;
  }

  // Give each authority enough vertical space, including on smaller screens.
  chartContainer.style.height = `${Math.max(300, chartRows.length * 40)}px`;
  chartSection.hidden = false;

  try {
    parkCountChart = new Chart(chartCanvas, {
      type: "bar",
      data: {
        labels: chartRows.map((row) => row.authorityName),
        datasets: [{
          label: "Number of parks",
          data: chartRows.map((row) => row.stats.parkCount),
          backgroundColor: "rgba(0, 122, 80, 0.65)",
            borderColor: "#007a50",
            borderWidth: 1,
            borderRadius: 4,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        events: [],
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        scales: {
          x: {
            beginAtZero: true,
            title: { display: true, text: "Number of parks" },
            ticks: { precision: 0 },
          },
        },
      },
    });

    parkCountButton.textContent = "Hide park count chart";
    parkCountButton.setAttribute("aria-expanded", "true");
    chartStatus.textContent = "Park count chart shown.";
  } catch (error) {
    console.error("Could not create park count chart:", error);
    chartSection.hidden = true;
    chartStatus.textContent = "Could not create the chart.";
  }
});

const parkSizeButton = document.getElementById("parkSizeButton");
const parkSizeSection = document.getElementById("parkSizeSection");
const parkSizeContainer = document.getElementById("parkSizeContainer");
const parkSizeCanvas = document.getElementById("parkSizeChart");
const parkSizeTable = document.getElementById("parkSizeTable");

let parkSizeChart = null;

// Linear interpolation, matching the box-plot extension's default
// type-7 quartile calculation.
function quantile(sorted, proportion) {
  const position = (sorted.length - 1) * proportion;
  const lower = Math.floor(position);
  const fraction = position - lower;

  return sorted[lower] +
    (sorted[Math.ceil(position)] - sorted[lower]) * fraction;
}

function boxSummary(areas) {
  const sorted = [...areas].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;

  const inside = sorted.filter(
    (area) => area >= q1 - 1.5 * iqr && area <= q3 + 1.5 * iqr
  );

  return {
    count: sorted.length,
    min: sorted[0],
    q1,
    median,
    q3,
    max: sorted[sorted.length - 1],
    whiskerMin: inside[0],
    whiskerMax: inside[inside.length - 1],
    outlierCount: sorted.length - inside.length,
  };
}

function showBoxSummaryTable(rows) {
  const table = document.createElement("table");
  table.createCaption().textContent =
    "Park area distributions by authority, in hectares";

  const header = table.createTHead().insertRow();

  for (const label of [
    "Authority", "Parks plotted", "Excluded", "Minimum", "Lower whisker",
    "Lower quartile", "Median", "Upper quartile", "Upper whisker",
    "Maximum", "Outliers",
  ]) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    header.appendChild(th);
  }

  const body = table.createTBody();

  for (const row of rows) {
    const tr = body.insertRow();
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = row.name;
    tr.appendChild(th);

    const s = row.summary;
    const values = s
      ? [
          s.count, row.excluded, s.min, s.whiskerMin, s.q1,
          s.median, s.q3, s.whiskerMax, s.max, s.outlierCount,
        ]
      : [0, row.excluded, "Unavailable", "Unavailable", "Unavailable",
          "Unavailable", "Unavailable", "Unavailable", "Unavailable", 0];

    for (const value of values) {
      tr.insertCell().textContent =
        typeof value === "number"
          ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
          : value;
    }
  }

  parkSizeTable.replaceChildren(table);
}

function resetParkSizeChart() {
  if (parkSizeChart) {
    parkSizeChart.destroy();
    parkSizeChart = null;
  }

  parkSizeTable.replaceChildren();
  parkSizeSection.hidden = true;
  parkSizeButton.textContent = "Show park sizes by authority";
  parkSizeButton.setAttribute("aria-expanded", "false");
}

parkSizeButton.addEventListener("click", () => {
  if (!parkSizeSection.hidden) {
    resetParkSizeChart();
    chartStatus.textContent = "Park size chart hidden.";
    return;
  }

  if (typeof Chart === "undefined" || typeof ChartBoxPlot === "undefined") {
    chartStatus.textContent = "The box plot library could not be loaded.";
    return;
  }

  const rows = chartRows.map((row) => {
    const areas = row.parks
      .map((park) => park.areaM2)
      .filter((area) => Number.isFinite(area) && area > 0)
      .map((area) => area / 10000);

    return {
      name: row.authorityName,
      areas,
      excluded: row.parks.length - areas.length,
      summary: areas.length ? boxSummary(areas) : null,
    };
  });

  const plotted = rows.filter((row) => row.summary !== null);

  if (!plotted.length) {
    chartStatus.textContent = "No positive park areas are available to plot.";
    return;
  }

  showBoxSummaryTable(rows);
  parkSizeContainer.style.height = `${Math.max(300, plotted.length * 45)}px`;
  parkSizeSection.hidden = false;

  try {
    parkSizeChart = new Chart(parkSizeCanvas, {
      type: "boxplot",
      data: {
        labels: plotted.map((row) => row.name),
        datasets: [{
          label: "Park area",
          data: plotted.map((row) => row.areas),
          backgroundColor: "rgba(0, 122, 80, 0.65)",
          borderColor: "#007a50",
          borderWidth: 1,
          outlierColor: "#007a50",
          outlierRadius: 2,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        events: [],
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        scales: {
          x: {
            type: "logarithmic",
            title: {
              display: true,
              text: "Park area (hectares; logarithmic scale)",
            },
          },
        },
      },
    });

    parkSizeButton.textContent = "Hide park size chart";
    parkSizeButton.setAttribute("aria-expanded", "true");
    chartStatus.textContent = "Park size chart and data table shown.";
  } catch (error) {
    console.error("Could not create park size chart:", error);
    resetParkSizeChart();
    chartStatus.textContent = "Could not create the park size chart.";
  }
});