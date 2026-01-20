const POINTS_URL = "./out/members_points.json";

const statEl = document.getElementById("stat");
const errEl = document.getElementById("err");

const kpiLocations = document.getElementById("kpiLocations");
const kpiHeatMode = document.getElementById("kpiHeatMode");
const kpiView = document.getElementById("kpiView");

const map = L.map("map", { zoomControl: true, worldCopyJump: true }).setView(
  [20, 0],
  2,
);

L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  maxZoom: 20,
}).addTo(map);

const pointsLayer = L.layerGroup().addTo(map);
let heatLayer = null;

const togglePoints = document.getElementById("togglePoints");
const toggleHeat = document.getElementById("toggleHeat");
const pointRadius = document.getElementById("pointRadius");
const heatRadius = document.getElementById("heatRadius");
const heatBlur = document.getElementById("heatBlur");
const btnRefit = document.getElementById("btnRefit");

function showError(msg) {
  errEl.style.display = "block";
  errEl.textContent = msg;
}

function clearError() {
  errEl.style.display = "none";
  errEl.textContent = "";
}

function normalizePoints(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const p of raw) {
    const lat = Number(p?.lat);
    const lon = Number(p?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;
    const count = Number(p?.count);
    const w = Number.isFinite(count) ? count : 1;
    out.push({ lat, lon, w });
  }
  return out;
}

function buildPoints(points) {
  pointsLayer.clearLayers();
  const r = Number(pointRadius.value);

  for (const p of points) {
    L.circleMarker([p.lat, p.lon], {
      radius: r,
      weight: 0,
      fillOpacity: 0.75,
    }).addTo(pointsLayer);
  }
}

function buildHeat(points) {
  const r = Number(heatRadius.value);
  const b = Number(heatBlur.value);

  if (heatLayer) map.removeLayer(heatLayer);

  const heatData = points.map((p) => [p.lat, p.lon, p.w]);

  heatLayer = L.heatLayer(heatData, { radius: r, blur: b, maxZoom: 10 });
  if (toggleHeat.checked) heatLayer.addTo(map);
}

function refitBounds(points) {
  const latlngs = points.map((p) => [p.lat, p.lon]);
  if (!latlngs.length) return;
  map.fitBounds(L.latLngBounds(latlngs).pad(0.15));
}

function updateLayerVisibility() {
  const showPoints = togglePoints.checked;
  const showHeat = toggleHeat.checked;

  if (showPoints) {
    if (!map.hasLayer(pointsLayer)) map.addLayer(pointsLayer);
  } else {
    if (map.hasLayer(pointsLayer)) map.removeLayer(pointsLayer);
  }

  if (heatLayer) {
    if (showHeat) {
      if (!map.hasLayer(heatLayer)) map.addLayer(heatLayer);
    } else {
      if (map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
    }
  }

  const view =
    showPoints && showHeat
      ? "Points + Heat"
      : showPoints
        ? "Points"
        : showHeat
          ? "Heat"
          : "Hidden";

  if (kpiView) kpiView.textContent = view;
  if (kpiHeatMode) kpiHeatMode.textContent = "Count";
}

function updateStats(points) {
  statEl.textContent = ``;
  if (kpiLocations) kpiLocations.textContent = String(points.length);
}

function rebuildFromMemory() {
  if (!window.__points) return;
  buildPoints(window.__points);
  buildHeat(window.__points);
  updateLayerVisibility();
}

async function main() {
  try {
    clearError();
    statEl.textContent = "Loading data…";

    const res = await fetch(POINTS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch ${POINTS_URL}`);

    const raw = await res.json();
    const points = normalizePoints(raw);

    window.__points = points;

    buildPoints(points);
    buildHeat(points);
    updateLayerVisibility();
    refitBounds(points);
    updateStats(points);
  } catch (err) {
    console.error(err);
    showError(String(err));
    statEl.textContent = "Could not load data.";
  }
}

pointRadius.addEventListener("input", rebuildFromMemory);
heatRadius.addEventListener("input", rebuildFromMemory);
heatBlur.addEventListener("input", rebuildFromMemory);

togglePoints.addEventListener("change", updateLayerVisibility);
toggleHeat.addEventListener("change", updateLayerVisibility);

if (btnRefit) {
  btnRefit.addEventListener("click", () => {
    if (window.__points) refitBounds(window.__points);
  });
}

main();
