-- Drop tables in reverse order of creation due to foreign key constraints
DROP TABLE IF EXISTS public.paradas_reparto CASCADE;
DROP TABLE IF EXISTS public.envios CASCADE;
DROP TABLE IF EXISTS public.repartos CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.empresas CASCADE;
DROP TABLE IF EXISTS public.repartidores CASCADE;

-- Drop enums if they exist
DROP TYPE IF EXISTS public.tipoRepartoEnum_old;
DROP TYPE IF EXISTS public.tipoRepartoEnum;
DROP TYPE IF EXISTS public.estadoRepartoEnum_old;
DROP TYPE IF EXISTS public.estadoRepartoEnum;
DROP TYPE IF EXISTS public.estadoEnvioEnum_old;
DROP TYPE IF EXISTS public.estadoEnvioEnum;
DROP TYPE IF EXISTS public.packageSizeEnum_old;
DROP TYPE IF EXISTS public.packageSizeEnum;


-- Create Enums (using TEXT for flexibility with Zod validation at app level)
-- If true ENUM types are preferred, they can be created like this:
-- CREATE TYPE public.packageSizeEnum AS ENUM ('small', 'medium', 'large');
-- CREATE TYPE public.estadoEnvioEnum AS ENUM ('pending', 'suggested', 'asignado_a_reparto', 'en_transito', 'entregado', 'cancelado', 'problema_entrega');
-- CREATE TYPE public.estadoRepartoEnum AS ENUM ('asignado', 'en_curso', 'completado');
-- CREATE TYPE public.tipoRepartoEnum AS ENUM ('individual', 'viaje_empresa', 'viaje_empresa_lote');

-- Empresas Table
CREATE TABLE public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    nombre TEXT NOT NULL,
    direccion TEXT NULL,
    telefono TEXT NULL,
    email TEXT NULL UNIQUE,
    notas TEXT NULL
);
COMMENT ON TABLE "public"."empresas" IS 'Stores company information.';

-- Clientes Table
CREATE TABLE public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    direccion TEXT NOT NULL,
    telefono TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    notas TEXT NULL,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL
);
COMMENT ON TABLE "public"."clientes" IS 'Stores client information.';
COMMENT ON COLUMN "public"."clientes"."empresa_id" IS 'Foreign key to the company the client belongs to.';

-- Repartidores Table
CREATE TABLE public.repartidores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    nombre TEXT NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE "public"."repartidores" IS 'Stores delivery personnel information.';
COMMENT ON COLUMN "public"."repartidores"."estado" IS 'Indicates if the delivery person is active (true) or inactive (false).';

-- Repartos Table
CREATE TABLE public.repartos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    fecha_reparto DATE NOT NULL,
    repartidor_id UUID REFERENCES public.repartidores(id) ON DELETE SET NULL,
    estado TEXT NOT NULL DEFAULT 'asignado', -- Values: 'asignado', 'en_curso', 'completado' (Validated by Zod)
    tipo_reparto TEXT NOT NULL, -- Values: 'individual', 'viaje_empresa', 'viaje_empresa_lote' (Validated by Zod)
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL
);
COMMENT ON TABLE "public"."repartos" IS 'Stores delivery route information.';
COMMENT ON COLUMN "public"."repartos"."empresa_id" IS 'Foreign key to the company for company-wide trips.';

-- Envios Table
CREATE TABLE public.envios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    nombre_cliente_temporal TEXT NULL,
    client_location TEXT NOT NULL,
    package_size TEXT NOT NULL DEFAULT 'medium', -- Values: 'small', 'medium', 'large' (Validated by Zod)
    package_weight REAL NOT NULL DEFAULT 1, -- Using REAL for float
    status TEXT NOT NULL DEFAULT 'pending', -- Values like 'pending', 'assigned', 'in_transit', 'delivered' (Validated by Zod)
    suggested_options JSONB NULL,
    reasoning TEXT NULL,
    reparto_id UUID REFERENCES public.repartos(id) ON DELETE SET NULL,
    latitud NUMERIC NULL,
    longitud NUMERIC NULL
);
COMMENT ON TABLE "public"."envios" IS 'Stores shipment information.';
COMMENT ON COLUMN "public"."envios"."reparto_id" IS 'Foreign key to the assigned reparto.';
COMMENT ON COLUMN "public"."envios"."latitud" IS 'Latitude of the client_location for mapping.';
COMMENT ON COLUMN "public"."envios"."longitud" IS 'Longitude of the client_location for mapping.';

