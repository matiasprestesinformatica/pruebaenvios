-- Sample Data for Empresas
INSERT INTO "public"."empresas" ("id", "nombre", "direccion", "email", "telefono", "estado", "latitud", "longitud") VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Tech Solutions SRL', 'San Martin 123, Mar del Plata', 'contacto@techsrl.com', '+542235550100', TRUE, -38.0045, -57.5426),
('b2c3d4e5-f6a7-8901-2345-678901bcdef0', 'NUTRISABOR (Viandas)', 'Av. Independencia 456, Mar del Plata', 'ventas@nutrisabor.com', '+542235550200', TRUE, -38.0012, -57.5501);

-- Sample Data for Clientes
INSERT INTO "public"."clientes" ("id", "nombre", "apellido", "direccion", "telefono", "email", "empresa_id", "latitud", "longitud", "estado") VALUES
('0f1ab15c-b943-43cd-9ed3-b3f6bf1f8d1a', 'Juan', 'Perez', 'Av. Colón 1234, Mar del Plata', '+542235550101', 'juan.perez@example.com', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL'), -38.0005, -57.5560, TRUE),
('d9b577b8-2118-4c19-9c6d-a39399e55082', 'Maria', 'Garcia', 'Belgrano 5678, Mar del Plata', '+542235550102', 'maria.garcia@example.com', (SELECT id from empresas WHERE nombre = 'NUTRISABOR (Viandas)'), -38.0025, -57.5490, TRUE),
('7a6280f8-c761-41ce-98f3-ce7e23bfa93d', 'Carlos', 'Lopez', 'Moreno 9101, Mar del Plata', NULL, NULL, (SELECT id from empresas WHERE nombre = 'NUTRISABOR (Viandas)'), -37.9910, -57.5830, FALSE),
('7ee95baf-df9a-458b-bab3-28ef838fc360', 'Ana', 'Martinez', 'Luro 3210, Mar del Plata', '+542235550104', 'ana.martinez@example.com', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL'), -38.0048, -57.5430, TRUE),
('89dcdd25-3cdd-4adf-b92f-b638c6efd656', 'Andrea', 'dentone', '25 de Mayo 3334, B7600 Mar del Plata, Provincia de Buenos Aires, Argentina', '+542235550105', 'a.dentone@topservice.net', (SELECT id from empresas WHERE nombre = 'NUTRISABOR (Viandas)'), -38.0022, -57.5450, TRUE),
('5e4a4569-b258-4bef-bdde-d119e9faf93c', 'Andrea', 'Almejun', 'F. Sanchez 2034, B7600 Mar del Plata, Provincia de Buenos Aires, Argentina', '+542235550106', 'a_almejun@unique-mail.com', (SELECT id from empresas WHERE nombre = 'NUTRISABOR (Viandas)'), -38.0150, -57.5500, TRUE),
('eab01d86-e550-4ae4-8783-2a179d99f40a', 'Andapez', 'Andapez', 'Av. Vertiz 3250, B7603GGT Mar del Plata, Provincia de Buenos Aires, Argentina ', '+542235550107', 'andapez.contact@anotherdomain.co', (SELECT id from empresas WHERE nombre = 'NUTRISABOR (Viandas)'), -38.0380, -57.5690, TRUE);

-- Sample Data for Repartidores
INSERT INTO "public"."repartidores" ("id", "nombre", "estado") VALUES
('0596f87a-a4a8-4f3d-9086-f003eab75af9', 'Matias', TRUE),
('471c54f9-5680-455c-9b41-50a261c58523', 'Juan Perez', TRUE),
('a9a64e0a-70e8-43c7-9d0f-768b09f69118', 'Maria Rodriguez', FALSE);

-- Sample Data for Tipos de Paquete
INSERT INTO "public"."tipos_paquete" ("nombre", "descripcion", "activo") VALUES
('Caja Pequeña', 'Cajas de hasta 30x30x30cm', TRUE),
('Caja Mediana', 'Cajas de hasta 50x50x50cm', TRUE),
('Caja Grande', 'Cajas mayores a 50x50x50cm', FALSE),
('Documentos', 'Sobres y documentación', TRUE),
('Delivery Comida', 'Pedidos de comida', TRUE),
('Otros', 'Paquetes con formas irregulares u otros', TRUE);

-- Sample Data for Tipos de Servicio
INSERT INTO "public"."tipos_servicio" ("nombre", "descripcion", "precio_base", "activo") VALUES
('Envío Express', 'Entrega en menos de 2 horas', 1500.00, TRUE),
('Envío LowCost', 'Entrega en 24-48 horas', 800.00, TRUE),
('Moto Fija Mensual', 'Servicio de moto fija por mes', 120000.00, TRUE),
('Plan Emprendedores', 'Tarifas especiales para emprendedores', NULL, TRUE),
('Envíos Flex', 'Servicio flexible adaptable', 1000.00, FALSE);

-- Sample Data for Repartos
INSERT INTO "public"."repartos" ("id", "fecha_reparto", "repartidor_id", "estado", "tipo_reparto", "empresa_id") VALUES
('df1e184e-71e6-4f00-a78d-b6e93034cd35', '2025-05-20', (SELECT id from repartidores WHERE nombre = 'Matias'), 'asignado', 'viaje_empresa', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL')),
('caad29f1-cf73-42d4-b3d2-658a7814f1c4', '2025-05-21', (SELECT id from repartidores WHERE nombre = 'Juan Perez'), 'en_curso', 'individual', NULL),
('a7a9309f-6bbf-4029-9f61-4d0a3724b908', '2025-05-22', (SELECT id from repartidores WHERE nombre = 'Maria Rodriguez'), 'completado', 'viaje_empresa_lote', (SELECT id from empresas WHERE nombre = 'NUTRISABOR (Viandas)'));

-- Sample Data for Envios (linking some to repartos)
INSERT INTO "public"."envios" ("id", "cliente_id", "client_location", "package_size", "package_weight", "status", "latitud", "longitud", "reparto_id") VALUES
('31326385-0208-4c49-90ac-12a76d61c899', (SELECT id from clientes WHERE email = 'juan.perez@example.com'), 'Av. Colón 1234, Mar del Plata', 'medium', 1.5, 'asignado_a_reparto', -38.0005, -57.5560, 'df1e184e-71e6-4f00-a78d-b6e93034cd35'),
('48379f7b-11a4-4476-8025-4f3c21b9e19d', (SELECT id from clientes WHERE email = 'maria.garcia@example.com'), 'Belgrano 5678, Mar del Plata', 'small', 0.5, 'en_transito', -38.0025, -57.5490, 'caad29f1-cf73-42d4-b3d2-658a7814f1c4'),
('2e47d785-9105-4759-b4b3-f6728b55796f', (SELECT id from clientes WHERE email = 'carlos.lopez@example.com'), 'Moreno 9101, Mar del Plata', 'large', 5, 'entregado', -37.9910, -57.5830, 'a7a9309f-6bbf-4029-9f61-4d0a3724b908'),
('609f63bb-10a3-47be-ae08-066b5e0768f8', (SELECT id from clientes WHERE email = 'ana.martinez@example.com'), 'Luro 3210, Mar del Plata', 'medium', 2.2, 'asignado_a_reparto', -38.0048, -57.5430, 'df1e184e-71e6-4f00-a78d-b6e93034cd35'),
('012e9bf2-3a29-4718-98a7-89b191518aed', (SELECT id from clientes WHERE email = 'a.dentone@topservice.net'), 'Colon 6130, B7600 Mar del Plata', 'medium', 1, 'asignado_a_reparto', -38.0022, -57.5450, 'a7a9309f-6bbf-4029-9f61-4d0a3724b908'),
('05723ba1-945c-4c35-9f00-e68184264c2b', (SELECT id from clientes WHERE email = 'a_almejun@unique-mail.com'), 'Irala 6249, B7600 Mar del Plata', 'medium', 1, 'pending', -38.0150, -57.5500, NULL);

-- Sample Data for Paradas_Reparto
-- Reparto 1 (Tech Solutions, individual items selected)
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden") VALUES
('df1e184e-71e6-4f00-a78d-b6e93034cd35', '31326385-0208-4c49-90ac-12a76d61c899', 'entrega_cliente', 0),
('df1e184e-71e6-4f00-a78d-b6e93034cd35', '609f63bb-10a3-47be-ae08-066b5e0768f8', 'entrega_cliente', 1);

-- Reparto 2 (Individual)
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden") VALUES
('caad29f1-cf73-42d4-b3d2-658a7814f1c4', '48379f7b-11a4-4476-8025-4f3c21b9e19d', 'entrega_cliente', 0);

-- Reparto 3 (Nutrisabor Lote)
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden") VALUES
('a7a9309f-6bbf-4029-9f61-4d0a3724b908', NULL, 'retiro_empresa', 0), -- Parada de retiro
('a7a9309f-6bbf-4029-9f61-4d0a3724b908', '2e47d785-9105-4759-b4b3-f6728b55796f', 'entrega_cliente', 1),
('a7a9309f-6bbf-4029-9f61-4d0a3724b908', '012e9bf2-3a29-4718-98a7-89b191518aed', 'entrega_cliente', 2);