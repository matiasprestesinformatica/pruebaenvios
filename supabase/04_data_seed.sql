-- Sample Data for Empresas
INSERT INTO "public"."empresas" ("id", "nombre", "direccion", "email", "telefono", "estado", "latitud", "longitud") VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Tech Solutions SRL', 'San Martin 123, Mar del Plata', 'contacto@techsrl.com', '+542235550100', TRUE, -38.0045, -57.5426),
('b2c3d4e5-f6a7-8901-2345-678901bcdef0', 'NUTRISABOR (Viandas)', 'Av. Independencia 456, Mar del Plata', 'ventas@nutrisabor.com', '+542235550200', TRUE, -38.0012, -57.5501),
('c3d4e5f6-a7b8-9012-3456-78901bcdef01', 'Librería El Saber', 'Peatonal San Martín 2500, Mar del Plata', 'info@elsaber.com', '+542235550300', TRUE, -38.0030, -57.5460);

-- Sample Data for Clientes
INSERT INTO "public"."clientes" ("id", "nombre", "apellido", "direccion", "telefono", "email", "empresa_id", "latitud", "longitud", "estado") VALUES
('0f1ab15c-b943-43cd-9ed3-b3f6bf1f8d1a', 'Juan', 'Perez', 'Av. Colón 1234, Mar del Plata', '+542235550101', 'juan.perez@example.com', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL'), -38.0005, -57.5560, TRUE),
('d9b577b8-2118-4c19-9c6d-a39399e55082', 'Maria', 'Garcia', 'Belgrano 5678, Mar del Plata', '+542235550102', 'maria.garcia@example.com', (SELECT id from empresas WHERE nombre = 'NUTRISABOR (Viandas)'), -38.0025, -57.5490, TRUE),
('7a6280f8-c761-41ce-98f3-ce7e23bfa93d', 'Carlos', 'Lopez', 'Moreno 9101, Mar del Plata', NULL, NULL, (SELECT id from empresas WHERE nombre = 'NUTRISABOR (Viandas)'), -37.9910, -57.5830, FALSE),
('7ee95baf-df9a-458b-bab3-28ef838fc360', 'Ana', 'Martinez', 'Luro 3210, Mar del Plata', '+542235550104', 'ana.martinez@example.com', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL'), -38.0048, -57.5430, TRUE),
('89dcdd25-3cdd-4adf-b92f-b638c6efd656', 'Andrea', 'Dentone', '25 de Mayo 3334, Mar del Plata', '+542235550105', 'a.dentone@topservice.net', (SELECT id from empresas WHERE nombre = 'NUTRISABOR (Viandas)'), -38.0022, -57.5450, TRUE),
('5e4a4569-b258-4bef-bdde-d119e9faf93c', 'Andrea', 'Almejun', 'F. Sanchez 2034, Mar del Plata', '+542235550106', 'a_almejun@unique-mail.com', (SELECT id from empresas WHERE nombre = 'NUTRISABOR (Viandas)'), -38.0150, -57.5500, TRUE),
('eab01d86-e550-4ae4-8783-2a179d99f40a', 'Andapez', 'Cliente', 'Av. Vertiz 3250, Mar del Plata', '+542235550107', 'andapez.contact@anotherdomain.co', (SELECT id from empresas WHERE nombre = 'NUTRISABOR (Viandas)'), -38.0380, -57.5690, TRUE);

-- Sample Data for Repartidores
INSERT INTO "public"."repartidores" ("id", "nombre", "estado") VALUES
('0596f87a-a4a8-4f3d-9086-f003eab75af9', 'Matias', TRUE),
('471c54f9-5680-455c-9b41-50a261c58523', 'Juan Perez', TRUE),
('a9a64e0a-70e8-43c7-9d0f-768b09f69118', 'Maria Rodriguez', FALSE);

-- Sample Data for Tipos de Paquete
INSERT INTO "public"."tipos_paquete" ("id", "nombre", "descripcion", "activo") VALUES
('pkg_caja_peq_001', 'Caja Pequeña', 'Cajas de hasta 30x30x30cm', TRUE),
('pkg_caja_med_002', 'Caja Mediana', 'Cajas de hasta 50x50x50cm', TRUE),
('pkg_caja_gra_003', 'Caja Grande', 'Cajas mayores a 50x50x50cm', FALSE),
('pkg_docs_004', 'Documentos', 'Sobres y documentación', TRUE),
('pkg_delivery_005', 'Delivery Comida', 'Pedidos de comida', TRUE),
('pkg_otros_006', 'Otros', 'Paquetes con formas irregulares u otros', TRUE);

-- Sample Data for Tipos de Servicio
INSERT INTO "public"."tipos_servicio" ("id", "nombre", "descripcion", "precio_base", "activo") VALUES
('svc_express_001', 'Envío Express', 'Entrega en menos de 2 horas', 1500.00, TRUE),
('svc_lowcost_002', 'Envío LowCost', 'Entrega en 24-48 horas', 800.00, TRUE),
('svc_motofija_003', 'Moto Fija Mensual', 'Servicio de moto fija por mes', 120000.00, TRUE),
('svc_emprend_004', 'Plan Emprendedores', 'Tarifas especiales para emprendedores', NULL, TRUE),
('svc_flex_005', 'Envíos Flex', 'Servicio flexible adaptable', 1000.00, FALSE);

-- Sample Data for Repartos
INSERT INTO "public"."repartos" ("id", "fecha_reparto", "repartidor_id", "estado", "tipo_reparto", "empresa_id") VALUES
('df1e184e-71e6-4f00-a78d-b6e93034cd35', '2025-05-20', (SELECT id from repartidores WHERE nombre = 'Matias'), 'asignado', 'viaje_empresa', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL')),
('caad29f1-cf73-42d4-b3d2-658a7814f1c4', '2025-05-21', (SELECT id from repartidores WHERE nombre = 'Juan Perez'), 'en_curso', 'individual', NULL),
('a7a9309f-6bbf-4029-9f61-4d0a3724b908', '2025-05-22', (SELECT id from repartidores WHERE nombre = 'Maria Rodriguez'), 'completado', 'viaje_empresa_lote', (SELECT id from empresas WHERE nombre = 'NUTRISABOR (Viandas)'));

-- Sample Data for Envios
INSERT INTO "public"."envios" (
    "cliente_id", "client_location", "latitud", "longitud", "tipo_paquete_id", "package_weight", "status", "reparto_id", "tipo_servicio_id", "precio_servicio_final"
) VALUES
((SELECT id from clientes WHERE email = 'juan.perez@example.com'), 'Av. Colón 1234, Mar del Plata', -38.0005, -57.5560, (SELECT id from tipos_paquete WHERE nombre = 'Caja Mediana'), 1.5, 'asignado_a_reparto', 'df1e184e-71e6-4f00-a78d-b6e93034cd35', (SELECT id from tipos_servicio WHERE nombre = 'Envío Express'), 1500.00),
((SELECT id from clientes WHERE email = 'maria.garcia@example.com'), 'Belgrano 5678, Mar del Plata', -38.0025, -57.5490, (SELECT id from tipos_paquete WHERE nombre = 'Caja Pequeña'), 0.5, 'en_transito', 'caad29f1-cf73-42d4-b3d2-658a7814f1c4', (SELECT id from tipos_servicio WHERE nombre = 'Envío LowCost'), 800.00),
((SELECT id from clientes WHERE email = 'carlos.lopez@example.com'), 'Moreno 9101, Mar del Plata', -37.9910, -57.5830, (SELECT id from tipos_paquete WHERE nombre = 'Caja Grande'), 5, 'entregado', 'a7a9309f-6bbf-4029-9f61-4d0a3724b908', NULL, 2500.00),
((SELECT id from clientes WHERE email = 'ana.martinez@example.com'), 'Luro 3210, Mar del Plata', -38.0048, -57.5430, (SELECT id from tipos_paquete WHERE nombre = 'Documentos'), 2.2, 'asignado_a_reparto', 'df1e184e-71e6-4f00-a78d-b6e93034cd35', (SELECT id from tipos_servicio WHERE nombre = 'Envío Express'), 1500.00),
((SELECT id from clientes WHERE email = 'a.dentone@topservice.net'), 'Colon 6130, B7600 Mar del Plata', -38.0022, -57.5450, (SELECT id from tipos_paquete WHERE nombre = 'Caja Mediana'), 1, 'asignado_a_reparto', 'a7a9309f-6bbf-4029-9f61-4d0a3724b908', NULL, NULL),
((SELECT id from clientes WHERE email = 'a_almejun@unique-mail.com'), 'Irala 6249, B7600 Mar del Plata', -38.0150, -57.5500, (SELECT id from tipos_paquete WHERE nombre = 'Delivery Comida'), 1, 'pending', NULL, (SELECT id from tipos_servicio WHERE nombre = 'Envío Express'), 1500.00);

-- Sample Data for Paradas_Reparto
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'df1e184e-71e6-4f00-a78d-b6e93034cd35', e.id, 'entrega_cliente', 0 FROM envios e WHERE e.cliente_id = (SELECT id from clientes WHERE email = 'juan.perez@example.com') AND e.reparto_id = 'df1e184e-71e6-4f00-a78d-b6e93034cd35' LIMIT 1;
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'df1e184e-71e6-4f00-a78d-b6e93034cd35', e.id, 'entrega_cliente', 1 FROM envios e WHERE e.cliente_id = (SELECT id from clientes WHERE email = 'ana.martinez@example.com') AND e.reparto_id = 'df1e184e-71e6-4f00-a78d-b6e93034cd35' LIMIT 1;

INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'caad29f1-cf73-42d4-b3d2-658a7814f1c4', e.id, 'entrega_cliente', 0 FROM envios e WHERE e.cliente_id = (SELECT id from clientes WHERE email = 'maria.garcia@example.com') AND e.reparto_id = 'caad29f1-cf73-42d4-b3d2-658a7814f1c4' LIMIT 1;

INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden") VALUES
('a7a9309f-6bbf-4029-9f61-4d0a3724b908', NULL, 'retiro_empresa', 0);
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'a7a9309f-6bbf-4029-9f61-4d0a3724b908', e.id, 'entrega_cliente', 1 FROM envios e WHERE e.cliente_id = (SELECT id from clientes WHERE email = 'carlos.lopez@example.com') AND e.reparto_id = 'a7a9309f-6bbf-4029-9f61-4d0a3724b908' LIMIT 1;
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'a7a9309f-6bbf-4029-9f61-4d0a3724b908', e.id, 'entrega_cliente', 2 FROM envios e WHERE e.cliente_id = (SELECT id from clientes WHERE email = 'a.dentone@topservice.net') AND e.reparto_id = 'a7a9309f-6bbf-4029-9f61-4d0a3724b908' LIMIT 1;

-- Sample Data for Tarifas Distancia Calculadora
-- LowCost - Vigente desde 2024-01-01
INSERT INTO "public"."tarifas_distancia_calculadora" ("tipo_calculadora", "distancia_hasta_km", "precio", "fecha_vigencia_desde") VALUES
('lowcost', 2.9, 800.00, '2024-01-01'),
('lowcost', 4.9, 1200.00, '2024-01-01'),
('lowcost', 8.9, 1800.00, '2024-01-01'),
('lowcost', 13.0, 2500.00, '2024-01-01'),
('lowcost', 17.0, 3200.00, '2024-01-01');

-- LowCost - Vigente desde 2025-06-01 (ejemplo de precios futuros)
INSERT INTO "public"."tarifas_distancia_calculadora" ("tipo_calculadora", "distancia_hasta_km", "precio", "fecha_vigencia_desde") VALUES
('lowcost', 2.9, 900.00, '2025-06-01'),
('lowcost', 4.9, 1300.00, '2025-06-01'),
('lowcost', 8.9, 2000.00, '2025-06-01');

-- Express - Vigente desde 2024-01-01
INSERT INTO "public"."tarifas_distancia_calculadora" ("tipo_calculadora", "distancia_hasta_km", "precio", "fecha_vigencia_desde") VALUES
('express', 2.0, 1500.00, '2024-01-01'),
('express', 5.0, 2200.00, '2024-01-01'),
('express', 10.0, 3500.00, '2024-01-01');
-- Para Express, si excede 10km, se calcula un adicional por km (lógica en el frontend/componente)
