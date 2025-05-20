
-- Eliminar tablas existentes en orden inverso de dependencia para evitar errores de FK
DROP TABLE IF EXISTS public.paradas_reparto CASCADE;
DROP TABLE IF EXISTS public.envios CASCADE;
DROP TABLE IF EXISTS public.repartos CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.empresas CASCADE;
DROP TABLE IF EXISTS public.repartidores CASCADE;

-- Crear tabla para Empresas
CREATE TABLE public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    nombre TEXT NOT NULL UNIQUE,
    direccion TEXT NULL,
    telefono TEXT NULL,
    email TEXT NULL UNIQUE,
    notas TEXT NULL
);
COMMENT ON TABLE "public"."empresas" IS 'Stores company information.';

-- Crear tabla para Clientes
CREATE TABLE public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    direccion TEXT NOT NULL,
    latitud NUMERIC NULL, -- Nueva columna para latitud
    longitud NUMERIC NULL, -- Nueva columna para longitud
    telefono TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    notas TEXT NULL,
    empresa_id UUID NULL REFERENCES empresas(id) ON DELETE SET NULL
);
COMMENT ON TABLE "public"."clientes" IS 'Stores client information.';
COMMENT ON COLUMN "public"."clientes"."latitud" IS 'Latitude of the client address.';
COMMENT ON COLUMN "public"."clientes"."longitud" IS 'Longitude of the client address.';


-- Crear tabla para Repartidores
CREATE TABLE public.repartidores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    nombre TEXT NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE -- TRUE para activo, FALSE para inactivo
);
COMMENT ON TABLE "public"."repartidores" IS 'Stores delivery personnel information.';

-- Crear tipo ENUM para estado_reparto si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estadorepartoenum') THEN
        CREATE TYPE estadoRepartoEnum AS ENUM ('asignado', 'en_curso', 'completado');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tiporepartoenum') THEN
        CREATE TYPE tipoRepartoEnum AS ENUM ('individual', 'viaje_empresa', 'viaje_empresa_lote');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estadoenvioenum') THEN
        CREATE TYPE estadoEnvioEnum AS ENUM ('pending', 'suggested', 'asignado_a_reparto', 'en_transito', 'entregado', 'cancelado', 'problema_entrega');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'packagesizeenum') THEN
         CREATE TYPE packageSizeEnum AS ENUM ('small', 'medium', 'large');
    END IF;
END
$$;

-- Crear tabla para Repartos
CREATE TABLE public.repartos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    fecha_reparto DATE NOT NULL,
    repartidor_id UUID REFERENCES repartidores(id) ON DELETE SET NULL,
    estado TEXT NOT NULL DEFAULT 'asignado', -- Usar TEXT y validar en la app, o usar estadoRepartoEnum
    tipo_reparto TEXT NOT NULL, -- Usar TEXT y validar en la app, o usar tipoRepartoEnum
    empresa_id UUID NULL REFERENCES empresas(id) ON DELETE SET NULL
);
COMMENT ON TABLE "public"."repartos" IS 'Stores delivery route information.';

-- Crear tabla para Envíos
CREATE TABLE public.envios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    cliente_id UUID NULL REFERENCES clientes(id) ON DELETE SET NULL,
    nombre_cliente_temporal TEXT NULL,
    client_location TEXT NOT NULL,
    latitud NUMERIC NULL,
    longitud NUMERIC NULL,
    package_size TEXT NOT NULL, -- Usar TEXT y validar en la app, o usar packageSizeEnum
    package_weight REAL NOT NULL DEFAULT 0.1,
    status TEXT NOT NULL DEFAULT 'pending', -- Usar TEXT y validar en la app, o usar estadoEnvioEnum
    suggested_options JSONB NULL,
    reasoning TEXT NULL,
    reparto_id UUID NULL REFERENCES repartos(id) ON DELETE SET NULL
);
COMMENT ON TABLE "public"."envios" IS 'Stores shipment information.';
COMMENT ON COLUMN "public"."envios"."latitud" IS 'Latitude of the client_location for mapping.';
COMMENT ON COLUMN "public"."envios"."longitud" IS 'Longitude of the client_location for mapping.';

