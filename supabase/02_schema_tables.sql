-- supabase/02_schema_tables.sql
-- Creación de la estructura de las tablas.

-- Create Table for Empresas
CREATE TABLE "public"."empresas" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "nombre" TEXT NOT NULL UNIQUE,
    "direccion" TEXT NOT NULL,
    "latitud" NUMERIC NULL,
    "longitud" NUMERIC NULL,
    "telefono" TEXT NULL,
    "email" TEXT NULL UNIQUE,
    "notas" TEXT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE "public"."empresas" IS 'Stores company information.';

-- Create Table for Clientes
CREATE TABLE "public"."clientes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "latitud" NUMERIC NULL,
    "longitud" NUMERIC NULL,
    "telefono" TEXT NULL,
    "email" TEXT NULL UNIQUE,
    "notas" TEXT NULL,
    "empresa_id" UUID NULL REFERENCES "public"."empresas"("id") ON DELETE SET NULL,
    "estado" BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE "public"."clientes" IS 'Stores client information and their link to a company.';

-- Create Table for Repartidores
CREATE TABLE "public"."repartidores" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE "public"."repartidores" IS 'Stores delivery personnel information.';

-- Create Table for Tipos de Paquete
CREATE TABLE "public"."tipos_paquete" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL UNIQUE,
    "descripcion" TEXT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE "public"."tipos_paquete" IS 'Defines different types of packages.';

-- Create Table for Tipos de Servicio
CREATE TABLE "public"."tipos_servicio" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL UNIQUE,
    "descripcion" TEXT NULL,
    "precio_base" NUMERIC NULL CHECK (precio_base >= 0),
    "activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE "public"."tipos_servicio" IS 'Defines different types of services offered and their base prices.';

-- Create Table for Repartos
CREATE TABLE "public"."repartos" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "fecha_reparto" DATE NOT NULL,
    "repartidor_id" UUID NULL REFERENCES "public"."repartidores"("id") ON DELETE SET NULL,
    "estado" TEXT NOT NULL DEFAULT 'asignado', -- Validated by Zod: estadoRepartoEnum
    "tipo_reparto" TEXT NOT NULL, -- Validated by Zod: tipoRepartoEnum
    "empresa_id" UUID NULL REFERENCES "public"."empresas"("id") ON DELETE SET NULL
);
COMMENT ON TABLE "public"."repartos" IS 'Stores delivery route information.';

-- Create Table for Envios
CREATE TABLE "public"."envios" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "cliente_id" UUID NULL REFERENCES "public"."clientes"("id") ON DELETE SET NULL,
    "nombre_cliente_temporal" TEXT NULL,
    "client_location" TEXT NOT NULL,
    "latitud" NUMERIC NULL,
    "longitud" NUMERIC NULL,
    "package_size" TEXT NOT NULL, -- Validated by Zod: packageSizeEnum from schemas.ts
    "package_weight" NUMERIC NOT NULL DEFAULT 0.1,
    "status" TEXT NOT NULL DEFAULT 'pending', -- Validated by Zod: estadoEnvioEnum
    "suggested_options" JSON NULL,
    "reasoning" TEXT NULL,
    "reparto_id" UUID NULL REFERENCES "public"."repartos"("id") ON DELETE SET NULL
    -- "tipo_paquete_id" UUID NULL REFERENCES "public"."tipos_paquete"("id") ON DELETE SET NULL, -- Future consideration
    -- "tipo_servicio_id" UUID NULL REFERENCES "public"."tipos_servicio"("id") ON DELETE SET NULL  -- Future consideration
);
COMMENT ON TABLE "public"."envios" IS 'Stores individual shipment details.';
COMMENT ON COLUMN "public"."envios"."reparto_id" IS 'Foreign key to the assigned reparto.';
COMMENT ON COLUMN "public"."envios"."latitud" IS 'Latitude of the client_location for mapping.';
COMMENT ON COLUMN "public"."envios"."longitud" IS 'Longitude of the client_location for mapping.';

-- Create Table for Paradas_Reparto
CREATE TABLE "public"."paradas_reparto" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "reparto_id" UUID NOT NULL REFERENCES "public"."repartos"("id") ON DELETE CASCADE,
    "envio_id" UUID NULL REFERENCES "public"."envios"("id") ON DELETE CASCADE, -- Nullable for 'retiro_empresa'
    "tipo_parada" public.tipoparadaenum NULL, -- Enum: 'retiro_empresa', 'entrega_cliente'
    "orden" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_reparto_envio UNIQUE (reparto_id, envio_id) DEFERRABLE INITIALLY DEFERRED -- Allows NULLs in envio_id to not conflict immediately
    -- CONSTRAINT uq_reparto_orden UNIQUE (reparto_id, orden) -- Removed as it caused issues with reordering
);
COMMENT ON TABLE "public"."paradas_reparto" IS 'Defines the sequence and type of stops within a delivery route.';
