import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Wallet, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { name: "Planner", href: "/", icon: LayoutDashboard },
    { name: "Investments", href: "/investments", icon: Wallet },
    { name: "Simulator", href: "/simulator", icon: LineChart },
];

export function BottomNav() {
    const location = useLocation();

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
        </nav>
    );
}
