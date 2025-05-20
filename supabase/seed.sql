
-- Drop tables in reverse order of dependency due to foreign keys
DROP TABLE IF EXISTS "public"."paradas_reparto";
DROP TABLE IF EXISTS "public"."envios";
DROP TABLE IF EXISTS "public"."repartos";
DROP TABLE IF EXISTS "public"."clientes";
DROP TABLE IF EXISTS "public"."empresas";
DROP TABLE IF EXISTS "public"."repartidores";

-- Drop enums if they exist (handle with care in production)
DROP TYPE IF EXISTS "public"."estadorepartoenum";
DROP TYPE IF EXISTS "public"."tiporepartoenum";
DROP TYPE IF EXISTS "public"."estadoenvioenum";
DROP TYPE IF EXISTS "public"."packagesizeenum";
DROP TYPE IF EXISTS "public"."tipoparadaenum";


-- Create ENUM types if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipoparadaenum') THEN
        CREATE TYPE "public"."tipoparadaenum" AS ENUM ('retiro_empresa', 'entrega_cliente');
    END IF;
END$$;


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
ALTER TABLE "public"."empresas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (empresas)" ON "public"."empresas" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

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
ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (clientes)" ON "public"."clientes" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

-- Create Table for Repartidores
CREATE TABLE "public"."repartidores" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE "public"."repartidores" IS 'Stores delivery personnel information.';
ALTER TABLE "public"."repartidores" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (repartidores)" ON "public"."repartidores" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

-- Create Table for Repartos
CREATE TABLE "public"."repartos" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "fecha_reparto" DATE NOT NULL,
    "repartidor_id" UUID NULL REFERENCES "public"."repartidores"("id") ON DELETE SET NULL,
    "estado" TEXT NOT NULL DEFAULT 'asignado', -- Zod: 'asignado', 'en_curso', 'completado'
    "tipo_reparto" TEXT NOT NULL, -- Zod: 'individual', 'viaje_empresa', 'viaje_empresa_lote'
    "empresa_id" UUID NULL REFERENCES "public"."empresas"("id") ON DELETE SET NULL
);
COMMENT ON TABLE "public"."repartos" IS 'Stores delivery route information.';
ALTER TABLE "public"."repartos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (repartos)" ON "public"."repartos" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

-- Create Table for Envios
CREATE TABLE "public"."envios" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "cliente_id" UUID NULL REFERENCES "public"."clientes"("id") ON DELETE SET NULL,
    "nombre_cliente_temporal" TEXT NULL,
    "client_location" TEXT NOT NULL,
    "latitud" NUMERIC NULL,
    "longitud" NUMERIC NULL,
    "package_size" TEXT NOT NULL, -- Zod: 'small', 'medium', 'large'
    "package_weight" NUMERIC NOT NULL DEFAULT 0.1,
    "status" TEXT NOT NULL DEFAULT 'pending', -- Zod: 'pending', 'suggested', ...
    "suggested_options" JSON NULL,
    "reasoning" TEXT NULL,
    "reparto_id" UUID NULL REFERENCES "public"."repartos"("id") ON DELETE SET NULL
);
COMMENT ON TABLE "public"."envios" IS 'Stores individual shipment details.';
ALTER TABLE "public"."envios" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (envios)" ON "public"."envios" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

-- Create Table for Paradas_Reparto
CREATE TABLE "public"."paradas_reparto" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "reparto_id" UUID NOT NULL REFERENCES "public"."repartos"("id") ON DELETE CASCADE,
    "envio_id" UUID NULL REFERENCES "public"."envios"("id") ON DELETE CASCADE, -- Made NULLABLE
    "tipo_parada" public.tipoparadaenum NULL, -- 'retiro_empresa', 'entrega_cliente'
    "orden" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_reparto_envio UNIQUE (reparto_id, envio_id) DEFERRABLE INITIALLY DEFERRED -- Deferrable to handle NULLs better if needed, or remove if not strictly needed for NULL envio_id
    -- CONSTRAINT uq_reparto_orden UNIQUE (reparto_id, orden) -- Removed earlier
);
COMMENT ON TABLE "public"."paradas_reparto" IS 'Defines the sequence of stops (company pickups or client deliveries) within a delivery route.';
ALTER TABLE "public"."paradas_reparto" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (paradas_reparto)" ON "public"."paradas_reparto" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);


