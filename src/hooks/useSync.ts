import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { syncService } from '@/services/syncService';

export function useSync() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        // Check session
        supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                // Auto sync on login
                syncNow();
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        // Auto sync interval if logged in
        if (!user) return;
        const interval = setInterval(syncNow, 5 * 60 * 1000); // 5 min
        return () => clearInterval(interval);
    }, [user]);

    // Listen to online status
    useEffect(() => {
        const handleOnline = () => {
            if (user) syncNow();
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [user]);

    const syncNow = async () => {
        // Allow manual sync even if isSyncing is true? No, debounce.
        if (!user || isSyncing) return;
        setIsSyncing(true);
        try {
            await syncService.sync();
            setLastSyncTime(new Date());
        } catch (e) {
            console.error("Sync error:", e);
        } finally {
            setIsSyncing(false);
        }
    };

    return { isSyncing, lastSyncTime, user, syncNow };
}
