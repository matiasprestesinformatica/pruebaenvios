
-- Drop tables in reverse order of creation due to foreign keys
DROP TABLE IF EXISTS public.envios;
DROP TABLE IF EXISTS public.clientes;

-- Create clientes table
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  nombre text NOT NULL,
  apellido text NOT NULL,
  direccion text NOT NULL,
  telefono text NOT NULL,
  email text NOT NULL UNIQUE,
  notas text
);

-- Create envios table
CREATE TABLE public.envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL, -- Allow setting to NULL if client is deleted
  nombre_cliente_temporal text,
  client_location text NOT NULL,
  package_size text NOT NULL, -- e.g., 'small', 'medium', 'large'
  package_weight numeric NOT NULL, -- e.g., 2.5 (for 2.5kg)
  status text DEFAULT 'pending' NOT NULL, -- e.g., 'pending', 'suggested', 'confirmed', 'in_transit', 'delivered'
  suggested_options jsonb,
  reasoning text
);

-- Enable Row Level Security (RLS) for the tables if you plan to use it
-- For development, you might start with a permissive policy or disable RLS initially.
-- Example: alter table public.clientes enable row level security;
-- Example: alter table public.envios enable row level security;

-- Create policies (example: allow all for authenticated users, adjust as needed for production)
-- This is a very permissive policy, suitable for local development.
-- Make sure to define appropriate RLS policies for production.
/*
CREATE POLICY "Allow all access for authenticated users on clientes"
ON public.clientes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all access for authenticated users on envios"
ON public.envios
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- If you want to allow public read access (e.g., for anon key)
CREATE POLICY "Allow public read access on clientes"
ON public.clientes
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public read access on envios"
ON public.envios
FOR SELECT
TO anon, authenticated
USING (true);
*/


-- Seed data for clientes table
INSERT INTO
  public.clientes (
    nombre,
    apellido,
    direccion,
    telefono,
    email,
    notas
  )
VALUES
  (
    'Juan',
    'Pérez',
    'Av. Siempreviva 742, Springfield',
    '+54 9 11 1234-5678',
    'juan.perez@example.com',
    'Cliente frecuente, prefiere entregas por la mañana.'
  ),
  (
    'María',
    'García',
    'Calle Falsa 123, Buenos Aires',
    '+54 9 11 8765-4321',
    'maria.garcia@example.com',
    'Nuevo cliente, contactar antes de entregar.'
  );

-- Seed data for envios table
-- Ensure this runs after clientes data is inserted if referencing by subquery
INSERT INTO
  public.envios (
    cliente_id,
    nombre_cliente_temporal,
    client_location,
    package_size,
    package_weight,
    status,
    suggested_options,
    reasoning
  )
VALUES
  (
    (SELECT id from public.clientes WHERE email = 'juan.perez@example.com'),
    NULL,
    'Av. Siempreviva 742, Springfield',
    'medium',
    2.5,
    'pending',
    NULL,
    NULL
  ),
  (
    NULL,
    'Laura Gómez',
    'Otra Calle 456, Córdoba',
    'small',
    0.8,
    'suggested',
    '["Envío Económico", "Envío Rápido Local"]'::jsonb,
    'Cliente nuevo en Córdoba, opciones estándar sugeridas.'
  );

