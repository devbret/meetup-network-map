import csv
import json
import math
from pathlib import Path
from typing import Dict, Tuple, List, Any, Optional

def to_float(x: str) -> Optional[float]:
    try:
        if x is None:
            return None
        x = str(x).strip()
        if x == "" or x.lower() in {"nan", "none", "null"}:
            return None
        return float(x)
    except Exception:
        return None

def is_valid_lat_lon(lat: float, lon: float) -> bool:
    return (
        lat is not None
        and lon is not None
        and not math.isnan(lat)
        and not math.isnan(lon)
        and -90.0 <= lat <= 90.0
        and -180.0 <= lon <= 180.0
    )

def weight_from_row(row: Dict[str, str]) -> float:
    events = to_float(row.get("events_attended", ""))
    if events is None:
        return 1.0
    return min(10.0, 1.0 + math.log1p(max(0.0, events)))

def convert_meetup_csv_to_leaflet_json(
    csv_path: str,
    out_dir: str = "./out",
    aggregate: bool = True,
    aggregate_precision_decimals: int = 3,
) -> Dict[str, Any]:
    csv_path = str(csv_path)
    out_dir_path = Path(out_dir)
    out_dir_path.mkdir(parents=True, exist_ok=True)

    points: List[Dict[str, float]] = []
    heat: List[List[float]] = []

    agg: Dict[Tuple[float, float], Dict[str, float]] = {}

    with open(csv_path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            lat = to_float(row.get("lat", ""))
            lon = to_float(row.get("lon", ""))

            if lat is None or lon is None or not is_valid_lat_lon(lat, lon):
                continue

            w = float(weight_from_row(row))

            if aggregate:
                key = (round(lat, aggregate_precision_decimals), round(lon, aggregate_precision_decimals))
                if key not in agg:
                    agg[key] = {"lat": key[0], "lon": key[1], "w": 0.0}
                agg[key]["w"] += w
            else:
                points.append({"lat": lat, "lon": lon, "w": w})
                heat.append([lat, lon, w])

    if aggregate:
        points = list(agg.values())
        heat = [[p["lat"], p["lon"], p["w"]] for p in points]

    points_path = out_dir_path / "members_points.json"
    heat_path = out_dir_path / "members_heat.json"
    meta_path = out_dir_path / "members_meta.json"

    with open(points_path, "w", encoding="utf-8") as f:
        json.dump(points, f, ensure_ascii=False, indent=2)

    with open(heat_path, "w", encoding="utf-8") as f:
        json.dump(heat, f, ensure_ascii=False, indent=2)

    meta = {
        "input_csv": csv_path,
        "total_points_output": len(points),
        "aggregate": aggregate,
        "aggregate_precision_decimals": aggregate_precision_decimals,
        "outputs": {
            "points": str(points_path),
            "heat": str(heat_path),
        },
        "privacy_note": "No member_name or member_id included. Only lat/lon (+weight).",
    }

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    return meta

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Convert Meetup members CSV -> Leaflet JSON (points + heat).")
    parser.add_argument("csv_path", help="Path to Meetup CSV export")
    parser.add_argument("--out", default="./out", help="Output directory")
    parser.add_argument("--no-aggregate", action="store_true", help="Disable coordinate aggregation")
    parser.add_argument("--decimals", type=int, default=3, help="Rounding decimals when aggregating")
    args = parser.parse_args()

    meta = convert_meetup_csv_to_leaflet_json(
        args.csv_path,
        out_dir=args.out,
        aggregate=not args.no_aggregate,
        aggregate_precision_decimals=args.decimals,
    )

    print("Wrote:")
    print(json.dumps(meta, indent=2))