-- Crear tabla para Paradas de Reparto (tabla de unión entre repartos y envios con orden)
CREATE TABLE public.paradas_reparto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reparto_id UUID NOT NULL REFERENCES repartos(id) ON DELETE CASCADE,
    envio_id UUID NOT NULL REFERENCES envios(id) ON DELETE CASCADE,
    orden INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_reparto_envio UNIQUE (reparto_id, envio_id)
    -- CONSTRAINT uq_reparto_orden UNIQUE (reparto_id, orden) -- Eliminada para facilitar reordenamiento simple
);
COMMENT ON TABLE "public"."paradas_reparto" IS 'Junction table for shipments in a delivery route, defining order.';


-- Insertar datos de ejemplo
INSERT INTO public.empresas (nombre, direccion, telefono, email, notas) VALUES
('Tech Solutions SRL', 'Av. Independencia 1234, Mar del Plata', '+542234567890', 'contacto@techsolutions.com', 'Cliente VIP de tecnología'),
('Nutrisabor', 'San Juan 567, Mar del Plata', '+542236543210', 'pedidos@nutrisabor.com', 'Productos frescos y orgánicos'),
('Libros del Puerto', '12 de Octubre 3210, Mar del Plata', '+542231234567', 'info@librosdelpuerto.com', NULL);

INSERT INTO public.clientes (nombre, apellido, direccion, latitud, longitud, telefono, email, notas, empresa_id) VALUES
('Juan', 'Perez', 'Av. Colón 2345, Mar del Plata', -38.0005, -57.5559, '+542235550101', 'juan.perez@example.com', 'Prefiere entregas por la mañana', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL')),
('Maria', 'Garcia', 'Alberti 876, Mar del Plata', -38.0022, -57.5488, '+542235550102', 'maria.garcia@example.com', 'Llamar antes de entregar', (SELECT id from empresas WHERE nombre = 'Nutrisabor')),
('Carlos', 'Lopez', 'Hipólito Yrigoyen 1500, Mar del Plata', -37.9952, -57.5531, '+542235550103', 'carlos.lopez@example.com', NULL, NULL),
('Ana', 'Martinez', 'Paso 3000, Mar del Plata', -38.0115, -57.5697, '+542235550104', 'ana.martinez@example.com', 'Cuidado con el perro', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL'));

INSERT INTO public.repartidores (nombre, estado) VALUES
('Juan Perez', TRUE),
('Maria Rodriguez', TRUE),
('Carlos Gomez', FALSE),
('Matias', TRUE);

-- Sample envios (some with lat/lng for Mar del Plata)
INSERT INTO public.envios (cliente_id, client_location, latitud, longitud, package_size, package_weight, status) VALUES
((SELECT id from clientes WHERE email = 'juan.perez@example.com'), 'Av. Colón 2345, Mar del Plata', -38.0005, -57.5559, 'medium', 1.5, 'pending'),
((SELECT id from clientes WHERE email = 'maria.garcia@example.com'), 'Alberti 876, Mar del Plata', -38.0022, -57.5488, 'small', 0.5, 'pending'),
((SELECT id from clientes WHERE email = 'carlos.lopez@example.com'), 'Hipólito Yrigoyen 1500, Mar del Plata', -37.9952, -57.5531, 'large', 5.0, 'pending'),
((SELECT id from clientes WHERE email = 'ana.martinez@example.com'), 'Paso 3000, Mar del Plata', -38.0115, -57.5697, 'medium', 2.2, 'en_transito');

-- Activar RLS (Row Level Security) para todas las tablas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repartidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repartos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paradas_reparto ENABLE ROW LEVEL SECURITY;

-- Políticas RLS permisivas para desarrollo (solo para usuarios autenticados)
-- Ajustar estas políticas para producción según los roles y permisos necesarios.
CREATE POLICY "Allow all for authenticated users on empresas" ON public.empresas FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Allow all for authenticated users on clientes" ON public.clientes FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Allow all for authenticated users on repartidores" ON public.repartidores FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Allow all for authenticated users on repartos" ON public.repartos FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Allow all for authenticated users on envios" ON public.envios FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Allow all for authenticated users on paradas_reparto" ON public.paradas_reparto FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
