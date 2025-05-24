
# Explicación Detallada de Páginas y Componentes: Rumbos Envíos

Este documento describe en detalle las principales páginas (rutas) de la aplicación "Rumbos Envíos", los componentes clave que utiliza cada una, su lógica de negocio y las interacciones con el backend (Server Actions y Supabase).

## 1. Gestión de Clientes (`/clientes`)

*   **Ruta:** `/clientes`
*   **Archivo Principal:** `src/app/clientes/page.tsx` (Server Component)
*   **Propósito:** Permitir la creación, visualización, edición y gestión del estado (activo/inactivo) de los clientes de la empresa.

### Componentes UI Clave:
*   **`src/components/page-header.tsx`:** Componente reutilizable para mostrar el título de la página y acciones principales.
*   **`src/components/add-client-dialog.tsx` (Client Component):**
    *   Diálogo modal que utiliza `src/components/client-form.tsx` para agregar nuevos clientes.
    *   Llama a `getEmpresasForClientFormAction` para poblar el selector de empresas.
    *   Al enviar, llama a `addClientAction`.
*   **`src/components/edit-client-dialog.tsx` (Client Component):**
    *   Diálogo modal que utiliza `src/components/client-form.tsx` para editar clientes existentes.
    *   Llama a `getClientByIdAction` para obtener los datos del cliente.
    *   Llama a `getEmpresasForClientFormAction` para el selector de empresas.
    *   Al enviar, llama a `updateClientAction`.
*   **`src/components/client-form.tsx` (Client Component):**
    *   Formulario reutilizable para los datos del cliente (nombre, apellido, dirección, lat/lng manual, teléfono, email, notas, empresa asociada, estado).
    *   Utiliza `react-hook-form` y el esquema Zod `clientSchema` para validación.
*   **`src/components/clients-table.tsx` (Client Component):**
    *   Muestra los clientes en una tabla paginada y con búsqueda.
    *   Columnas: Nombre completo, Email, Teléfono, Empresa (si aplica), Estado (con un `Switch` para cambiarlo), Fecha de registro.
    *   Acciones por fila: Editar (abre `EditClientDialog`), Eliminar (placeholder).
    *   Utiliza `ClientSideFormattedDate` para formatear fechas.

### Lógica de Negocio e Interacciones:
*   La página principal (`page.tsx`) obtiene la lista inicial de clientes usando `getClientsAction` y la pasa a `ClientsTable`.
*   `ClientsTable` maneja la paginación y búsqueda actualizando los parámetros de la URL, lo que provoca una nueva carga de datos en la página.
*   El `Switch` de estado en la tabla llama a `updateClientEstadoAction`.
*   La geocodificación de la dirección para obtener latitud/longitud se realiza en `addClientAction` y `updateClientAction` si no se proveen coordenadas manuales.

### Server Actions Utilizadas (`src/app/clientes/actions.ts`):
*   `addClientAction(data: ClientFormData)`: Crea un nuevo cliente.
*   `updateClientAction(clientId: string, data: ClientFormData)`: Actualiza un cliente existente.
*   `getClientsAction(page, pageSize, searchTerm?)`: Obtiene una lista paginada y filtrada de clientes (incluye un join con `empresas`).
*   `getClientByIdAction(clientId: string)`: Obtiene los detalles de un cliente específico.
*   `updateClientEstadoAction(clientId: string, nuevoEstado: boolean)`: Cambia el estado activo/inactivo de un cliente.
*   `getEmpresasForClientFormAction()`: Obtiene una lista de empresas (ID, nombre) para el selector en el formulario de cliente.

### Tablas de Supabase Relevantes:
*   `clientes`
*   `empresas` (para la relación `empresa_id` y el selector)

---

## 2. Gestión de Empresas (`/empresas`)

*   **Ruta:** `/empresas`
*   **Archivo Principal:** `src/app/empresas/page.tsx` (Server Component)
*   **Propósito:** Similar a la gestión de clientes, pero para entidades empresariales.

### Componentes UI Clave:
*   **`src/components/page-header.tsx`**
*   **`src/components/add-empresa-dialog.tsx` (Client Component):**
    *   Usa `src/components/empresa-form.tsx`.
    *   Llama a `addEmpresaAction`.
*   **`src/components/edit-empresa-dialog.tsx` (Client Component):**
    *   Usa `src/components/empresa-form.tsx`.
    *   Llama a `getEmpresaByIdAction`.
    *   Llama a `updateEmpresaAction`.
*   **`src/components/empresa-form.tsx` (Client Component):**
    *   Formulario para datos de la empresa (nombre, dirección, lat/lng manual, teléfono, email, notas, estado).
    *   Usa `react-hook-form` y `empresaSchema`.
