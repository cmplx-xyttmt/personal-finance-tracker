import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Wallet, LineChart, LogIn, RefreshCw, CheckCircle, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSync } from "@/hooks/useSync";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

const navItems = [
    { name: "Planner", href: "/", icon: LayoutDashboard },
    { name: "Investments", href: "/investments", icon: Wallet },
    { name: "Simulator", href: "/simulator", icon: LineChart },
];

export function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isSyncing, lastSyncTime, user, syncNow } = useSync();
    const [showUserMenu, setShowUserMenu] = useState(false);

    const handleLoginClick = () => {
        navigate("/auth");
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/auth");
        setShowUserMenu(false);
    };

    return (
        <>
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
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex flex-1 flex-col items-center justify-center space-y-1 transition-colors hover:text-primary text-muted-foreground relative"
                        title={user.email}
                    >
                        <User className="h-5 w-5" />
                        <span className="text-[10px] font-medium">Account</span>
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

            {/* User Menu Modal */}
            {showUserMenu && user && (
                <div 
                    className="fixed inset-0 bg-black/50 z-[60] md:hidden"
                    onClick={() => setShowUserMenu(false)}
                >
                    <div 
                        className="fixed bottom-20 left-4 right-4 bg-background border rounded-lg shadow-lg p-4 space-y-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center space-x-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Logged in as</p>
                                    <p className="text-sm font-medium truncate max-w-[200px]" title={user.email}>
                                        {user.email}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowUserMenu(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                ✕
                            </button>
                        </div>

                        <button
                            onClick={() => syncNow()}
                            disabled={isSyncing}
                            className="w-full flex items-center justify-between p-3 rounded-md hover:bg-accent transition-colors disabled:opacity-50"
                        >
                            <div className="flex items-center space-x-2">
                                {isSyncing ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                                <span className="text-sm font-medium">Sync Now</span>
                            </div>
                            {lastSyncTime && (
                                <span className="text-xs text-muted-foreground">
                                    {new Date(lastSyncTime).toLocaleTimeString()}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center space-x-2 p-3 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="text-sm font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
