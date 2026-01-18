import { db, type Month, type Budget, type Transaction, type Bond } from '@/db/db';
import { supabase } from '@/lib/supabase';

const SYNC_KEY = 'last_sync_timestamp';

// Debounce helper for immediate sync
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_DEBOUNCE_MS = 500; // Wait 500ms after last change before syncing

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
            // Process deletions in parallel
            await Promise.all(deleted.map(async (record) => {
                const table = record.table;
                const { error } = await supabase.from(table).delete().eq('id', record.itemId);
                if (!error) {
                    await db.deleted_records.update(record.id!, { synced: 1 });
                } else {
                    console.error(`Failed to delete ${record.table} ${record.itemId}`, error);
                }
            }));
        }

        // --- 2. Push Updates/Inserts (optimized - only fetch back if needed) ---
        const now = Date.now();

        // Get all unsynced records in parallel
        const [months, budgets, transactions, bonds] = await Promise.all([
            db.months.where('synced').equals(0).toArray(),
            db.budgets.where('synced').equals(0).toArray(),
            db.transactions.where('synced').equals(0).toArray(),
            db.bonds.where('synced').equals(0).toArray()
        ]);

        // Push all tables in parallel
        const pushPromises = [];

        // Months
        if (months.length > 0) {
            pushPromises.push((async () => {
                const payload = months.map(mapMonthToSupabase);
                const { error } = await supabase.from('months').upsert(payload);
                if (!error) {
                    // Use current timestamp instead of fetching back (faster)
                    await db.months.bulkUpdate(months.map(m => ({ 
                        key: m.id, 
                        changes: { synced: 1, updatedAt: now } 
                    })));
                }
            })());
        }

        // Budgets
        if (budgets.length > 0) {
            pushPromises.push((async () => {
                const payload = budgets.map(mapBudgetToSupabase);
                const { error } = await supabase.from('budgets').upsert(payload);
                if (!error) {
                    await db.budgets.bulkUpdate(budgets.map(b => ({ 
                        key: b.id, 
                        changes: { synced: 1, updatedAt: now } 
                    })));
                }
            })());
        }

        // Transactions
        if (transactions.length > 0) {
            pushPromises.push((async () => {
                const payload = transactions.map(mapTransactionToSupabase);
                const { error } = await supabase.from('transactions').upsert(payload);
                if (!error) {
                    await db.transactions.bulkUpdate(transactions.map(t => ({ 
                        key: t.id, 
                        changes: { synced: 1, updatedAt: now } 
                    })));
                }
            })());
        }

        // Bonds
        if (bonds.length > 0) {
            pushPromises.push((async () => {
                const payload = bonds.map(mapBondToSupabase);
                const { error } = await supabase.from('bonds').upsert(payload);
                if (!error) {
                    await db.bonds.bulkUpdate(bonds.map(b => ({ 
                        key: b.id, 
                        changes: { synced: 1, updatedAt: now } 
                    })));
                }
            })());
        }

        await Promise.all(pushPromises);
    },

    async pullChanges() {
        const lastSyncISO = localStorage.getItem(SYNC_KEY) || new Date(0).toISOString();
        const nowISO = new Date().toISOString();

        // Get IDs of records with unsynced local changes to avoid overwriting them (in parallel)
        const [unsyncedMonths, unsyncedBudgets, unsyncedTransactions, unsyncedBonds] = await Promise.all([
            db.months.where('synced').equals(0).toArray(),
            db.budgets.where('synced').equals(0).toArray(),
            db.transactions.where('synced').equals(0).toArray(),
            db.bonds.where('synced').equals(0).toArray()
        ]);

        const unsyncedMonthIds = new Set(unsyncedMonths.map(m => m.id));
        const unsyncedBudgetIds = new Set(unsyncedBudgets.map(b => b.id));
        const unsyncedTransactionIds = new Set(unsyncedTransactions.map(t => t.id));
        const unsyncedBondIds = new Set(unsyncedBonds.map(b => b.id));

        // Pull all tables in parallel for better performance
        const [monthsResult, budgetsResult, transResult, bondsResult] = await Promise.all([
            supabase.from('months').select('*').gt('updated_at', lastSyncISO),
            supabase.from('budgets').select('*').gt('updated_at', lastSyncISO),
            supabase.from('transactions').select('*').gt('updated_at', lastSyncISO),
            supabase.from('bonds').select('*').gt('updated_at', lastSyncISO)
        ]);

        // Process results in parallel
        const updatePromises = [];

        // 1. Months
        if (monthsResult.data && !monthsResult.error) {
            const toUpdate = monthsResult.data
                .filter(m => !unsyncedMonthIds.has(m.id))
                .map(mapMonthFromSupabase);
            if (toUpdate.length > 0) {
                updatePromises.push(db.months.bulkPut(toUpdate));
            }
        }

        // 2. Budgets
        if (budgetsResult.data && !budgetsResult.error) {
            const toUpdate = budgetsResult.data
                .filter(b => !unsyncedBudgetIds.has(b.id))
                .map(mapBudgetFromSupabase);
            if (toUpdate.length > 0) {
                updatePromises.push(db.budgets.bulkPut(toUpdate));
            }
        }

        // 3. Transactions
        if (transResult.data && !transResult.error) {
            const toUpdate = transResult.data
                .filter(t => !unsyncedTransactionIds.has(t.id))
                .map(mapTransactionFromSupabase);
            if (toUpdate.length > 0) {
                updatePromises.push(db.transactions.bulkPut(toUpdate));
            }
        }

        // 4. Bonds
        if (bondsResult.data && !bondsResult.error) {
            const toUpdate = bondsResult.data
                .filter(b => !unsyncedBondIds.has(b.id))
                .map(mapBondFromSupabase);
            if (toUpdate.length > 0) {
                updatePromises.push(db.bonds.bulkPut(toUpdate));
            }
        }

        await Promise.all(updatePromises);
        localStorage.setItem(SYNC_KEY, nowISO);
    },

    async sync() {
        if (!supabase) return;
        // Check auth?
        const { data } = await supabase.auth.getSession();
        if (!data.session) return; // Can't sync if not logged in

        try {
            // Push first to ensure local changes are on server before pulling
            // This way, if there are conflicts, our local changes are preserved on server
            await this.pushChanges();
            // Then pull remote changes (will skip records we just pushed or have unsynced local changes)
            await this.pullChanges();
        } catch (e) {
            console.error("Sync failed", e);
        }
    },

    /**
     * Immediate sync with debouncing - syncs changes after a short delay
     * Use this when user makes changes and is online
     */
    async syncImmediate() {
        if (!supabase) return;
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;

        // Clear existing debounce timer
        if (syncDebounceTimer) {
            clearTimeout(syncDebounceTimer);
        }

        // Set new debounce timer
        syncDebounceTimer = setTimeout(async () => {
            syncDebounceTimer = null;
            await this.sync();
        }, SYNC_DEBOUNCE_MS);
    },

    /**
     * Pull ALL data from server, ignoring last sync timestamp
     * Use this to resync everything from server (e.g., after fixing sync bugs)
     * WARNING: This will overwrite local data with server data
     */
    async pullAllFromServer() {
        if (!supabase) return;
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;

        try {
            // Pull all records, ignoring lastSyncISO
            const { data: months } = await supabase.from('months').select('*');
            if (months) {
                const local = months.map(mapMonthFromSupabase);
                await db.months.bulkPut(local);
            }

            const { data: budgets } = await supabase.from('budgets').select('*');
            if (budgets) {
                const local = budgets.map(mapBudgetFromSupabase);
                await db.budgets.bulkPut(local);
            }

            const { data: transactions } = await supabase.from('transactions').select('*');
            if (transactions) {
                const local = transactions.map(mapTransactionFromSupabase);
                await db.transactions.bulkPut(local);
            }

            const { data: bonds } = await supabase.from('bonds').select('*');
            if (bonds) {
                const local = bonds.map(mapBondFromSupabase);
                await db.bonds.bulkPut(local);
            }

            // Update sync timestamp
            localStorage.setItem(SYNC_KEY, new Date().toISOString());
        } catch (e) {
            console.error("Pull all failed", e);
            throw e;
        }
    },

    /**
     * Mark all local records as unsynced so they will be pushed on next sync
     * Use this if you want to force push all local data to server
     */
    async markAllAsUnsynced() {
        try {
            await db.months.toCollection().modify(m => { m.synced = 0; });
            await db.budgets.toCollection().modify(b => { b.synced = 0; });
            await db.transactions.toCollection().modify(t => { t.synced = 0; });
            await db.bonds.toCollection().modify(b => { b.synced = 0; });
        } catch (e) {
            console.error("Mark unsynced failed", e);
            throw e;
        }
    },

    /**
     * Reset sync state - clears last sync timestamp and marks all as unsynced
     * Use this to start fresh sync
     */
    async resetSyncState() {
        localStorage.removeItem(SYNC_KEY);
        await this.markAllAsUnsynced();
    }
};
