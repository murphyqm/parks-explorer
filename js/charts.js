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