import Dexie, { type EntityTable } from 'dexie';

export interface Month {
    id: string; // YYYY-MM
    expectedIncome: number;
    savingsGoal: number;
}

export interface Budget {
    id: number;
    monthId: string; // YYYY-MM
    category: string;
    plannedAmount: number;
    tag: string; // [NEW] Tag field
}

export interface Transaction {
    id: number;
    budgetId: number;
    amount: number;
    description: string;
    date: string; // ISO Date
}

export interface Bond {
    id: number;
    principal: number;
    rate: number; // annual percentage
    purchaseDate: string;
    durationYears: number;
}

const db = new Dexie('FinanceDB') as Dexie & {
    months: EntityTable<Month, 'id'>;
    budgets: EntityTable<Budget, 'id'>;
    transactions: EntityTable<Transaction, 'id'>;
    bonds: EntityTable<Bond, 'id'>;
    expenses: EntityTable<any, 'id'>; // Keep for migration/deletion
};

db.version(1).stores({
    months: 'id',
    expenses: '++id, monthId, category',
    bonds: '++id, purchaseDate'
});

db.version(2).stores({
    months: 'id',
    budgets: '++id, monthId, category',
    transactions: '++id, budgetId',
    bonds: '++id, purchaseDate',
    expenses: null // Delete old table
});

db.version(3).stores({
    budgets: '++id, monthId, category, tag' // Add tag to index
});

export { db };
