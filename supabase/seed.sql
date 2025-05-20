
-- Eliminar tablas existentes en orden inverso de dependencias para evitar errores de FK
DROP TABLE IF EXISTS "public"."envios" CASCADE;
DROP TABLE IF EXISTS "public"."repartos" CASCADE;
DROP TABLE IF EXISTS "public"."clientes" CASCADE;
DROP TABLE IF EXISTS "public"."empresas" CASCADE;
DROP TABLE IF EXISTS "public"."repartidores" CASCADE;

-- Eliminar tipos enum si existen
DROP TYPE IF EXISTS "public"."tipoRepartoEnum" CASCADE;
DROP TYPE IF EXISTS "public"."estadoRepartoEnum" CASCADE;
DROP TYPE IF EXISTS "public"."estadoEnvioEnum" CASCADE;
DROP TYPE IF EXISTS "public"."packageSizeEnum" CASCADE;


-- Crear tipo enum para estado de envío
CREATE TYPE "public"."estadoEnvioEnum" AS ENUM (
  'pending',
  'suggested',
  'asignado_a_reparto',
  'en_transito',
  'entregado',
  'cancelado',
  'problema_entrega'
);
ALTER TYPE "public"."estadoEnvioEnum" OWNER TO "postgres";

-- Crear tipo enum para tamaño de paquete
CREATE TYPE "public"."packageSizeEnum" AS ENUM (
  'small',
  'medium',
  'large'
);
ALTER TYPE "public"."packageSizeEnum" OWNER TO "postgres";

-- Crear tipo enum para estado de reparto
CREATE TYPE "public"."estadoRepartoEnum" AS ENUM (
  'asignado',
  'en_curso',
  'completado'
);
ALTER TYPE "public"."estadoRepartoEnum" OWNER TO "postgres";

-- Crear tipo enum para tipo de reparto (actualizado)
CREATE TYPE "public"."tipoRepartoEnum" AS ENUM (
  'individual',
  'viaje_empresa',
  'viaje_empresa_lote' -- Nuevo valor añadido
);
ALTER TYPE "public"."tipoRepartoEnum" OWNER TO "postgres";


-- Crear tabla de empresas
CREATE TABLE "public"."empresas" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "nombre" text NOT NULL,
    "direccion" text,
    "telefono" text,
    "email" text UNIQUE,
    "notas" text
);
ALTER TABLE "public"."empresas" OWNER TO "postgres";
COMMENT ON TABLE "public"."empresas" IS 'Stores company information for B2B clients.';

-- Crear tabla de clientes
CREATE TABLE "public"."clientes" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "nombre" text NOT NULL,
    "apellido" text NOT NULL,
    "direccion" text NOT NULL,
    "telefono" text NOT NULL,
    "email" text NOT NULL UNIQUE,
    "notas" text,
    "empresa_id" uuid REFERENCES "public"."empresas"(id) ON DELETE SET NULL
);
ALTER TABLE "public"."clientes" OWNER TO "postgres";
COMMENT ON TABLE "public"."clientes" IS 'Stores client information.';
COMMENT ON COLUMN "public"."clientes"."empresa_id" IS 'Foreign key to the company the client belongs to, if any.';


-- Crear tabla de repartidores
CREATE TABLE "public"."repartidores" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "nombre" text NOT NULL,
    "estado" boolean DEFAULT true NOT NULL -- true para activo, false para inactivo
);
ALTER TABLE "public"."repartidores" OWNER TO "postgres";
COMMENT ON TABLE "public"."repartidores" IS 'Stores information about delivery personnel.';
COMMENT ON COLUMN "public"."repartidores"."estado" IS 'Indicates if the delivery person is active or inactive.';


