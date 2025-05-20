
-- Drop tables in reverse order of creation due to foreign key constraints
DROP TABLE IF EXISTS public.envios CASCADE;
DROP TABLE IF EXISTS public.repartos CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.empresas CASCADE;
DROP TABLE IF EXISTS public.repartidores CASCADE;

-- Drop ENUM types if they were created previously (and if you intend to use TEXT instead)
-- Or, define them if you intend to use actual ENUM types in the database.
-- For now, assuming TEXT as per previous setup, Zod will handle enum validation.
-- If you were to use DB enums, you'd do:
-- DROP TYPE IF EXISTS estado_reparto_enum;
-- CREATE TYPE estado_reparto_enum AS ENUM ('asignado', 'en_curso', 'completado');
-- DROP TYPE IF EXISTS tipo_reparto_enum;
-- CREATE TYPE tipo_reparto_enum AS ENUM ('individual', 'viaje_empresa', 'viaje_empresa_lote');
-- DROP TYPE IF EXISTS estado_envio_enum;
-- CREATE TYPE estado_envio_enum AS ENUM ('pending', 'suggested', 'asignado_a_reparto', 'en_transito', 'entregado', 'cancelado', 'problema_entrega');
-- DROP TYPE IF EXISTS package_size_enum;
-- CREATE TYPE package_size_enum AS ENUM ('small', 'medium', 'large');

-- Empresas Table
CREATE TABLE public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    nombre TEXT NOT NULL,
    direccion TEXT NULL,
    telefono TEXT NULL,
    email TEXT NULL,
    notas TEXT NULL
);
COMMENT ON TABLE "public"."empresas" IS 'Stores company information.';
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON public.empresas FOR ALL TO authenticated USING (true) WITH CHECK (true);

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
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Repartidores Table
CREATE TABLE public.repartidores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    nombre TEXT NOT NULL,
    estado BOOLEAN DEFAULT true NOT NULL
);
COMMENT ON TABLE "public"."repartidores" IS 'Stores delivery personnel information.';
ALTER TABLE public.repartidores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON public.repartidores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Repartos Table
CREATE TABLE public.repartos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    fecha_reparto DATE NOT NULL,
    repartidor_id UUID REFERENCES public.repartidores(id) ON DELETE SET NULL,
    estado TEXT NOT NULL DEFAULT 'asignado', -- Use TEXT, Zod validates: 'asignado', 'en_curso', 'completado'
    tipo_reparto TEXT NOT NULL, -- Use TEXT, Zod validates: 'individual', 'viaje_empresa', 'viaje_empresa_lote'
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL
);
COMMENT ON TABLE "public"."repartos" IS 'Stores delivery route information.';
ALTER TABLE public.repartos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON public.repartos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Envios Table
CREATE TABLE public.envios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    nombre_cliente_temporal TEXT NULL,
    client_location TEXT NOT NULL,
    package_size TEXT NOT NULL, -- Use TEXT, Zod validates: 'small', 'medium', 'large'
    package_weight REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- Use TEXT, Zod validates
    suggested_options JSONB NULL,
    reasoning TEXT NULL,
    reparto_id UUID REFERENCES public.repartos(id) ON DELETE SET NULL
);
COMMENT ON TABLE "public"."envios" IS 'Stores individual shipment details.';
ALTER TABLE public.envios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON public.envios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sample Data
INSERT INTO public.empresas (nombre, direccion, telefono, email, notas) VALUES
('Tech Solutions SRL', 'Av. Corrientes 1234, CABA', '+541145678901', 'contacto@techsolutions.com', 'Cliente VIP, contactar a Juan Pérez.'),
('Gourmet Foods Inc.', 'Calle Falsa 567, Rosario', '+543414567890', 'pedidos@gourmetfoods.com', 'Entregas por la mañana preferentemente.');

INSERT INTO public.clientes (nombre, apellido, direccion, telefono, email, empresa_id, notas) VALUES
('Laura', 'García', 'Av. Santa Fe 2000, CABA', '+541133445566', 'laura.garcia@example.com', (SELECT id from public.empresas WHERE nombre = 'Tech Solutions SRL'), 'Prefiere entregas por la tarde.'),
('Carlos', 'Rodríguez', 'Bv. Oroño 300, Rosario', '+5434166778899', 'carlos.rodriguez@example.com', (SELECT id from public.empresas WHERE nombre = 'Gourmet Foods Inc.'), NULL),
('Ana', 'Martínez', 'Calle Soler 4500, Palermo, CABA', '+541112345678', 'ana.martinez@example.com', NULL, 'Dejar en portería si no está.');

INSERT INTO public.repartidores (nombre, estado) VALUES
('Juan Dominguez', true),
('Maria Lopez', true),
('Pedro Gonzalez', false);

-- Sample Repartos (ensure these IDs match if you have specific FK needs for Envios)
INSERT INTO public.repartos (fecha_reparto, repartidor_id, estado, tipo_reparto, empresa_id) VALUES
('2025-05-20', (SELECT id from public.repartidores WHERE nombre = 'Juan Dominguez'), 'asignado', 'viaje_empresa', (SELECT id from public.empresas WHERE nombre = 'Tech Solutions SRL')),
('2025-05-21', (SELECT id from public.repartidores WHERE nombre = 'Maria Lopez'), 'en_curso', 'individual', NULL);

-- Sample Envios (ensure cliente_id and reparto_id exist if FKs are hardcoded)
INSERT INTO public.envios (cliente_id, client_location, package_size, package_weight, status, reparto_id) VALUES
((SELECT id from public.clientes WHERE email = 'laura.garcia@example.com'), 'Av. Santa Fe 2000, CABA', 'medium', 2.5, 'asignado_a_reparto', (SELECT id from public.repartos WHERE fecha_reparto = '2025-05-20' AND repartidor_id = (SELECT id from public.repartidores WHERE nombre = 'Juan Dominguez'))),
((SELECT id from public.clientes WHERE email = 'carlos.rodriguez@example.com'), 'Bv. Oroño 300, Rosario', 'small', 0.8, 'pending', NULL),
((SELECT id from public.clientes WHERE email = 'ana.martinez@example.com'), 'Calle Soler 4500, Palermo, CABA', 'large', 10.2, 'asignado_a_reparto', (SELECT id from public.repartos WHERE fecha_reparto = '2025-05-21' AND repartidor_id = (SELECT id from public.repartidores WHERE nombre = 'Maria Lopez')));

INSERT INTO public.envios (nombre_cliente_temporal, client_location, package_size, package_weight, status) VALUES
('Destinatario Rápido', 'Urgente 123, CABA', 'small', 0.3, 'pending');

