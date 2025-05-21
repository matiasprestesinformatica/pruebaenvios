-- Drop tables in reverse order of dependency due to foreign keys
DROP TABLE IF EXISTS "public"."paradas_reparto" CASCADE;
DROP TABLE IF EXISTS "public"."envios" CASCADE;
DROP TABLE IF EXISTS "public"."repartos" CASCADE;
DROP TABLE IF EXISTS "public"."clientes" CASCADE;
DROP TABLE IF EXISTS "public"."empresas" CASCADE;
DROP TABLE IF EXISTS "public"."repartidores" CASCADE;
DROP TABLE IF EXISTS "public"."tipos_paquete" CASCADE;
DROP TABLE IF EXISTS "public"."tipos_servicio" CASCADE;

-- Drop enums if they exist
DROP TYPE IF EXISTS "public"."tipoparadaenum" CASCADE;
-- Los otros enums no se definieron como tipos de PostgreSQL en el último seed.sql
-- sino que sus columnas son TEXT y se validan con Zod.
-- Si los tuvieras como ENUMs de PostgreSQL, los añadirías aquí:
DROP TYPE IF EXISTS "public"."estadorepartoenum" CASCADE;
DROP TYPE IF EXISTS "public"."tiporepartoenum" CASCADE;
 DROP TYPE IF EXISTS "public"."estadoenvioenum" CASCADE;
DROP TYPE IF EXISTS "public"."packagesizeenum" CASCADE;