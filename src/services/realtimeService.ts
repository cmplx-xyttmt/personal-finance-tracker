import { supabase } from '@/lib/supabase';
import { db } from '@/db/db';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Mappers from Supabase (same as syncService)
const mapMonthFromSupabase = (s: any) => ({
    id: s.id,
    expectedIncome: s.expected_income,
    savingsGoal: s.savings_goal,
    updatedAt: new Date(s.updated_at).getTime(),
    synced: 1
});

const mapBudgetFromSupabase = (s: any) => ({
    id: s.id,
    monthId: s.month_id,
    category: s.category,
    plannedAmount: s.planned_amount,
    tag: s.tag,
    updatedAt: new Date(s.updated_at).getTime(),
    synced: 1
});

const mapTransactionFromSupabase = (s: any) => ({
    id: s.id,
    budgetId: s.budget_id,
    description: s.description,
    amount: s.amount,
    date: s.date,
    updatedAt: new Date(s.updated_at).getTime(),
    synced: 1
});

const mapBondFromSupabase = (s: any) => ({
    id: s.id,
    principal: s.amount,
    rate: s.rate,
    purchaseDate: s.purchase_date,
    durationYears: s.term_months / 12,
    updatedAt: new Date(s.updated_at).getTime(),
    synced: 1
});

let channels: RealtimeChannel[] = [];

export const realtimeService = {
    /**
     * Set up real-time subscriptions to receive push updates from other devices
     * Call this when user logs in
     */
    async subscribe() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Unsubscribe from existing channels first
        this.unsubscribe();

        // Subscribe to all tables
        const monthsChannel = supabase
            .channel('months-changes')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'months',
                    filter: `user_id=eq.${session.user.id}`
                }, 
                async (payload) => {
                    console.log('Realtime months update:', payload);
                    if (payload.eventType === 'DELETE') {
                        await db.months.delete(payload.old.id);
                    } else if (payload.new) {
                        // Only update if local record is already synced (to avoid overwriting local changes)
                        const local = await db.months.get(payload.new.id);
                        if (!local || local.synced === 1) {
                            const mapped = mapMonthFromSupabase(payload.new);
                            await db.months.put(mapped);
                        }
                    }
                }
            )
            .subscribe();

        const budgetsChannel = supabase
            .channel('budgets-changes')
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'budgets',
                    filter: `user_id=eq.${session.user.id}`
                },
                async (payload) => {
                    console.log('Realtime budgets update:', payload);
                    if (payload.eventType === 'DELETE') {
                        await db.budgets.delete(payload.old.id);
                    } else if (payload.new) {
                        // Only update if local record is already synced (to avoid overwriting local changes)
                        const local = await db.budgets.get(payload.new.id);
                        if (!local || local.synced === 1) {
                            const mapped = mapBudgetFromSupabase(payload.new);
                            await db.budgets.put(mapped);
                        }
                    }
                }
            )
            .subscribe();

        const transactionsChannel = supabase
            .channel('transactions-changes')
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'transactions',
                    filter: `user_id=eq.${session.user.id}`
                },
                async (payload) => {
                    console.log('Realtime transactions update:', payload);
                    if (payload.eventType === 'DELETE') {
                        await db.transactions.delete(payload.old.id);
                    } else if (payload.new) {
                        // Only update if local record is already synced (to avoid overwriting local changes)
                        const local = await db.transactions.get(payload.new.id);
                        if (!local || local.synced === 1) {
                            const mapped = mapTransactionFromSupabase(payload.new);
                            await db.transactions.put(mapped);
                        }
                    }
                }
            )
            .subscribe();

        const bondsChannel = supabase
            .channel('bonds-changes')
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bonds',
                    filter: `user_id=eq.${session.user.id}`
                },
                async (payload) => {
                    console.log('Realtime bonds update:', payload);
                    if (payload.eventType === 'DELETE') {
                        await db.bonds.delete(payload.old.id);
                    } else if (payload.new) {
                        // Only update if local record is already synced (to avoid overwriting local changes)
                        const local = await db.bonds.get(payload.new.id);
                        if (!local || local.synced === 1) {
                            const mapped = mapBondFromSupabase(payload.new);
                            await db.bonds.put(mapped);
                        }
                    }
                }
            )
            .subscribe();

        channels = [monthsChannel, budgetsChannel, transactionsChannel, bondsChannel];
    },

    /**
     * Unsubscribe from all real-time channels
     * Call this when user logs out
     */
    unsubscribe() {
        channels.forEach(channel => {
            supabase.removeChannel(channel);
        });
        channels = [];
    }
};

