# FitnessTalks Daily Meal & Water Tracker — Build Spec

## Context

This is a personal daily tracker for a 37-day fat loss challenge (FitnessTalks program). The user is on a PCOS-friendly, eggetetrian diet (eggs, chicken, fish, mutton — no red meat) with a fixed 7-day rotating meal plan. Goal: reduce body fat from 35% to 20% at 70 kg body weight. No supplements are being taken.

Build this as a **single-screen React artifact (.jsx)** with persistent storage (`window.storage` API) so data survives across sessions.

---

## 7-Day Meal Rotation

Each day maps to a fixed breakfast, lunch, and dinner. The user sees what they're supposed to eat and logs whether they followed it.

### Monday
- **Breakfast:** Eggs Omelette + Cheese — 2 boiled eggs, 25g cheese cube, 150ml toned milk, 2 walnuts, 5g ghee. 1 green apple.
- **Lunch:** Chicken Tikka Salad — 125g chicken breast grilled, 15g ghee/coconut oil. 100g cucumber-carrot-capsicum salad.
- **Dinner:** Paneer Handi — 100g paneer, 50-100g mixed veggies, 15g ghee. 1 cup cooked brown rice.

### Tuesday
- **Breakfast:** Paneer Bhurji — 100g paneer, onion, tomato, capsicum in 10g ghee. 100g curd. Strawberries.
- **Lunch:** Fish Roasted — 100g fish in 25g butter. 1 bajra/jowar roti. 1 bowl cucumber salad.
- **Dinner:** Chicken Tikka Salad — 125g chicken breast tikka, 15g coconut oil. 100g sauteed broccoli + zucchini.

### Wednesday
- **Breakfast:** Moong Dal Chilla — 60g moong dal chilla, 10-15g ghee. 100g low-fat curd. 10-15 almonds. 1 guava/apple.
- **Lunch:** Butter Chicken — 100g chicken breast in butter gravy. 1 cup red/black rice. 100g cucumber salad.
- **Dinner:** Paneer Handi — 100g paneer with mixed veggies, 15g butter. 1 cup quinoa or brown rice.

### Thursday
- **Breakfast:** Oats Meal — 30g oats in 100g toned milk. 3 boiled eggs. Blueberries/strawberries.
- **Lunch:** Paneer Handi — 100g paneer, 100g mixed veggies, 15g ghee. 1 jowar/ragi roti. Salad.
- **Dinner:** Fish Roasted — 100g fish in 25g butter. 1 cup brown rice. Sauteed spinach/palak.

### Friday
- **Breakfast:** Eggs Omelette + Cheese — 2 boiled eggs, 25g cheese cube, 150ml toned milk, 2 walnuts, 5g coconut oil. 1 green apple.
- **Lunch:** Chicken Tikka Salad — 125g chicken breast grilled, 15g ghee. 100g lettuce-cherry tomato-cucumber salad.
- **Dinner:** Butter Chicken — 100g chicken breast in butter gravy. 1 cup brown rice. 100g cucumber salad.

### Saturday
- **Breakfast:** Paneer Bhurji — 100g paneer, onion, tomato, capsicum in 10g ghee. 100g curd. Strawberries/orange.
- **Lunch:** Fish Roasted — 100g fish, 25g butter. 1 bajra roti. Cucumber-carrot salad.
- **Dinner:** Chicken Tikka Salad — 125g chicken breast tikka, 15g coconut oil. 100g sauteed broccoli + capsicum.

### Sunday
- **Breakfast:** Moong Dal Chilla — 60g moong dal chilla, 10-15g ghee. 100g low-fat curd. 10-15 almonds. 1 guava.
- **Lunch:** Butter Chicken — 100g chicken breast, butter gravy, 10-15g ghee. 1 cup brown/red rice. 100g salad.
- **Dinner:** Paneer Handi — 100g paneer, veggies, 15g ghee. 1 ragi/jowar roti. Sauteed spinach.

---

## App Sections (top to bottom, single scrollable screen)

### 1. Header
- Red/orange gradient bar.
- Shows "Today" if current date, otherwise the selected date.
- Full date with weekday name.
- Branding line: "FitnessTalks · 37 Day Challenge"

### 2. Morning Routine
- Two checkboxes:
  - **500ml warm water** — on check, show sub-options: Jeera water / Cinnamon water / Plain warm water (pick one).
  - **10 almonds + 2 walnuts (soaked overnight)**

### 3. Meals (Breakfast / Lunch / Dinner)
Three separate cards, one per meal. Each card contains:

- **Time window label:** Breakfast 7:30-9:30 AM, Lunch 1:00-2:30 PM, Dinner 8:00-9:30 PM.
- **Planned meal reference:** Dashed border box showing the day's planned meal name and full ingredient list from the rotation above.
- **Status chips (tap to select, tap again to deselect):**
  - "Followed plan" (green)
  - "Ate something else" (yellow)
  - "Skipped" (red)
