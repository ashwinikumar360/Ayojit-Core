# UI/UX Style Guide (Design.md) — Ayojit 5-App Suite

## 1. Visual Direction: High-Contrast Light Neo-Brutalism
We are using the official high-contrast light Neo-Brutalism design system with bright flat accent panels, heavy borders, and off-axis solid shadows.

---

## 2. Color Palette
- **Base Background:** `#F4F4F5` (Zinc-100 / Light grey) or `#FFFFFF` (White)
- **Primary Accent Panel:** `#FCD34D` (Amber-300 / Warm Orange-Yellow)
- **Secondary (Success Accent):** `#BEF264` (Lime-300)
- **Danger (Quota Exceeded):** `#F87171` (Red-400)
- **Borders & Shadows:** `#000000` (Pure Black)

---

## 3. Typography
- **Headings (H1, H2, H3):** **Space Grotesk** (Geometrical sans-serif, bold weight)
- **Body & Controls:** **Outfit** or **Inter** (Clean geometric sans-serif)
- **Code & Metadata:** **JetBrains Mono** or standard system monospaced fonts

---

## 4. Layout & Spacing Discipline
- **Borders:** `4px` solid black border on all components.
- **Shadows:** Hard, non-blurry drop shadows shifted `4px` down and `4px` right.
  - CSS rule: `box-shadow: 4px 4px 0px 0px rgba(0,0,0,1);`
- **Transitions:** Hover effects must use snappy linear translations:
  - Active hover: `transform: translate(2px, 2px); box-shadow: 2px 2px 0px 0px rgba(0,0,0,1);`
- **Radius:** No rounded borders (`border-radius: 0px`). Keep everything sharp and blocky.
