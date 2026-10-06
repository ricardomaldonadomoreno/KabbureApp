# Importación de rutas: Microcruz / Santa Cruz

Paquete normalizado para cargar rutas en el panel administrativo de Kabbure.

- `routes-package.json`: formato completo de importación, con códigos RK, dos sentidos, secuencias y metadatos.
- `routes.geojson`: formato cartográfico estándar para Leaflet y editores de geometría.
- Todas las rutas quedan como `pending` y no deben publicarse automáticamente.
- Las coordenadas GeoJSON usan el orden `[longitud, latitud]`.

Fuente funcional: pública. La referencia técnica de importación se conserva únicamente en el script.
