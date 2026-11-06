const chartOptions = document.getElementById("chartOptions");
const parkCountButton = document.getElementById("parkCountButton");
const chartSection = document.getElementById("parkCountChartSection");
const chartContainer = document.getElementById("parkCountChartContainer");
const chartCanvas = document.getElementById("parkCountChart");
const chartStatus = document.getElementById("chartStatus");

let parkCountChart = null;
let chartRows = [];

let parkTypeChart = null;
let parkTypeAreaChart = null;
let parkTypeBoxChart = null;
const parkTypeButton = document.getElementById("parkTypeButton");
const parkTypeSection = document.getElementById("parkTypeSection");
const parkTypeCountCanvas = document.getElementById("parkTypeCountChart");
const parkTypeAreaCanvas = document.getElementById("parkTypeAreaChart");
const parkTypeBoxCanvas = document.getElementById("parkTypeBoxChart");
const parkTypeBoxContainer = document.getElementById("parkTypeBoxContainer");

let stackedBarChart = null;
let scatterPlotChart = null;
const comparativePlotsButton = document.getElementById("comparativePlotsButton");
const comparativePlotsSection = document.getElementById("comparativePlotsSection");
const stackedBarButton = document.getElementById("stackedBarButton");
const stackedBarSection = document.getElementById("stackedBarChartSection");
const stackedBarContainer = document.getElementById("stackedBarContainer");
const stackedBarCanvas = document.getElementById("stackedBarChart");
const scatterPlotButton = document.getElementById("scatterPlotButton");
const scatterPlotSection = document.getElementById("scatterPlotSection");
const scatterPlotContainer = document.getElementById("scatterPlotContainer");
const scatterPlotCanvas = document.getElementById("scatterPlotChart");

