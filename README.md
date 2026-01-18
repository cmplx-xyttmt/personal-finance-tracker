# Personal Finance Tracker

A privacy-focused, local-first personal finance application built with React and Dexie.js.

![PWA Capable](https://img.shields.io/badge/PWA-Capable-success)
![Local First](https://img.shields.io/badge/Data-Local_Only-blue)

## Features

### 📅 Monthly Budgeting
- **Zero-Based Budgeting**: Plan every shilling. Track Expected Income vs. Planned Expenses.
- **Real-Time Tracking**: Log expenses against categories and see your remaining budget instantly.
- **Templates**: Auto-populates your monthly budget based on a customizable template.
- **Sync**: Easily update existing months with new categories or tag changes.

### 💰 Wealth Tracking
- **Sinking Funds**: Track accumulated balances for specific goals (e.g., "Medical", "Travel", "Emergency Buffer") across months.
- **Bank Balance**: Always know your "Operating Cash" (Income - Actual Spends).

### 🔄 Month-End Workflows
- **Close Month**: Formalize your financial period.
- **Surplus Handling**: Choose to carry over extra cash to the next month or transfer it to a savings goal.
- **Deficit Handling**: Automatically carries over debt to deduuct from next month's available funds.

### 📱 Progressive Web App (PWA)
- **Installable**: Add to your home screen on iOS/Android or Desktop.
- **Offline First**: Works completely offline. Data is stored in your browser's IndexedDB.

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