-- Crear tabla de repartos (usando los enums actualizados)
CREATE TABLE "public"."repartos" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "fecha_reparto" date NOT NULL,
    "repartidor_id" uuid REFERENCES "public"."repartidores"(id) ON DELETE SET NULL,
    "estado" "public"."estadoRepartoEnum" DEFAULT 'asignado'::"public"."estadoRepartoEnum" NOT NULL,
    "tipo_reparto" "public"."tipoRepartoEnum" NOT NULL,
    "empresa_id" uuid REFERENCES "public"."empresas"(id) ON DELETE SET NULL
);
ALTER TABLE "public"."repartos" OWNER TO "postgres";
COMMENT ON TABLE "public"."repartos" IS 'Stores delivery route information.';
COMMENT ON COLUMN "public"."repartos"."fecha_reparto" IS 'Scheduled date for the delivery route.';
COMMENT ON COLUMN "public"."repartos"."repartidor_id" IS 'Foreign key to the assigned delivery person.';
COMMENT ON COLUMN "public"."repartos"."estado" IS 'Current status of the delivery route (e.g., asignado, en_curso, completado).';
COMMENT ON COLUMN "public"."repartos"."tipo_reparto" IS 'Type of delivery route (e.g., individual, viaje_empresa, viaje_empresa_lote).';
COMMENT ON COLUMN "public"."repartos"."empresa_id" IS 'Foreign key to the company if it is a company-specific trip.';


-- Crear tabla de envíos (usando los enums)
CREATE TABLE "public"."envios" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "cliente_id" uuid REFERENCES "public"."clientes"(id) ON DELETE SET NULL,
    "nombre_cliente_temporal" text,
    "client_location" text NOT NULL,
    "package_size" "public"."packageSizeEnum" NOT NULL,
    "package_weight" real NOT NULL,
    "status" "public"."estadoEnvioEnum" DEFAULT 'pending'::"public"."estadoEnvioEnum" NOT NULL,
    "suggested_options" jsonb,
    "reasoning" text,
    "reparto_id" uuid REFERENCES "public"."repartos"(id) ON DELETE SET NULL
);
ALTER TABLE "public"."envios" OWNER TO "postgres";
COMMENT ON TABLE "public"."envios" IS 'Stores individual shipment details.';
COMMENT ON COLUMN "public"."envios"."cliente_id" IS 'Foreign key to the client table, if the recipient is an existing client.';
COMMENT ON COLUMN "public"."envios"."nombre_cliente_temporal" IS 'Name of the recipient if not an existing client.';
COMMENT ON COLUMN "public"."envios"."client_location" IS 'Delivery address or location.';
COMMENT ON COLUMN "public"."envios"."package_size" IS 'Size of the package (small, medium, large).';
COMMENT ON COLUMN "public"."envios"."package_weight" IS 'Weight of the package in kilograms.';
COMMENT ON COLUMN "public"."envios"."status" IS 'Current status of the shipment.';
COMMENT ON COLUMN "public"."envios"."suggested_options" IS 'AI suggested delivery options (JSON array of strings).';
COMMENT ON COLUMN "public"."envios"."reasoning" IS 'AI reasoning for the suggested options.';
COMMENT ON COLUMN "public"."envios"."reparto_id" IS 'Foreign key to the assigned reparto (delivery route).';


-- Habilitar RLS (Row Level Security) y crear políticas permisivas para desarrollo
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


-- Sample Data (opcional, pero útil para desarrollo)
-- Insertar Empresas
INSERT INTO "public"."empresas" (id, nombre, direccion, telefono, email, notas) VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Tech Solutions SRL', 'Av. Corrientes 1234, CABA', '+541155551111', 'contacto@techsolutions.com', 'Cliente corporativo grande, requiere facturas A.'),
('b2c3d4e5-f6a7-8901-2345-678901bcdef0', 'Pymes Unidas', 'Calle Falsa 456, Rosario', '+5434155552222', 'info@pymesunidas.org', 'Agrupación de pequeñas empresas.');

