import Dexie, { type EntityTable } from 'dexie';

export interface Month {
    id: string; // YYYY-MM
    expectedIncome: number;
    savingsGoal: number;
}

export interface Expense {
    id: number;
    monthId: string; // YYYY-MM
    category: string;
    plannedAmount: number;
    actualAmount: number;
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
    expenses: EntityTable<Expense, 'id'>;
    bonds: EntityTable<Bond, 'id'>;
};

db.version(1).stores({
    months: 'id',
    expenses: '++id, monthId, category',
    bonds: '++id, purchaseDate'
});

export { db };
