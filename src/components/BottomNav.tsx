import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Wallet, LineChart, LogIn, RefreshCw, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSync } from "@/hooks/useSync";
import { supabase } from "@/lib/supabase";

const navItems = [
    { name: "Planner", href: "/", icon: LayoutDashboard },
    { name: "Investments", href: "/investments", icon: Wallet },
    { name: "Simulator", href: "/simulator", icon: LineChart },
];

export function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isSyncing, lastSyncTime, user, syncNow } = useSync();

    const handleLoginClick = () => {
        navigate("/auth");
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/auth");
    };

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t bg-background/80 backdrop-blur-lg">
            {navItems.map((item) => (
                <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                        "flex flex-1 flex-col items-center justify-center space-y-1 transition-colors hover:text-primary",
                        location.pathname === item.href
                            ? "text-primary"
                            : "text-muted-foreground"
                    )}
                >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium">{item.name}</span>
                </Link>
            ))}
            {user ? (
                <button
                    onClick={syncNow}
                    disabled={isSyncing}
                    className="flex flex-1 flex-col items-center justify-center space-y-1 transition-colors hover:text-primary text-muted-foreground disabled:opacity-50"
                    title={lastSyncTime ? `Last synced: ${lastSyncTime.toLocaleString()}` : "Sync"}
                >
                    {isSyncing ? (
                        <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    <span className="text-[10px] font-medium">Sync</span>
                </button>
            ) : (
                <button
                    onClick={handleLoginClick}
                    className="flex flex-1 flex-col items-center justify-center space-y-1 transition-colors hover:text-primary text-muted-foreground"
                >
                    <LogIn className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Login</span>
                </button>
            )}
        </nav>
    );
}
