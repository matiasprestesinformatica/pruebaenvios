# Blueprint del Proyecto: Rumbos Envíos

## 1. Visión General del Proyecto

**Nombre de la Aplicación:** Rumbos Envíos

**Propósito Principal:**
Una aplicación web para la gestión integral de una empresa de mensajería y logística en Mar del Plata, Argentina. Permite administrar clientes, empresas asociadas, repartidores, crear y gestionar envíos individuales y por lote, optimizar rutas de reparto, y cotizar servicios de envío.

**Público Objetivo:**
*   Personal operativo de la empresa Rumbos Envíos.
*   (Potencialmente) Clientes para realizar cotizaciones.

**Stack Tecnológico (Predefinido):**
*   Frontend: Next.js (App Router), React, TypeScript
*   UI: ShadCN UI, Tailwind CSS
*   Backend/Base de Datos: Supabase (PostgreSQL)
*   Inteligencia Artificial: Genkit (con Google Gemini)

## 2. Funcionalidades Principales (Core Features)

### 2.1. Gestión de Clientes (`/clientes`)
*   **Formulario de Cliente:** Para agregar y editar clientes.
    *   Campos: Nombre (obligatorio), Apellido (obligatorio), Dirección (obligatoria), Latitud (numérico, opcional, manual), Longitud (numérico, opcional, manual), Teléfono (opcional, formato validado), Email (opcional, formato validado, único), Notas (opcional), Empresa asociada (opcional, FK a `empresas`), Estado (activo/inactivo, booleano).
    *   **Geocodificación:** Al ingresar una dirección (si no se proveen lat/lng manuales), se intentará geocodificarla automáticamente usando Google Geocoding API. Se validará que las coordenadas estén dentro de Mar del Plata.
*   **Listado de Clientes:**
    *   Tabla paginada y con búsqueda que muestra los clientes.
    *   Columnas: Nombre completo, Email, Teléfono, Empresa (si aplica), Estado (con switch para activar/inactivar), Fecha de registro.
    *   Acciones: Editar cliente, placeholder para eliminar.
*   **Server Actions (`src/app/clientes/actions.ts`):**
    *   `addClientAction`, `updateClientAction`, `getClientsAction`, `getClientByIdAction`, `updateClientEstadoAction`, `getEmpresasForClientFormAction`.

### 2.2. Gestión de Empresas (`/empresas`)
*   **Formulario de Empresa:** Para agregar y editar empresas.
    *   Campos: Nombre (obligatorio), Dirección (obligatoria), Latitud (numérico, opcional, manual), Longitud (numérico, opcional, manual), Teléfono (opcional), Email (opcional), Notas (opcional), Estado (activo/inactivo).
    *   **Geocodificación:** Similar a Clientes, para la dirección de la empresa.
*   **Listado de Empresas:**
    *   Tabla paginada y con búsqueda.
    *   Columnas: Nombre, Email, Teléfono, Estado (con switch), Fecha de registro.
    *   Acciones: Editar empresa, placeholder para eliminar.
*   **Server Actions (`src/app/empresas/actions.ts`):**
    *   `addEmpresaAction`, `updateEmpresaAction`, `getEmpresasAction`, `getEmpresaByIdAction`, `updateEmpresaEstadoAction`, `getEmpresasForSelectAction`.

### 2.3. Gestión de Repartidores (`/repartidores`)
*   **Formulario de Repartidor:** Para agregar y editar repartidores.
    *   Campos: Nombre (obligatorio), Estado (activo/inactivo).
*   **Listado de Repartidores:**
    *   Tabla paginada y con búsqueda.
    *   Columnas: Nombre, Estado (con switch).
    *   Acciones: Editar (placeholder), placeholder para eliminar.
*   **Server Actions (`src/app/repartidores/actions.ts`):**
    *   `addRepartidorAction`, `getRepartidoresAction`, `updateRepartidorEstadoAction`.

### 2.4. Gestión de Envíos (`/envios`)
*   **Formulario de Creación de Envío (`/envios/nuevo`):**
    *   Permite crear un nuevo envío.
    *   Campos:
        *   Cliente Existente (opcional, selector de clientes activos) o Nombre Cliente Temporal (si no se selecciona existente).
        *   Ubicación del Cliente (autocompletada si se selecciona cliente con dirección, o manual).
        *   Tipo de Paquete (obligatorio, selector desde tabla `tipos_paquete`).
        *   Peso del Paquete (kg, numérico, obligatorio).
        *   Tipo de Servicio (opcional, selector desde `tipos_servicio` activos). Si se elige uno, se usa su `precio_base`.
        *   Precio Final del Servicio (numérico, manual). Si se elige un Tipo de Servicio, este campo puede autocompletarse con el `precio_base` del servicio, pero puede ser sobrescrito. Si se elige "Ingreso Manual", este campo es obligatorio.
    *   **Geocodificación:** Si se ingresa una dirección manual o si el cliente seleccionado no tiene coordenadas, se intenta geocodificar.
    *   **Sugerencias IA (Opcional):** Botón para solicitar sugerencias de opciones de entrega basadas en ubicación, tamaño y peso.