- **If "Ate something else" is selected:** Show a text input — "What did you eat instead?"
- **Avoid List flag:** If the typed text contains any Avoid List keyword (see below), show a red warning: "⚠️ This may be on your Avoid List". This is informational, not blocking.
- **Timestamp:** Auto-log and display the time when a status is selected.

### 4. Extras & Snacks
For anything eaten outside the 3 main meals.

- Shows list of logged extras, each with text + auto-timestamp.
- Each entry has a delete (×) button.
- If the text matches an Avoid List keyword, show it with red background tint and "⚠️ On your Avoid List" label.
- A "+ Log extra food or snack" dashed button at the bottom.
- On tap, show text input with placeholder "e.g. 2 biscuits, chai with sugar..." and an "Add" button.
- Enter key also submits.

### 5. Water Tracker
- Title shows current count: "Water — X / 12 glasses" with subtitle "X.XL of 3L target".
- **Progress bar:** Horizontal fill bar, water-blue color.
- **12 dot grid:** Circular dots, filled = blue with 💧 emoji, unfilled = bordered. Tap a dot to fill up to that point, or tap a filled dot to unfill from that point.
- **Quick-add buttons:** "+ 1 glass (250ml)" and "+ 1 bottle (500ml)". Cap at 12.
- **Note:** "Herbal tea, lemon water, coconut water (no sugar) count too"

### 6. Weekly Strip (fixed bottom bar)
- Fixed to bottom of screen.
- Shows last 7 days as circular dots with weekday initial label.
- Color coding:
  - Green (✓): All 3 meals marked "Followed plan"
  - Yellow (~): At least 1 meal logged but not all followed
  - Red (✗): Any meal marked "Skipped"
  - Empty (·): Nothing logged
- Current/selected day has an accent border highlight.
- Tap any day dot to navigate to that day's log.

---

## Avoid List Keywords

Used for flagging in the "Ate something else" and "Extras" inputs. Case-insensitive substring match.

```
wheat, chapati, roti, naan, paratha, maida, bread, pasta
sugar, candy, cake, cookie, pastry, ice cream, chocolate, mithai, gulab jamun, jalebi, barfi
banana, mango, grapes, watermelon, lychee, chikoo, dates
peanut, samosa, pakora, bhaji, fries, pizza, burger, maggi, noodle
coke, pepsi, soda, juice, fanta, sprite, cold drink, soft drink
alcohol, beer, wine, whisky, vodka, rum
biscuit, chips, namkeen
```

**Important:** "roti" should NOT flag bajra/jowar/ragi roti since those are plan-approved. The flag is a simple substring match, so this is a known limitation — acceptable for now.

---

## Data Model

Each day is stored as one key in persistent storage.

**Storage key format:** `day:YYYY-MM-DD`

**Day object structure:**
```json
{
  "morningWater": false,
  "morningWaterType": "",
  "morningNuts": false,
  "meals": {
    "breakfast": { "status": null, "alt": "", "time": "" },
    "lunch": { "status": null, "alt": "", "time": "" },
    "dinner": { "status": null, "alt": "", "time": "" }
  },
  "extras": [],
  "waterGlasses": 0
}
```

- `status` values: `null` (not logged), `"followed"`, `"other"`, `"skipped"`
- `extras` array items: `{ "text": "string", "time": "string" }`
- `waterGlasses`: integer 0-12

**Storage API:**
```javascript
// Read
const result = await window.storage.get("day:2026-07-20");
const data = result ? JSON.parse(result.value) : EMPTY_DAY;

// Write
await window.storage.set("day:2026-07-20", JSON.stringify(data));
```

---

## Design Tokens

- **Background:** #f7f6f3
- **Card:** #ffffff with 1px solid #e8e8e4 border, 14px border-radius
- **Accent/brand:** #d94f2b (red-orange)
- **Green (followed):** #22963d, soft bg #eefbf0
- **Yellow (other):** #c58c07, soft bg #fefaeb
- **Red (skipped/avoid):** #d94040, soft bg #fef0f0
- **Blue (breakfast):** #2568d4
- **Water blue:** #3b9dd6, soft bg #e8f5fc
- **Purple (extras):** #8b5cf6
- **Text:** #1c1c1c, subtext #6b6b6b
- **Font:** Inter / system sans-serif
- **Section indicator:** 4px wide × 16px tall colored bar left of section title

---

## Technical Notes

- Build as a single React .jsx file (no external dependencies beyond React).
- Use `useState`, `useEffect`, `useCallback` from React.
- Persistent storage via `window.storage` API (get/set/delete/list). Always wrap in try-catch.
- Mobile-first layout, single column, scrollable with fixed bottom bar.
- The meal plan is derived from `new Date().getDay()` — 0 = Sunday through 6 = Saturday.
- Date key helper: `YYYY-MM-DD` format using local date.
- Time logging: `toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })`.
- Week strip loads last 7 days of data on mount and after any update.
- No localStorage/sessionStorage — only `window.storage`.
- No supplements anywhere in the app.
