# 425 - Product Options Phase 1 - Schema, API, and Menu Admin - Implementation

Date: 2026-07-01  
Roadmap reference: `docs/roadmaps/2026-07-01-PRODUCT-OPTIONS-AND-KITCHEN-PRINTING.md` (Phase 1)

---

## 1) Context

Phase 1 of the product options / kitchen printing feature adds reusable menu
parameters (preset groups like Cuisson) and product assignment in menu admin.
POS capture and kitchen printing remain for later phases.

---

## 2) What changed

### Database

Migration `2026_07_01_10_00_00_add_product_option_groups.sql`:

| Table | Purpose |
|-------|---------|
| `product_option_groups` | Reusable parameter definitions per establishment |
| `product_option_choices` | Preset values (saignant, à point, etc.) |
| `product_option_group_products` | Many-to-many product ↔ parameter assignment |

All tables include tenant RLS policies.

### Backend

| Area | Change |
|------|--------|
| `models/database/productOptionGroupModel.ts` | CRUD, choice sync, product assignment |
| `services/productOptions/productOptionCatalogService.ts` | Enrich products with `option_group_ids` + `option_groups` |
| `routes/productOptionGroups.ts` | `/api/product-option-groups` CRUD |
| `routes/products.ts` | Embeds option metadata on GET; accepts `option_group_ids` on create/update |
| `app.ts` | Mount new router |

### Frontend

| Area | Change |
|------|--------|
| `hooks/useProductOptionGroups.ts` | Load/create/update/delete parameter groups |
| `components/Menu/OptionGroupsSection.tsx` | List and manage parameters |
| `components/Menu/OptionGroupDialog.tsx` | Create/edit parameter + preset values |
| `components/Menu/ProductDialog.tsx` | Checkbox assignment of parameters to products |
| `components/Menu/MenuContainer.tsx` | Wire option group admin into menu screen |
| API + types | `@mosehxl/types`, `productOptionGroups.ts`, product mappers |

### Tests

- `migrations/productOptionGroups.migration.test.ts`
- `routes/productOptionGroups.routes.test.ts`

---

## 3) Outcome

Establishments can configure reusable product parameters and attach them to
products from the menu screen. No POS or kitchen printing behaviour yet.

**Next:** Phase 2 — POS modal, order persistence, server-side option validation.

---

## 4) Verification

```bash
cd MuseBar/backend && npm run type-check && npm run lint && npm run test -- --run
cd MuseBar && npm run type-check
```

Backend: 70 test files / 298 tests green.

Apply migration on environments:

```bash
cd MuseBar/backend && npm run migration:up
```

Patch-note index regenerated with:

```bash
npm run docs:patch-notes-index
```
