import csv
import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Tuple, List, Any, Optional

_BRACKET_ZONE = re.compile(r"\[[^\]]*\]\s*$")


def to_float(x: Optional[str]) -> Optional[float]:
    try:
        if x is None:
            return None
        x = str(x).strip()
        if x == "" or x.lower() in {"nan", "none", "null"}:
            return None
        return float(x)
    except Exception:
        return None


def to_int(x: Optional[str]) -> Optional[int]:
    try:
        if x is None:
            return None
        x = str(x).strip()
        if x == "" or x.lower() in {"nan", "none", "null"}:
            return None
        return int(float(x))
    except Exception:
        return None


def parse_timestamp(x: Optional[str]) -> Optional[datetime]:
    if x is None:
        return None
    s = str(x).strip()
    if s == "" or s.lower() in {"nan", "none", "null"}:
        return None

    epoch = to_float(s)
    if epoch is not None:
        if epoch >= 1e12:
            epoch /= 1000.0
        try:
            return datetime.fromtimestamp(epoch, tz=timezone.utc)
        except (OverflowError, OSError, ValueError):
            return None

    s = _BRACKET_ZONE.sub("", s)
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def is_valid_lat_lon(lat: float, lon: float) -> bool:
    return (
        lat is not None
        and lon is not None
        and not math.isnan(lat)
        and not math.isnan(lon)
        and -90.0 <= lat <= 90.0
        and -180.0 <= lon <= 180.0
    )


def weight_from_events(row: Dict[str, str]) -> float:
    events = to_float(row.get("events_attended", ""))
    if events is None:
        return 1.0
    return min(10.0, 1.0 + math.log1p(max(0.0, events)))


def normalize_recency(
    access_time: Optional[int],
    min_seconds: Optional[int],
    max_seconds: Optional[int],
) -> float:
    if access_time is None or min_seconds is None or max_seconds is None:
        return 0.0
    span = max_seconds - min_seconds
    if span <= 0:
        return 1.0
    return max(0.0, min(1.0, (access_time - min_seconds) / float(span)))


def _iso_utc(seconds: Optional[int]) -> Optional[str]:
    if seconds is None:
        return None
    return datetime.fromtimestamp(seconds, tz=timezone.utc).isoformat()


def convert_meetup_csv_to_leaflet_json(
    csv_path: str,
    out_dir: str = "./out",
    aggregate: bool = True,
    aggregate_precision_decimals: int = 3,
) -> Dict[str, Any]:
    csv_path = str(csv_path)
    out_dir_path = Path(out_dir)
    out_dir_path.mkdir(parents=True, exist_ok=True)

    points: List[Dict[str, Any]] = []
    heat_presence: List[List[float]] = []
    heat_engagement: List[List[float]] = []

    agg: Dict[Tuple[float, float], Dict[str, Any]] = {}

    rows_total = 0
    rows_skipped = 0
    rows_parsed: List[Dict[str, Any]] = []

    with open(csv_path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows_total += 1
            lat = to_float(row.get("lat", ""))
            lon = to_float(row.get("lon", ""))

            if lat is None or lon is None or not is_valid_lat_lon(lat, lon):
                rows_skipped += 1
                continue

            w_eng = float(weight_from_events(row))

            last_access_dt = parse_timestamp(row.get("last_access_time"))
            last_access = int(last_access_dt.timestamp()) if last_access_dt else None

            join_dt = parse_timestamp(row.get("join_time"))
            join_day = join_dt.date().isoformat() if join_dt else None

            rows_parsed.append(
                {
                    "lat": lat,
                    "lon": lon,
                    "w_eng": w_eng,
                    "last_access": last_access,
                    "join_day": join_day,
                }
            )

    access_times = [r["last_access"] for r in rows_parsed if r["last_access"] is not None]
    min_last_access = min(access_times) if access_times else None
    max_last_access = max(access_times) if access_times else None

    join_days = sorted(r["join_day"] for r in rows_parsed if r["join_day"])

    for item in rows_parsed:
        lat = item["lat"]
        lon = item["lon"]
        w_eng = item["w_eng"]
        join_day = item["join_day"]
        recency = normalize_recency(item["last_access"], min_last_access, max_last_access)

        if aggregate:
            key = (round(lat, aggregate_precision_decimals), round(lon, aggregate_precision_decimals))
            if key not in agg:
                agg[key] = {
                    "lat": key[0],
                    "lon": key[1],
                    "w_presence": 0.0,
                    "w_engagement": 0.0,
                    "recency_max": 0.0,
                    "count": 0.0,
                    "joins": [],
                }
            agg[key]["w_presence"] += 1.0
            agg[key]["w_engagement"] += w_eng
            agg[key]["recency_max"] = max(agg[key]["recency_max"], recency)
            agg[key]["count"] += 1.0
            if join_day:
                agg[key]["joins"].append(join_day)
        else:
            points.append(
                {
                    "lat": lat,
                    "lon": lon,
                    "w_presence": 1.0,
                    "w_engagement": w_eng,
                    "recency": recency,
                    "joins": [join_day] if join_day else [],
                }
            )
            heat_presence.append([lat, lon, 1.0])
            heat_engagement.append([lat, lon, w_eng])

    if aggregate:
        points = list(agg.values())
        heat_presence = [[p["lat"], p["lon"], p["w_presence"]] for p in points]
        heat_engagement = [[p["lat"], p["lon"], p["w_engagement"]] for p in points]

        for p in points:
            p["recency"] = p.pop("recency_max")
            p["joins"].sort()

    points_path = out_dir_path / "members_points.json"
    heat_presence_path = out_dir_path / "members_heat_presence.json"
    heat_engagement_path = out_dir_path / "members_heat_engagement.json"
    meta_path = out_dir_path / "members_meta.json"

    with open(points_path, "w", encoding="utf-8") as f:
        json.dump(points, f, ensure_ascii=False, indent=2)

    with open(heat_presence_path, "w", encoding="utf-8") as f:
        json.dump(heat_presence, f, ensure_ascii=False, indent=2)

    with open(heat_engagement_path, "w", encoding="utf-8") as f:
        json.dump(heat_engagement, f, ensure_ascii=False, indent=2)

    meta = {
        "input_csv": csv_path,
        "members_total": rows_total,
        "members_plotted": len(rows_parsed),
        "members_skipped": rows_skipped,
        "members_missing_last_access": len(rows_parsed) - len(access_times),
        "members_missing_join_time": len(rows_parsed) - len(join_days),
        "total_points_output": len(points),
        "aggregate": aggregate,
        "aggregate_precision_decimals": aggregate_precision_decimals,
        "last_access_range": {
            "min": _iso_utc(min_last_access),
            "max": _iso_utc(max_last_access),
        },
        "join_date_range": {
            "min": join_days[0] if join_days else None,
            "max": join_days[-1] if join_days else None,
        },
        "outputs": {
            "points": str(points_path),
            "heat_presence": str(heat_presence_path),
            "heat_engagement": str(heat_engagement_path),
        },
        "privacy_note": (
            "No member_name, member_id or email included. Only lat/lon, "
            "derived weights, a 0..1 recency score and join dates (day resolution)."
        ),
    }

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    return meta


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Convert Meetup members CSV -> Leaflet JSON (points + heat + recency + join dates).")
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
