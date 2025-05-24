
# Estructura del Proyecto y Configuración: Rumbos Envíos

Este documento detalla la estructura de directorios y los archivos de configuración clave del proyecto "Rumbos Envíos".

## 1. Estructura de Directorios Principal

El proyecto sigue una estructura estándar para aplicaciones Next.js (App Router), con carpetas adicionales para lógica específica de la aplicación.

```
/
├── .env                    # (No versionado) Variables de entorno locales.
├── .eslintrc.json          # Configuración de ESLint.
├── .gitignore              # Archivos y carpetas ignorados por Git.
├── .idx/                   # Directorio específico del entorno de desarrollo Project IDX.
├── .vscode/                # Configuraciones específicas para Visual Studio Code.
├── README.md               # Información general del proyecto.
├── components.json         # Configuración de ShadCN UI (CLI).
├── next-env.d.ts           # Declaraciones de tipos globales para Next.js.
├── next.config.ts          # Configuración principal de Next.js.
├── package.json            # Dependencias y scripts del proyecto.
├── pnpm-lock.yaml          # Archivo de bloqueo de dependencias (Pnpm).
├── supabase/               # Configuración y scripts de la base de datos Supabase.
│   ├── config.toml         # Configuración del entorno local de Supabase.
│   ├── migrations/         # (Opcional, si se usa el sistema de migraciones)
│   ├── migrations_extras/  # Scripts SQL adicionales (ej. para alteraciones puntuales).
│   │   ├── 01_add_precio_servicio_to_envios.sql
│   │   └── 02_update_envios_for_tipos.sql
│   │   └── 03_create_tarifas_calculadora.sql
│   ├── 00_schema_drop_all.sql # Script para eliminar todas las tablas y tipos.
│   ├── 01_schema_enums.sql    # Script para crear tipos ENUM de PostgreSQL.
│   ├── 02_schema_tables.sql   # Script para crear todas las tablas.
│   ├── 03_schema_rls.sql      # Script para definir políticas de Row Level Security.
│   ├── 04_data_seed.sql     # Script para insertar datos de ejemplo/configuración.
│   ├── schema_config_seed.sql # Script SQL consolidado con esquema y datos de configuración.
│   └── nueva.sql              # Script SQL consolidado solo con el esquema.
├── src/                    # Directorio principal del código fuente.
│   ├── ai/                 # Módulos de Inteligencia Artificial (Genkit).
│   │   ├── dev.ts          # Punto de entrada para desarrollo de Genkit.
│   │   ├── flows/          # Flujos de Genkit.
│   │   │   ├── generate-client-summary.ts
│   │   │   ├── optimize-route-flow.ts
│   │   │   └── suggest-delivery-options.ts
│   │   └── genkit.ts       # Configuración e inicialización de Genkit.
│   ├── app/                # Núcleo del App Router de Next.js.
│   │   ├── (app)/          # Grupo de rutas (actualmente neutralizado).
│   │   ├── calculadora/
│   │   │   └── actions.ts  # Server Actions para los cotizadores.
│   │   ├── clientes/       # Sección de Clientes.
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   ├── configuracion/  # Sección de Configuración.
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   ├── cotizador-envios-express/
│   │   │   └── page.tsx
│   │   ├── cotizador-envios-lowcost/
│   │   │   └── page.tsx
│   │   ├── empresas/       # Sección de Empresas.
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   ├── envios/         # Sección de Envíos.
│   │   │   ├── actions.ts
│   │   │   ├── nuevo/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── mapa-envios/    # Sección de Mapa de Envíos.
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   ├── repartidores/   # Sección de Repartidores.
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   ├── repartos/       # Sección de Repartos.
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx # Página de detalle de un reparto.
│   │   │   ├── actions.ts
│   │   │   ├── lote/
│   │   │   │   └── nuevo/
│   │   │   │       └── page.tsx # Crear reparto por lote.
│   │   │   ├── nuevo/
│   │   │   │   └── page.tsx # Crear reparto individual o por empresa.
│   │   │   └── page.tsx     # Listado de repartos.
│   │   ├── favicon.ico     # (No generar automáticamente por IA)
│   │   ├── globals.css     # Estilos globales y variables de tema CSS.
│   │   ├── layout.tsx      # Layout raíz de la aplicación.
│   │   └── page.tsx        # Página de inicio (actualmente redirige).
│   ├── components/         # Componentes React reutilizables.
│   │   ├── calculadora/
│   │   │   └── solicitud-envio-form.tsx
│   │   ├── configuracion/  # Componentes para la página de configuración.
│   │   │   ├── add-tipo-paquete-dialog.tsx
│   │   │   ├── add-tipo-servicio-dialog.tsx
│   │   │   ├── edit-tipo-paquete-dialog.tsx
│   │   │   ├── edit-tipo-servicio-dialog.tsx
│   │   │   ├── gestion-tarifas-calculadora.tsx
│   │   │   ├── tipo-paquete-form.tsx
│   │   │   ├── tipos-paquete-table.tsx
│   │   │   ├── tipo-servicio-form.tsx
│   │   │   └── tipos-servicio-table.tsx
│   │   ├── layout/         # Componentes de estructura (navbar).
│   │   │   ├── main-nav.tsx
│   │   │   ├── top-navbar.tsx
│   │   │   └── user-nav.tsx
│   │   ├── ui/             # Componentes ShadCN UI (copiados al proyecto).
│   │   │   └── ... (button.tsx, card.tsx, dialog.tsx, etc.)
│   │   ├── add-client-dialog.tsx
│   │   ├── add-empresa-dialog.tsx
│   │   ├── add-repartidor-dialog.tsx
│   │   ├── client-form.tsx
│   │   ├── clients-table.tsx
│   │   ├── edit-client-dialog.tsx
│   │   ├── edit-empresa-dialog.tsx
│   │   ├── edit-shipment-dialog.tsx
│   │   ├── empresa-form.tsx
│   │   ├── empresas-table.tsx
│   │   ├── envio-detail-dialog.tsx
│   │   ├── envios-no-asignados-card.tsx
│   │   ├── envios-table.tsx
│   │   ├── mapa-envios-summary.tsx
│   │   ├── mapa-envios-view.tsx
│   │   ├── page-header.tsx
│   │   ├── repartidor-form.tsx
│   │   ├── repartidores-table.tsx
│   │   ├── reparto-create-form.tsx
│   │   ├── reparto-detail-view.tsx
│   │   ├── reparto-lote-create-form.tsx
│   │   ├── reparto-map-filter.tsx
│   │   ├── repartos-list-table.tsx
│   │   └── shipment-form.tsx
│   ├── hooks/              # Hooks de React personalizados.
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/                # Utilidades, esquemas, cliente Supabase.
│   │   ├── schemas.ts      # Esquemas de validación Zod.
│   │   ├── supabase/       # Clientes Supabase.
│   │   │   ├── client.ts   # Cliente para el navegador.
│   │   │   └── server.ts   # Cliente para el servidor.
│   │   └── utils.ts        # Utilidades generales (ej. `cn`).
│   └── types/              # Definiciones de tipos TypeScript.
│       └── supabase.ts     # Tipos generados para la base de datos y tipos personalizados.
├── tailwind.config.ts      # Configuración de Tailwind CSS.
└── tsconfig.json           # Configuración del compilador TypeScript.
```

