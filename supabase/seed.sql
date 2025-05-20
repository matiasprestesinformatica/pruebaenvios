
-- Eliminar tablas existentes en orden inverso de dependencia para evitar errores FK
DROP TABLE IF EXISTS "public"."paradas_reparto";
DROP TABLE IF EXISTS "public"."envios";
DROP TABLE IF EXISTS "public"."repartos";
DROP TABLE IF EXISTS "public"."clientes";
DROP TABLE IF EXISTS "public"."empresas";
DROP TABLE IF EXISTS "public"."repartidores";

-- Eliminar tipos ENUM si existen (manejo de errores si no existen)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_reparto_enum_old') THEN
        DROP TYPE "public"."tipo_reparto_enum_old";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tiporepartoenum_old') THEN
        DROP TYPE "public"."tiporepartoenum_old";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_reparto_enum') THEN
        DROP TYPE "public"."tipo_reparto_enum";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tiporepartoenum') THEN
        DROP TYPE "public"."tiporepartoenum";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estadorepartoenum_old') THEN
        DROP TYPE "public"."estadorepartoenum_old";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estadorepartoenum') THEN
        DROP TYPE "public"."estadorepartoenum";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estadoenvioenum_old') THEN
        DROP TYPE "public"."estadoenvioenum_old";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estadoenvioenum') THEN
        DROP TYPE "public"."estadoenvioenum";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'packagesizeenum_old') THEN
        DROP TYPE "public"."packagesizeenum_old";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'packagesizeenum') THEN
        DROP TYPE "public"."packagesizeenum";
    END IF;
END $$;


-- Crear Tipos ENUM (si se decide usarlos a nivel de DB)
-- Por ahora, se manejan como TEXT y se validan con Zod en la aplicación.
-- CREATE TYPE "public"."tipoRepartoEnum" AS ENUM ('individual', 'viaje_empresa', 'viaje_empresa_lote');
-- CREATE TYPE "public"."estadoRepartoEnum" AS ENUM ('asignado', 'en_curso', 'completado');
-- CREATE TYPE "public"."estadoEnvioEnum" AS ENUM ('pending', 'suggested', 'asignado_a_reparto', 'en_transito', 'entregado', 'cancelado', 'problema_entrega');
-- CREATE TYPE "public"."packageSizeEnum" AS ENUM ('small', 'medium', 'large');


-- Tabla de Empresas
CREATE TABLE "public"."empresas" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NULL,
    "telefono" TEXT NULL,
    "email" TEXT NULL,
    "notas" TEXT NULL
);
ALTER TABLE "public"."empresas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON "public"."empresas" FOR ALL TO authenticated USING (true) WITH CHECK (true);
COMMENT ON TABLE "public"."empresas" IS 'Stores company information.';

-- Tabla de Clientes
CREATE TABLE "public"."clientes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "notas" TEXT NULL,
    "empresa_id" UUID NULL REFERENCES "public"."empresas"(id) ON DELETE SET NULL
);
ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON "public"."clientes" FOR ALL TO authenticated USING (true) WITH CHECK (true);
COMMENT ON TABLE "public"."clientes" IS 'Stores client information.';
COMMENT ON COLUMN "public"."clientes"."empresa_id" IS 'Foreign key to the company the client belongs to.';

-- Tabla de Repartidores
CREATE TABLE "public"."repartidores" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT TRUE -- TRUE for active, FALSE for inactive
);
ALTER TABLE "public"."repartidores" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON "public"."repartidores" FOR ALL TO authenticated USING (true) WITH CHECK (true);
COMMENT ON TABLE "public"."repartidores" IS 'Stores delivery personnel information.';

-- Tabla de Repartos
CREATE TABLE "public"."repartos" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "fecha_reparto" DATE NOT NULL,
    "repartidor_id" UUID REFERENCES "public"."repartidores"(id) ON DELETE SET NULL,
    "estado" TEXT NOT NULL DEFAULT 'asignado', -- Valores: 'asignado', 'en_curso', 'completado'. Validado por Zod.
    "tipo_reparto" TEXT NOT NULL, -- Valores: 'individual', 'viaje_empresa', 'viaje_empresa_lote'. Validado por Zod.
    "empresa_id" UUID NULL REFERENCES "public"."empresas"(id) ON DELETE SET NULL
);
ALTER TABLE "public"."repartos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON "public"."repartos" FOR ALL TO authenticated USING (true) WITH CHECK (true);
COMMENT ON TABLE "public"."repartos" IS 'Stores delivery route master information.';
COMMENT ON COLUMN "public"."repartos"."empresa_id" IS 'FK to empresa if tipo_reparto is viaje_empresa or viaje_empresa_lote.';