*   **Formulario de Edición de Envío:**
    *   Permite modificar un envío existente.
    *   Todos los campos del formulario de creación son editables, más el campo "Estado del Envío" (selector con valores de `estadoEnvioEnum`).
*   **Listado de Envíos:**
    *   Tabla paginada y con búsqueda.
    *   Columnas: Cliente/Destino, Ubicación, Paquete (nombre del tipo de paquete, peso), Estado (con badge coloreado), Fecha de registro.
    *   Acciones: Ver Detalle, Editar.
*   **Diálogo de Detalle de Envío:**
    *   Muestra información completa del envío en un modal: Info Principal, Cliente/Destinatario, Paquete, Servicio y Precio, Asignado a Reparto (si aplica), Sugerencias de IA.
*   **Server Actions (`src/app/envios/actions.ts`):**
    *   `createShipmentAction`, `updateShipmentAction`, `getEnviosAction`, `getEnvioByIdAction`, `getClientesForShipmentFormAction`, `suggestDeliveryOptionsAction`.

### 2.5. Gestión de Repartos y Viajes
#### 2.5.1. Listado de Repartos (`/repartos`)
*   Tabla paginada y con búsqueda que muestra los repartos existentes.
*   Columnas: Fecha Reparto, Repartidor, Tipo (Individual, Viaje Empresa, Viaje Empresa Lote), Empresa (si aplica), Estado (Asignado, En Curso, Completado - con badge).
*   Acción: Ver Detalle (lleva a `/repartos/[id]`).

#### 2.5.2. Creación de Nuevo Reparto (`/repartos/nuevo`)
*   Formulario para crear repartos de tipo "Envíos Individuales" o "Viaje por Empresa".
*   Campos comunes: Fecha de Reparto, Repartidor Asignado.
*   **Envíos Individuales:** Permite buscar y seleccionar envíos pendientes (no asignados a otro reparto).
*   **Viaje por Empresa:** Permite seleccionar una empresa y luego seleccionar envíos pendientes de los clientes de esa empresa.
*   **Lógica de Creación:**
    *   Crea un registro en `repartos`.
    *   Actualiza `reparto_id` y `status` en los `envios` seleccionados.
    *   Crea registros en `paradas_reparto` para cada envío, con un `orden` secuencial y `tipo_parada = 'entrega_cliente'`.

#### 2.5.3. Creación de Reparto por Lote (`/repartos/lote/nuevo`)
*   Formulario para crear repartos donde se generan automáticamente envíos para clientes de una empresa.
*   Campos: Fecha, Repartidor, Empresa.
*   **Selección de Clientes:** Lista clientes de la empresa seleccionada, permite seleccionar múltiples.
*   **Configuración de Servicio por Cliente:** Para cada cliente seleccionado, permite:
    *   Elegir un "Tipo de Servicio" (de `tipos_servicio` activos). Su `precio_base` se usa si no hay precio manual.
    *   O ingresar un "Precio Manual" para el servicio de ese cliente.
*   **Lógica de Creación:**
    *   Crea un registro en `repartos` con `tipo_reparto = 'viaje_empresa_lote'`.
    *   Crea una parada de `tipo_parada = 'retiro_empresa'` para la empresa (orden 0), usando las coordenadas de la empresa.
    *   Para cada cliente seleccionado:
        *   Crea un nuevo `envio` (usando la dirección y coordenadas del cliente, `tipo_paquete_id` por defecto/nulo, `package_weight` por defecto).
        *   Asigna `tipo_servicio_id` y `precio_servicio_final` al envío según la configuración del formulario.
        *   Crea una parada en `paradas_reparto` para este envío (orden secuencial > 0, `tipo_parada = 'entrega_cliente'`).

#### 2.5.4. Detalle del Reparto (`/repartos/[id]`)
*   Muestra información completa del reparto:
    *   Datos generales: Fecha, Repartidor, Tipo, Empresa (y dirección de retiro si es de empresa).
    *   **Valor Total del Reparto:** Suma de `precio_servicio_final` de todos los envíos de entrega.
    *   Gestión de Estado del Reparto: Selector para cambiar estado (Asignado, En Curso, Completado). Al cambiar, se actualiza el estado de los envíos asociados.
