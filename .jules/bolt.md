## 2025-05-15 - O(n²) Table Rendering Anti-Pattern
**Learning:** Found a common pattern in the admin dashboard where arrays were being queried with `.find()` and `.filter()` inside `.map()` loops during React renders (e.g., matching applications to users or counts to statuses). This creates an O(n²) complexity that can severely degrade rendering performance as database records grow.
**Action:** Always precompute lookup `Map`s or `Set`s before the `.map()` loop to ensure O(1) lookups during render.