-- Tabla de Envíos
CREATE TABLE "public"."envios" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "cliente_id" UUID NULL REFERENCES "public"."clientes"(id) ON DELETE SET NULL,
    "nombre_cliente_temporal" TEXT NULL,
    "client_location" TEXT NOT NULL,
    "package_size" TEXT NOT NULL, -- Valores: 'small', 'medium', 'large'. Validado por Zod.
    "package_weight" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending', -- Validado por Zod: 'pending', 'suggested', 'asignado_a_reparto', etc.
    "suggested_options" JSONB NULL,
    "reasoning" TEXT NULL,
    "reparto_id" UUID NULL REFERENCES "public"."repartos"(id) ON DELETE SET NULL
);
ALTER TABLE "public"."envios" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON "public"."envios" FOR ALL TO authenticated USING (true) WITH CHECK (true);
COMMENT ON TABLE "public"."envios" IS 'Stores individual shipment details.';
COMMENT ON COLUMN "public"."envios"."reparto_id" IS 'Foreign key to the assigned reparto, if any.';

-- Nueva Tabla: paradas_reparto
CREATE TABLE "public"."paradas_reparto" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "reparto_id" UUID NOT NULL REFERENCES "public"."repartos"(id) ON DELETE CASCADE,
    "envio_id" UUID NOT NULL REFERENCES "public"."envios"(id) ON DELETE CASCADE,
    "orden" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_reparto_envio UNIQUE (reparto_id, envio_id),
    CONSTRAINT uq_reparto_orden UNIQUE (reparto_id, orden)
);
ALTER TABLE "public"."paradas_reparto" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON "public"."paradas_reparto" FOR ALL TO authenticated USING (true) WITH CHECK (true);
COMMENT ON TABLE "public"."paradas_reparto" IS 'Stores the sequence and association of shipments within a delivery route.';
COMMENT ON COLUMN "public"."paradas_reparto"."orden" IS 'The sequence number of this stop in the delivery route.';


-- Sample Data

-- Empresas
INSERT INTO "public"."empresas" ("id", "nombre", "direccion", "email", "telefono") VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Tech Solutions SRL', 'Av. Corrientes 123, CABA', 'contacto@techsolutions.com', '+541145678901'),
('b2c3d4e5-f6a7-8901-2345-678901bcdef0', 'Nutrisabor', 'Calle Falsa 456, Rosario', 'ventas@nutrisabor.com', '+543414567890');

-- Clientes
INSERT INTO "public"."clientes" ("id", "nombre", "apellido", "direccion", "telefono", "email", "empresa_id") VALUES
('0f1ab15c-b943-43cd-9ed3-b3f6bf1f8d1a', 'Ana', 'Gomez', 'Honduras 4800, Palermo', '+541123456789', 'ana.gomez@example.com', (SELECT id FROM empresas WHERE nombre = 'Tech Solutions SRL')),
('7a6280f8-c761-41ce-98f3-ce7e23bfa93d', 'Luis', 'Martinez', 'Defensa 567, San Telmo', '+541134567890', 'luis.martinez@example.com', (SELECT id FROM empresas WHERE nombre = 'Tech Solutions SRL')),
('7ee95baf-df9a-458b-bab3-28ef838fc360', 'Carlos', 'Lopez', 'Av. Rivadavia 7000, Flores', '+541145678901', 'carlos.lopez@example.com', null),
('89dcdd25-3cdd-4adf-b92f-b638c6efd656', 'Andrea dentone', 'Andrea dentone', '25 de Mayo 3334, B7600 Mar del Plata, Provincia de Buenos Aires, Argentina', '+542235678901', 'a.dentone@topservice.net', (SELECT id FROM empresas WHERE nombre = 'Nutrisabor')),
('5e4a4569-b258-4bef-bdde-d119e9faf93c', 'Andrea Almejun', 'Andrea Almejun', 'F. Sanchez 2034, B7600 Mar del Plata, Provincia de Buenos Aires, Argentina', '+542235678902', 'a_almejun@unique-mail.com', (SELECT id FROM empresas WHERE nombre = 'Nutrisabor')),
('eab01d86-e550-4ae4-8783-2a179d99f40a', 'Andapez', 'Andapez', 'Av. Vertiz 3250, B7603GGT Mar del Plata, Provincia de Buenos Aires, Argentina ', '+542235678903', 'andapez.contact@anotherdomain.co', (SELECT id FROM empresas WHERE nombre = 'Nutrisabor')),
('d9b577b8-2118-4c19-9c6d-a39399e55082', 'Sofia', 'Fernandez', 'Colon 1234', '+541156789012', 'sofia.fernandez@example.com', null);

