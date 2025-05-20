-- Habilitar la extensión pgcrypto si no está habilitada (para gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

-- Borrar tablas existentes en orden inverso de dependencia para evitar errores de FK
DROP TABLE IF EXISTS "public"."paradas_reparto";
DROP TABLE IF EXISTS "public"."envios";
DROP TABLE IF EXISTS "public"."repartos";
DROP TABLE IF EXISTS "public"."clientes";
DROP TABLE IF EXISTS "public"."empresas";
DROP TABLE IF EXISTS "public"."repartidores";

-- Crear el tipo ENUM para estado_reparto si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estadorepartoenum') THEN
        CREATE TYPE estadoRepartoEnum AS ENUM ('asignado', 'en_curso', 'completado');
    END IF;
END$$;

-- Crear el tipo ENUM para tipo_reparto si no existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tiporepartoenum_old') THEN
        DROP TYPE tipoRepartoEnum_old;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tiporepartoenum') THEN
        DROP TYPE tipoRepartoEnum;
    END IF;
    CREATE TYPE tipoRepartoEnum AS ENUM ('individual', 'viaje_empresa', 'viaje_empresa_lote');
END$$;

-- Crear el tipo ENUM para estado_envio si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estadoenvioenum') THEN
        CREATE TYPE estadoEnvioEnum AS ENUM ('pending', 'suggested', 'asignado_a_reparto', 'en_transito', 'entregado', 'cancelado', 'problema_entrega');
    END IF;
END$$;

-- Crear el tipo ENUM para package_size_enum si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'packagesizeenum') THEN
        CREATE TYPE packageSizeEnum AS ENUM ('small', 'medium', 'large');
    END IF;
END$$;


-- Crear tabla empresas
CREATE TABLE "public"."empresas" (
    "id" UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NULL,
    "telefono" TEXT NULL,
    "email" TEXT NULL UNIQUE,
    "notas" TEXT NULL
);
COMMENT ON TABLE "public"."empresas" IS 'Stores company information.';

-- Crear tabla clientes
CREATE TABLE "public"."clientes" (
    "id" UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "notas" TEXT NULL,
    "empresa_id" UUID REFERENCES "public"."empresas"(id) ON DELETE SET NULL
);
COMMENT ON TABLE "public"."clientes" IS 'Stores client information.';
COMMENT ON COLUMN "public"."clientes"."empresa_id" IS 'Foreign key to the company the client belongs to.';

-- Crear tabla repartidores
CREATE TABLE "public"."repartidores" (
    "id" UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" BOOLEAN DEFAULT TRUE NOT NULL -- TRUE for active, FALSE for inactive
);
COMMENT ON TABLE "public"."repartidores" IS 'Stores delivery personnel information.';

-- Crear tabla repartos
CREATE TABLE "public"."repartos" (
    "id" UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "fecha_reparto" DATE NOT NULL,
    "repartidor_id" UUID REFERENCES "public"."repartidores"(id) ON DELETE SET NULL,
    "estado" TEXT NOT NULL DEFAULT 'asignado', -- Zod schema: estadoRepartoEnum
    "tipo_reparto" TEXT NOT NULL, -- Zod schema: tipoRepartoEnum
    "empresa_id" UUID REFERENCES "public"."empresas"(id) ON DELETE SET NULL
);
COMMENT ON TABLE "public"."repartos" IS 'Stores delivery route information.';
COMMENT ON COLUMN "public"."repartos"."estado" IS 'Status of the delivery route (e.g., asignado, en_curso, completado). Validated by Zod schema estadoRepartoEnum.';
COMMENT ON COLUMN "public"."repartos"."tipo_reparto" IS 'Type of delivery route (e.g., individual, viaje_empresa, viaje_empresa_lote). Validated by Zod schema tipoRepartoEnum.';
COMMENT ON COLUMN "public"."repartos"."empresa_id" IS 'Foreign key to the company if it is a company-specific trip.';


