# Plan dociągnięcia architektury — field-ops + MRO

> **Status:** fazy **0–7 zamknięte** (2026-09-14). Program alignmentu zakończony.  
> **Źródło:** audyt architektury v1.9.4 (14 wrz 2026). Canvas planu żyje obok czatu (`cmms-alignment-plan.canvas.tsx`); ten plik jest SSOT w git.
> **SSOT postępu w git:** ten plik + [`docs/TECH_DEBT_ROADMAP.md`](../docs/TECH_DEBT_ROADMAP.md) §5 (P-ALIGN).  
> **Kontrakt dla agentów:** [`AGENTS.md`](../AGENTS.md) §1, [`ARCHITECTURE.md`](../ARCHITECTURE.md) §1a.

---

## Faza 0 — twardy kontrakt produktu ✅

**Potwierdzone 2026-09-14.** Werkit w tym programie to:

**dyspozycja ludzi + rejestr zasobów + dwa magazyny + GPS w sesji transportu.**

To field-ops z warstwą MRO (utrzymanie ruchu na zleceniu naprawy), nie klasyczny CMMS.

### Świadomie zostaje

| Decyzja | Znaczenie w kodzie |
|---------|-------------------|
| 1 materiał na zlecenie pracy | `machine_work` → `work_orders.material_id` + ilość (ładunek). Auto WZ przy starcie sesji. |
| N części na zlecenie naprawy | `machine_repair` → `work_order_spare_parts` (BOM). |
| Dwa SKU magazynowe | Tabele `materials` / `material_*` oraz `spare_parts` / `spare_part_*` + `stock_*` **się nie łączą**. Wspólne może być tylko jądro kodu (faza 5), nie schemat. |
| GPS tylko w sesji | `gps_logs` na `work_sessions`. Watcher przy aktywnej, **niestacjonarnej** sesji. Brak śladu pojazdu poza sesją. |

### Świadomie poza tym programem

- Plany prewencji (PM), zgłoszenia awarii poza dyspozycją.
- Motogodziny / liczniki jako dane (nie tylko zdjęcie).
- Historia utrzymania per zasób jako osobny cykl.
- Tracker pojazdu / zasobu 24/7 bez sesji pracownika.

Bez tej granicy faza 5 scalałaby ładunek z BOM, a kolejne PR-y zaczęłyby budować pełny CMMS „przy okazji”.

---

## Fazy 1–7

Kolejność z zależności kodu. Każda faza jest merdżowalna sama.

| Faza | Nazwa | Blokuje | Ryzyko |
|------|--------|---------|--------|
| 1 | GPS: flaga = zachowanie ✅ | nic | Niskie — bugfix |
| 2 | Typ floty bez DUR ✅ | 5 (kompatybilność części) | Niskie |
| 3 | IA dwóch magazynów ✅ | 5 (gdzie żyje UI) | Niskie — i18n/nav |
| 4 | Flagi GPS niezależne ✅ | nic | Średnie — semantyka UI |
| 5 | Jądro magazynu ✅ | nic dalszego w tym programie | Średnie — stany, WZ/PZ |
| 6 | Polityka kategorii ✅ | nic | Średnie — worker GPS + formularze |
| 7 | Nazwy i snapshot sesji ✅ | koniec programu | Niskie |

**Program zamknięty** — fazy 6 i 7 ukończone 2026-09-14.

### Faza 1 — GPS: flaga = zachowanie ✅

**Zamknięta 2026-09-14.** Serwer odrzucał zapis (`403`), a telefon dalej nagrywał i retry’ował kolejkę co 100 ms.

1. `gpsTrackingEnabled` w `AppSettings` + `serializeWorkerAppSettings` (`WorkerSessionService`).
2. `useWorkerGPS` / `shouldStartGpsWatcher`: brak watchera, gdy flaga jest off **albo** kategoria jest stacjonarna.
3. `GPSManager.flushQueue`: przy `403` / `feature_disabled` czyści kolejkę i **nie** robi retry.
4. Testy: narrowing settings, flush przy 403, watcher nie woła native API.

**Gotowe:** wyłączenie GPS w platformie = cisza na urządzeniu, IndexedDB puste, brak pętli sieciowej.

### Faza 2 — typ floty bez DUR ✅

**Zamknięta 2026-09-14.** `resource_groups` to typ maszyny, nie magazyn części.

1. Zdjęto `requireDurFeature` z `/api/resource-groups` (GET/POST i `[id]` GET/PUT/DELETE).
2. `MachinesClient` zawsze ładuje grupy i pokazuje blok typu zasobu; pole typu w formularzu zasobu nie zależy od `durEnabled`.
3. Kompatybilność część ↔ typ **zostaje** za `durEnabled` (`/api/dur/*`, magazyn w sidebarze, BOM na zleceniu naprawy).