## 2. Archivos de Configuración Clave

*   **`.env` (Local, no versionado):**
    *   Almacena variables de entorno sensibles para desarrollo local.
    *   Variables críticas:
        *   `NEXT_PUBLIC_SUPABASE_URL`: URL pública de tu proyecto Supabase.
        *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave anónima pública de tu proyecto Supabase.
        *   `GEMINI_API_KEY`: Clave API para Google AI (Gemini), utilizada por Genkit.
        *   `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Clave API para Google Maps JavaScript API (usada en el cliente para mapas).
        *   `GOOGLE_GEOCODING_API_KEY`: Clave API para Google Geocoding API (usada en el servidor para geocodificar direcciones).
    *   En producción (ej. Netlify), estas variables deben configurarse en el panel de control del proveedor de hosting.

*   **`next.config.ts`:**
    *   Configuración principal de Next.js.
    *   Puede incluir configuraciones para optimización de imágenes, variables de entorno públicas, plugins, etc.
    *   Actualmente, incluye `typescript.ignoreBuildErrors` y `eslint.ignoreDuringBuilds` (para desarrollo), y `images.remotePatterns` para `placehold.co`.

*   **`package.json`:**
    *   Define metadatos del proyecto, scripts (ej. `dev`, `build`, `lint`, `genkit:dev`), y dependencias (Next.js, React, Supabase, Genkit, ShadCN UI, Tailwind CSS, Zod, Lucide React, date-fns, etc.).

*   **`tailwind.config.ts`:**
    *   Configuración de Tailwind CSS.
    *   Define el tema (colores, fuentes, espaciado, breakpoints) utilizando variables CSS HSL para permitir tematización (modo claro/oscuro).
    *   Importa el plugin `tailwindcss-animate`.

*   **`tsconfig.json`:**
    *   Configuración del compilador TypeScript.
    *   Establece el `target` (ES2017), `lib`s, `moduleResolution` ("bundler"), `jsx` ("preserve").
    *   Define alias de rutas (`paths`, ej. `@/*` apunta a `./src/*`).
    *   Habilita `strict: true`.

*   **`components.json` (ShadCN UI):**
    *   Configuración para la CLI de ShadCN UI.
    *   Define el estilo de los componentes ("default"), si se usan Server Components (RSC), alias de importación para `components`, `utils`, `ui`, etc., y la librería de iconos (Lucide).

*   **`src/app/globals.css`:**
    *   Importa las directivas base de Tailwind CSS.
    *   Define las variables CSS globales para el tema claro y oscuro (colores de fondo, texto, primario, secundario, acento, etc.) que utilizan los componentes de ShadCN UI y Tailwind.

## 3. Flujo de Datos y Lógica

*   **App Router de Next.js:** Las rutas se definen por la estructura de carpetas dentro de `src/app/`. Los archivos `page.tsx` definen las UI para las rutas. Los archivos `layout.tsx` definen UI compartida.
*   **Server Components y Client Components:** Se utiliza una mezcla. Los componentes de página (`page.tsx`) son Server Components por defecto, permitiendo fetching de datos asíncrono. Los componentes interactivos (formularios, tablas con interacción) son Client Components (`"use client";`).
*   **Server Actions:** La lógica de backend (operaciones CRUD con Supabase) se implementa mediante Server Actions, definidas en archivos `actions.ts` dentro de las carpetas de cada ruta. Esto permite llamar a funciones del servidor directamente desde Client Components sin crear APIs explícitas.
*   **Supabase:**
    *   El cliente de Supabase se inicializa en `src/lib/supabase/client.ts` (para navegador) y `src/lib/supabase/server.ts` (para Server Components/Actions).
    *   Las interacciones con la base de datos utilizan el cliente JS de Supabase.
*   **Genkit:**
    *   Se inicializa en `src/ai/genkit.ts`.
    *   Los flujos de IA (ej. `optimizeRouteFlow`) se definen en `src/ai/flows/`.
    *   Estos flujos se llaman desde Server Actions.
*   **Validación de Datos:** Se utiliza Zod (`src/lib/schemas.ts`) para definir esquemas de validación para los datos de formularios y, a veces, para las respuestas de la API.
*   **Estilos:** Tailwind CSS para clases de utilidad, complementado por los estilos base de los componentes ShadCN UI y las variables de tema personalizadas en `globals.css`.

Esta estructura y configuración proporcionan una base robusta y organizada para el desarrollo de "Rumbos Envíos".