-- Crear tabla envios
CREATE TABLE "public"."envios" (
    "id" UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "cliente_id" UUID REFERENCES "public"."clientes"(id) ON DELETE SET NULL,
    "nombre_cliente_temporal" TEXT NULL,
    "client_location" TEXT NOT NULL,
    "package_size" TEXT NOT NULL, -- Zod schema: packageSizeEnum
    "package_weight" REAL NOT NULL, -- Using REAL for float4
    "status" TEXT NOT NULL DEFAULT 'pending', -- Zod schema: estadoEnvioEnum
    "suggested_options" JSONB NULL,
    "reasoning" TEXT NULL,
    "reparto_id" UUID REFERENCES "public"."repartos"(id) ON DELETE SET NULL
);
COMMENT ON TABLE "public"."envios" IS 'Stores individual shipment details.';
COMMENT ON COLUMN "public"."envios"."package_size" IS 'Size of the package (e.g., small, medium, large). Validated by Zod schema packageSizeEnum.';
COMMENT ON COLUMN "public"."envios"."status" IS 'Status of the shipment (e.g., pending, en_transito, entregado). Validated by Zod schema estadoEnvioEnum.';
COMMENT ON COLUMN "public"."envios"."reparto_id" IS 'Foreign key to the assigned reparto.';

-- Crear tabla paradas_reparto
CREATE TABLE "public"."paradas_reparto" (
    "id" UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
    "reparto_id" UUID NOT NULL REFERENCES "public"."repartos"(id) ON DELETE CASCADE,
    "envio_id" UUID NOT NULL REFERENCES "public"."envios"(id) ON DELETE CASCADE,
    "orden" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_reparto_envio UNIQUE (reparto_id, envio_id)
    --CONSTRAINT uq_reparto_orden UNIQUE (reparto_id, orden) -- Removed to allow easier reordering
);
COMMENT ON TABLE "public"."paradas_reparto" IS 'Represents a stop in a delivery route, linking a reparto to a specific envio and its order.';
COMMENT ON COLUMN "public"."paradas_reparto"."orden" IS 'The sequence number of this stop in the delivery route.';


-- Políticas RLS (Row Level Security) - Permisivas para desarrollo
ALTER TABLE "public"."empresas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON "public"."empresas" FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON "public"."clientes" FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE "public"."repartidores" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON "public"."repartidores" FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE "public"."repartos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON "public"."repartos" FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE "public"."envios" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON "public"."envios" FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE "public"."paradas_reparto" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON "public"."paradas_reparto" FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- Insertar datos de ejemplo para empresas
INSERT INTO "public"."empresas" ("id", "nombre", "direccion", "email") VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Tech Solutions SRL', 'Calle Falsa 123, CABA', 'contacto@techsolutions.example.com'),
('b2c3d4e5-f6a7-8901-2345-678901bcdef0', 'Nutrisabor', 'Av. Corrientes 456, CABA', 'info@nutrisabor.example.com');

-- Insertar datos de ejemplo para clientes (algunos asociados a empresas)
INSERT INTO "public"."clientes" ("id", "nombre", "apellido", "direccion", "telefono", "email", "empresa_id") VALUES
('0f1ab15c-b943-43cd-9ed3-b3f6bf1f8d1a', 'Lucia', 'Gomez', 'Honduras 4800, Palermo', '+541133334444', 'lucia.gomez@example.com', (SELECT id from "public"."empresas" WHERE nombre = 'Tech Solutions SRL')),
('7a6280f8-c761-41ce-98f3-ce7e23bfa93d', 'Carlos', 'Lopez', 'Defensa 567, San Telmo', '+541155556666', 'carlos.lopez@example.com', (SELECT id from "public"."empresas" WHERE nombre = 'Tech Solutions SRL')),
('7ee95baf-df9a-458b-bab3-28ef838fc360', 'Ana', 'Martinez', 'Av. Rivadavia 7000, Flores', '+541177778888', 'ana.martinez@example.com', null),
('d9b577b8-2118-4c19-9c6d-a39399e55082', 'Jorge', 'Fernandez', 'Colon 1234, Mar del Plata', '+542234445555', 'jorge.fernandez@example.com', (SELECT id from "public"."empresas" WHERE nombre = 'Nutrisabor'));

-- Insertar datos de ejemplo para repartidores
INSERT INTO "public"."repartidores" ("id", "nombre", "estado") VALUES
('0596f87a-a4a8-4f3d-9086-f003eab75af9', 'Juan Perez', true),
('1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e', 'Maria Rodriguez', true),
('c7d8e9f0-a1b2-c3d4-e5f6-a7b8c9d0e1f2', 'Carlos Sanchez', false);

