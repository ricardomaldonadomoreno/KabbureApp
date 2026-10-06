#!/usr/bin/env python3
"""Importa rutas de Microcruz al paquete de rutas editable de Kabbure."""
from __future__ import annotations

import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE_URL = "https://microcruz.tel.bo/api/routes.php"
SOURCE_URL = "https://microcruz.tel.bo"
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "data" / "route-imports" / "microcruz-santa-cruz"


def get_json(params: dict[str, str]) -> dict:
    url = f"{BASE_URL}?{urlencode(params)}"
    request = Request(url, headers={"User-Agent": "Kabbure route importer/1.0"})
    with urlopen(request, timeout=45) as response:
        return json.load(response)


def chunks(items: list[str], size: int):
    for start in range(0, len(items), size):
        yield items[start : start + size]


def route_code(name: str) -> str:
    match = re.search(r"linea\s*(\d+)", name, re.IGNORECASE)
    return match.group(1) if match else name


def route_slug(name: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return value or "ruta-sin-nombre"


def build_kabbure_codes(names: list[str]) -> dict[str, str]:
    grouped: dict[str, list[str]] = {}
    for name in names:
        grouped.setdefault(route_code(name), []).append(name)

    codes: dict[str, str] = {}
    for base, group in grouped.items():
        if len(group) == 1:
            codes[group[0]] = f"RK-{base}"
            continue
        for index, name in enumerate(group):
            suffix = chr(ord("A") + index)
            codes[name] = f"RK-{base}-{suffix}"
    return codes


def coordinates(points: list[dict]) -> list[list[float]]:
    return [[float(point["lng"]), float(point["lat"])] for point in points if "lng" in point and "lat" in point]


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    names = get_json({"action": "list"}).get("routes", [])
    if not isinstance(names, list):
        raise RuntimeError("Microcruz no devolvió una lista de rutas")
    kabbure_codes = build_kabbure_codes(names)

    route_payloads: dict[str, dict] = {}
    direction_payloads: dict[str, dict] = {}
    segment_payloads: dict[str, dict] = {}

    for batch in chunks(names, 20):
        encoded = ",".join(batch)
        route_payloads.update(get_json({"names": encoded}).get("routes", {}))
        direction_payloads.update(get_json({"action": "sentidos", "names": encoded}).get("sentidos", {}))
        segment_payloads.update(get_json({"action": "tramos", "names": encoded}).get("tramos", {}))
        time.sleep(0.15)

    routes = []
    features = []
    missing_geometry = []

    for name in names:
        kabbure_code = kabbure_codes[name]
        full_points = route_payloads.get(name, [])
        segments = segment_payloads.get(name, {})
        route_directions = []

        for direction_id in ("sentido_a", "sentido_b"):
            api_key = "ida" if direction_id == "sentido_a" else "vuelta"
            points = segments.get(api_key, []) if isinstance(segments, dict) else []
            if not points:
                points = full_points if direction_id == "sentido_a" else list(reversed(full_points))
            coords = coordinates(points)
            direction = {
                "id": direction_id,
                "label": "Sentido A" if direction_id == "sentido_a" else "Sentido B",
                "coordinates": coords,
                "source_sequence": [point.get("seq") for point in points if point.get("seq") is not None],
            }
            route_directions.append(direction)
            if len(coords) < 2:
                missing_geometry.append({"route": name, "direction": direction_id})
            else:
                features.append({
                    "type": "Feature",
                    "id": f"microcruz-{route_slug(name)}-{direction_id}",
                    "properties": {
                        "route_id": f"microcruz-{route_slug(name)}",
                        "route_name": f"Ruta {kabbure_code}",
                        "route_code": kabbure_code,
                        "direction_id": direction_id,
                        "direction_label": direction["label"],
                        "country_code": "BO",
                        "city": "Santa Cruz de la Sierra",
                        "source": "pública",
                        "approval_status": "pending",
                    },
                    "geometry": {"type": "LineString", "coordinates": coords},
                })

        routes.append({
            "id": f"microcruz-{route_slug(name)}",
            "name": f"Ruta {kabbure_code}",
            "code": kabbure_code,
            "country_code": "BO",
            "city": "Santa Cruz de la Sierra",
            "source": "pública",
            "approval_status": "pending",
            "directions": route_directions,
            "import_reference": {"external_name": name, "directions": direction_payloads.get(name, {})},
        })

    imported_at = datetime.now(timezone.utc).isoformat()
    manifest = {
        "format": "kabbure-route-import",
        "version": 1,
        "imported_at": imported_at,
        "source": {"type": "publica"},
        "location": {"country_code": "BO", "city": "Santa Cruz de la Sierra"},
        "approval_status_default": "pending",
        "route_count": len(routes),
        "feature_count": len(features),
        "routes_with_missing_direction_geometry": missing_geometry,
        "routes": routes,
    }
    geojson = {
        "type": "FeatureCollection",
        "name": "Kabbure import - Microcruz Santa Cruz",
        "metadata": {
            "format": "kabbure-route-geojson",
            "version": 1,
            "imported_at": imported_at,
            "source": "pública",
            "approval_status_default": "pending",
        },
        "features": features,
    }

    (OUTPUT_DIR / "routes-package.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    (OUTPUT_DIR / "routes.geojson").write_text(json.dumps(geojson, ensure_ascii=False, indent=2) + "\n")
    (OUTPUT_DIR / "README.md").write_text(
        "# Importación de rutas: Microcruz / Santa Cruz\n\n"
        "Paquete normalizado para cargar rutas en el panel administrativo de Kabbure.\n\n"
        "- `routes-package.json`: formato completo de importación, con códigos RK, dos sentidos, secuencias y metadatos.\n"
        "- `routes.geojson`: formato cartográfico estándar para Leaflet y editores de geometría.\n"
        "- Todas las rutas quedan como `pending` y no deben publicarse automáticamente.\n"
        "- Las coordenadas GeoJSON usan el orden `[longitud, latitud]`.\n\n"
        "Fuente funcional: pública. La referencia técnica de importación se conserva únicamente en el script.\n"
    )
    print(json.dumps({
        "output_dir": str(OUTPUT_DIR),
        "routes": len(routes),
        "geojson_features": len(features),
        "missing_direction_geometry": len(missing_geometry),
        "package_bytes": (OUTPUT_DIR / "routes-package.json").stat().st_size,
        "geojson_bytes": (OUTPUT_DIR / "routes.geojson").stat().st_size,
    }, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Error importando rutas de Microcruz: {exc}", file=sys.stderr)
        raise
