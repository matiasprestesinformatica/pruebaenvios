-- supabase/01_schema_enums.sql
-- Creación de tipos ENUM si no existen.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estadorepartoenum') THEN
        CREATE TYPE "public"."estadorepartoenum" AS ENUM ('asignado', 'en_curso', 'completado');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tiporepartoenum') THEN
        CREATE TYPE "public"."tiporepartoenum" AS ENUM ('individual', 'viaje_empresa', 'viaje_empresa_lote');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estadoenvioenum') THEN
        CREATE TYPE "public"."estadoenvioenum" AS ENUM ('pending', 'suggested', 'asignado_a_reparto', 'en_transito', 'entregado', 'cancelado', 'problema_entrega');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'packagesizeenum') THEN
        CREATE TYPE "public"."packagesizeenum" AS ENUM ('small', 'medium', 'large');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipoparadaenum') THEN
        CREATE TYPE "public"."tipoparadaenum" AS ENUM ('retiro_empresa', 'entrega_cliente');
    END IF;
END$$;
