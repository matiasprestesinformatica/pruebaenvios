-- Drop tables in reverse order of dependency due to foreign keys
DROP TABLE IF EXISTS "public"."paradas_reparto" CASCADE;
DROP TABLE IF EXISTS "public"."envios" CASCADE;
DROP TABLE IF EXISTS "public"."repartos" CASCADE;
DROP TABLE IF EXISTS "public"."clientes" CASCADE;
DROP TABLE IF EXISTS "public"."empresas" CASCADE;
DROP TABLE IF EXISTS "public"."repartidores" CASCADE;
DROP TABLE IF EXISTS "public"."tipos_paquete" CASCADE;
DROP TABLE IF EXISTS "public"."tipos_servicio" CASCADE;
DROP TABLE IF EXISTS "public"."tarifas_distancia_calculadora" CASCADE; -- Added

-- Drop enums if they exist
DROP TYPE IF EXISTS "public"."tipoparadaenum" CASCADE;
DROP TYPE IF EXISTS "public"."tipocalculadoraservicioenum" CASCADE; -- Added