*   **`src/components/empresas-table.tsx` (Client Component):**
    *   Tabla paginada y con búsqueda.
    *   Columnas: Nombre, Email, Teléfono, Estado (con `Switch`), Fecha de registro.
    *   Acciones: Editar, Eliminar (placeholder).

### Lógica de Negocio e Interacciones:
*   Similar a Clientes. La página obtiene la lista inicial de empresas con `getEmpresasAction`.
*   La tabla maneja paginación y búsqueda.
*   El `Switch` de estado llama a `updateEmpresaEstadoAction`.
*   La geocodificación de la dirección se realiza en `addEmpresaAction` y `updateEmpresaAction`.

### Server Actions Utilizadas (`src/app/empresas/actions.ts`):
*   `addEmpresaAction(data: EmpresaFormData)`
*   `updateEmpresaAction(empresaId: string, data: EmpresaFormData)`
*   `getEmpresasAction(page, pageSize, searchTerm?)`
*   `getEmpresaByIdAction(empresaId: string)`
*   `updateEmpresaEstadoAction(empresaId: string, nuevoEstado: boolean)`
*   `getEmpresasForSelectAction()`: Obtiene empresas (ID, nombre) para selectores en otros formularios (ej. Clientes, Repartos).

### Tablas de Supabase Relevantes:
*   `empresas`

---

## 3. Gestión de Repartidores (`/repartidores`)

*   **Ruta:** `/repartidores`
*   **Archivo Principal:** `src/app/repartidores/page.tsx` (Server Component)
*   **Propósito:** Administrar el personal de reparto.

### Componentes UI Clave:
*   **`src/components/page-header.tsx`**
*   **`src/components/add-repartidor-dialog.tsx` (Client Component):**
    *   Usa `src/components/repartidor-form.tsx`.
    *   Llama a `addRepartidorAction`.
*   **`src/components/repartidor-form.tsx` (Client Component):**
    *   Formulario simple para nombre y estado (activo/inactivo).
    *   Usa `react-hook-form` y `repartidorSchema`.
*   **`src/components/repartidores-table.tsx` (Client Component):**
    *   Tabla paginada y con búsqueda.
    *   Columnas: Nombre, Estado (con `Switch`).
    *   Acciones: Editar (placeholder), Eliminar (placeholder).

### Lógica de Negocio e Interacciones:
*   La página obtiene la lista inicial con `getRepartidoresAction`.
*   La tabla maneja paginación y búsqueda.
*   El `Switch` de estado llama a `updateRepartidorEstadoAction`.

### Server Actions Utilizadas (`src/app/repartidores/actions.ts`):
*   `addRepartidorAction(data: RepartidorFormData)`
*   `getRepartidoresAction(page, pageSize, searchTerm?)`
*   `updateRepartidorEstadoAction(id: string, estado: boolean)`

### Tablas de Supabase Relevantes:
*   `repartidores`

---

## 4. Gestión de Envíos

### 4.1. Listado de Envíos (`/envios`)
*   **Ruta:** `/envios`
*   **Archivo Principal:** `src/app/envios/page.tsx` (Server Component)
*   **Propósito:** Mostrar todos los envíos, permitir la búsqueda y el acceso a la creación y edición.

#### Componentes UI Clave:
*   **`src/components/page-header.tsx`**: Con un botón "Nuevo Envío" que enlaza a `/envios/nuevo`.
*   **`src/components/envios-table.tsx` (Client Component):**
    *   Tabla paginada y con búsqueda.
    *   Columnas: Cliente/Destino Temporal, Ubicación, Paquete (tipo y peso), Estado (con `Badge` coloreado), Fecha de Registro.
    *   Acciones: "Ver Detalle" (abre `EnvioDetailDialog`), "Editar" (abre `EditShipmentDialog`), Eliminar (placeholder).
*   **`src/components/edit-shipment-dialog.tsx` (Client Component):**
    *   Diálogo para modificar envíos existentes. Usa `ShipmentForm`.
*   **`src/components/envio-detail-dialog.tsx` (Client Component):**
    *   Muestra información completa de un envío en un modal.

#### Lógica de Negocio:
*   La página carga la lista inicial de envíos con `getEnviosAction`.
*   La tabla maneja paginación y búsqueda.

### 4.2. Creación de Nuevo Envío (`/envios/nuevo`)
*   **Ruta:** `/envios/nuevo`
*   **Archivo Principal:** `src/app/envios/nuevo/page.tsx` (Server Component)
*   **Propósito:** Formulario para registrar nuevos envíos.

