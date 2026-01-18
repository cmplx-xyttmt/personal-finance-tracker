Act as a Senior Frontend Engineer. We are building a "Local-First" Personal Finance Tracker.

### Project Goal
A private, offline-capable budgeting tool that tracks monthly expenses, government bond investments (coupons/payouts), unit trust saving accounts, and runs investment simulations.

### Tech Stack
- Framework: React (Vite)
- Language: TypeScript
- Database: Dexie.js (for local-first IndexedDB storage)
- Styling: Tailwind CSS + Shadcn/UI
- Hosting: Prepared for GitHub Pages

### Phase 1: Core Infrastructure & Local Database
1. Initialize a Vite React project with Tailwind.
2. Set up Dexie.js with a schema for:
   - 'months': id (YYYY-MM), expectedIncome, savingsGoal.
   - 'expenses': id, monthId, category, plannedAmount, actualAmount, date.
   - 'bonds': id, principal, rate, purchaseDate, durationYears.
3. Create a basic 'Layout' with a sidebar for Navigation.

### Phase 2: Monthly Budgeting UI
1. Create a "Monthly Planner" view.
2. Logic: User selects a month (e.g., Feb 2026). They can set 'Expected Income'.
3. Allow adding expense categories with 'Planned' vs 'Actual' inputs.
4. Ensure data persists to Dexie immediately on change.

### Phase 3: Investment & Coupon Tracker
1. Create an "Investments" view. 
2. Logic: When a user adds a 'Bond', automatically calculate a "Coupon Schedule" (Semi-annual payments for the duration).
3. Display a "Payment Calendar" showing exactly which months coupons will hit the bank account.

### Phase 4: Financial "Day-Dream" Simulator
1. Create a "Simulator" tab.
2. Build a calculator that takes 'Monthly Contribution', 'Annual Rate', and 'Years'.
3. Output a chart or table showing the projected growth, including a toggle for "Reinvesting Coupons" vs "Spending Coupons".

### Phase 5: GitHub Pages & PWA Setup
1. Configure 'vite.config.ts' with the correct 'base' for GitHub Pages.
2. Add 'vite-plugin-pwa' to make the app installable on mobile and functional fully offline.

Always ask before running any commands, or better yet, ask the user to run the commands.
Please start with Phase 1 only. Explain the folder structure and how Dexie is being initialized before moving to Phase 2.