-- Insertar Clientes (algunos asociados a empresas)
INSERT INTO "public"."clientes" (id, nombre, apellido, direccion, telefono, email, notas, empresa_id) VALUES
('7a6280f8-c761-41ce-98f3-ce7e23bfa93d', 'Ana', 'Gomez', 'Defensa 567, San Telmo', '+541155553333', 'ana.gomez@example.com', 'Prefiere entregas por la mañana.', 'a1b2c3d4-e5f6-7890-1234-567890abcdef'),
('0f1ab15c-b943-43cd-9ed3-b3f6bf1f8d1a', 'Luis', 'Martinez', 'Honduras 4800, Palermo', '+541155554444', 'luis.martinez@example.com', 'Dejar en portería si no está.', 'a1b2c3d4-e5f6-7890-1234-567890abcdef'),
('7ee95baf-df9a-458b-bab3-28ef838fc360', 'Sofia', 'Rodriguez', 'Av. Rivadavia 7000, Flores', '+541155556666', 'sofia.r@example.net', NULL, NULL),
('d9b577b8-2118-4c19-9c6d-a39399e55082', 'Carlos', 'Lopez', 'Colon 1234, Cordoba Capital', '+5435155557777', 'c.lopez@example.org', 'Entregar en oficina 3B.', 'b2c3d4e5-f6a7-8901-2345-678901bcdef0');

-- Insertar Repartidores
INSERT INTO "public"."repartidores" (id, nombre, estado) VALUES
('c4d5e6f7-a8b9-0123-4567-890123abcdef', 'Juan Perez', true),
('d5e6f7a8-b9c0-1234-5678-901234bcdef0', 'Maria Rodriguez', true),
('e6f7a8b9-c0d1-2345-6789-012345cdef01', 'Pedro Gonzalez', false);

-- Insertar Envíos (algunos para los clientes de muestra)
INSERT INTO "public"."envios" (id, cliente_id, client_location, package_size, package_weight, status) VALUES
('6a9dd307-1f2e-4eca-9f8b-f887697c4841', '7ee95baf-df9a-458b-bab3-28ef838fc360', 'Av. Rivadavia 7000, Flores', 'large', 10.2, 'pending'),
('4068601d-34dc-4983-9834-68c630af1b31', '7a6280f8-c761-41ce-98f3-ce7e23bfa93d', 'Defensa 567, San Telmo', 'medium', 2.5, 'pending'),
('46990e54-0a24-4756-a6b8-96f7229246c5', '0f1ab15c-b943-43cd-9ed3-b3f6bf1f8d1a', 'Honduras 4800, Palermo', 'small', 0.8, 'pending'),
('ee0a5dbe-4542-4b52-89ec-a339e1482f0b', '7a6280f8-c761-41ce-98f3-ce7e23bfa93d', 'Defensa 567, San Telmo (Oficina)', 'small', 0.5, 'pending'),
('62ceba09-7a0f-43dc-bef0-b5340f6f83d4', 'd9b577b8-2118-4c19-9c6d-a39399e55082', 'Colon 1234, Cordoba', 'medium', 1.1, 'pending');

-- Sample Reparto
INSERT INTO "public"."repartos" (id, fecha_reparto, repartidor_id, estado, tipo_reparto, empresa_id) VALUES
('df1e184e-71e6-4f00-a78d-b6e93034cd35', (NOW() + interval '1 day')::date, 'c4d5e6f7-a8b9-0123-4567-890123abcdef', 'asignado', 'viaje_empresa', 'a1b2c3d4-e5f6-7890-1234-567890abcdef');

-- Update some envios to be part of this sample reparto
UPDATE "public"."envios" SET reparto_id = 'df1e184e-71e6-4f00-a78d-b6e93034cd35', status = 'asignado_a_reparto' WHERE id IN ('4068601d-34dc-4983-9834-68c630af1b31', '46990e54-0a24-4756-a6b8-96f7229246c5');
```