-- Cofnięcie automatycznego ukrywania z wczesnej wersji migracji 0010 (UPDATE ustawiał
-- show_material i show_quantity na false dla wszystkich is_stationary). Przywracamy
-- tylko ten „podpis” stanu — jeśli admin później świadomie wyłączył pola, inna
-- kombinacja flag nie jest nadpisywana.
UPDATE "resource_categories"
SET "show_material" = true,
    "show_quantity" = true
WHERE "is_stationary" = true
  AND "show_material" = false
  AND "show_quantity" = false;