-- Insertar datos de ejemplo para repartos
INSERT INTO "public"."repartos" ("id", "fecha_reparto", "repartidor_id", "estado", "tipo_reparto", "empresa_id") VALUES
('df1e184e-71e6-4f00-a78d-b6e93034cd35', '2025-05-21', (SELECT id from "public"."repartidores" WHERE nombre = 'Juan Perez'), 'asignado', 'viaje_empresa', (SELECT id from "public"."empresas" WHERE nombre = 'Tech Solutions SRL')),
('caad29f1-cf73-42d4-b3d2-658a7814f1c4', '2025-05-22', (SELECT id from "public"."repartidores" WHERE nombre = 'Maria Rodriguez'), 'en_curso', 'individual', null),
('a7a9309f-6bbf-4029-9f61-4d0a3724b908', '2025-05-20', (SELECT id from "public"."repartidores" WHERE nombre = 'Juan Perez'), 'completado', 'viaje_empresa_lote', (SELECT id from "public"."empresas" WHERE nombre = 'Nutrisabor'));


-- Insertar datos de ejemplo para envios
INSERT INTO "public"."envios" ("id", "cliente_id", "client_location", "package_size", "package_weight", "status", "reparto_id") VALUES
('4068601d-34dc-4983-9834-68c630af1b31', (SELECT id from "public"."clientes" WHERE email = 'carlos.lopez@example.com'), 'Defensa 567, San Telmo', 'medium', 2.5, 'asignado_a_reparto', (SELECT id from "public"."repartos" WHERE fecha_reparto = '2025-05-21' AND repartidor_id = (SELECT id from "public"."repartidores" WHERE nombre = 'Juan Perez'))),
('46990e54-0a24-4756-a6b8-96f7229246c5', (SELECT id from "public"."clientes" WHERE email = 'lucia.gomez@example.com'), 'Honduras 4800, Palermo', 'small', 0.8, 'asignado_a_reparto', (SELECT id from "public"."repartos" WHERE fecha_reparto = '2025-05-21' AND repartidor_id = (SELECT id from "public"."repartidores" WHERE nombre = 'Juan Perez'))),
('62ceba09-7a0f-43dc-bef0-b5340f6f83d4', (SELECT id from "public"."clientes" WHERE email = 'jorge.fernandez@example.com'), 'Colon 1234, Mar del Plata', 'medium', 0.1, 'entregado', (SELECT id from "public"."repartos" WHERE fecha_reparto = '2025-05-20' AND repartidor_id = (SELECT id from "public"."repartidores" WHERE nombre = 'Juan Perez') AND tipo_reparto = 'viaje_empresa_lote')),
('6a9dd307-1f2e-4eca-9f8b-f887697c4841', (SELECT id from "public"."clientes" WHERE email = 'ana.martinez@example.com'), 'Av. Rivadavia 7000, Flores', 'large', 10.2, 'pending', null),
('ee0a5dbe-4542-4b52-89ec-a339e1482f0b', (SELECT id from "public"."clientes" WHERE email = 'carlos.lopez@example.com'), 'Defensa 567, San Telmo (Oficina)', 'small', 0.5, 'en_transito', (SELECT id from "public"."repartos" WHERE fecha_reparto = '2025-05-22' AND repartidor_id = (SELECT id from "public"."repartidores" WHERE nombre = 'Maria Rodriguez')));


-- Insertar datos de ejemplo para paradas_reparto (el orden debe ser coherente con los envios de cada reparto)
-- Paradas para el reparto 'df1e184e-71e6-4f00-a78d-b6e93034cd35'
-- INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "orden") VALUES
-- ('df1e184e-71e6-4f00-a78d-b6e93034cd35', '4068601d-34dc-4983-9834-68c630af1b31', 0),
-- ('df1e184e-71e6-4f00-a78d-b6e93034cd35', '46990e54-0a24-4756-a6b8-96f7229246c5', 1);

-- Paradas para el reparto 'caad29f1-cf73-42d4-b3d2-658a7814f1c4'
-- INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "orden") VALUES
-- ('caad29f1-cf73-42d4-b3d2-658a7814f1c4', 'ee0a5dbe-4542-4b52-89ec-a339e1482f0b', 0);

-- Paradas para el reparto 'a7a9309f-6bbf-4029-9f61-4d0a3724b908'
-- INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "orden") VALUES
-- ('a7a9309f-6bbf-4029-9f61-4d0a3724b908', '62ceba09-7a0f-43dc-bef0-b5340f6f83d4', 0);
-- Nota: Los INSERT para paradas_reparto se comentan porque la lógica de creación de repartos ahora debería poblar esta tabla.

-- Reiniciar secuencias si es necesario (ej. si se usan SERIAL y no UUID con gen_random_uuid())
-- SELECT setval(pg_get_serial_sequence('empresas', 'id'), COALESCE(MAX(id), 1)) FROM empresas;
-- ... (similar para otras tablas si usan secuencias)

