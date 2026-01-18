import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Wallet, LineChart, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { name: "Planner", href: "/", icon: LayoutDashboard },
    { name: "Investments", href: "/investments", icon: Wallet },
    { name: "Simulator", href: "/simulator", icon: LineChart },
];

export function Sidebar() {
    const location = useLocation();

    return (
        <div className="flex h-screen w-64 flex-col border-r bg-card text-card-foreground">
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
        </div>
    );
}
