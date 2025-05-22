
-- 01_schema_enums.sql part
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipocalculadoraservicioenum') THEN
        CREATE TYPE "public"."tipocalculadoraservicioenum" AS ENUM ('lowcost', 'express');
    END IF;
END$$;

-- 02_schema_tables.sql part
CREATE TABLE "public"."tarifas_distancia_calculadora" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tipo_calculadora" public.tipocalculadoraservicioenum NOT NULL,
    "distancia_hasta_km" NUMERIC NOT NULL, -- This tier applies for distances > previous tier's max_km and <= this value
    "precio" NUMERIC(10, 2) NOT NULL,
    "fecha_vigencia_desde" DATE NOT NULL DEFAULT CURRENT_DATE, -- When this rate becomes active
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_tarifa_distancia_tipo_vigencia_distancia UNIQUE (tipo_calculadora, fecha_vigencia_desde, distancia_hasta_km)
);

COMMENT ON TABLE "public"."tarifas_distancia_calculadora" IS 'Stores distance-based pricing tiers for calculators, with validity dates.';
COMMENT ON COLUMN "public"."tarifas_distancia_calculadora"."distancia_hasta_km" IS 'This tier applies for distances greater than the previous tier''s max_km and less than or equal to this value.';
COMMENT ON COLUMN "public"."tarifas_distancia_calculadora"."fecha_vigencia_desde" IS 'The date from which this pricing tier set is active.';

-- 03_schema_rls.sql part
ALTER TABLE "public"."tarifas_distancia_calculadora" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for calculator tariffs" ON "public"."tarifas_distancia_calculadora"
    FOR SELECT USING (true);

-- For admin/management later (if needed for a UI to manage these)
-- CREATE POLICY "Allow all for authenticated users (tarifas_distancia_calculadora)" ON "public"."tarifas_distancia_calculadora"
--     FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

-- 04_data_seed.sql part
-- Sample Data for Tarifas Distancia Calculadora
-- LowCost Prices (reflecting the original hardcoded logic)
-- Effective from today
INSERT INTO "public"."tarifas_distancia_calculadora" (tipo_calculadora, distancia_hasta_km, precio, fecha_vigencia_desde) VALUES
('lowcost', 2.9, 2150.00, CURRENT_DATE),
('lowcost', 4.9, 2900.00, CURRENT_DATE),
('lowcost', 8.9, 4000.00, CURRENT_DATE),
('lowcost', 13.0, 5800.00, CURRENT_DATE),
('lowcost', 30.0, 8200.00, CURRENT_DATE);

-- Express Prices (reflecting the original hardcoded logic)
-- Effective from today
INSERT INTO "public"."tarifas_distancia_calculadora" (tipo_calculadora, distancia_hasta_km, precio, fecha_vigencia_desde) VALUES
('express', 3.0, 2700.00, CURRENT_DATE),
('express', 5.0, 3400.00, CURRENT_DATE),
('express', 6.0, 4200.00, CURRENT_DATE),
('express', 7.0, 5000.00, CURRENT_DATE),
('express', 8.0, 5800.00, CURRENT_DATE),
('express', 9.0, 6500.00, CURRENT_DATE),
('express', 10.0, 7350.00, CURRENT_DATE);
-- Note: The per-km extra for express > 10km (750 * kmExtra) needs to be handled in application logic
-- or by adding a specific tier type like 'per_km_extra' if the DB structure were more complex.
-- For now, the "Consulte por WhatsApp" will cover this.

-- Example of future prices for LowCost, effective next month
-- INSERT INTO "public"."tarifas_distancia_calculadora" (tipo_calculadora, distancia_hasta_km, precio, fecha_vigencia_desde) VALUES
-- ('lowcost', 2.9, 2200.00, CURRENT_DATE + INTERVAL '1 month'),
-- ('lowcost', 4.9, 3000.00, CURRENT_DATE + INTERVAL '1 month'),
-- ('lowcost', 8.9, 4100.00, CURRENT_DATE + INTERVAL '1 month'),
-- ('lowcost', 13.0, 5900.00, CURRENT_DATE + INTERVAL '1 month'),
-- ('lowcost', 30.0, 8300.00, CURRENT_DATE + INTERVAL '1 month');