function resetCharts() {
  if (parkCountChart) {
    parkCountChart.destroy();
    parkCountChart = null;
  }

  chartRows = [];
  resetParkSizeChart();
  chartOptions.hidden = true;
  chartSection.hidden = true;
  comparativePlotsSection.hidden = true;
  stackedBarSection.hidden = true;
  scatterPlotSection.hidden = true;
  chartStatus.textContent = "";
  parkCountButton.textContent = "Show park count by authority";
  parkCountButton.setAttribute("aria-expanded", "false");
  comparativePlotsButton.textContent = "Show comparative plots";
  comparativePlotsButton.setAttribute("aria-expanded", "false");
  stackedBarButton.textContent = "Show park types by authority";
  stackedBarButton.setAttribute("aria-expanded", "false");
  scatterPlotButton.textContent = "Show count vs. mean area scatter plot";
  scatterPlotButton.setAttribute("aria-expanded", "false");

    if (parkTypeChart) {
      parkTypeChart.destroy();
      parkTypeChart = null;
    }
    if (parkTypeAreaChart) {
      parkTypeAreaChart.destroy();
      parkTypeAreaChart = null;
    }
    if (parkTypeBoxChart) {
      parkTypeBoxChart.destroy();
      parkTypeBoxChart = null;
    }
    if (stackedBarChart) {
      stackedBarChart.destroy();
      stackedBarChart = null;
    }
    if (scatterPlotChart) {
      scatterPlotChart.destroy();
      scatterPlotChart = null;
    }
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
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
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

parkTypeButton.addEventListener("click", () => {
  if (!parkTypeSection.hidden) {
    if (parkTypeChart) parkTypeChart.destroy();
    if (parkTypeAreaChart) parkTypeAreaChart.destroy();
    if (parkTypeBoxChart) parkTypeBoxChart.destroy();
    parkTypeChart = null;
    parkTypeAreaChart = null;
    parkTypeBoxChart = null;
    parkTypeSection.hidden = true;
    chartStatus.textContent = "Type charts hidden.";
    parkTypeButton.textContent = "Show park types";
    parkTypeButton.setAttribute("aria-expanded", "false");
    return;
  }

  if (typeof Chart === "undefined") {
    chartStatus.textContent = "The chart library could not be loaded.";
    return;
  }

  parkTypeSection.hidden = false;
  
  try {
    // Deduplicate parks to match the regional total in the table
    const deduplicatedParks = deduplicateParks(currentRegionParks);
    const typeSummaryData = typeSummary(deduplicatedParks);
    
    // Show type summary table
    showParkTypeTable(typeSummaryData, currentRegionName);
    
    // Consistent color palette
    const colors = [
      "rgba(0, 122, 80, 0.7)",    // Jade
      "rgba(0, 102, 153, 0.7)",   // Blue
      "rgba(204, 102, 0, 0.7)",   // Orange
      "rgba(153, 51, 153, 0.7)",  // Purple
      "rgba(51, 153, 102, 0.7)",  // Green
      "rgba(204, 51, 51, 0.7)",   // Red
      "rgba(153, 153, 0, 0.7)",   // Yellow
      "rgba(102, 102, 102, 0.7)", // Gray
    ];
    
    const typeLabels = typeSummaryData.map(item => item.type || "(Unknown)");
    const countData = typeSummaryData.map(item => item.count);
    const areaData = typeSummaryData.map(item => item.totalAreaM2 / 10000); // Convert to hectares
    const chartColors = colors.slice(0, typeSummaryData.length);
    
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.5,
      animation: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 12,
            font: { size: 11 },
          },
        },
      },
    };
    
    // Count chart
    parkTypeChart = new Chart(parkTypeCountCanvas, {
      type: "doughnut",
      data: {
        labels: typeLabels,
        datasets: [{
          data: countData,
          backgroundColor: chartColors,
          borderColor: "#fff",
          borderWidth: 2,
        }],
      },
      options: {
        ...chartOptions,
        plugins: {
          ...chartOptions.plugins,
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || "";
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} parks (${percentage}%)`;
              },
            },
          },
        },
      },
    });
    
    // Area chart
    parkTypeAreaChart = new Chart(parkTypeAreaCanvas, {
      type: "doughnut",
      data: {
        labels: typeLabels,
        datasets: [{
          data: areaData,
          backgroundColor: chartColors,
          borderColor: "#fff",
          borderWidth: 2,
        }],
      },
      options: {
        ...chartOptions,
        plugins: {
          ...chartOptions.plugins,
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || "";
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ha (${percentage}%)`;
              },
            },
          },
        },
      },
    });
    
    // Box plot by type
    if (typeof ChartBoxPlot === "undefined") {
      chartStatus.textContent = "The box plot library could not be loaded.";
      return;
    }

    // Group parks by type
    const typeAreaData = new Map();
    for (const park of deduplicatedParks) {
      const typeOS = normalizeType(park.typeOS);
      const typeOSM = normalizeType(park.typeOSM);
      const type = typeOS || typeOSM;

      if (!type || park.areaM2 === null) continue;

      if (!typeAreaData.has(type)) {
        typeAreaData.set(type, []);
      }
      // Convert to hectares and filter for positive values
      const areaHa = park.areaM2 / 10000;
      if (areaHa > 0) {
        typeAreaData.get(type).push(areaHa);
      }
    }

    // Sort by median area descending
    const typeBoxData = Array.from(typeAreaData.entries())
      .map(([type, areas]) => ({
        type,
        areas: areas.sort((a, b) => a - b),
        summary: boxSummary(areas),
        excluded: deduplicatedParks.filter(p => {
          const typeOS = normalizeType(p.typeOS);
          const typeOSM = normalizeType(p.typeOSM);
          const t = typeOS || typeOSM;
          return t === type && (p.areaM2 === null || p.areaM2 <= 0);
        }).length,
      }))
      .filter(item => item.areas.length > 0)
      .sort((a, b) => (b.summary?.median || 0) - (a.summary?.median || 0));

    if (!typeBoxData.length) {
      chartStatus.textContent = "No positive park areas are available to plot by type.";
      return;
    }

    // Show box summary table
    const typeBoxTable = document.getElementById("parkTypeBoxTable");
    const table = document.createElement("table");
    const caption = table.createCaption();
    caption.textContent = `Park area distribution by type`;

    const header = table.createTHead().insertRow();
    for (const label of [
      "Park type",
      "Number of parks",
      "Q1 (hectares)",
      "Median (hectares)",
      "Q3 (hectares)",
      "Min whisker (hectares)",
      "Max whisker (hectares)",
      "Outliers",
    ]) {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = label;
      header.appendChild(th);
    }

    const body = table.createTBody();
    for (const { type, areas, summary, excluded } of typeBoxData) {
      const row = body.insertRow();
      const typeHeader = document.createElement("th");
      typeHeader.scope = "row";
      typeHeader.textContent = type;
      row.appendChild(typeHeader);

      row.insertCell().textContent = areas.length;
      row.insertCell().textContent = summary.q1.toLocaleString(undefined, { maximumFractionDigits: 2 });
      row.insertCell().textContent = summary.median.toLocaleString(undefined, { maximumFractionDigits: 2 });
      row.insertCell().textContent = summary.q3.toLocaleString(undefined, { maximumFractionDigits: 2 });
      row.insertCell().textContent = summary.whiskerMin.toLocaleString(undefined, { maximumFractionDigits: 2 });
      row.insertCell().textContent = summary.whiskerMax.toLocaleString(undefined, { maximumFractionDigits: 2 });
      row.insertCell().textContent = summary.outlierCount;
    }

    typeBoxTable.replaceChildren(table);

    // Set container height dynamically
    parkTypeBoxContainer.style.height = `${Math.max(300, typeBoxData.length * 50)}px`;

    // Create box plot
    parkTypeBoxChart = new Chart(parkTypeBoxCanvas, {
      type: "boxplot",
      data: {
        labels: typeBoxData.map((item) => item.type),
        datasets: [{
          label: "Park area",
          data: typeBoxData.map((item) => item.areas),
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
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
        },
        scales: {
          x: {
            type: "logarithmic",
            title: { display: true, text: "Park area (hectares, log scale)" },
          },
        },
      },
    });
    
    chartStatus.textContent = "Type charts displayed.";
    parkTypeButton.textContent = "Hide park types";
    parkTypeButton.setAttribute("aria-expanded", "true");
  } catch (error) {
    chartStatus.textContent = `Error rendering type charts: ${error.message}`;
    console.error("Type chart error:", error);
  }
});

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
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
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

