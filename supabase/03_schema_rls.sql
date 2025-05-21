-- Enable RLS for all tables
ALTER TABLE "public"."empresas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."repartidores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tipos_paquete" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tipos_servicio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."repartos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."envios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."paradas_reparto" ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for authenticated users (for development/initial setup)
-- Replace with more granular policies for production

CREATE POLICY "Allow all for authenticated users (empresas)" ON "public"."empresas"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users (clientes)" ON "public"."clientes"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users (repartidores)" ON "public"."repartidores"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users (tipos_paquete)" ON "public"."tipos_paquete"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users (tipos_servicio)" ON "public"."tipos_servicio"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users (repartos)" ON "public"."repartos"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users (envios)" ON "public"."envios"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users (paradas_reparto)" ON "public"."paradas_reparto"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true);