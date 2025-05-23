
-- Sample Data for Tipos de Servicio
-- Asegúrate de que los IDs (si los especificas manualmente) no choquen si la tabla ya tiene datos.
-- Si los IDs son generados por defecto (gen_random_uuid()), no necesitas especificarlos.
DELETE FROM "public"."tipos_servicio"; -- Limpia la tabla antes de insertar para evitar conflictos de UNIQUE constraint si se re-ejecuta
INSERT INTO "public"."tipos_servicio" ("nombre", "descripcion", "precio_base", "activo") VALUES
('Envíos Express', 'Entrega urgente en la ciudad.', NULL, TRUE),
('Envíos LowCost', 'Entrega económica programada.', NULL, TRUE),
('Moto Fija', 'Servicio de mensajería con moto asignada para cliente.', 50000.00, TRUE),
('Plan Emprendedores', 'Tarifas especiales y soluciones para emprendedores.', NULL, TRUE),
('Envíos Flex', 'Servicio adaptable a necesidades específicas.', NULL, TRUE);

-- Sample Data for Tipos de Paquete
DELETE FROM "public"."tipos_paquete";
INSERT INTO "public"."tipos_paquete" ("nombre", "descripcion", "activo") VALUES
('Caja Pequeña', 'Paquetes pequeños, ej: hasta 30x30x15cm, <2kg', TRUE),
('Caja Mediana', 'Paquetes medianos, ej: hasta 50x40x30cm, <5kg', TRUE),
('Caja Grande', 'Paquetes grandes, ej: >50x40x30cm, >5kg', TRUE),
('Sobre Documentos', 'Sobres tamaño A4/Oficio, documentación', TRUE),
('Delivery Comida', 'Pedidos de comida, típicamente en contenedores térmicos', TRUE),
('Especial', 'Paquetes con formas irregulares o que requieren cuidado especial', TRUE);

-- Sample Data for Tarifas Distancia Calculadora
DELETE FROM "public"."tarifas_distancia_calculadora";
-- LowCost Tariffs - Vigente desde 2024-01-01
INSERT INTO "public"."tarifas_distancia_calculadora" ("tipo_calculadora", "distancia_hasta_km", "precio", "fecha_vigencia_desde") VALUES
('lowcost', 3.0, 500.00, '2024-01-01'),
('lowcost', 5.0, 700.00, '2024-01-01'),
('lowcost', 10.0, 1000.00, '2024-01-01'),
('lowcost', 15.0, 1300.00, '2024-01-01');

-- LowCost Tariffs - Vigente desde 2024-06-01 (ejemplo de actualización de precios)
INSERT INTO "public"."tarifas_distancia_calculadora" ("tipo_calculadora", "distancia_hasta_km", "precio", "fecha_vigencia_desde") VALUES
('lowcost', 3.0, 550.00, '2024-06-01'),
('lowcost', 5.0, 770.00, '2024-06-01'),
('lowcost', 10.0, 1100.00, '2024-06-01'),
('lowcost', 15.0, 1500.00, '2024-06-01');

-- Express Tariffs - Vigente desde 2024-01-01
INSERT INTO "public"."tarifas_distancia_calculadora" ("tipo_calculadora", "distancia_hasta_km", "precio", "fecha_vigencia_desde") VALUES
('express', 2.0, 1000.00, '2024-01-01'),
('express', 4.0, 1500.00, '2024-01-01'),
('express', 8.0, 2000.00, '2024-01-01'),
('express', 12.0, 2500.00, '2024-01-01');

-- Express Tariffs - Vigente desde 2024-07-01 (ejemplo de actualización de precios)
INSERT INTO "public"."tarifas_distancia_calculadora" ("tipo_calculadora", "distancia_hasta_km", "precio", "fecha_vigencia_desde") VALUES
('express', 2.0, 1100.00, '2024-07-01'),
('express', 4.0, 1650.00, '2024-07-01'),
('express', 8.0, 2200.00, '2024-07-01'),
('express', 12.0, 2800.00, '2024-07-01');

-- NOTA: No se incluyen INSERTs para empresas, clientes, repartidores, repartos, envios, paradas_reparto
-- ya que esta solicitud se centra en los datos de configuración de tipos.
-- Esos datos de ejemplo pueden estar en un archivo de seed de datos más general.
