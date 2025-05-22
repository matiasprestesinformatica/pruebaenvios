-- Create ENUM types if they don't exist

-- Enum para paradas_reparto.tipo_parada
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipoparadaenum') THEN
        CREATE TYPE "public"."tipoparadaenum" AS ENUM ('retiro_empresa', 'entrega_cliente');
    END IF;
END$$;

-- Enum para tarifas_distancia_calculadora.tipo_calculadora
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipocalculadoraservicioenum') THEN
        CREATE TYPE "public"."tipocalculadoraservicioenum" AS ENUM ('lowcost', 'express');
    END IF;
END$$;