-- Sample Data
INSERT INTO "public"."empresas" ("id", "nombre", "direccion", "email", "telefono", "latitud", "longitud", "estado") VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Tech Solutions SRL', 'San Martin 123, Mar del Plata', 'contacto@techsrl.com', '+542235550100', -38.0054, -57.5426, TRUE),
('b2c3d4e5-f6a7-8901-2345-678901bcdef0', 'Nutrisabor', 'Av. Independencia 456, Mar del Plata', 'ventas@nutrisabor.com', '+542235550200', -37.9950, -57.5550, TRUE),
('c3d4e5f6-a7b8-9012-3456-78901bcdef01', 'Librería El Saber', 'Rivadavia 3000, Mar del Plata', 'info@elsaber.com', '+542235550300', -38.0011, -57.5499, TRUE);


INSERT INTO "public"."clientes" ("id", "nombre", "apellido", "direccion", "telefono", "email", "empresa_id", "latitud", "longitud", "estado") VALUES
('0f1ab15c-b943-43cd-9ed3-b3f6bf1f8d1a', 'Juan', 'Perez', 'Av. Colón 1234, Mar del Plata', '+542235550101', 'juan.perez@example.com', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL'), -38.0005, -57.5560, TRUE),
('d9b577b8-2118-4c19-9c6d-a39399e55082', 'Maria', 'Garcia', 'Belgrano 5678, Mar del Plata', '+542235550102', 'maria.garcia@example.com', (SELECT id from empresas WHERE nombre = 'Nutrisabor'), -38.0025, -57.5490, TRUE),
('7a6280f8-c761-41ce-98f3-ce7e23bfa93d', 'Carlos', 'Lopez', 'Moreno 9101, Mar del Plata', '+542235550103', 'carlos.lopez@example.com', (SELECT id from empresas WHERE nombre = 'Nutrisabor'), -37.9910, -57.5830, FALSE),
('7ee95baf-df9a-458b-bab3-28ef838fc360', 'Ana', 'Martinez', 'Luro 3210, Mar del Plata', '+542235550104', 'ana.martinez@example.com', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL'), -38.0048, -57.5430, TRUE),
('89dcdd25-3cdd-4adf-b92f-b638c6efd656', 'Andrea', 'Dentone', '25 de Mayo 3334, Mar del Plata', NULL, NULL, (SELECT id from empresas WHERE nombre = 'Nutrisabor'), -38.0022, -57.5450, TRUE),
('5e4a4569-b258-4bef-bdde-d119e9faf93c', 'Laura', 'Gomez', 'F. Sanchez 2034, Mar del Plata', '+542235550106', 'laura.gomez@email.com', (SELECT id from empresas WHERE nombre = 'Librería El Saber'), -38.0150, -57.5500, TRUE),
('eab01d86-e550-4ae4-8783-2a179d99f40a', 'Pedro', 'Rodriguez', 'Av. Vertiz 3250, Mar del Plata', '+542235550107', 'pedro.r@another.co', (SELECT id from empresas WHERE nombre = 'Librería El Saber'), -38.0380, -57.5690, TRUE);


INSERT INTO "public"."repartidores" ("id", "nombre", "estado") VALUES
('0596f87a-a4a8-4f3d-9086-f003eab75af9', 'Matias Gonzalez', TRUE),
('471c54f9-5680-455c-9b41-50a261c58523', 'Juan Perez', TRUE),
('a9a64e0a-70e8-43c7-9d0f-768b09f69118', 'Maria Rodriguez', FALSE);

-- Sample Envios
INSERT INTO "public"."envios" ("id", "cliente_id", "client_location", "latitud", "longitud", "package_size", "package_weight", "status") VALUES
('31326385-0208-4c49-90ac-12a76d61c899', (SELECT id from clientes WHERE email = 'juan.perez@example.com'), 'Av. Colón 1234, Mar del Plata', -38.0005, -57.5560, 'medium', 1.5, 'pending'),
('48379f7b-11a4-4476-8025-4f3c21b9e19d', (SELECT id from clientes WHERE email = 'maria.garcia@example.com'), 'Belgrano 5678, Mar del Plata', -38.0025, -57.5490, 'small', 0.5, 'pending'),
('2e47d785-9105-4759-b4b3-f6728b55796f', (SELECT id from clientes WHERE email = 'carlos.lopez@example.com'), 'Moreno 9101, Mar del Plata', -37.9910, -57.5830, 'large', 5, 'entregado'),
('609f63bb-10a3-47be-ae08-066b5e0768f8', (SELECT id from clientes WHERE email = 'ana.martinez@example.com'), 'Luro 3210, Mar del Plata', -38.0048, -57.5430, 'medium', 2.2, 'en_transito');

-- Sample Repartos with initial Paradas (pickup and one delivery)
DO $$
DECLARE
    reparto_tech_id UUID;
    reparto_nutri_id UUID;
    reparto_libre_id UUID;
    envio_juan_id UUID;
    envio_maria_id UUID;
    envio_pedro_id UUID;
    empresa_tech_id UUID;
    empresa_nutri_id UUID;
    empresa_libre_id UUID;
BEGIN
    -- Get Empresa IDs
    SELECT id INTO empresa_tech_id FROM empresas WHERE nombre = 'Tech Solutions SRL';
    SELECT id INTO empresa_nutri_id FROM empresas WHERE nombre = 'Nutrisabor';
    SELECT id INTO empresa_libre_id FROM empresas WHERE nombre = 'Librería El Saber';

    -- Create Reparto 1 (Tech Solutions Lote)
    INSERT INTO "public"."repartos" ("fecha_reparto", "repartidor_id", "estado", "tipo_reparto", "empresa_id")
    VALUES ('2025-05-25', (SELECT id from repartidores WHERE nombre = 'Matias Gonzalez'), 'asignado', 'viaje_empresa_lote', empresa_tech_id)
    RETURNING id INTO reparto_tech_id;

    -- Parada 0: Retiro en Tech Solutions
    INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
    VALUES (reparto_tech_id, NULL, 'retiro_empresa', 0);

    -- Parada 1: Entrega a Juan Perez (de Tech Solutions)
    SELECT id INTO envio_juan_id FROM envios WHERE cliente_id = (SELECT id FROM clientes WHERE email = 'juan.perez@example.com') LIMIT 1;
    IF envio_juan_id IS NOT NULL THEN
        UPDATE envios SET reparto_id = reparto_tech_id, status = 'asignado_a_reparto' WHERE id = envio_juan_id;
        INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
        VALUES (reparto_tech_id, envio_juan_id, 'entrega_cliente', 1) ON CONFLICT (reparto_id, envio_id) DO NOTHING;
    END IF;

    -- Create Reparto 2 (Nutrisabor Lote)
    INSERT INTO "public"."repartos" ("fecha_reparto", "repartidor_id", "estado", "tipo_reparto", "empresa_id")
    VALUES ('2025-05-26', (SELECT id from repartidores WHERE nombre = 'Juan Perez'), 'asignado', 'viaje_empresa_lote', empresa_nutri_id)
    RETURNING id INTO reparto_nutri_id;

    -- Parada 0: Retiro en Nutrisabor
    INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
    VALUES (reparto_nutri_id, NULL, 'retiro_empresa', 0);

    -- Parada 1: Entrega a Maria Garcia (de Nutrisabor)
    SELECT id INTO envio_maria_id FROM envios WHERE cliente_id = (SELECT id FROM clientes WHERE email = 'maria.garcia@example.com') LIMIT 1;
    IF envio_maria_id IS NOT NULL THEN
        UPDATE envios SET reparto_id = reparto_nutri_id, status = 'asignado_a_reparto' WHERE id = envio_maria_id;
        INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
        VALUES (reparto_nutri_id, envio_maria_id, 'entrega_cliente', 1) ON CONFLICT (reparto_id, envio_id) DO NOTHING;
    END IF;

    -- Create Reparto 3 (Individual)
    INSERT INTO "public"."repartos" ("fecha_reparto", "repartidor_id", "estado", "tipo_reparto", "empresa_id")
    VALUES ('2025-05-27', (SELECT id from repartidores WHERE nombre = 'Matias Gonzalez'), 'en_curso', 'individual', NULL)
    RETURNING id INTO reparto_libre_id;
    
    -- Parada 1: Entrega a Pedro Rodriguez (envío individual)
    SELECT id INTO envio_pedro_id FROM envios WHERE cliente_id = (SELECT id FROM clientes WHERE email = 'pedro.r@another.co') LIMIT 1;
    IF envio_pedro_id IS NOT NULL THEN
        UPDATE envios SET reparto_id = reparto_libre_id, status = 'asignado_a_reparto' WHERE id = envio_pedro_id;
        INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
        VALUES (reparto_libre_id, envio_pedro_id, 'entrega_cliente', 0) ON CONFLICT (reparto_id, envio_id) DO NOTHING;
    END IF;

END $$;
