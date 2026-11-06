const regionSelect = document.getElementById("regionSelect");
const regionStatus = document.getElementById("regionStatus");
const regionResults = document.getElementById("regionResults");

let currentRegionName = ""; // Global to share with charts.js

async function loadRegions() {
  try {
    const response = await fetch("regions.json");

    if (!response.ok) {
      throw new Error(`Could not load regions: HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data.regions)) {
      throw new Error("The regions file does not contain a regions list.");
    }

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a region";

    const englandGroup = document.createElement("optgroup");
    englandGroup.label = "England";

    const walesGroup = document.createElement("optgroup");
    walesGroup.label = "Wales / Cymru";

    for (const region of data.regions) {
      const option = document.createElement("option");
      option.value = region.id;

      if (region.id.startsWith("E")) {
        option.textContent = region.name_en;
        englandGroup.appendChild(option);
      } else if (region.id.startsWith("W")) {
        option.textContent = `${region.name_en} / ${region.name_cy}`;
        walesGroup.appendChild(option);
      } else {
        throw new Error(`Unrecognised region code: ${region.id}`);
      }
    }

    regionSelect.replaceChildren(placeholder, englandGroup, walesGroup);
    regionSelect.disabled = false;
    regionStatus.textContent = "Select a region to explore.";
  } catch (error) {
    console.error("Error loading regions:", error);
    regionSelect.replaceChildren(new Option("Regions unavailable", ""));
    regionStatus.textContent =
      "Could not load regions. Please reload the page and try again.";
  }
}

async function fetchJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Could not load ${url}: HTTP ${response.status}`);
  }

  return response.json();
}

function regionBaseURL(regionCode) {
  return `https://raw.githubusercontent.com/Safer-Parks/${regionCode}/refs/heads/main`;
}

async function loadAuthorities(regionCode) {
  const baseURL = regionBaseURL(regionCode);
  const lut = await fetchJSON(`${baseURL}/${regionCode}_lut.geojson`);

  return lut.features.map((feature) => ({
    regionCode,
    authorityCode: feature.properties.authority_id,
    authorityName: feature.properties.auth_name_e,
  }));
}

async function loadAuthorityParks(authority) {
  const baseURL = regionBaseURL(authority.regionCode);
  const filename = encodeURIComponent(`${authority.authorityName}_parks.geojson`);
  const url = `${baseURL}/${authority.authorityCode}/${filename}`;

  const geojson = await fetchJSON(url);

  return geojson.features.map((feature) => {
    const properties = feature.properties;
    const area = properties["Total Area (m²)"];

    if (area != null && (typeof area !== "number" || !Number.isFinite(area))) {
      throw new Error(`Invalid park area in ${url}`);
    }

    return {
      id: properties.park_offical_id,
      name: properties["Park Name"],
      areaM2: area ?? null,
      typeOS: properties["Type (OS)"],
      typeOSM: properties["Type (OSM)"],
      authorityCode: authority.authorityCode,
      authorityName: authority.authorityName,
    };
  });
}

function summariseParks(parks) {
  const areas = parks
    .map((park) => park.areaM2)
    .filter((area) => area !== null)
    .sort((a, b) => a - b);

  const totalAreaM2 = areas.reduce((total, area) => total + area, 0);
  const middle = Math.floor(areas.length / 2);

  let medianAreaM2 = null;
  if (areas.length > 0) {
    medianAreaM2 = areas.length % 2 === 0
      ? (areas[middle - 1] + areas[middle]) / 2
      : areas[middle];
  }

  return {
    parkCount: parks.length,
    totalAreaM2: areas.length ? totalAreaM2 : null,
    meanAreaM2: areas.length ? totalAreaM2 / areas.length : null,
    medianAreaM2,
    missingAreas: parks.length - areas.length,
    maxAreaM2: areas.length ? areas[areas.length - 1] : null,
  };
}

function formatArea(areaM2) {
  if (areaM2 === null) return "Unavailable";
  return `${(areaM2 / 10000).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })} ha`;
}

function showAuthorityStats(rows, regionName) {
  const table = document.createElement("table");

  const caption = table.createCaption();
  caption.textContent = `Park statistics for ${regionName}`;

  const header = table.createTHead().insertRow();

  for (const label of [
    "Authority",
    "Parks",
    "Total parkland area",
    "Mean area per park",
    "Median area per park",
    "Maximum area per park",
  ]) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    header.appendChild(th);
  }

  const body = table.createTBody();

  for (const { authorityName, stats } of rows) {
    const row = body.insertRow();

    const authorityHeader = document.createElement("th");
    authorityHeader.scope = "row";
    authorityHeader.textContent = authorityName;
    row.appendChild(authorityHeader);

    for (const value of [
      stats.parkCount,
      formatArea(stats.totalAreaM2),
      formatArea(stats.meanAreaM2),
      formatArea(stats.medianAreaM2),
      formatArea(stats.maxAreaM2),
    ]) {
      row.insertCell().textContent = value;
    }
  }

  regionResults.replaceChildren(table);
}


