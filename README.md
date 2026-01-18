# Personal Finance Tracker

A privacy-focused, local-first personal finance application built with React and Dexie.js.

![PWA Capable](https://img.shields.io/badge/PWA-Capable-success)
![Local First](https://img.shields.io/badge/Data-Local_Only-blue)

## Features

### 📅 Monthly Budgeting
- **Zero-Based Budgeting**: Plan every shilling. Track Expected Income vs. Planned Expenses.
- **Real-Time Tracking**: Log expenses against categories and see your remaining budget instantly.
- **Templates**: Fill your monthly budget from a customizable template with one click.
- **Category Management**: Easily add, edit, or remove budget categories as needed.

### 💰 Wealth Tracking
- **Sinking Funds**: Track accumulated balances for specific goals (e.g., "Medical", "Travel", "Emergency Buffer") across months.
- **Bank Balance**: Always know your "Operating Cash" (Income - Actual Spends).

### 🔄 Month-End Workflows
- **Close Month**: Formalize your financial period.
- **Surplus Handling**: Choose to carry over extra cash to the next month or transfer it to a savings goal.
- **Deficit Handling**: Automatically carries over debt to deduuct from next month's available funds.

### 💾 Data Management
- **Backup & Restore**: Export your data as a JSON file for backup or transfer between devices.
- **Local Storage**: All data is stored locally in your browser's IndexedDB - your data never leaves your device.

### 📱 Progressive Web App (PWA)
- **Installable**: Add to your home screen on iOS/Android or Desktop.
- **Offline First**: Works completely offline. No internet connection required.

## 🚀 Roadmap (Coming Soon)
### Investment & Coupon Tracker
- **Bond Portfolio**: Track 2-year, 5-year, and 10-year Uganda Government Bonds.
- **Coupon Calendar**: Automated 6-month payout schedule with 10% WHT (Withholding Tax) calculations.
- **Payout Notifications**: Visual indicators in your monthly budget when a coupon is expected.

### Financial Independence Simulator
- **Wealth Projection**: Interactive charts to visualize compound growth over 5, 10, and 15 years.
- **"What-If" Analysis**: See how a 500k/month increase in bond reinvestment affects your 35-year-old "Dream Retirement" goals.
- **Goal Milestones**: Track progress toward specific wealth targets (e.g., "100m UGX Net Worth").

## Tech Stack
- **Framework**: React + Vite
- **Language**: TypeScript
- **Database**: Dexie.js (Wrapper for IndexedDB)
- **Styling**: Tailwind CSS + Shadcn/UI
- **Deployment**: GitHub Pages

## Getting Started

1.  **Clone the repository**
    ```bash
    git clone https://github.com/cmplx-xyttmt/personal-finance-tracker.git
    cd personal-finance-tracker
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Run Locally**
    ```bash
    npm run dev
    ```

4.  **Build**
    ```bash
    npm run build
    ```

## Configuration

- **Budget Template**: Modify `src/lib/constants.ts` to adjust your default categories and tags.

## License
MIT
