-- Domyślna nazwa produktu: Werkit (nie „Werkit ERP”).
-- Istniejące firmy z niezmienioną wartością domyślną dostają nową nazwę;
-- własne nazwy firm zostają.
ALTER TABLE "company_settings" ALTER COLUMN "company_name" SET DEFAULT 'Werkit';

UPDATE "company_settings"
SET "company_name" = 'Werkit'
WHERE "company_name" = 'Werkit ERP';
