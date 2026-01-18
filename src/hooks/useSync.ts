import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { syncService } from '@/services/syncService';

export function useSync() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [user, setUser] = useState<any>(null);
    const [hasCompletedInitialSync, setHasCompletedInitialSync] = useState(false);

    const syncNow = async (skipUserCheck = false) => {
        // Allow manual sync even if isSyncing is true? No, debounce.
        if (!skipUserCheck && (!user || isSyncing)) return;
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

    useEffect(() => {
        let mounted = true;
        let timeoutId: ReturnType<typeof setTimeout>;

        const completeSync = () => {
            if (mounted) {
                setHasCompletedInitialSync(true);
            }
        };

        // Check session
        supabase.auth.getSession().then(async ({ data }) => {
            const sessionUser = data.session?.user ?? null;
            if (!mounted) return;
            
            setUser(sessionUser);
            if (sessionUser) {
                // Auto sync on initial load if already logged in
                // Set timeout to prevent infinite loading
                timeoutId = setTimeout(() => {
                    console.warn("Initial sync timeout - completing anyway");
                    completeSync();
                }, 15000); // 15 second timeout

                try {
                    await syncNow(true);
                } catch (e) {
                    console.error("Initial sync failed:", e);
                } finally {
                    clearTimeout(timeoutId);
                    completeSync();
                }
            } else {
                // No user, mark as completed so UI can render
                setHasCompletedInitialSync(true);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return;
            
            const sessionUser = session?.user ?? null;
            setUser(sessionUser);
            if (sessionUser) {
                // Auto sync on login
                timeoutId = setTimeout(() => {
                    console.warn("Login sync timeout - completing anyway");
                    completeSync();
                }, 15000);

                try {
                    await syncNow(true);
                } catch (e) {
                    console.error("Login sync failed:", e);
                } finally {
                    clearTimeout(timeoutId);
                    completeSync();
                }
            } else {
                // Logged out, mark as completed
                setHasCompletedInitialSync(true);
            }
        });

        return () => {
            mounted = false;
            if (timeoutId) clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        // Auto sync interval if logged in
        if (!user) return;
        const interval = setInterval(() => syncNow(), 5 * 60 * 1000); // 5 min
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

    return { isSyncing, lastSyncTime, user, syncNow, hasCompletedInitialSync };
}