// Comparative plots section
comparativePlotsButton.addEventListener("click", () => {
  if (!comparativePlotsSection.hidden) {
    comparativePlotsSection.hidden = true;
    stackedBarSection.hidden = true;
    scatterPlotSection.hidden = true;
    if (stackedBarChart) stackedBarChart.destroy();
    if (scatterPlotChart) scatterPlotChart.destroy();
    stackedBarChart = null;
    scatterPlotChart = null;
    chartStatus.textContent = "Comparative plots hidden.";
    comparativePlotsButton.textContent = "Show comparative plots";
    comparativePlotsButton.setAttribute("aria-expanded", "false");
    stackedBarButton.textContent = "Show park types by authority";
    stackedBarButton.setAttribute("aria-expanded", "false");
    scatterPlotButton.textContent = "Show count vs. mean area scatter plot";
    scatterPlotButton.setAttribute("aria-expanded", "false");
    return;
  }

  comparativePlotsSection.hidden = false;
  comparativePlotsButton.textContent = "Hide comparative plots";
  comparativePlotsButton.setAttribute("aria-expanded", "true");
});

// Stacked bar chart
stackedBarButton.addEventListener("click", () => {
  if (!stackedBarSection.hidden) {
    if (stackedBarChart) stackedBarChart.destroy();
    stackedBarChart = null;
    stackedBarSection.hidden = true;
    chartStatus.textContent = "Stacked bar chart hidden.";
    stackedBarButton.textContent = "Show park types by authority";
    stackedBarButton.setAttribute("aria-expanded", "false");
    return;
  }

  if (typeof Chart === "undefined") {
    chartStatus.textContent = "The chart library could not be loaded.";
    return;
  }

  stackedBarSection.hidden = false;

  try {
    // Group parks by authority and type
    const authorityTypeData = new Map();
    
    for (const row of chartRows) {
      if (!authorityTypeData.has(row.authorityName)) {
        authorityTypeData.set(row.authorityName, new Map());
      }
      
      const typeMap = authorityTypeData.get(row.authorityName);
      
      for (const park of row.parks) {
        const typeOS = normalizeType(park.typeOS);
        const typeOSM = normalizeType(park.typeOSM);
        const type = typeOS || typeOSM || "(Unknown)";
        
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      }
    }
    
    // Get all unique types
    const allTypes = new Set();
    for (const typeMap of authorityTypeData.values()) {
      for (const type of typeMap.keys()) {
        allTypes.add(type);
      }
    }
    const sortedTypes = Array.from(allTypes).sort();
    
    // Color palette (reusing the existing colors)
    const colors = [
      "rgba(0, 122, 80, 0.7)",
      "rgba(0, 102, 153, 0.7)",
      "rgba(204, 102, 0, 0.7)",
      "rgba(153, 51, 153, 0.7)",
      "rgba(51, 153, 102, 0.7)",
      "rgba(204, 51, 51, 0.7)",
      "rgba(153, 153, 0, 0.7)",
      "rgba(102, 102, 102, 0.7)",
    ];
    
    // Create datasets
    const datasets = sortedTypes.map((type, index) => ({
      label: type,
      data: Array.from(authorityTypeData.keys()).map(authority => 
        authorityTypeData.get(authority).get(type) || 0
      ),
      backgroundColor: colors[index % colors.length],
      borderColor: "#fff",
      borderWidth: 1,
    }));
    
    stackedBarContainer.style.height = `${Math.max(400, chartRows.length * 30)}px`;
    
    stackedBarChart = new Chart(stackedBarCanvas, {
      type: "bar",
      data: {
        labels: Array.from(authorityTypeData.keys()),
        datasets,
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { font: { size: 11 } },
          },
          tooltip: { enabled: true },
        },
        scales: {
          x: {
            stacked: true,
            title: { display: true, text: "Number of parks" },
          },
          y: {
            stacked: true,
          },
        },
      },
    });
    
    chartStatus.textContent = "Stacked bar chart displayed.";
    stackedBarButton.textContent = "Hide park types by authority";
    stackedBarButton.setAttribute("aria-expanded", "true");
  } catch (error) {
    chartStatus.textContent = `Error rendering stacked bar chart: ${error.message}`;
    console.error("Stacked bar chart error:", error);
  }
});

