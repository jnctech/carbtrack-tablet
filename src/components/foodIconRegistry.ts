/**
 * Icon key registry — must stay in sync with the carbtrack-au backend
 * `foods.icon_key` column. The 21 keys below are the seed-matched mappings
 * confirmed live in prod (see plan section "Icon Key Backfill Mapping").
 *
 * Adding a new key here requires a matching row update in carbtrack-au
 * `seed_icon_keys()`.
 */
export const ICON_KEYS = [
  "cereal_weetbix",
  "cereal_cornflakes",
  "bread_white",
  "dairy_milk_fc",
  "dairy_yoghurt_greek",
  "dairy_milk_oat",
  "fruit_banana",
  "fruit_apple_red",
  "fruit_orange",
  "fruit_strawberry",
  "fruit_mango",
  "fruit_watermelon",
  "fruit_avocado",
  "veg_potato_white",
  "veg_sweet_potato",
  "veg_broccoli",
  "veg_carrot",
  "veg_pumpkin",
  "veg_corn_sweet",
  "veg_peas",
  "veg_broccolini",
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

const KEY_SET: ReadonlySet<string> = new Set(ICON_KEYS);

export function isIconKey(value: string | null | undefined): value is IconKey {
  return typeof value === "string" && KEY_SET.has(value);
}
