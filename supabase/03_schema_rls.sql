-- supabase/03_schema_rls.sql
-- Habilitación de Row Level Security y creación de políticas.

ALTER TABLE "public"."empresas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (empresas)" ON "public"."empresas" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (clientes)" ON "public"."clientes" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

ALTER TABLE "public"."repartidores" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (repartidores)" ON "public"."repartidores" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

ALTER TABLE "public"."tipos_paquete" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (tipos_paquete)" ON "public"."tipos_paquete" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

ALTER TABLE "public"."tipos_servicio" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (tipos_servicio)" ON "public"."tipos_servicio" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

ALTER TABLE "public"."repartos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (repartos)" ON "public"."repartos" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

ALTER TABLE "public"."envios" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (envios)" ON "public"."envios" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

ALTER TABLE "public"."paradas_reparto" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (paradas_reparto)" ON "public"."paradas_reparto" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
