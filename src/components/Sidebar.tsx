import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Wallet, LineChart, Cpu, LogIn, LogOut, RefreshCw, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSync } from "@/hooks/useSync";
import { supabase } from "@/lib/supabase";

const navItems = [
    { name: "Planner", href: "/", icon: LayoutDashboard },
    { name: "Investments", href: "/investments", icon: Wallet },
    { name: "Simulator", href: "/simulator", icon: LineChart },
];

export function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isSyncing, lastSyncTime, user, syncNow } = useSync();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/auth");
    };

    return (
        <div className="hidden md:flex h-screen w-64 flex-col border-r bg-card text-card-foreground">
            <div className="flex h-14 items-center border-b px-4">
                <Cpu className="mr-2 h-6 w-6" />
                <span className="font-bold">FinanceTracker</span>
            </div>
            <nav className="flex-1 space-y-1 p-2">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                            "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                            location.pathname === item.href
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground"
                        )}
                    >
                        <item.icon className="mr-3 h-5 w-5" />
                        {item.name}
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t space-y-4">
                {user ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="truncate max-w-[120px]" title={user.email}>{user.email}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleLogout} title="Logout">
                                <LogOut className="h-3 w-3" />
                            </Button>
                        </div>
                        <div className="flex items-center justify-between bg-accent/20 p-2 rounded-md">
                            <div className="flex items-center space-x-2 text-sm">
                                {isSyncing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 text-green-500" />}
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground" title={lastSyncTime?.toLocaleString()}>
                                    {isSyncing ? "Syncing..." : "Synced"}
                                </span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={syncNow} disabled={isSyncing} title="Sync Now">
                                <RefreshCw className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button className="w-full" size="sm" onClick={() => navigate("/auth")}>
                        <LogIn className="h-4 w-4 mr-2" /> Login to Sync
                    </Button>
                )}
            </div>
        </div>
    );
}
