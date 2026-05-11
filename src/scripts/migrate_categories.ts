/**
 * Historyczny skrypt jednorazowy (mapowanie starych typów sesji → `category_id`, kopiowanie `resources.category_id` → `resource_to_categories`).
 *
 * Po migracji **`0014_drop_legacy_session_type_resource_category.sql`** te kolumny nie istnieją — uruchomienie jest zbędne.
 * Zachowane jako dokumentacja; dla bardzo starych kopii DB użyj commitu sprzed usunięcia kolumn lub ręcznego SQL z repo history.
 */
async function main() {
  console.info(
    '[migrate_categories] Pominięto — schema bez session_type oraz bez resources.category_id (patrz drizzle/0014_*.sql).',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
