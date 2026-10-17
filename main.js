const POINTS_URL = "./out/members_points.json";

const statEl = document.getElementById("stat");
const errEl = document.getElementById("err");

const kpiMembers = document.getElementById("kpiMembers");
const kpiLocations = document.getElementById("kpiLocations");
const kpiView = document.getElementById("kpiView");

const map = L.map("map", { zoomControl: true, worldCopyJump: true }).setView(
  [20, 0],
  2,
);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(map);

const pointsLayer = L.layerGroup().addTo(map);
let heatLayer = null;

const togglePoints = document.getElementById("togglePoints");
const toggleHeat = document.getElementById("toggleHeat");
const pointRadius = document.getElementById("pointRadius");
const heatRadius = document.getElementById("heatRadius");
const heatBlur = document.getElementById("heatBlur");
const btnRefit = document.getElementById("btnRefit");

const growthRow = document.getElementById("growthRow");
const joinCutoff = document.getElementById("joinCutoff");
const joinCutoffLabel = document.getElementById("joinCutoffLabel");
const btnPlay = document.getElementById("btnPlay");

let allPoints = [];
let joinDays = [];
let playTimer = null;

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
    const joins = Array.isArray(p?.joins)
      ? p.joins.filter((d) => typeof d === "string").sort()
      : [];
    const unknown = Math.max(0, w - joins.length);
    out.push({ lat, lon, w, joins, unknown });
  }
  return out;
}

function collectJoinDays(points) {
  const days = new Set();
  for (const p of points) for (const d of p.joins) days.add(d);
  return [...days].sort();
}

function pointsJoinedBy(points, cutoffDay) {
  if (cutoffDay === null) return points;
  const out = [];
  for (const p of points) {
    let n = p.unknown;
    for (const d of p.joins) {
      if (d > cutoffDay) break;
      n++;
    }
    if (n > 0) out.push({ lat: p.lat, lon: p.lon, w: n });
  }
  return out;
}

function currentCutoffDay() {
  if (!joinDays.length) return null;
  const i = Math.min(
    joinDays.length - 1,
    Math.max(0, Number(joinCutoff.value)),
  );
  return joinDays[i];
}

function formatDay(day) {
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
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
}

function updateKpis(points) {
  const members = points.reduce((sum, p) => sum + p.w, 0);
  if (kpiMembers) kpiMembers.textContent = String(members);
  if (kpiLocations) kpiLocations.textContent = String(points.length);

  const day = currentCutoffDay();
  if (joinCutoffLabel) joinCutoffLabel.textContent = day ? formatDay(day) : "";
}

function updateSummary() {
  const members = allPoints.reduce((sum, p) => sum + p.w, 0);
  const parts = [`${members} members`, `${allPoints.length} locations`];
  if (joinDays.length) {
    const first = formatDay(joinDays[0]);
    const last = formatDay(joinDays[joinDays.length - 1]);
    parts.push(
      first === last ? `joined ${first}` : `joined ${first} to ${last}`,
    );
  }
  statEl.textContent = parts.join(" · ");
}

function setupGrowthSlider() {
  joinDays = collectJoinDays(allPoints);
  if (!growthRow || !joinCutoff) return;

  if (!joinDays.length) {
    growthRow.hidden = true;
    return;
  }

  growthRow.hidden = false;
  joinCutoff.min = "0";
  joinCutoff.max = String(joinDays.length - 1);
  joinCutoff.value = String(joinDays.length - 1);
}

function render() {
  const points = pointsJoinedBy(allPoints, currentCutoffDay());
  buildPoints(points);
  buildHeat(points);
  updateLayerVisibility();
  updateKpis(points);
}

function stopPlay() {
  if (playTimer) {
    clearInterval(playTimer);
    playTimer = null;
  }
  if (btnPlay) btnPlay.textContent = "Play";
}

function startPlay() {
  if (!joinDays.length) return;
  const last = joinDays.length - 1;
  if (Number(joinCutoff.value) >= last) joinCutoff.value = "0";
  render();

  const interval = Math.max(40, Math.min(400, 6000 / joinDays.length));

  if (btnPlay) btnPlay.textContent = "Pause";
  playTimer = setInterval(() => {
    const next = Number(joinCutoff.value) + 1;
    joinCutoff.value = String(next);
    render();
    if (next >= last) stopPlay();
  }, interval);
}

async function main() {
  try {
    clearError();
    statEl.textContent = "Loading data…";

    const res = await fetch(POINTS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch ${POINTS_URL}`);

    const raw = await res.json();
    allPoints = normalizePoints(raw);

    setupGrowthSlider();
    render();
    refitBounds(allPoints);
    updateSummary();
  } catch (err) {
    console.error(err);
    showError(String(err));
    statEl.textContent = "Could not load data.";
  }
}

pointRadius.addEventListener("input", render);
heatRadius.addEventListener("input", render);
heatBlur.addEventListener("input", render);

togglePoints.addEventListener("change", updateLayerVisibility);
toggleHeat.addEventListener("change", updateLayerVisibility);

if (btnRefit) {
  btnRefit.addEventListener("click", () => refitBounds(allPoints));
}

if (joinCutoff) {
  joinCutoff.addEventListener("input", () => {
    stopPlay();
    render();
  });
}

if (btnPlay) {
  btnPlay.addEventListener("click", () =>
    playTimer ? stopPlay() : startPlay(),
  );
}

main();
