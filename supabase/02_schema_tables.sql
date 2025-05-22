-- Create Table for Repartidores
CREATE TABLE "public"."repartidores" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE "public"."repartidores" IS 'Stores delivery personnel information.';

-- Create Table for Empresas
CREATE TABLE "public"."empresas" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "latitud" NUMERIC NULL,
    "longitud" NUMERIC NULL,
    "telefono" TEXT NULL,
    "email" TEXT NULL,
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
    "email" TEXT NULL,
    "notas" TEXT NULL,
    "empresa_id" UUID NULL REFERENCES "public"."empresas"("id") ON DELETE SET NULL,
    "estado" BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT clientes_email_key UNIQUE (email)
);
COMMENT ON TABLE "public"."clientes" IS 'Stores client information and their link to a company.';

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
    "precio_base" NUMERIC(10, 2) NULL,
    "activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE "public"."tipos_servicio" IS 'Defines different types of services and their base prices.';

-- Create Table for Repartos
CREATE TABLE "public"."repartos" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "fecha_reparto" DATE NOT NULL,
    "repartidor_id" UUID NULL REFERENCES "public"."repartidores"("id") ON DELETE SET NULL,
    "estado" TEXT NOT NULL DEFAULT 'asignado', 
    "tipo_reparto" TEXT NOT NULL, 
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
    "tipo_paquete_id" UUID NULL REFERENCES "public"."tipos_paquete"("id") ON DELETE SET NULL,
    "package_weight" NUMERIC NOT NULL DEFAULT 0.1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "suggested_options" JSON NULL,
    "reasoning" TEXT NULL,
    "reparto_id" UUID NULL REFERENCES "public"."repartos"("id") ON DELETE SET NULL,
    "tipo_servicio_id" UUID NULL REFERENCES "public"."tipos_servicio"("id") ON DELETE SET NULL,
    "precio_servicio_final" NUMERIC(10, 2) NULL
);
COMMENT ON TABLE "public"."envios" IS 'Stores individual shipment details.';
COMMENT ON COLUMN "public"."envios"."reparto_id" IS 'Foreign key to the assigned reparto.';
COMMENT ON COLUMN "public"."envios"."latitud" IS 'Latitude of the client_location for mapping.';
COMMENT ON COLUMN "public"."envios"."longitud" IS 'Longitude of the client_location for mapping.';
COMMENT ON COLUMN "public"."envios"."tipo_paquete_id" IS 'Foreign key to the type of package.';
COMMENT ON COLUMN "public"."envios"."tipo_servicio_id" IS 'Foreign key to the type of service.';
COMMENT ON COLUMN "public"."envios"."precio_servicio_final" IS 'Final price for the service of this shipment.';

-- Create Table for Paradas_Reparto
CREATE TABLE "public"."paradas_reparto" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "reparto_id" UUID NOT NULL REFERENCES "public"."repartos"("id") ON DELETE CASCADE,
    "envio_id" UUID NULL REFERENCES "public"."envios"("id") ON DELETE CASCADE,
    "tipo_parada" public.tipoparadaenum NULL,
    "orden" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_reparto_envio UNIQUE (reparto_id, envio_id) DEFERRABLE INITIALLY DEFERRED
);
COMMENT ON TABLE "public"."paradas_reparto" IS 'Defines the sequence of stops (shipments or company pickup) within a delivery route.';
COMMENT ON COLUMN "public"."paradas_reparto"."envio_id" IS 'FK to envios. Null if tipo_parada is retiro_empresa.';
COMMENT ON COLUMN "public"."paradas_reparto"."tipo_parada" IS 'Type of stop: company pickup or client delivery.';

-- Create Table for Tarifas Distancia Calculadora
CREATE TABLE "public"."tarifas_distancia_calculadora" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tipo_calculadora" public.tipocalculadoraservicioenum NOT NULL,
    "distancia_hasta_km" NUMERIC NOT NULL,
    "precio" NUMERIC(10, 2) NOT NULL,
    "fecha_vigencia_desde" DATE NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_tarifa_distancia_version UNIQUE (tipo_calculadora, fecha_vigencia_desde, distancia_hasta_km)
);
COMMENT ON TABLE "public"."tarifas_distancia_calculadora" IS 'Stores distance-based pricing tiers for calculators (LowCost, Express).';
COMMENT ON COLUMN "public"."tarifas_distancia_calculadora"."tipo_calculadora" IS 'Indicates if the tariff is for LowCost or Express calculator.';
COMMENT ON COLUMN "public"."tarifas_distancia_calculadora"."distancia_hasta_km" IS 'The upper bound of the distance tier (e.g., up to 5 km).';
COMMENT ON COLUMN "public"."tarifas_distancia_calculadora"."precio" IS 'The price for this distance tier.';
COMMENT ON COLUMN "public"."tarifas_distancia_calculadora"."fecha_vigencia_desde" IS 'The date from which this tariff list is effective.';