// Scatter plot
scatterPlotButton.addEventListener("click", () => {
  if (!scatterPlotSection.hidden) {
    if (scatterPlotChart) scatterPlotChart.destroy();
    scatterPlotChart = null;
    scatterPlotSection.hidden = true;
    chartStatus.textContent = "Scatter plot hidden.";
    scatterPlotButton.textContent = "Show count vs. mean area scatter plot";
    scatterPlotButton.setAttribute("aria-expanded", "false");
    return;
  }

  if (typeof Chart === "undefined") {
    chartStatus.textContent = "The chart library could not be loaded.";
    return;
  }

  scatterPlotSection.hidden = false;

  try {
    // Prepare scatter data
    const scatterData = chartRows.map(row => ({
      x: row.stats.parkCount,
      y: row.stats.meanAreaM2 ? row.stats.meanAreaM2 / 10000 : 0,
      authorityName: row.authorityName,
    }));
    
    scatterPlotChart = new Chart(scatterPlotCanvas, {
      type: "scatter",
      data: {
        datasets: [{
          label: "Authorities",
          data: scatterData,
          backgroundColor: "rgba(0, 122, 80, 0.6)",
          borderColor: "#007a50",
          borderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: false,
        plugins: {
          legend: { display: true },
          tooltip: {
            enabled: true,
            callbacks: {
              label: function(context) {
                const point = context.raw;
                return `${point.authorityName}: ${point.x} parks, mean area ${point.y.toLocaleString(undefined, { maximumFractionDigits: 2 })} ha`;
              },
              title: () => "",
            },
          },
        },
        scales: {
          x: {
            type: "linear",
            position: "bottom",
            title: { display: true, text: "Number of parks" },
          },
          y: {
            title: { display: true, text: "Mean park area (hectares)" },
          },
        },
      },
    });
    
    chartStatus.textContent = "Scatter plot displayed.";
    scatterPlotButton.textContent = "Hide count vs. mean area scatter plot";
    scatterPlotButton.setAttribute("aria-expanded", "true");
  } catch (error) {
    chartStatus.textContent = `Error rendering scatter plot: ${error.message}`;
    console.error("Scatter plot error:", error);
  }
});