*   **Paradas Asignadas:**
    *   Tabla de paradas ordenadas por `orden`.
    *   Columnas: Orden, Reordenar (botones arriba/abajo), Destino/Tipo Parada (Empresa o Cliente), Ubicación, Paquete, Estado Envío, Valor Servicio.
    *   **Distancia Ruta Actual:** Muestra la distancia estimada de la ruta actual (calculada en cliente con Google Maps).
*   **Optimización de Ruta con IA:**
    *   Botón "Optimizar Ruta (IA)" (habilitado si hay >=2 paradas con coordenadas).
    *   Llama a un flujo de Genkit (`optimizeRouteFlow`) que usa un LLM para sugerir un nuevo orden de paradas y una distancia estimada.
    *   Muestra la ruta sugerida y su distancia.
    *   Botón "Aplicar Ruta Sugerida" para actualizar el `orden` en `paradas_reparto`.

*   **Server Actions (`src/app/repartos/actions.ts`):**
    *   `getRepartidoresActivosAction`, `getEmpresasForRepartoAction`, `getEnviosPendientesAction`, `getEnviosPendientesPorEmpresaAction`, `createRepartoAction`, `createRepartoLoteAction`, `getRepartosListAction`, `getRepartoDetailsAction`, `updateRepartoEstadoAction`, `reorderParadasAction`, `optimizeRouteAction`, `applyOptimizedRouteOrderAction`, `getClientesByEmpresaAction`.

### 2.6. Mapa de Envíos (`/mapa-envios`)
*   Muestra envíos geolocalizados en un mapa de Google Maps centrado en Mar del Plata.
*   **Filtros:**
    *   Por Reparto específico: Muestra las paradas de ese reparto, conectadas por una polilínea con dirección y con marcadores numerados según el orden.
    *   Envíos No Asignados.
    *   Todos los Envíos.
*   **Marcadores:**
    *   Coloreados según el `status` del envío.
    *   La parada de "retiro en empresa" tiene un marcador distintivo.
*   **InfoWindow:** Al hacer clic en un marcador, muestra detalles del envío/parada.
*   **Componente de Resumen:** Muestra un resumen de lo que se está viendo en el mapa (total de paradas, punto de retiro si aplica, envíos no asignados).
*   **Tarjeta de Envíos No Asignados:** Lista los envíos no asignados si el filtro no es por un reparto específico.
*   **Server Actions (`src/app/mapa-envios/actions.ts`):**
    *   `getEnviosGeolocalizadosAction` (acepta `repartoId` para filtrar).
    *   `getRepartosForMapFilterAction`.
    *   `getEnviosNoAsignadosGeolocalizadosAction`.

### 2.7. Configuración (`/configuracion`)
Página con pestañas para gestionar:
*   **Tipos de Paquete:** CRUD para `tipos_paquete` (Nombre, Descripción, Activo).
*   **Tipos de Servicio:** CRUD para `tipos_servicio` (Nombre, Descripción, Precio Base, Activo).
*   **Tarifas Calculadora:** Gestión de `tarifas_distancia_calculadora`.
    *   Permite seleccionar "Express" o "LowCost".
    *   Muestra listas de precios agrupadas por `fecha_vigencia_desde`.
    *   Permite crear nuevas listas de precios para una fecha futura, definiendo tramos (distancia\_hasta\_km, precio).
    *   Permite eliminar listas de precios por fecha.
*   **Server Actions (`src/app/configuracion/actions.ts`):**
    *   Acciones CRUD para `tipos_paquete` y `tipos_servicio`.
    *   Acciones para `tarifas_distancia_calculadora`: `getTarifasCalculadoraConHistorialAction`, `saveListaTarifasCalculadoraAction`, `deleteTarifasCalculadoraPorFechaAction`.

### 2.8. Cotizadores de Envío
*   **Cotizador Express (`/cotizador-envios-express`):**
    *   Permite ingresar dirección de origen y destino en Mar del Plata.
    *   Calcula la distancia usando Google Maps Directions API.
    *   Calcula el precio usando las tarifas vigentes de `tarifas_distancia_calculadora` para el tipo 'express'.
    *   Muestra distancia, precio y un mapa con la ruta.
    *   Permite convertir la cotización en una "Solicitud de Envío" a través de un formulario.
*   **Cotizador LowCost (`/cotizador-envios-lowcost`):**
    *   Funcionalidad similar al Express, pero usa las tarifas 'lowcost'. No incluye la opción de convertir a solicitud de envío.
