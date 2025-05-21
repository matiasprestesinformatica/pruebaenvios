-- supabase/seed.sql
-- Este archivo está obsoleto. La estructura y los datos de la base de datos
-- ahora se gestionan mediante archivos SQL separados y numerados en este mismo directorio:
-- 00_schema_drop_all.sql
-- 01_schema_enums.sql
-- 02_schema_tables.sql
-- 03_schema_rls.sql
-- 04_data_seed.sql

-- Si estás utilizando 'supabase db reset' y quieres que estos archivos se ejecuten,
-- necesitarás modificar tu supabase/config.toml para cambiar la entrada 'sql_paths'
-- para que apunte a estos archivos en el orden correcto, o moverlos a la
-- carpeta 'supabase/migrations/' y usar el sistema de migraciones de Supabase.

-- Por ejemplo, para ejecutar manualmente en orden:
-- 1. psql -h localhost -p 54322 -U postgres -d postgres -f supabase/00_schema_drop_all.sql (con precaución)
-- 2. psql -h localhost -p 54322 -U postgres -d postgres -f supabase/01_schema_enums.sql
-- 3. psql -h localhost -p 54322 -U postgres -d postgres -f supabase/02_schema_tables.sql
-- 4. psql -h localhost -p 54322 -U postgres -d postgres -f supabase/03_schema_rls.sql
-- 5. psql -h localhost -p 54322 -U postgres -d postgres -f supabase/04_data_seed.sql

SELECT 'El archivo seed.sql principal está obsoleto. Ver comentarios dentro del archivo para más detalles.' AS Nota;
