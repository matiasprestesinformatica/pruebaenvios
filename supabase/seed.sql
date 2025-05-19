
-- Drop existing tables if they exist to prevent errors on re-seed
DROP TABLE IF EXISTS envios;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS repartidores;

-- Create Clientes table
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  direccion TEXT NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  notas TEXT
);

-- Create Envios table
CREATE TABLE envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL, -- Allow null if client is deleted or temporary
  nombre_cliente_temporal TEXT,
  client_location TEXT NOT NULL,
  package_size TEXT NOT NULL, -- e.g., 'small', 'medium', 'large'
  package_weight NUMERIC(10, 2) NOT NULL, -- e.g., 1.5 kg
  status TEXT DEFAULT 'pending' NOT NULL, -- e.g., 'pending', 'suggested', 'confirmed', 'in_transit', 'delivered'
  suggested_options JSONB,
  reasoning TEXT
);

-- Create Repartidores table
CREATE TABLE repartidores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  nombre TEXT NOT NULL,
  estado BOOLEAN DEFAULT TRUE NOT NULL -- true for active, false for inactive
);

-- Enable RLS for all tables (important for security)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE repartidores ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies that allow all authenticated users to perform all operations.
-- WARNING: In a production environment, you should define more granular RLS policies.
CREATE POLICY "Allow all for authenticated users on clientes" ON clientes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users on envios" ON envios
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users on repartidores" ON repartidores
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- Sample data for Clientes
INSERT INTO clientes (nombre, apellido, direccion, telefono, email, notas) VALUES
('Juan', 'Pérez', 'Av. Siempreviva 742, Springfield', '+54 9 11 12345678', 'juan.perez@example.com', 'Cliente frecuente, prefiere entregas por la mañana.'),
('Ana', 'García', 'Calle Falsa 123, Ciudad Gótica', '+54 9 351 8765432', 'ana.garcia@example.com', 'Nuevo cliente, verificar dirección antes de enviar.');

-- Sample data for Envios
INSERT INTO envios (cliente_id, client_location, package_size, package_weight, status) VALUES
((SELECT id from clientes WHERE email = 'juan.perez@example.com'), 'Av. Siempreviva 742, Springfield', 'medium', 2.5, 'pending'),
((SELECT id from clientes WHERE email = 'ana.garcia@example.com'), 'Calle Falsa 123, Ciudad Gótica', 'small', 0.8, 'suggested');

-- Sample data for Repartidores
INSERT INTO repartidores (nombre, estado) VALUES
('Carlos Rodriguez', TRUE),
('Lucia Fernandez', TRUE),
('Miguel Torres', FALSE);
