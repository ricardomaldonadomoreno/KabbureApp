# Despliegue del frontend en Vercel

## Alcance de esta etapa

Este repositorio se desplegará en Vercel como un **frontend estático** construido con React y Vite. El objetivo inmediato es que la URL pública muestre la interfaz de Mobility Intelligence y que las rutas internas del cliente funcionen correctamente.

La configuración de **Supabase**, sus tablas, autenticación, claves, seguimiento GPS y cualquier llamada al backend se realizará en una fase posterior. Por esa razón, Vercel no ejecuta Express ni tRPC en este despliegue.

| Elemento | Estado en esta etapa |
|---|---|
| Código fuente | Versionado en GitHub. |
| Frontend React/Vite | Publicado por Vercel desde `dist/public`. |
| Navegación interna | Resuelta como SPA mediante fallback a `index.html`. |
| Backend y base de datos | Pendientes de integración con Supabase. |
| Variables y claves de Supabase | No se configuran todavía. |

## Configuración incluida

El archivo `vercel.json` utiliza `pnpm exec vite build` y publica solamente el directorio `dist/public`. De este modo, Vercel no toma `dist/index.js` —el bundle de servidor local— como página de inicio.

> Para aplicaciones Vite configuradas como SPA, Vercel recomienda una reescritura hacia `index.html` para permitir enlaces directos a rutas del cliente. [1]

## Pasos para Vercel

1. Importa el repositorio `ricardomaldonadomoreno/mobility-intelligence-mvp` desde GitHub.
2. Mantén la raíz del repositorio como **Root Directory**.
3. Usa `pnpm exec vite build` como **Build Command** y `dist/public` como **Output Directory** si el panel no aplica automáticamente los valores de `vercel.json`.
4. No añadas aún claves de Supabase ni variables de backend.
5. Despliega el proyecto. Los siguientes pushes a `main` activarán el redespliegue automático si la integración GitHub–Vercel permanece conectada.

## Validación esperada

| URL | Resultado esperado ahora |
|---|---|
| `/` | Muestra la interfaz React de Mobility Intelligence. |
| `/admin/dashboard` | Carga la SPA y su ruta de cliente, no un 404 de Vercel. |
| `/driver/dashboard` | Carga la SPA y su ruta de cliente, no el bundle JavaScript del servidor. |
| `/api/*` | No forma parte de esta fase; se habilitará al conectar Supabase. |

## Próxima etapa: Supabase

Cuando se inicie la integración de backend, se definirán las tablas, las políticas de acceso por rol, la autenticación, el almacenamiento de posiciones GPS y las variables de entorno correspondientes. En ese momento se reemplazarán las llamadas locales tRPC por la integración de Supabase que se acuerde para el producto.

## Referencias

[1]: https://vercel.com/docs/frameworks/frontend/vite "Vite on Vercel"

