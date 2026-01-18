import { db, type Month, type Budget, type Transaction, type Bond } from '@/db/db';
import { supabase } from '@/lib/supabase';

const SYNC_KEY = 'last_sync_timestamp';

// Mappers: Dexie (Camel) <-> Supabase (Snake)

const mapMonthToSupabase = (m: Month) => ({
    id: m.id,
    expected_income: m.expectedIncome,
    savings_goal: m.savingsGoal,
    updated_at: new Date(m.updatedAt || Date.now()).toISOString()
});

const mapMonthFromSupabase = (s: any): Month => ({
    id: s.id,
    expectedIncome: s.expected_income,
    savingsGoal: s.savings_goal,
    updatedAt: new Date(s.updated_at).getTime(),
    synced: 1
});

const mapBudgetToSupabase = (b: Budget) => ({
    id: b.id,
    month_id: b.monthId,
    category: b.category,
    planned_amount: b.plannedAmount,
    tag: b.tag,
    updated_at: new Date(b.updatedAt || Date.now()).toISOString()
});

const mapBudgetFromSupabase = (s: any): Budget => ({
    id: s.id,
    monthId: s.month_id,
    category: s.category,
    plannedAmount: s.planned_amount,
    tag: s.tag,
    updatedAt: new Date(s.updated_at).getTime(),
    synced: 1
});

const mapTransactionToSupabase = (t: Transaction) => ({
    id: t.id,
    budget_id: t.budgetId,
    description: t.description,
    amount: t.amount,
    date: t.date, // ISO string already
    updated_at: new Date(t.updatedAt || Date.now()).toISOString()
});

const mapTransactionFromSupabase = (s: any): Transaction => ({
    id: s.id,
    budgetId: s.budget_id,
    description: s.description,
    amount: s.amount,
    date: s.date,
    updatedAt: new Date(s.updated_at).getTime(),
    synced: 1
});

const mapBondToSupabase = (b: Bond) => ({
    id: b.id,
    name: "Bond " + b.id.slice(0, 4), // Fallback if name missing in Dexie interface (Wait, Dexie interface didn't have name? Check db.ts) 
    // db.ts Bond interface: id, principal, rate, purchaseDate, durationYears. NO NAME.
    // Supabase schema: name. I'll add 'Bond' or use category conceptually?
    // Actually, local DB might need 'name' if I want to display it properly. 
    // I'll update Dexie Schema later if needed. For now use 'Bond' + ID.
    amount: b.principal, // Mapped principal -> amount
    rate: b.rate,
    purchase_date: b.purchaseDate,
    term_months: b.durationYears * 12,
    updated_at: new Date(b.updatedAt || Date.now()).toISOString()
});

const mapBondFromSupabase = (s: any): Bond => ({
    id: s.id,
    principal: s.amount,
    rate: s.rate,
    purchaseDate: s.purchase_date,
    durationYears: s.term_months / 12,
    updatedAt: new Date(s.updated_at).getTime(),
    synced: 1
});

export const syncService = {
    async pushChanges() {
        // --- 1. Push Deletions ---
        const deleted = await db.deleted_records.where('synced').equals(0).toArray();
        if (deleted.length > 0) {
            for (const record of deleted) {
                // Determine Supabase table
                const table = record.table; // matches? months, budgets, transactions, bonds
                const { error } = await supabase.from(table).delete().eq('id', record.itemId);

                if (!error) {
                    await db.deleted_records.update(record.id!, { synced: 1 });
                } else {
                    console.error(`Failed to delete ${record.table} ${record.itemId}`, error);
                }
            }
        }

        // --- 2. Push Updates/Inserts ---

        // Months
        const months = await db.months.where('synced').equals(0).toArray();
        if (months.length > 0) {
            const payload = months.map(mapMonthToSupabase);
            const { error } = await supabase.from('months').upsert(payload);
            if (!error) await db.months.bulkUpdate(months.map(m => ({ key: m.id, changes: { synced: 1 } })));
        }

        // Budgets
        const budgets = await db.budgets.where('synced').equals(0).toArray();
        if (budgets.length > 0) {
            const payload = budgets.map(mapBudgetToSupabase);
            const { error } = await supabase.from('budgets').upsert(payload);
            if (!error) await db.budgets.bulkUpdate(budgets.map(b => ({ key: b.id, changes: { synced: 1 } })));
        }

        // Transactions
        const transactions = await db.transactions.where('synced').equals(0).toArray();
        if (transactions.length > 0) {
            const payload = transactions.map(mapTransactionToSupabase);
            const { error } = await supabase.from('transactions').upsert(payload);
            if (!error) await db.transactions.bulkUpdate(transactions.map(t => ({ key: t.id, changes: { synced: 1 } })));
        }

        // Bonds
        const bonds = await db.bonds.where('synced').equals(0).toArray();
        if (bonds.length > 0) {
            const payload = bonds.map(mapBondToSupabase);
            const { error } = await supabase.from('bonds').upsert(payload);
            if (!error) await db.bonds.bulkUpdate(bonds.map(b => ({ key: b.id, changes: { synced: 1 } })));
        }
    },

    async pullChanges() {
        const lastSyncISO = localStorage.getItem(SYNC_KEY) || new Date(0).toISOString();

        const nowISO = new Date().toISOString();

        // 1. Months
        const { data: months, error: errM } = await supabase.from('months').select('*').gt('updated_at', lastSyncISO);
        if (months && !errM) {
            const local = months.map(mapMonthFromSupabase);
            await db.months.bulkPut(local);
        }

        // 2. Budgets
        const { data: budgets, error: errB } = await supabase.from('budgets').select('*').gt('updated_at', lastSyncISO);
        if (budgets && !errB) {
            const local = budgets.map(mapBudgetFromSupabase);
            await db.budgets.bulkPut(local);
        }

        // 3. Transactions
        const { data: trans, error: errT } = await supabase.from('transactions').select('*').gt('updated_at', lastSyncISO);
        if (trans && !errT) {
            const local = trans.map(mapTransactionFromSupabase);
            await db.transactions.bulkPut(local);
        }

        // 4. Bonds
        const { data: bonds, error: errBo } = await supabase.from('bonds').select('*').gt('updated_at', lastSyncISO);
        if (bonds && !errBo) {
            const local = bonds.map(mapBondFromSupabase);
            await db.bonds.bulkPut(local);
        }

        localStorage.setItem(SYNC_KEY, nowISO);
    },

    async sync() {
        if (!supabase) return;
        // Check auth?
        const { data } = await supabase.auth.getSession();
        if (!data.session) return; // Can't sync if not logged in

        try {
            await this.pullChanges(); // Pull first to minimize conflicts locally? Or Push first?
            // "Pull First" is safer to incorporate latest changes.
            await this.pushChanges();
        } catch (e) {
            console.error("Sync failed", e);
        }
    }
};