-- Paradas Reparto Table (Junction table for ordered shipments in a reparto)
CREATE TABLE public.paradas_reparto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reparto_id UUID NOT NULL REFERENCES public.repartos(id) ON DELETE CASCADE,
    envio_id UUID NOT NULL REFERENCES public.envios(id) ON DELETE CASCADE,
    orden INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_reparto_envio UNIQUE (reparto_id, envio_id)
    -- Removed: CONSTRAINT uq_reparto_orden UNIQUE (reparto_id, orden) -- Removed to allow easier reordering logic
);
COMMENT ON TABLE "public"."paradas_reparto" IS 'Stores the sequence of shipments (stops) for a delivery route.';
COMMENT ON COLUMN "public"."paradas_reparto"."orden" IS 'Sequential order of the stop in the route.';


-- Enable RLS for all tables
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repartidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repartos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paradas_reparto ENABLE ROW LEVEL SECURITY;

-- Create policies (PERMISSIVE FOR DEVELOPMENT - REVIEW FOR PRODUCTION)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.empresas;
CREATE POLICY "Allow all for authenticated users" ON public.empresas FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.clientes;
CREATE POLICY "Allow all for authenticated users" ON public.clientes FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.repartidores;
CREATE POLICY "Allow all for authenticated users" ON public.repartidores FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.repartos;
CREATE POLICY "Allow all for authenticated users" ON public.repartos FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.envios;
CREATE POLICY "Allow all for authenticated users" ON public.envios FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.paradas_reparto;
CREATE POLICY "Allow all for authenticated users" ON public.paradas_reparto FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);


-- Sample Data (Optional, for testing)
INSERT INTO public.empresas (nombre, direccion, telefono, email, notas) VALUES
('Tech Solutions SRL', 'Av. Corrientes 1234, CABA', '+541145678901', 'contacto@techsrl.com', 'Cliente VIP, proveedor de software.'),
('Gourmet Foods Inc.', 'Calle Falsa 123, Palermo, CABA', '+541133334444', 'pedidos@gourmetfoods.com', 'Entrega de productos frescos martes y jueves.'),
('Nutrisabor', 'Rivadavia 500, Mar del Plata', '+542234567890', 'info@nutrisabor.com.ar', 'Tienda de alimentos saludables, envíos locales.');

INSERT INTO public.clientes (nombre, apellido, direccion, telefono, email, empresa_id) VALUES
('Juan', 'Pérez', 'Av. Siempreviva 742, Springfield', '+5491112345678', 'juan.perez@example.com', (SELECT id from public.empresas WHERE nombre = 'Tech Solutions SRL')),
('Ana', 'García', 'Calle Falsa 123, Palermo, CABA', '+5491187654321', 'ana.garcia@example.com', (SELECT id from public.empresas WHERE nombre = 'Gourmet Foods Inc.')),
('Carlos', 'López', 'Defensa 567, San Telmo, CABA', '+5491155555555', 'carlos.lopez@example.com', NULL),
('Cliente MDP 1', 'Apellido MDP 1', 'Av. Colón 1234, Mar del Plata', '+542231112222', 'cliente.mdp1@example.com', (SELECT id from public.empresas WHERE nombre = 'Nutrisabor')),
('Cliente MDP 2', 'Apellido MDP 2', 'Güemes 2500, Mar del Plata', '+542233334444', 'cliente.mdp2@example.com', (SELECT id from public.empresas WHERE nombre = 'Nutrisabor'));

INSERT INTO public.repartidores (nombre, estado) VALUES
('Juan Perez', TRUE),
('Maria Rodriguez', TRUE),
('Matias', FALSE); -- Matias inactivo

