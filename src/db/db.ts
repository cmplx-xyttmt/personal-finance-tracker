import Dexie, { type EntityTable } from 'dexie';

export interface Month {
    id: string; // YYYY-MM
    expectedIncome: number;
    savingsGoal: number;
    updatedAt?: number;
}

export interface Budget {
    id: string; // UUID
    monthId: string; // YYYY-MM
    category: string;
    plannedAmount: number;
    tag: string;
    updatedAt?: number;
}

export interface Transaction {
    id: string; // UUID
    budgetId: string; // UUID
    amount: number;
    description: string;
    date: string; // ISO Date
    updatedAt?: number;
}

export interface Bond {
    id: string; // UUID
    principal: number;
    rate: number; // annual percentage
    purchaseDate: string;
    durationYears: number;
    updatedAt?: number;
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

// Version 4: Migration to UUIDs and Sync fields
db.version(4).stores({
    months: 'id, synced',
    budgets: 'id, monthId, category, synced', // 'id' (string) replaces '++id'
    transactions: 'id, budgetId, synced',
    bonds: 'id, purchaseDate, synced'
}).upgrade(async (trans) => {
    // 1. Upgrade Months
    await trans.table('months').toCollection().modify(m => {
        m.updatedAt = Date.now();
        m.synced = 0;
    });

    // 2. Upgrade Budgets (Convert ID to UUID)
    // We need to read all budgets, assign new UUIDs, and map old ID -> new UUID
    const oldBudgets = await trans.table('budgets').toArray();
    const budgetMap = new Map<number, string>(); // Old ID -> New UUID

    // Clear the table so we can re-add with string IDs
    // Note: Dexie upgrade transaction works on the *underlying* IDB transaction.
    // Changing primary key type usually requires clearing and re-adding.
    await trans.table('budgets').clear();

    const newBudgets = oldBudgets.map((b: any) => {
        const newId = crypto.randomUUID();
        budgetMap.set(b.id, newId); // Map old numeric ID to new UUID
        return {
            ...b,
            id: newId,
            updatedAt: Date.now(),
            synced: 0
        };
    });

    // Batch add back
    await trans.table('budgets').bulkAdd(newBudgets);

    // 3. Upgrade Transactions
    const oldTrans = await trans.table('transactions').toArray();
    await trans.table('transactions').clear();

    const newTrans = oldTrans.map((t: any) => {
        return {
            ...t,
            id: crypto.randomUUID(),
            budgetId: budgetMap.get(t.budgetId), // Use the mapped UUID
            updatedAt: Date.now(),
            synced: 0
        };
    }).filter((t: any) => t.budgetId !== undefined); // Safety check in case of orphan transactions

    await trans.table('transactions').bulkAdd(newTrans);

    // 4. Upgrade Bonds
    const oldBonds = await trans.table('bonds').toArray();
    await trans.table('bonds').clear();
    const newBonds = oldBonds.map((b: any) => ({
        ...b,
        id: crypto.randomUUID(),
        updatedAt: Date.now(),
        synced: 0
    }));
    await trans.table('bonds').bulkAdd(newBonds);
});

// Version 6: Remove synced fields and deleted_records table (simplified, no sync)
db.version(6).stores({
    months: 'id',
    budgets: 'id, monthId, category, tag',
    transactions: 'id, budgetId',
    bonds: 'id, purchaseDate',
    deleted_records: null // Remove deleted_records table
}).upgrade(async (trans) => {
    // Remove synced fields from all tables
    await trans.table('months').toCollection().modify(m => {
        delete (m as any).synced;
    });
    await trans.table('budgets').toCollection().modify(b => {
        delete (b as any).synced;
    });
    await trans.table('transactions').toCollection().modify(t => {
        delete (t as any).synced;
    });
    await trans.table('bonds').toCollection().modify(b => {
        delete (b as any).synced;
    });
});

/**
 * Clear all data from the database
 */
export async function clearDatabase() {
    await Promise.all([
        db.months.clear(),
        db.budgets.clear(),
        db.transactions.clear(),
        db.bonds.clear()
    ]);
}

export { db };
