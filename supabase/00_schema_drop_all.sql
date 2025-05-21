-- supabase/00_schema_drop_all.sql
-- Este archivo contiene sentencias para eliminar tablas y tipos.
-- Ejecutar con precaución, especialmente en entornos con datos existentes.

-- Drop tables in reverse order of dependency due to foreign keys
DROP TABLE IF EXISTS "public"."paradas_reparto";
DROP TABLE IF EXISTS "public"."envios";
DROP TABLE IF EXISTS "public"."repartos";
DROP TABLE IF EXISTS "public"."clientes";
DROP TABLE IF EXISTS "public"."empresas";
DROP TABLE IF EXISTS "public"."repartidores";
DROP TABLE IF EXISTS "public"."tipos_paquete";
DROP TABLE IF EXISTS "public"."tipos_servicio";

-- Drop enums (siempre después de las tablas que los usan o si las tablas se dropean)
DROP TYPE IF EXISTS "public"."estadorepartoenum";
DROP TYPE IF EXISTS "public"."tiporepartoenum";
DROP TYPE IF EXISTS "public"."estadoenvioenum";
DROP TYPE IF EXISTS "public"."packagesizeenum";
DROP TYPE IF EXISTS "public"."tipoparadaenum";
