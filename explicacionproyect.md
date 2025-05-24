
# Explicación General del Proyecto: Rumbos Envíos

## 1. Visión General

**Nombre de la Aplicación:** Rumbos Envíos

**Propósito Principal:**
Rumbos Envíos es una aplicación web integral diseñada para la gestión de operaciones de una empresa de mensajería y logística en Mar del Plata, Argentina. Su objetivo es optimizar y centralizar la administración de clientes, empresas asociadas, repartidores, la creación y seguimiento de envíos (individuales y por lote), la planificación de rutas de reparto (con asistencia de IA para optimización), y la cotización de servicios de envío.

**Público Objetivo:**
*   **Personal Operativo de Rumbos Envíos:** Administradores, despachadores, y personal encargado de la logística y atención al cliente.
*   **Repartidores (Potencialmente en futuras fases):** Para visualización de rutas asignadas y actualización de estados de entrega.
*   **Clientes (Potencialmente en futuras fases):** Para realizar cotizaciones de envíos y, posiblemente, seguimiento de sus propios pedidos.

## 2. Funcionalidades Principales (Resumen de Alto Nivel)

La aplicación se organiza en torno a las siguientes funcionalidades clave:

*   **Gestión de Clientes:** Creación, edición, listado y administración del estado (activo/inactivo) de los clientes de la empresa. Incluye geocodificación de direcciones.
*   **Gestión de Empresas Asociadas:** Similar a la gestión de clientes, pero para entidades empresariales que pueden tener múltiples clientes o envíos asociados.
*   **Gestión de Repartidores:** Administración de la información y estado de los repartidores.
*   **Gestión de Envíos:** Creación de nuevos envíos (asociados a clientes existentes o clientes temporales), edición de envíos existentes, visualización de detalles y listado con filtros y paginación. Incluye gestión de tipos de paquete, peso, y asignación de servicios con precios.
*   **Gestión de Repartos y Viajes:**
    *   Creación de hojas de ruta (repartos) para repartidores y fechas específicas.
    *   Agrupación de envíos individuales.
    *   Generación de "Viajes por Empresa" (agrupando envíos pendientes de clientes de una empresa).
    *   Generación de "Repartos por Lote" (creación automática de envíos para clientes seleccionados de una empresa, con asignación de valor de servicio).
    *   Visualización detallada de repartos, incluyendo paradas, valor total, y gestión de estado.
    *   Optimización de rutas de reparto mediante IA.
*   **Mapa de Envíos:** Visualización geográfica interactiva de envíos en Mar del Plata, con filtros por reparto y estado.
*   **Configuración del Sistema:**
    *   Gestión de "Tipos de Paquete".
    *   Gestión de "Tipos de Servicio" (incluyendo precios base).
    *   Gestión de "Tarifas de Calculadora" (para cotizadores Express y LowCost, con historial por fecha de vigencia).
*   **Cotizadores de Envío:**
    *   Herramientas para calcular precios estimados de envíos (Express y LowCost) basados en distancia y tarifas configuradas.
    *   El cotizador Express permite convertir la cotización en una solicitud de envío.
*   **Integración con Inteligencia Artificial (IA):**
    *   Sugerencias de opciones de entrega (actualmente no prioritaria).
    *   Optimización de rutas de reparto.

## 3. Stack Tecnológico

El proyecto se desarrolla utilizando un stack tecnológico moderno y predefinido:

*   **Frontend:**
    *   **Next.js (v14+ con App Router):** Framework de React para desarrollo de aplicaciones web con renderizado del lado del servidor (SSR) y generación de sitios estáticos (SSG). Se utiliza el App Router para una estructura de rutas basada en directorios.
    *   **React:** Biblioteca de JavaScript para construir interfaces de usuario.
    *   **TypeScript:** Superset de JavaScript que añade tipado estático para mejorar la calidad y mantenibilidad del código.
*   **Interfaz de Usuario (UI):**
    *   **ShadCN UI:** Colección de componentes de UI reutilizables, construidos sobre Radix UI y Tailwind CSS, que se pueden personalizar y copiar directamente al proyecto.
    *   **Tailwind CSS:** Framework de CSS "utility-first" para un diseño rápido y personalizable.
    *   **Lucide React:** Librería de iconos SVG.
*   **Backend y Base de Datos:**
    *   **Supabase:** Plataforma "Backend as a Service" (BaaS) de código abierto, alternativa a Firebase.
        *   **Base de Datos PostgreSQL:** Utilizada como la base de datos relacional principal.
        *   **Autenticación:** (Funcionalidad básica, se puede expandir)
        *   **APIs en Tiempo Real:** (Potencial para futuras funcionalidades)
        *   **Storage:** (Potencial para futuras funcionalidades)
*   **Inteligencia Artificial (IA):**
    *   **Genkit (framework de Google):** Utilizado para crear, desplegar y gestionar flujos de IA.
    *   **Google Gemini (o similar):** Modelo de lenguaje grande (LLM) accedido a través de Genkit para funcionalidades como la optimización de rutas.
*   **Herramientas de Desarrollo:**
    *   **ESLint:** Para el análisis estático de código y el cumplimiento de estilos.
    *   **Prettier (implícito):** Para el formateo de código.
    *   **Firebase Studio (como entorno de desarrollo asistido por IA):** El entorno donde se desarrolla la aplicación.

Este stack permite un desarrollo rápido, eficiente y escalable, aprovechando las ventajas del tipado estático, componentes de UI modernos, una potente base de datos backend, y capacidades de IA.