#### Componentes UI Clave:
*   **`src/components/page-header.tsx`**
*   **`src/components/shipment-form.tsx` (Client Component):**
    *   Formulario completo para los detalles del envío:
        *   Selector de Cliente Existente (de `clientes` activos) o campos para Nombre Cliente Temporal y Ubicación Manual.
        *   Selector de Tipo de Paquete (de `tipos_paquete` activos).
        *   Input para Peso del Paquete.
        *   Sección para Tipo de Servicio (selector de `tipos_servicio` activos) o Precio Manual.
        *   (Opcional) Botón para sugerencias de IA.
    *   Al seleccionar un cliente existente, su dirección se autocompleta si está disponible.
    *   Al seleccionar un tipo de servicio con `precio_base`, este puede pre-llenar el precio final.

#### Lógica de Negocio:
*   La página obtiene listas de clientes activos, tipos de paquete activos y tipos de servicio activos.
*   El `ShipmentForm` llama a `createShipmentAction` al enviar.
*   Si se ingresa una dirección manual, se intenta geocodificar en `createShipmentAction` o `updateShipmentAction`.
*   Si se usa el botón de sugerencias IA, llama a `suggestDeliveryOptionsAction`.

### Server Actions Utilizadas para Envíos (`src/app/envios/actions.ts`):
*   `createShipmentAction(formData, aiSuggestions?)`: Crea un nuevo envío.
*   `updateShipmentAction(envioId, formData)`: Actualiza un envío.
*   `getEnviosAction(page, pageSize, searchTerm?)`: Lista envíos (join con `clientes` y `tipos_paquete`).
*   `getEnvioByIdAction(envioId)`: Obtiene detalles de un envío (join con `clientes`, `repartos`, `tipos_paquete`, `tipos_servicio`).
*   `getClientesForShipmentFormAction()`: Lista clientes activos para el selector.
*   `suggestDeliveryOptionsAction(data)`: Llama al flujo de IA.

### Tablas de Supabase Relevantes:
*   `envios`
*   `clientes`
*   `tipos_paquete`
*   `tipos_servicio`
*   `repartos` (para mostrar información del reparto asignado)

---

## 5. Gestión de Repartos y Viajes

### 5.1. Listado de Repartos (`/repartos`)
*   **Ruta:** `/repartos`
*   **Archivo Principal:** `src/app/repartos/page.tsx` (Server Component)
*   **Propósito:** Ver todos los repartos creados, su estado y acceder a sus detalles o a la creación de nuevos.

#### Componentes UI Clave:
*   **`src/components/page-header.tsx`**: Con botón "Nuevo Reparto".
*   **`src/components/repartos-list-table.tsx` (Client Component):**
    *   Tabla paginada y con búsqueda.
    *   Columnas: Fecha Reparto, Repartidor, Tipo, Empresa (si aplica), Estado.
    *   Acción: "Ver Detalle" que lleva a `/repartos/[id]`.

### 5.2. Creación de Nuevo Reparto (`/repartos/nuevo`)
*   **Ruta:** `/repartos/nuevo`
*   **Archivo Principal:** `src/app/repartos/nuevo/page.tsx` (Server Component)
*   **Propósito:** Crear repartos de tipo "Envíos Individuales" o "Viaje por Empresa".

#### Componentes UI Clave:
*   **`src/components/reparto-create-form.tsx` (Client Component):**
    *   Formulario para Fecha, Repartidor, Tipo de Reparto.
    *   Si "Envíos Individuales": buscador y tabla con checkboxes para `envios` pendientes.
    *   Si "Viaje por Empresa": selector de empresa, luego tabla con checkboxes para `envios` pendientes de los clientes de esa empresa.

### 5.3. Creación de Reparto por Lote (`/repartos/lote/nuevo`)
*   **Ruta:** `/repartos/lote/nuevo`
*   **Archivo Principal:** `src/app/repartos/lote/nuevo/page.tsx` (Server Component)
*   **Propósito:** Crear repartos para una empresa, generando automáticamente envíos para sus clientes y asignando valores de servicio.

#### Componentes UI Clave:
*   **`src/components/reparto-lote-create-form.tsx` (Client Component):**
    *   Formulario para Fecha, Repartidor, Empresa.
    *   Listado de clientes de la empresa seleccionada con checkboxes.
    *   Para cada cliente seleccionado, un selector de "Tipo de Servicio" (de `tipos_servicio`) y un input para "Precio Manual".

