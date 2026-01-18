import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

export function Layout() {
    const location = useLocation();
    const isAuthPage = location.pathname === "/auth";
    
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />
            <main className={`flex-1 overflow-y-auto p-4 md:p-8 ${isAuthPage ? 'pb-4' : 'pb-20 md:pb-8'}`}>
                <Outlet />
            </main>
            {!isAuthPage && <BottomNav />}
        </div>
    );
}