-- Repartidores
INSERT INTO "public"."repartidores" ("id", "nombre", "estado") VALUES
('0596f87a-a4a8-4f3d-9086-f003eab75af9', 'Matias', TRUE),
('f0b8c6e2-4d7a-41b5-9c3f-8e1d2a7b6c5d', 'Juan Perez', TRUE),
('e1d2c3b4-a5f6-7890-1234-567890abcdef', 'Maria Rodriguez', FALSE);

-- Envíos de Ejemplo (algunos pendientes, otros para asociar a repartos)
INSERT INTO "public"."envios" ("id", "cliente_id", "nombre_cliente_temporal", "client_location", "package_size", "package_weight", "status") VALUES
('11111111-1111-1111-1111-111111111111', (SELECT id FROM clientes WHERE email = 'ana.gomez@example.com'), null, 'Honduras 4800, Palermo', 'small', 1.2, 'pending'),
('22222222-2222-2222-2222-222222222222', (SELECT id FROM clientes WHERE email = 'luis.martinez@example.com'), null, 'Defensa 567, San Telmo', 'medium', 3.5, 'pending'),
('33333333-3333-3333-3333-333333333333', null, 'Destinatario Temporal 1', 'Ubicación Temporal 123', 'large', 5.0, 'pending'),
('44444444-4444-4444-4444-444444444444', (SELECT id FROM clientes WHERE email = 'carlos.lopez@example.com'), null, 'Av. Rivadavia 7000, Flores', 'small', 0.5, 'pending'),
('55555555-5555-5555-5555-555555555555', (SELECT id FROM clientes WHERE email = 'a.dentone@topservice.net'), null, '25 de Mayo 3334, B7600 Mar del Plata, Provincia de Buenos Aires, Argentina', 'medium', 2.0, 'pending'),
('66666666-6666-6666-6666-666666666666', (SELECT id FROM clientes WHERE email = 'a_almejun@unique-mail.com'), null, 'F. Sanchez 2034, B7600 Mar del Plata, Provincia de Buenos Aires, Argentina', 'small', 1.0, 'pending');

-- Repartos de Ejemplo (inicialmente sin paradas, las paradas se crearán por las actions)
INSERT INTO "public"."repartos" ("id", "fecha_reparto", "repartidor_id", "estado", "tipo_reparto", "empresa_id") VALUES
('df1e184e-71e6-4f00-a78d-b6e93034cd35', '2025-05-21', (SELECT id FROM repartidores WHERE nombre = 'Juan Perez'), 'asignado', 'viaje_empresa', (SELECT id FROM empresas WHERE nombre = 'Tech Solutions SRL')),
('caad29f1-cf73-42d4-b3d2-658a7814f1c4', '2025-05-22', (SELECT id FROM repartidores WHERE nombre = 'Matias'), 'en_curso', 'individual', null),
('a7a9309f-6bbf-4029-9f61-4d0a3724b908', '2025-05-23', (SELECT id FROM repartidores WHERE nombre = 'Maria Rodriguez'), 'completado', 'viaje_empresa_lote', (SELECT id FROM empresas WHERE nombre = 'Nutrisabor'));

-- Las paradas_reparto se insertarán mediante las Server Actions al crear/modificar repartos.
-- Ejemplo manual (descomentar y adaptar UUIDs si se prueba directamente en SQL):
/*
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "orden") VALUES
('df1e184e-71e6-4f00-a78d-b6e93034cd35', (SELECT id FROM envios WHERE client_location = 'Honduras 4800, Palermo'), 0),
('df1e184e-71e6-4f00-a78d-b6e93034cd35', (SELECT id FROM envios WHERE client_location = 'Defensa 567, San Telmo'), 1);
*/