**Gotowe:** firma bez DUR ma typy zasobów na `/admin/machines`, a magazyn części nadal jest schowany.

### Faza 3 — dwa magazyny obok siebie ✅

**Zamknięta 2026-09-14.** Materiały i części jako rodzeństwo pod logistyką.

1. Sidebar: link `/admin/dur/warehouse` w sekcji Logistyka, zaraz po Materiałach — bez nagłówka „Utrzymanie ruchu” / `ordersAndDispatch`.
2. Etykieta „Części zamienne” (pl) / „Spare parts” / „Ersatzteile”; ikona `Boxes` (klienci zostają przy `Package`).
3. URL `/admin/dur/warehouse` bez zmian (legacy redirecty spare-parts / kategorie zostają).

**Gotowe:** admin widzi „Materiały” i „Części zamienne” w jednej sekcji.

### Faza 4 — flagi GPS niezależne ✅

**Zamknięta 2026-09-14.** `isGpsModuleEnabled` nie AND-uje pięciu flag.

1. `isGpsModuleEnabled` = `gpsTrackingEnabled`. `isAdminGpsEnabled` = śledzenie **albo** mapa. `canAssignWorkerRouteEdit` = mapa + planowanie trasy.
2. Panel platformy: pięć osobnych przełączników GPS (PUT jednego klucza), bez `gpsModuleFlagsPatch`.
3. `AdminAbility.gpsEnabled` = `gpsTrackingEnabled || mapViewEnabled`; `gpsFlags` steruje mapą / geofence / trasą / nawigacją.
4. Worker `AppSettings` niesie wszystkie flagi GPS. Geofence off pomija prompt „Dojechał”, nie gasi watchera ani `POST /api/worker/gps`.

**Gotowe:** geofence off nie wyłącza śledzenia.

### Faza 5 — jądro magazynu ✅

**Zamknięta 2026-09-14.** Tabele SKU **nie** są scalone. Reguła stanu żyje w `services/warehouse/`.

1. Jądro: walidacja ilości, `insufficient_stock`, upsert `quantity + delta`, korekta bezwzględna, orkiestracja PZ/WZ (`executeWarehouseReceipt` / `executeWarehouseIssue`).
2. Adaptery: `materialsInventoryStore` i `sparePartsInventoryStore` (kind + klasa błędu). Tabele `materials*` i `spare_part*` / `stock_*` zostają osobne.
3. `InventoryService` / `MaterialInventoryService` / ruchy PZ-WZ delegują mutacje do jądra. Auto WZ sesji, BOM naprawy, prefiksy API — bez zmian.

**Gotowe:** zmiana reguły stanu jest w jednym miejscu; oba magazyny przechodzą swoje testy.

### Faza 6 — polityka kategorii ✅

**Zamknięta 2026-09-14.** Tabela `resource_categories` **nie** jest rozbita. Odczyt: `gpsPolicy` / `orderKind` / `fieldVisibility`.

1. [`src/lib/categoryPolicy.ts`](../src/lib/categoryPolicy.ts): `resolveGpsPolicy` (`stationary` / `track`), `resolveOrderKind`, `resolveFieldVisibility`, `resolveCategoryPolicy`.
2. `useWorkerGPS` / `shouldStartGpsWatcher` czytają `gpsPolicy`, nie surowy `isStationary`. Legacy `categoryIsStationary` zostaje na payloadzie jako fallback.
3. Geofence „Dojechał”, shell sesji, mapa historii i admin session details idą przez `gpsPolicyFromSession`.
4. Walidacja zlecenia i etykiety karty: `orderKind` / `fieldVisibility` zamiast bezpośredniego `resolveOrderType` / `resolvedCategoryFieldFlags`.

**Gotowe:** `useWorkerGPS` nie czyta surowego `isStationary`, tylko `gpsPolicy`.

### Faza 7 — snapshot i nazwy ✅

**Zamknięta 2026-09-14.**

1. Snapshot `orderType` / `materialId` / `quantityTons` na sesję przy akceptacji: [`sessionInsertFromAcceptedOrder`](../src/lib/sessionSnapshotFromOrder.ts) + test kopiowania (unit + `acceptOrder`).
2. Default `company_name` „Werkit ERP” → „Werkit” (`DEFAULT_COMPANY_NAME`, migracja **0032**, metadata, manifest).
3. URL `/admin/machines` bez zmian; etykieta sidebar/strony „Zasoby” (`admin.sidebar.resources`).

**Gotowe:** sesja kopiuje snapshot zlecenia; produkt nazywa się Werkit; rejestr to zasoby.

---

## Po fazie 7 (osobny program)

PM, motogodziny jako dane, historia utrzymania per zasób, GPS 24/7 na pojeździe — **nie ten plan**.