-- Sample Envios (some with Mar del Plata coordinates)
INSERT INTO public.envios (cliente_id, nombre_cliente_temporal, client_location, package_size, package_weight, status, latitud, longitud) VALUES
((SELECT id from public.clientes WHERE email = 'juan.perez@example.com'), NULL, 'Av. Siempreviva 742, Springfield', 'medium', 2.5, 'pending', NULL, NULL),
((SELECT id from public.clientes WHERE email = 'ana.garcia@example.com'), NULL, 'Calle Falsa 123, Palermo, CABA', 'small', 0.8, 'pending', NULL, NULL),
(NULL, 'Destinatario Temporal CABA', 'Av. Rivadavia 7000, Flores, CABA', 'large', 10.2, 'pending', NULL, NULL),
((SELECT id from public.clientes WHERE email = 'cliente.mdp1@example.com'), NULL, 'Av. Colón 1234, Mar del Plata', 'medium', 1.5, 'pending', -38.0023, -57.5575), -- MDP Centro
((SELECT id from public.clientes WHERE email = 'cliente.mdp2@example.com'), NULL, 'Güemes 2500, Mar del Plata', 'small', 0.5, 'en_transito', -38.0095, -57.5438), -- MDP Güemes
(NULL, 'Envío Puerto MDP', 'Puerto Mar del Plata', 'large', 5.0, 'entregado', -38.0333, -57.5389); -- MDP Puerto

-- Sample Repartos (opcional, se crearán desde la app)
-- Reparto 1: Individual, asignado
INSERT INTO public.repartos (fecha_reparto, repartidor_id, estado, tipo_reparto, empresa_id) VALUES
('2025-05-25', (SELECT id from public.repartidores WHERE nombre = 'Juan Perez'), 'asignado', 'individual', NULL);

-- Reparto 2: Viaje por Empresa, en curso
INSERT INTO public.repartos (fecha_reparto, repartidor_id, estado, tipo_reparto, empresa_id) VALUES
('2025-05-26', (SELECT id from public.repartidores WHERE nombre = 'Maria Rodriguez'), 'en_curso', 'viaje_empresa', (SELECT id from public.empresas WHERE nombre = 'Tech Solutions SRL'));

-- Update some envios to link them to repartos for testing (assuming you have the reparto IDs after they are inserted)
-- This part is tricky in a static seed.sql without knowing the generated reparto IDs.
-- The application logic for creating repartos will handle linking envios to repartos.
-- For manual testing, after repartos are created, you can update envios.reparto_id.
-- For instance, if Reparto 1 (individual) gets ID 'some-reparto-id-1':
-- UPDATE public.envios SET reparto_id = 'some-reparto-id-1', status = 'asignado_a_reparto' WHERE client_location = 'Av. Siempreviva 742, Springfield';
-- UPDATE public.envios SET reparto_id = 'some-reparto-id-1', status = 'asignado_a_reparto' WHERE client_location = 'Calle Falsa 123, Palermo, CABA';
-- INSERT INTO public.paradas_reparto (reparto_id, envio_id, orden) VALUES
-- ('some-reparto-id-1', (SELECT id from public.envios where client_location = 'Av. Siempreviva 742, Springfield'), 0),
-- ('some-reparto-id-1', (SELECT id from public.envios where client_location = 'Calle Falsa 123, Palermo, CABA'), 1);

-- Sample Paradas_Reparto (commented out as they depend on actual Reparto/Envio IDs)
/*
WITH rep1 AS (SELECT id FROM public.repartos WHERE fecha_reparto = '2025-05-25' AND repartidor_id = (SELECT id FROM public.repartidores WHERE nombre = 'Juan Perez') LIMIT 1),
     env1 AS (SELECT id FROM public.envios WHERE client_location = 'Av. Siempreviva 742, Springfield' LIMIT 1),
     env2 AS (SELECT id FROM public.envios WHERE client_location = 'Calle Falsa 123, Palermo, CABA' LIMIT 1)
INSERT INTO public.paradas_reparto (reparto_id, envio_id, orden)
SELECT (SELECT id FROM rep1), (SELECT id FROM env1), 0 WHERE (SELECT id FROM rep1) IS NOT NULL AND (SELECT id FROM env1) IS NOT NULL
UNION ALL
SELECT (SELECT id FROM rep1), (SELECT id FROM env2), 1 WHERE (SELECT id FROM rep1) IS NOT NULL AND (SELECT id FROM env2) IS NOT NULL;
*/
