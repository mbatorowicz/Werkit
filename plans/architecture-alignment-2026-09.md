# Plan dociągnięcia architektury — field-ops + MRO

> **Status:** fazy **0–3 zamknięte** (2026-09-14). Fazy 4–7 otwarte.  
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
| 4 | Flagi GPS niezależne | nic | Średnie — semantyka UI |
| 5 | Jądro magazynu | nic dalszego w tym programie | Średnie — stany, WZ/PZ |
| 6 | Polityka kategorii | nic | Średnie — worker GPS + formularze |
| 7 | Nazwy i snapshot sesji | koniec programu | Niskie |

**Faza 5 może startować** — faza 3 (IA magazynów) jest zamknięta.

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

### Faza 4 — flagi GPS niezależne

`isGpsModuleEnabled` nie wymaga pięciu flag naraz. Śledzenie, mapa, geofence, trasa, nawigacja niezależnie. `AdminAbility.gpsEnabled` = `gpsTrackingEnabled` (ew. mapa).

**Gotowe, gdy:** geofence off nie wyłącza śledzenia.

### Faza 5 — jądro magazynu

**Nie scalać tabel.** Wydzielić `services/warehouse/`: walidacja ilości, upsert stanu, `insufficient_stock`, korekta, kształt PZ/WZ. Dwa adaptery: materials i spare_parts.

Zostaje osobno: auto WZ sesji (materiał), kompatybilność z typem (DUR), prefiksy API, 1×materiał vs N×części na zleceniu.

**Gotowe, gdy:** zmiana reguły stanu jest w jednym miejscu, oba magazyny przechodzą swoje testy.

### Faza 6 — polityka kategorii

Nie rozbijać `resource_categories`. Dodać odczyt: `gpsPolicy` (stationary / track), `orderKind`, `fieldVisibility`. Call-site’y przez te funkcje, nie przez surowe booleany z wiersza.

**Gotowe, gdy:** `useWorkerGPS` nie czyta surowego `isStationary`, tylko `gpsPolicy`.

### Faza 7 — snapshot i nazwy

Snapshot `orderType` / materiał / ilość na sesję przy akceptacji zostaje + test kopiowania. Default `company_name` „Werkit ERP” → „Werkit”. URL `/admin/machines` zostaje; etykieta wszędzie „zasoby”.

---

## Po fazie 7 (osobny program)

PM, motogodziny jako dane, historia utrzymania per zasób, GPS 24/7 na pojeździe — **nie ten plan**.
