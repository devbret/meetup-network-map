const DATA_URL = "./out/members_heat.json";

const statEl = document.getElementById("stat");
const errEl = document.getElementById("err");

const map = L.map("map", {
  zoomControl: true,
  worldCopyJump: true,
}).setView([20, 0], 2);

const tiles = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  {
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxZoom: 20,
  },
).addTo(map);

const pointsLayer = L.layerGroup().addTo(map);
let heatLayer = null;

const togglePoints = document.getElementById("togglePoints");
const toggleHeat = document.getElementById("toggleHeat");
const pointRadius = document.getElementById("pointRadius");
const heatRadius = document.getElementById("heatRadius");
const heatBlur = document.getElementById("heatBlur");

function showError(msg) {
  errEl.style.display = "block";
  errEl.textContent = msg;
}

function clearError() {
  errEl.style.display = "none";
  errEl.textContent = "";
}

function isValidTriplet(t) {
  return (
    Array.isArray(t) &&
    t.length >= 2 &&
    Number.isFinite(t[0]) &&
    Number.isFinite(t[1]) &&
    t[0] >= -90 &&
    t[0] <= 90 &&
    t[1] >= -180 &&
    t[1] <= 180
  );
}

function buildPoints(data) {
  pointsLayer.clearLayers();

  const r = Number(pointRadius.value);

  for (const item of data) {
    if (!isValidTriplet(item)) continue;
    const lat = item[0];
    const lon = item[1];

    L.circleMarker([lat, lon], {
      radius: r,
      weight: 0,
      fillOpacity: 0.75,
    }).addTo(pointsLayer);
  }
}

function buildHeat(data) {
  const r = Number(heatRadius.value);
  const b = Number(heatBlur.value);

  if (heatLayer) {
    map.removeLayer(heatLayer);
  }

  heatLayer = L.heatLayer(data, {
    radius: r,
    blur: b,
    maxZoom: 10,
  });

  if (toggleHeat.checked) {
    heatLayer.addTo(map);
  }
}

function refitBounds(data) {
  const latlngs = [];
  for (const item of data) {
    if (!isValidTriplet(item)) continue;
    latlngs.push([item[0], item[1]]);
  }
  if (latlngs.length === 0) return;

  const bounds = L.latLngBounds(latlngs);
  map.fitBounds(bounds.pad(0.15));
}

function updateLayerVisibility() {
  if (togglePoints.checked) {
    if (!map.hasLayer(pointsLayer)) map.addLayer(pointsLayer);
  } else {
    if (map.hasLayer(pointsLayer)) map.removeLayer(pointsLayer);
  }

  if (heatLayer) {
    if (toggleHeat.checked) {
      if (!map.hasLayer(heatLayer)) map.addLayer(heatLayer);
    } else {
      if (map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
    }
  }
}

function updateStats(data) {
  const total = data.filter(isValidTriplet).length;
  statEl.textContent = `Loaded ${total} locations`;
}

pointRadius.addEventListener("input", () => {
  if (window.__heatData) buildPoints(window.__heatData);
});

function rebuildHeat() {
  if (window.__heatData) buildHeat(window.__heatData);
  updateLayerVisibility();
}
heatRadius.addEventListener("input", rebuildHeat);
heatBlur.addEventListener("input", rebuildHeat);

togglePoints.addEventListener("change", updateLayerVisibility);
toggleHeat.addEventListener("change", updateLayerVisibility);

async function main() {
  try {
    clearError();
    statEl.textContent = "Loading data…";

    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(
        `Failed to fetch ${DATA_URL}\nHTTP ${res.status} ${res.statusText}`,
      );
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error(
        "Data is not an array. Expected: [[lat, lon, weight], ...]",
      );
    }

    window.__heatData = data;

    buildPoints(data);
    buildHeat(data);
    updateLayerVisibility();
    refitBounds(data);
    updateStats(data);
  } catch (err) {
    console.error(err);
    showError(String(err));
    statEl.textContent = "Could not load data.";
  }
}

main();