function deduplicateParks(parks) {
  const unique = [];
  const byArea = new Map();
  let duplicates = 0;
  let unchecked = 0;

  for (const park of parks) {
    const name = typeof park.name === "string"
      ? park.name.trim().toLowerCase()
      : "";

    if (park.areaM2 === null || !name || name === "null") {
      unique.push(park);
      unchecked++;
      continue;
    }

    const candidates = byArea.get(park.areaM2) ?? [];

    const match = candidates.find((candidate) =>
      candidate.authorityCode !== park.authorityCode &&
      candidate.name.trim().toLowerCase() === name
    );

    if (match) {
      duplicates++;
      console.log("Possible duplicate excluded:", {
        name: park.name,
        areaM2: park.areaM2,
        keptFrom: match.authorityName,
        excludedFrom: park.authorityName,
      });
    } else {
      unique.push(park);
      candidates.push(park);
      byArea.set(park.areaM2, candidates);
    }
  }

  console.log(`Excluded ${duplicates} possible duplicates from the region.`);
  if (unchecked) {
    console.warn(`${unchecked} parks lacked a name or area and were not checked.`);
  }

  return unique;
}

let latestSelection = 0;
let currentRegionParks = [];

regionSelect.addEventListener("change", async () => {
  const selection = ++latestSelection;
  const regionCode = regionSelect.value;
  regionResults.replaceChildren();

  resetCharts();

  if (!regionCode) {
    regionStatus.textContent = "Select a region to explore.";
    return;
  }

  const regionName = regionSelect.selectedOptions[0].textContent;
  currentRegionName = regionName;
  regionStatus.textContent = `Loading ${regionName}...`;

  try {
    const authorities = await loadAuthorities(regionCode);
    const rows = [];
    const regionParks = [];

    for (const authority of authorities) {
      // Ignore old requests if the user has selected another region.
      if (selection !== latestSelection) return;

      regionStatus.textContent = `Loading ${authority.authorityName}...`;
      const parks = await loadAuthorityParks(authority);
      for (const park of parks) {
        regionParks.push(park);
      }

      rows.push({
        authorityName: authority.authorityName,
        stats: summariseParks(parks),
        parks,
      });
    }

    if (selection !== latestSelection) return;

    rows.sort((a, b) => a.authorityName.localeCompare(b.authorityName));
    rows.unshift({
      authorityName: `${regionName} — region total`,
      stats: summariseParks(deduplicateParks(regionParks)),
    });
    currentRegionParks = regionParks;
    showAuthorityStats(rows, regionName);
    // The first row is the regional total, not an authority.
    prepareCharts(rows.slice(1));
    regionStatus.textContent = `Statistics for ${regionName}`;
  } catch (error) {
    if (selection !== latestSelection) return;

    console.error("Could not load park statistics:", error);
    regionStatus.textContent =
      "Could not load all park data. See the browser console for details.";
  }
});

// Type grouping configuration - NOT USED; keeping for reference
const typeGroupingMap = {
  "park": "Public Parks",
  "public park or garden": "Public Parks",
  "garden": "Gardens",
  "dog park": "Specialist Parks",
  "recreation ground": "Recreation Grounds",
  "village green": "Village Greens",
  "meadow": "Meadows",
  "wood": "Woodlands",
  "heath": "Heathlands",
  "cemetery": "Cemeteries",
};

function normalizeType(typeStr) {
  if (!typeStr || typeStr.trim() === "null" || typeStr.trim() === "") {
    return null;
  }
  
  // Clean formatting: replace underscores with spaces, capitalize words
  return typeStr
    .trim()
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function typeSummary(parks) {
  const byType = new Map();
  
  for (const park of parks) {
    const typeOS = normalizeType(park.typeOS);
    const typeOSM = normalizeType(park.typeOSM);
    
    // Prefer Type (OS), then use Type (OSM), or skip if neither exists
    const type = typeOS || typeOSM;
    
    if (!type) continue;
    
    if (!byType.has(type)) {
      byType.set(type, { count: 0, totalAreaM2: 0, parks: [] });
    }
    
    const entry = byType.get(type);
    entry.count++;
    if (park.areaM2 !== null) {
      entry.totalAreaM2 += park.areaM2;
    }
    entry.parks.push(park);
  }
  
  // Convert to array and sort by count descending
  return Array.from(byType.entries())
    .map(([type, data]) => ({
      type,
      ...data,
      meanAreaM2: data.count > 0 ? data.totalAreaM2 / data.parks.filter(p => p.areaM2 !== null).length : null,
    }))
    .sort((a, b) => b.count - a.count);
}

function showParkTypeTable(typeSummaryData, regionName) {
  const table = document.createElement("table");
  
  const caption = table.createCaption();
  caption.textContent = `Park type breakdown for ${regionName}`;
  
  const header = table.createTHead().insertRow();
  
  for (const label of [
    "Park type",
    "Number of parks",
    "Total area",
    "Mean area per park",
  ]) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    header.appendChild(th);
  }
  
  const body = table.createTBody();
  
  for (const { type, count, totalAreaM2, meanAreaM2 } of typeSummaryData) {
    const row = body.insertRow();
    
    const typeHeader = document.createElement("th");
    typeHeader.scope = "row";
    typeHeader.textContent = type || "(Unknown)";
    row.appendChild(typeHeader);
    
    row.insertCell().textContent = count;
    row.insertCell().textContent = formatArea(totalAreaM2);
    row.insertCell().textContent = formatArea(meanAreaM2);
  }
  
  const typeTableContainer = document.getElementById("parkTypeTable");
  typeTableContainer.replaceChildren(table);
}

loadRegions();