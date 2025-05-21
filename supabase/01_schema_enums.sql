-- Create ENUM types if they don't exist

-- Enum para paradas_reparto.tipo_parada
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipoparadaenum') THEN
        CREATE TYPE "public"."tipoparadaenum" AS ENUM ('retiro_empresa', 'entrega_cliente');
    END IF;
END$$;

-- Los otros enums (estadorepartoenum, tiporepartoenum, estadoenvioenum, packagesizeenum)
-- no se crean aquí porque las columnas correspondientes en las tablas son TEXT
-- y su validación se realiza a nivel de aplicación usando Zod.
-- Si en el futuro decides usar tipos ENUM de PostgreSQL para esas columnas,
-- deberás añadir sus CREATE TYPE aquí.
-- Ejemplo de cómo sería si fueran ENUMs de PostgreSQL:

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