*   **Server Actions (`src/app/calculadora/actions.ts`):**
    *   `getTarifasCalculadoraAction` (obtiene tarifas vigentes para un tipo).
    *   `createEnvioDesdeCalculadoraAction` (crea un envío desde el formulario del cotizador Express).

## 3. Estructura de la Base de Datos (Supabase - PostgreSQL)

*   **`repartidores`**: id, created_at, nombre, estado.
*   **`empresas`**: id, created_at, nombre, direccion (NOT NULL), latitud, longitud, telefono, email, notas, estado.
*   **`clientes`**: id, created_at, nombre, apellido, direccion (NOT NULL), latitud, longitud, telefono, email (UNIQUE NULLABLE), notas, empresa_id (FK), estado.
*   **`tipos_paquete`**: id, created_at, nombre (UNIQUE), descripcion, activo.
*   **`tipos_servicio`**: id, created_at, nombre (UNIQUE), descripcion, precio_base (NUMERIC), activo.
*   **`repartos`**: id, created_at, fecha_reparto (DATE), repartidor_id (FK), estado (TEXT, default 'asignado'), tipo_reparto (TEXT), empresa_id (FK).
*   **`envios`**: id, created_at, cliente_id (FK), nombre_cliente_temporal, client_location (NOT NULL), latitud, longitud, tipo_paquete_id (FK a `tipos_paquete`), package_weight (NUMERIC, default 0.1), status (TEXT, default 'pending'), suggested_options (JSON), reasoning (TEXT), reparto_id (FK), tipo_servicio_id (FK a `tipos_servicio`), precio_servicio_final (NUMERIC).
*   **`paradas_reparto`**: id, created_at, reparto_id (FK, CASCADE), envio_id (FK, CASCADE, NULLABLE), tipo_parada (ENUM 'retiro_empresa', 'entrega_cliente'), orden (INTEGER). UNIQUE(reparto_id, envio_id) DEFERRABLE.
*   **`tarifas_distancia_calculadora`**: id, created_at, tipo_calculadora (ENUM 'lowcost', 'express'), distancia_hasta_km (NUMERIC), precio (NUMERIC), fecha_vigencia_desde (DATE). UNIQUE(tipo_calculadora, fecha_vigencia_desde, distancia_hasta_km).
*   **ENUMs PostgreSQL:** `tipoparadaenum`, `tipocalculadoraservicioenum`.
*   **RLS:** Habilitada para todas las tablas, con políticas permisivas para usuarios autenticados (y lectura pública para tarifas y empresas).

## 4. Flujos de IA (Genkit)

*   **`generateClientSummary`**: Resume notas de un cliente (actualmente no integrado en la UI principal).
*   **`suggestDeliveryOptions`**: Sugiere opciones de envío basadas en ubicación, tamaño y peso (integrado en el formulario de nuevo envío).
*   **`optimizeRouteFlow`**: Sugiere un orden óptimo para las paradas de un reparto (integrado en la página de detalle del reparto).

## 5. Estilo y UI

*   **Colores Principales (definidos en `globals.css`):**
    *   Primario: Azul apagado (#6699CC) - `hsl(var(--primary))`
    *   Fondo: Gris claro (#F0F0F0) - `hsl(var(--background))`
    *   Acento: Naranja contrastante (#FF8533) - `hsl(var(--accent))`
*   **Tipografía:** Fuente sans-serif legible (la configuración por defecto de Tailwind/ShadCN).
*   **Componentes:** Uso extensivo de componentes ShadCN UI para consistencia.
*   **Diseño Responsivo:** Todas las páginas deben ser responsivas.

## 6. Consideraciones Adicionales
*   **Variables de Entorno Críticas:**
    *   `NEXT_PUBLIC_SUPABASE_URL`
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    *   `GEMINI_API_KEY` (para Genkit)
    *   `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (para mapas en cliente)
    *   `GOOGLE_GEOCODING_API_KEY` (para geocodificación en servidor)
*   **Atomicidad:** Para operaciones complejas como la creación de repartos con múltiples actualizaciones de envíos/paradas, se recomienda considerar funciones RPC de Supabase para transacciones atómicas en producción.
*   **Seguridad RLS:** Las políticas RLS actuales son permisivas para desarrollo. Deben revisarse y ajustarse para un entorno de producción para asegurar un control de acceso granular.

Este documento proporciona una descripción detallada de "Rumbos Envíos". Debería servir como un excelente punto de partida para que una IA como yo pueda comenzar a desarrollar o continuar con el proyecto, entendiendo sus componentes clave y la lógica de negocio.