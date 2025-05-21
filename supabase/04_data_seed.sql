-- supabase/04_data_seed.sql
-- Inserción de datos de ejemplo.

-- Sample Empresas
INSERT INTO "public"."empresas" ("id", "nombre", "direccion", "email", "telefono", "latitud", "longitud", "estado") VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Tech Solutions SRL', 'San Martin 123, Mar del Plata', 'contacto@techsrl.com', '+542235550100', -38.0045, -57.5572, TRUE),
('b2c3d4e5-f6a7-8901-2345-678901bcdef0', 'Nutrisabor', 'Av. Independencia 456, Mar del Plata', 'ventas@nutrisabor.com', '+542235550200', -38.0030, -57.5480, TRUE),
('c3d4e5f6-a7b8-9012-3456-78901bcdef01', 'Librería El Saber', 'Rivadavia 3000, Mar del Plata', 'info@elsaber.com', '+542235550300', -38.0020, -57.5500, FALSE);

-- Sample Clientes
INSERT INTO "public"."clientes" ("id", "nombre", "apellido", "direccion", "telefono", "email", "empresa_id", "latitud", "longitud", "estado") VALUES
('0f1ab15c-b943-43cd-9ed3-b3f6bf1f8d1a', 'Juan', 'Perez', 'Av. Colón 1234, Mar del Plata', '+542235550101', 'juan.perez@example.com', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL'), -38.0005, -57.5560, TRUE),
('d9b577b8-2118-4c19-9c6d-a39399e55082', 'Maria', 'Garcia', 'Belgrano 5678, Mar del Plata', '+542235550102', 'maria.garcia@example.com', (SELECT id from empresas WHERE nombre = 'Nutrisabor'), -38.0025, -57.5490, TRUE),
('7a6280f8-c761-41ce-98f3-ce7e23bfa93d', 'Carlos', 'Lopez', 'Moreno 9101, Mar del Plata', NULL, NULL, (SELECT id from empresas WHERE nombre = 'Nutrisabor'), -37.9910, -57.5830, FALSE),
('7ee95baf-df9a-458b-bab3-28ef838fc360', 'Ana', 'Martinez', 'Luro 3210, Mar del Plata', '+542235550104', 'ana.martinez@example.com', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL'), -38.0048, -57.5430, TRUE),
('89dcdd25-3cdd-4adf-b92f-b638c6efd656', 'Andrea', 'Dentone', '25 de Mayo 3334, B7600 Mar del Plata, Provincia de Buenos Aires, Argentina', '+542235550105', 'a.dentone@topservice.net', (SELECT id from empresas WHERE nombre = 'Nutrisabor'), -38.0022, -57.5450, TRUE),
('5e4a4569-b258-4bef-bdde-d119e9faf93c', 'Andrea', 'Almejun', 'F. Sanchez 2034, B7600 Mar del Plata, Provincia de Buenos Aires, Argentina', '+542235550106', 'a_almejun@unique-mail.com', (SELECT id from empresas WHERE nombre = 'Nutrisabor'), -38.0150, -57.5500, TRUE),
('eab01d86-e550-4ae4-8783-2a179d99f40a', 'Andapez', 'Andapez', 'Av. Vertiz 3250, B7603GGT Mar del Plata, Provincia de Buenos Aires, Argentina ', '+542235550107', 'andapez.contact@anotherdomain.co', (SELECT id from empresas WHERE nombre = 'Nutrisabor'), -38.0380, -57.5690, TRUE),
('ce3e6d0a-0736-4325-a47e-91d102da90fd', 'Cliente', 'Sin Empresa', 'Formosa 150, Mar del Plata', '+542235550108', 'sinempresa@example.com', NULL, -37.9950, -57.5400, TRUE);


-- Sample Repartidores
INSERT INTO "public"."repartidores" ("id", "nombre", "estado") VALUES
('0596f87a-a4a8-4f3d-9086-f003eab75af9', 'Matias', TRUE),
('471c54f9-5680-455c-9b41-50a261c58523', 'Juan Perez Repartidor', TRUE),
('a9a64e0a-70e8-43c7-9d0f-768b09f69118', 'Maria Rodriguez Repartidora', FALSE);

-- Sample Tipos de Paquete
INSERT INTO "public"."tipos_paquete" ("nombre", "descripcion", "activo") VALUES
('Caja Pequeña', 'Cajas de hasta 30x30x30cm', TRUE),
('Documentos', 'Sobres y documentos importantes', TRUE),
('Delivery Comida', 'Pedidos de comida caliente o fría', TRUE),
('Caja Mediana', 'Cajas de hasta 50x50x50cm', TRUE),
('Caja Grande', 'Cajas de más de 50x50x50cm', FALSE),
('Otros', 'Paquetes con formas o requerimientos especiales', TRUE);

-- Sample Tipos de Servicio
INSERT INTO "public"."tipos_servicio" ("nombre", "descripcion", "precio_base", "activo") VALUES
('Envío Express', 'Entrega en menos de 2 horas', 1500.00, TRUE),
('Envío LowCost', 'Entrega en 24-48 horas, más económico', 800.00, TRUE),
('Moto Fija', 'Servicio de mensajería por hora o día', 5000.00, TRUE),
('Plan Emprendedores', 'Tarifas especiales para envíos recurrentes de emprendedores', NULL, TRUE),
('Envío Programado', 'Entrega en una franja horaria específica', 1200.00, FALSE),
('Envío Nocturno', 'Entregas fuera del horario comercial', 2500.00, TRUE);

-- Sample Envios (algunos con cliente_id, otros temporales, algunos con coordenadas)
INSERT INTO "public"."envios" ("cliente_id", "nombre_cliente_temporal", "client_location", "package_size", "package_weight", "status", "latitud", "longitud") VALUES
((SELECT id from clientes WHERE email = 'juan.perez@example.com'), NULL, 'Av. Colón 1234, Mar del Plata', 'medium', 1.5, 'pending', -38.0005, -57.5560),
((SELECT id from clientes WHERE email = 'maria.garcia@example.com'), NULL, 'Belgrano 5678, Mar del Plata', 'small', 0.5, 'pending', -38.0025, -57.5490),
(NULL, 'Laura Gomez (Temporal)', 'Santiago del Estero 2020, Mar del Plata', 'small', 0.3, 'pending', -38.0015, -57.5520),
((SELECT id from clientes WHERE email = 'carlos.lopez@example.com'), NULL, 'Moreno 9101, Mar del Plata', 'large', 5, 'entregado', -37.9910, -57.5830),
((SELECT id from clientes WHERE email = 'ana.martinez@example.com'), NULL, 'Luro 3210, Mar del Plata', 'medium', 2.2, 'en_transito', -38.0048, -57.5430),
((SELECT id from clientes WHERE email = 'a.dentone@topservice.net'), NULL, '25 de Mayo 3334, B7600 Mar del Plata, Provincia de Buenos Aires, Argentina', 'medium', 2.5, 'pending', -38.0022, -57.5450);

-- Sample Repartos
-- Reparto 1: Viaje por Empresa (Tech Solutions SRL), asignado a Matias
INSERT INTO "public"."repartos" ("id", "fecha_reparto", "repartidor_id", "estado", "tipo_reparto", "empresa_id") VALUES
('df1e184e-71e6-4f00-a78d-b6e93034cd35', '2025-05-20', (SELECT id from repartidores WHERE nombre = 'Matias'), 'asignado', 'viaje_empresa', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL'));

-- Paradas para Reparto 1
-- Parada 0: Retiro en Empresa Tech Solutions SRL
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden") VALUES
('df1e184e-71e6-4f00-a78d-b6e93034cd35', NULL, 'retiro_empresa', 0);
-- Parada 1: Entrega a Juan Perez
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'df1e184e-71e6-4f00-a78d-b6e93034cd35', e.id, 'entrega_cliente', 1
FROM envios e JOIN clientes c ON e.cliente_id = c.id WHERE c.email = 'juan.perez@example.com' AND e.client_location = 'Av. Colón 1234, Mar del Plata';
-- Parada 2: Entrega a Ana Martinez
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'df1e184e-71e6-4f00-a78d-b6e93034cd35', e.id, 'entrega_cliente', 2
FROM envios e JOIN clientes c ON e.cliente_id = c.id WHERE c.email = 'ana.martinez@example.com';

UPDATE envios SET reparto_id = 'df1e184e-71e6-4f00-a78d-b6e93034cd35', status = 'asignado_a_reparto' WHERE cliente_id IN (
    (SELECT id from clientes WHERE email = 'juan.perez@example.com'),
    (SELECT id from clientes WHERE email = 'ana.martinez@example.com')
) AND reparto_id IS NULL; -- Solo actualiza si no tienen reparto asignado, para evitar conflictos con el seed

-- Reparto 2: Individual, en curso, asignado a Juan Perez Repartidor
INSERT INTO "public"."repartos" ("id", "fecha_reparto", "repartidor_id", "estado", "tipo_reparto", "empresa_id") VALUES
('caad29f1-cf73-42d4-b3d2-658a7814f1c4', '2025-05-21', (SELECT id from repartidores WHERE nombre = 'Juan Perez Repartidor'), 'en_curso', 'individual', NULL);
-- Parada para Reparto 2 (Maria Garcia)
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'caad29f1-cf73-42d4-b3d2-658a7814f1c4', e.id, 'entrega_cliente', 0
FROM envios e JOIN clientes c ON e.cliente_id = c.id WHERE c.email = 'maria.garcia@example.com';
UPDATE envios SET reparto_id = 'caad29f1-cf73-42d4-b3d2-658a7814f1c4', status = 'en_transito' WHERE cliente_id = (SELECT id from clientes WHERE email = 'maria.garcia@example.com') AND reparto_id IS NULL;

-- Reparto 3: Viaje por Empresa Lote (Nutrisabor), completado, asignado a Maria Rodriguez Repartidora
INSERT INTO "public"."repartos" ("id", "fecha_reparto", "repartidor_id", "estado", "tipo_reparto", "empresa_id") VALUES
('a7a9309f-6bbf-4029-9f61-4d0a3724b908', '2025-05-22', (SELECT id from repartidores WHERE nombre = 'Maria Rodriguez Repartidora'), 'completado', 'viaje_empresa_lote', (SELECT id from empresas WHERE nombre = 'Nutrisabor'));
-- Parada 0: Retiro en Empresa Nutrisabor
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden") VALUES
('a7a9309f-6bbf-4029-9f61-4d0a3724b908', NULL, 'retiro_empresa', 0);
-- Parada 1: Entrega a Carlos Lopez (ya tenía un envío 'entregado', se vincula)
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'a7a9309f-6bbf-4029-9f61-4d0a3724b908', e.id, 'entrega_cliente', 1
FROM envios e JOIN clientes c ON e.cliente_id = c.id WHERE c.email = 'carlos.lopez@example.com';
UPDATE envios SET reparto_id = 'a7a9309f-6bbf-4029-9f61-4d0a3724b908', status = 'entregado' WHERE cliente_id = (SELECT id from clientes WHERE email = 'carlos.lopez@example.com'); -- Se asume que ya estaba entregado, solo se vincula

-- Parada 2: Entrega a Andrea Dentone (tenía un envío pendiente, se crea parada y se actualiza envío)
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'a7a9309f-6bbf-4029-9f61-4d0a3724b908', e.id, 'entrega_cliente', 2
FROM envios e JOIN clientes c ON e.cliente_id = c.id WHERE c.email = 'a.dentone@topservice.net';
UPDATE envios SET reparto_id = 'a7a9309f-6bbf-4029-9f61-4d0a3724b908', status = 'entregado' WHERE cliente_id = (SELECT id from clientes WHERE email = 'a.dentone@topservice.net') AND reparto_id IS NULL;

-- Otros envíos de ejemplo que podrían estar pendientes o asignados a otros repartos (ajustar según sea necesario)
INSERT INTO "public"."envios" ("cliente_id", "client_location", "package_size", "package_weight", "status", "latitud", "longitud") VALUES
((SELECT id from clientes WHERE email = 'andapez.contact@anotherdomain.co'), 'Av. Vertiz 3250, Mar del Plata', 'small', 0.7, 'pending', -38.0380, -57.5690),
((SELECT id from clientes WHERE email = 'sinempresa@example.com'), 'Formosa 150, Mar del Plata', 'medium', 1.1, 'pending', -37.9950, -57.5400);