### 5.4. Detalle del Reparto (`/repartos/[id]`)
*   **Ruta:** `/repartos/[id]`
*   **Archivo Principal:** `src/app/repartos/[id]/page.tsx` (Server Component)
*   **Propósito:** Ver detalles completos de un reparto, gestionar su estado, ver y reordenar paradas, y optimizar la ruta.

#### Componentes UI Clave:
*   **`src/components/reparto-detail-view.tsx` (Client Component):**
    *   Muestra información general, estado (con selector para cambiarlo), valor total del reparto.
    *   Tabla de "Paradas Asignadas":
        *   Columnas: Orden, Reordenar (botones arriba/abajo), Destino/Tipo (Empresa o Cliente), Ubicación, Paquete, Estado Envío, Valor Servicio.
        *   Muestra la distancia estimada de la ruta actual.
    *   Sección "Optimización de Ruta con IA":
        *   Botón "Optimizar Ruta (IA)".
        *   Muestra la ruta sugerida por la IA y su distancia.
        *   Botón "Aplicar Ruta Sugerida".

### Server Actions Utilizadas para Repartos (`src/app/repartos/actions.ts`):
*   `getRepartidoresActivosAction`
*   `getEmpresasForRepartoAction`
*   `getEnviosPendientesAction`
*   `getEnviosPendientesPorEmpresaAction`
*   `getClientesByEmpresaAction`
*   `createRepartoAction`
*   `createRepartoLoteAction`
*   `getRepartosListAction`
*   `getRepartoDetailsAction`
*   `updateRepartoEstadoAction`
*   `reorderParadasAction`
*   `optimizeRouteAction` (llama al flujo Genkit)
*   `applyOptimizedRouteOrderAction`

### Tablas de Supabase Relevantes:
*   `repartos`
*   `envios`
*   `paradas_reparto`
*   `repartidores`
*   `empresas`
*   `clientes`
*   `tipos_servicio` (para precios en repartos por lote)

---

## 6. Mapa de Envíos (`/mapa-envios`)

*   **Ruta:** `/mapa-envios`
*   **Archivo Principal:** `src/app/mapa-envios/page.tsx` (Server Component)
*   **Propósito:** Visualizar envíos geolocalizados en un mapa interactivo de Mar del Plata.

### Componentes UI Clave:
*   **`src/components/page-header.tsx`**
*   **`src/components/reparto-map-filter.tsx` (Client Component):** Selector para filtrar envíos por "Todos", "No Asignados", o un reparto específico.
*   **`src/components/mapa-envios-summary.tsx` (Client Component):** Muestra un resumen de lo que se ve en el mapa (total paradas, punto de retiro, envíos no asignados).
*   **`src/components/envios-no-asignados-card.tsx` (Client Component):** Lista los envíos no asignados geolocalizados.
*   **`src/components/mapa-envios-view.tsx` (Client Component):**
    *   Renderiza el mapa de Google Maps.
    *   Muestra marcadores para los envíos, coloreados por `status`.
    *   Si se filtra por un reparto, muestra los números de orden en los marcadores y una polilínea conectando las paradas.
    *   La parada de "retiro en empresa" tiene un marcador distintivo.
    *   Muestra InfoWindows al hacer clic en marcadores.

### Server Actions (`src/app/mapa-envios/actions.ts`):
*   `getEnviosGeolocalizadosAction(repartoId?)`: Obtiene envíos/paradas para mostrar en el mapa, adaptando la consulta si se filtra por un reparto.
*   `getRepartosForMapFilterAction()`: Obtiene la lista de repartos para el selector de filtro.
*   `getEnviosNoAsignadosGeolocalizadosAction()`: Obtiene envíos no asignados con coordenadas.

### Tablas de Supabase Relevantes:
*   `envios` (y sus `latitud`, `longitud`)
*   `paradas_reparto` (para el orden y tipo de parada cuando se filtra por reparto)
*   `repartos` (para el filtro)
*   `clientes`, `empresas` (para detalles en InfoWindows o resúmenes)

---

## 7. Configuración (`/configuracion`)

*   **Ruta:** `/configuracion`
*   **Archivo Principal:** `src/app/configuracion/page.tsx` (Server Component)
*   **Propósito:** Centralizar la administración de entidades maestras del sistema.

### Componentes UI Clave:
*   Utiliza `Tabs` de ShadCN UI para separar secciones.
*   **Sección "Tipos de Paquete":**
    *   `src/components/configuracion/tipos-paquete-table.tsx` (con paginación, búsqueda, switch de estado).
    *   `src/components/configuracion/add-tipo-paquete-dialog.tsx` y `edit-tipo-paquete-dialog.tsx` (usan `tipo-paquete-form.tsx`).
