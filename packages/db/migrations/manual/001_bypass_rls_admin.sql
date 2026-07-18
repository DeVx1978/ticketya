-- Migración manual (fuera de drizzle-kit): otorgar BYPASSRLS al rol del
-- Panel Admin de plataforma.
--
-- drizzle-orm 0.45.x no expone el atributo BYPASSRLS en la config de
-- pgRole() (solo createDb/createRole/inherit) — ver comentario en
-- packages/db/schema/rls.ts. Sin esto, RF-ADMIN-002 (dashboard nacional
-- agregado de todas las cooperativas) no puede funcionar, porque
-- ticketya_platform_admin quedaría sujeto a las mismas políticas RLS que
-- cualquier otra conexión.
ALTER ROLE ticketya_platform_admin BYPASSRLS;