*   **Sección "Tipos de Servicio":**
    *   `src/components/configuracion/tipos-servicio-table.tsx` (similar, incluye `precio_base`).
    *   `src/components/configuracion/add-tipo-servicio-dialog.tsx` y `edit-tipo-servicio-dialog.tsx` (usan `tipo-servicio-form.tsx`).
*   **Sección "Tarifas Calculadora":**
    *   `src/components/configuracion/gestion-tarifas-calculadora.tsx` (Client Component):
        *   Selector para tipo ("Express", "LowCost").
        *   Selector para `fecha_vigencia_desde` (para ver listas históricas).
        *   Tabla mostrando tramos de la lista seleccionada.
        *   Diálogo para "Crear Nueva Lista de Tarifas" (con `DatePicker` y tabla dinámica de tramos).
        *   Botón para eliminar lista de precios por fecha.

### Server Actions (`src/app/configuracion/actions.ts`):
*   Acciones CRUD completas para `tipos_paquete` y `tipos_servicio`.
*   `getTarifasCalculadoraConHistorialAction`, `saveListaTarifasCalculadoraAction`, `deleteTarifasCalculadoraPorFechaAction`.

### Tablas de Supabase Relevantes:
*   `tipos_paquete`
*   `tipos_servicio`
*   `tarifas_distancia_calculadora`

---

## 8. Cotizadores de Envío

### 8.1. Cotizador Express (`/cotizador-envios-express`)
*   **Ruta:** `/cotizador-envios-express`
*   **Archivo Principal:** `src/app/cotizador-envios-express/page.tsx` (Server Component)
*   **Propósito:** Permitir cotizar envíos Express y convertirlos en solicitudes.

#### Componentes UI Clave:
*   **`src/components/configuracion/CaluloCotizadorExpress.tsx` (Client Component):**
    *   Inputs para Dirección Origen y Destino.
    *   Botón "Calcular Ruta y Precio".
    *   Muestra Distancia, Precio Estimado y Mapa con la ruta (usando Google Maps API).
    *   Si se obtiene una cotización, muestra condicionalmente `src/components/calculadora/solicitud-envio-form.tsx`.
*   **`src/components/calculadora/solicitud-envio-form.tsx` (Client Component):**
    *   Formulario para completar datos del remitente, destinatario, horarios.
    *   Direcciones y monto cotizado están pre-llenados.
    *   Llama a `createEnvioDesdeCalculadoraAction`.

### 8.2. Cotizador LowCost (`/cotizador-envios-lowcost`)
*   **Ruta:** `/cotizador-envios-lowcost`
*   **Archivo Principal:** `src/app/cotizador-envios-lowcost/page.tsx` (Server Component)
*   **Propósito:** Similar al Express, pero para servicio LowCost y sin la opción de crear la solicitud de envío.

#### Componentes UI Clave:
*   **`src/components/configuracion/CaluloCotizadorLowCost.tsx` (Client Component):**
    *   Similar a `CaluloCotizadorExpress.tsx` pero no incluye el formulario de solicitud.

### Server Actions (`src/app/calculadora/actions.ts`):
*   `getTarifasCalculadoraAction(tipo: 'lowcost' | 'express')`: Obtiene las tarifas vigentes para un tipo de calculadora.
*   `createEnvioDesdeCalculadoraAction(formData, lat?, lng?)`: Crea un envío desde el formulario del cotizador Express, geocodificando la dirección de entrega o usando coordenadas pre-calculadas.

### Tablas de Supabase Relevantes:
*   `tarifas_distancia_calculadora`
*   `tipos_servicio` (para obtener el ID del servicio "Envíos Express")
*   `tipos_paquete` (para un tipo de paquete por defecto)
*   `envios` (para insertar la nueva solicitud)

---

## 9. Flujos de IA (`src/ai/flows/`)

*   **`generate-client-summary.ts`**: Flujo para resumir notas de clientes (no integrado activamente en la UI principal).
*   **`suggest-delivery-options.ts`**: Flujo para sugerir opciones de envío. Se usa en el formulario de creación de envíos.
*   **`optimize-route-flow.ts`**: Flujo principal para la optimización de rutas de reparto. Toma una lista de paradas (con coordenadas) y devuelve un orden optimizado, una estimación de distancia y notas. Se usa en la página de detalle del reparto.
    *   El prompt está diseñado para priorizar la ruta más corta y directa, considerar el punto de inicio óptimo y el uso de vías principales en Mar del Plata.

Esta descripción detallada debería proporcionar una base sólida para que una IA comprenda la estructura y funcionalidad de "Rumbos Envíos".
