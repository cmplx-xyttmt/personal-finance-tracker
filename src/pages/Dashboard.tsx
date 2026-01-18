import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format, addMonths } from "date-fns";
import { Plus, Trash2, ChevronDown, ChevronUp, TrendingUp, RefreshCw, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/db/db";
import { MonthSelector } from "@/components/MonthSelector";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { MoneyInput } from "@/components/ui/money-input";
import { BUDGET_TEMPLATE, TAG_COLORS } from "@/lib/constants";
import { useSync } from "@/hooks/useSync";

export function Dashboard() {
    const [currentMonth, setCurrentMonth] = useState(format(new Date(), "yyyy-MM"));
    const { user, isSyncing, hasCompletedInitialSync } = useSync();

    // Layout State
    const [isWealthExpanded, setIsWealthExpanded] = useState(false);

    // Close Month State
    const [showCloseModal, setShowCloseModal] = useState(false);

    const [surplusAction, setSurplusAction] = useState<"rollover" | "savings">("rollover");
    const [selectedSavingsBudget, setSelectedSavingsBudget] = useState<string | null>(null);

    // New Budget Form State
    const [newCategory, setNewCategory] = useState("");
    const [newPlanned, setNewPlanned] = useState(0);
    const [newTag, setNewTag] = useState("Variable");

    // --- Queries ---
    const monthData = useLiveQuery(() => db.months.get(currentMonth), [currentMonth]);
    const budgets = useLiveQuery(() => db.budgets.where("monthId").equals(currentMonth).toArray(), [currentMonth]);
    const transactions = useLiveQuery(
        async () => {
            if (!budgets) return [];
            const budgetIds = budgets.map(b => b.id);
            return db.transactions.where("budgetId").anyOf(budgetIds).toArray();
        },
        [budgets]
    );

    const wealthData = useLiveQuery(async () => {
        const savingBudgets = await db.budgets
            .filter(b => ["Savings", "Sinking Fund", "Growth"].includes(b.tag))
            .toArray();

        if (!savingBudgets || savingBudgets.length === 0) return { total: 0, breakdown: [] };

        const budgetIds = savingBudgets.map(b => b.id);
        const savingTrans = await db.transactions.where("budgetId").anyOf(budgetIds).toArray();

        const breakdownMap = new Map<string, number>();

        savingBudgets.forEach(b => {
            if (!breakdownMap.has(b.category)) {
                breakdownMap.set(b.category, 0);
            }
        });

        savingTrans.forEach(t => {
            const parent = savingBudgets.find(b => b.id === t.budgetId);
            if (parent) {
                const current = breakdownMap.get(parent.category) || 0;
                breakdownMap.set(parent.category, current + t.amount);
            }
        });

        const breakdown = Array.from(breakdownMap.entries()).map(([category, amount]) => ({ category, amount }));
        const total = breakdown.reduce((sum, item) => sum + item.amount, 0);

        return { total, breakdown };
    });

    // --- Auto Population & Sync ---
    useEffect(() => {
        const populate = async () => {
            // If user is logged in, wait for sync to complete before populating
            // This prevents creating default data that overwrites synced data
            if (user && isSyncing) {
                return; // Wait for sync to finish
            }

            try {
                // Fetch actual existing budgets for this month
                const existingBudgets = await db.budgets.where("monthId").equals(currentMonth).toArray();
                
                // Only auto-populate if there are NO budgets at all for this month
                // If user is logged in and has synced data, don't create defaults
                if (user && existingBudgets.length > 0) {
                    // User is logged in and has data - don't auto-populate
                    // Just ensure month record exists
                    const month = await db.months.get(currentMonth);
                    if (!month) {
                        await db.months.put({
                            id: currentMonth,
                            expectedIncome: 0,
                            savingsGoal: 0,
                            updatedAt: Date.now(),
                            synced: 0
                        });
                    }
                    return;
                }

                // Only populate missing categories if not logged in OR if truly no data exists
                const existingCats = new Set(existingBudgets.map(b => b.category));
                const missing = BUDGET_TEMPLATE.filter(t => !existingCats.has(t.category));

                if (missing.length > 0) {
                    await db.budgets.bulkAdd(missing.map(t => ({
                        id: crypto.randomUUID(),
                        monthId: currentMonth,
                        category: t.category,
                        plannedAmount: t.plannedAmount,
                        tag: t.tag,
                        updatedAt: Date.now(),
                        synced: user ? 0 : 1 // Mark as unsynced if logged in, synced if not
                    })));
                }

                // Also ensure a month record exists
                const month = await db.months.get(currentMonth);
                if (!month) {
                    await db.months.put({
                        id: currentMonth,
                        expectedIncome: 0,
                        savingsGoal: 0,
                        updatedAt: Date.now(),
                        synced: user ? 0 : 1
                    });
                }
            } catch (error) {
                console.error("Auto-population failed:", error);
            }
        };
        
        // Small delay to let sync complete if user just logged in
        const timeoutId = setTimeout(populate, user ? 1000 : 0);
        return () => clearTimeout(timeoutId);
    }, [currentMonth, user, isSyncing]);

    const syncTemplate = async () => {
        try {
            const existingBudgets = await db.budgets.where("monthId").equals(currentMonth).toArray();
            const existingCats = new Set(existingBudgets.map(b => b.category));

            const missing = BUDGET_TEMPLATE.filter(t => !existingCats.has(t.category));

            if (missing.length > 0) {
                await db.budgets.bulkAdd(missing.map(t => ({
                    id: crypto.randomUUID(),
                    monthId: currentMonth,
                    category: t.category,
                    plannedAmount: t.plannedAmount,
                    tag: t.tag,
                    updatedAt: Date.now(),
                    synced: 0
                })));
            }

            // Also update tags for existing ones if they changed in template
            const updates = [];
            for (const budget of existingBudgets) {
                const template = BUDGET_TEMPLATE.find(t => t.category === budget.category);
                if (template && template.tag !== budget.tag) {
                    updates.push(db.budgets.update(budget.id, {
                        tag: template.tag,
                        updatedAt: Date.now(),
                        synced: 0
                    }));
                }
            }
            if (updates.length > 0) await Promise.all(updates);
        } catch (error) {
            console.error("Sync template failed:", error);
        }
    };

    // --- Derived State ---
    const expectedIncome = monthData?.expectedIncome || 0;

    const budgetSummaries = budgets?.map(budget => {
        const budgetTrans = transactions?.filter(t => t.budgetId === budget.id) || [];
        const actual = budgetTrans.reduce((sum, t) => sum + t.amount, 0);
        return { ...budget, actual, transactions: budgetTrans };
    }) || [];

    const totalPlanned = budgetSummaries.reduce((sum, b) => sum + b.plannedAmount, 0);
    const totalActual = budgetSummaries.reduce((sum, b) => sum + b.actual, 0);
    const savings = expectedIncome - totalActual;
    const bankBalance = expectedIncome - totalActual;

    // --- Close Month Logic ---
    const handleCloseMonthClick = () => {
        setShowCloseModal(true);
    };

    const processCloseMonth = async () => {
        const nextMonth = format(addMonths(new Date(currentMonth + "-01"), 1), "yyyy-MM");

        const nextBudgetsCount = await db.budgets.where("monthId").equals(nextMonth).count();
        if (nextBudgetsCount === 0) {
            await db.budgets.bulkAdd(BUDGET_TEMPLATE.map(t => ({
                id: crypto.randomUUID(),
                monthId: nextMonth,
                category: t.category,
                plannedAmount: t.plannedAmount,
                tag: t.tag,
                updatedAt: Date.now(),
                synced: 0
            })));
        }

        if (savings > 0) {
            if (surplusAction === "savings" && selectedSavingsBudget) {
                await db.transactions.add({
                    id: crypto.randomUUID(),
                    budgetId: selectedSavingsBudget,
                    description: "Month-End Surplus Transfer",
                    amount: savings,
                    date: new Date().toISOString(),
                    updatedAt: Date.now(),
                    synced: 0
                });
            } else {
                const rolloverBudgetID = crypto.randomUUID();
                await db.budgets.add({
                    id: rolloverBudgetID,
                    monthId: nextMonth,
                    category: "Rollover Adjustment",
                    plannedAmount: 0,
                    tag: "Fixed",
                    updatedAt: Date.now(),
                    synced: 0
                });

                await db.transactions.add({
                    id: crypto.randomUUID(),
                    budgetId: rolloverBudgetID,
                    description: "Rollover from previous month",
                    amount: -savings,
                    date: new Date().toISOString(),
                    updatedAt: Date.now(),
                    synced: 0
                });
            }
        }
        else if (savings < 0) {
            const rolloverBudgetID = crypto.randomUUID();
            await db.budgets.add({
                id: rolloverBudgetID,
                monthId: nextMonth,
                category: "Rollover Adjustment",
                plannedAmount: 0,
                tag: "Fixed",
                updatedAt: Date.now(),
                synced: 0
            });

            await db.transactions.add({
                id: crypto.randomUUID(),
                budgetId: rolloverBudgetID,
                description: "Debt from previous month",
                amount: Math.abs(savings),
                date: new Date().toISOString(),
                updatedAt: Date.now(),
                synced: 0
            });
        }

        const nextMonthData = await db.months.get(nextMonth);
        if (!nextMonthData) {
            await db.months.put({
                id: nextMonth,
                expectedIncome: expectedIncome,
                savingsGoal: 0,
                updatedAt: Date.now(),
                synced: 0
            });
        }

        setShowCloseModal(false);
        setCurrentMonth(nextMonth);
    };

    // --- Handlers (Existing) ---
    const updateIncome = async (val: number) => {
        await db.months.put({
            id: currentMonth,
            expectedIncome: val,
            savingsGoal: monthData?.savingsGoal || 0,
            updatedAt: Date.now(),
            synced: 0
        });
    };

    const addBudget = async () => {
        if (!newCategory) return;
        await db.budgets.add({
            id: crypto.randomUUID(),
            monthId: currentMonth,
            category: newCategory,
            plannedAmount: newPlanned,
            tag: newTag,
            updatedAt: Date.now(),
            synced: 0
        });
        setNewCategory("");
        setNewPlanned(0);
    };

    const deleteBudget = async (id: string) => {
        await db.transaction('rw', [db.transactions, db.budgets, db.deleted_records], async () => {
            const trans = await db.transactions.where("budgetId").equals(id).toArray();
            const transIds = trans.map(t => t.id);

            if (transIds.length > 0) {
                await db.deleted_records.bulkAdd(transIds.map(tid => ({ itemId: tid, table: 'transactions', updatedAt: Date.now(), synced: 0 })));
                await db.transactions.bulkDelete(transIds);
            }

            await db.deleted_records.add({ itemId: id, table: 'budgets', updatedAt: Date.now(), synced: 0 });
            await db.budgets.delete(id);
        });
    };

    // Helpers for formatting
    const savingsOptions = budgetSummaries?.filter(b => ["Savings", "Sinking Fund", "Growth"].includes(b.tag)) || [];

    // Show loading state while waiting for initial sync when logged in
    if (user && !hasCompletedInitialSync) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Syncing data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl md:text-3xl font-bold">Monthly Planner</h1>
                <div className="flex items-center space-x-2 md:space-x-4">
                    <Button variant="destructive" size="sm" onClick={handleCloseMonthClick}>Close Month</Button>
                    <MonthSelector currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Expected Income</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-2">
                            <span className="text-2xl font-bold">UGX</span>
                            <MoneyInput
                                className="text-2xl font-bold h-10 w-full border-none shadow-none focus-visible:ring-0 px-0"
                                value={expectedIncome}
                                onValueChange={updateIncome}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalActual)}</div>
                        <p className="text-xs text-muted-foreground">
                            Planned: {formatCurrency(totalPlanned)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${bankBalance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                            {formatCurrency(bankBalance)}
                        </div>
                        <p className="text-xs text-muted-foreground">Operating Cash</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${savings >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {formatCurrency(savings)}
                        </div>
                        <p className="text-xs text-muted-foreground">Budget vs Actual</p>
                    </CardContent>
                </Card>
            </div>

            {/* Wealth Distribution */}
            <Card className="bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900">
                <CardHeader className="cursor-pointer select-none py-4" onClick={() => setIsWealthExpanded(!isWealthExpanded)}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                            <div className="flex items-baseline space-x-2">
                                <CardTitle className="text-lg">Wealth Distribution</CardTitle>
                                <span className="text-sm font-medium text-emerald-700">
                                    {formatCurrency(wealthData?.total || 0)}
                                </span>
                            </div>
                        </div>
                        {isWealthExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                </CardHeader>
                {isWealthExpanded && (
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                            {wealthData?.breakdown.map((item) => (
                                <div key={item.category} className="flex items-center justify-between text-sm border p-2 rounded bg-background/50">
                                    <span className="font-medium">{item.category}</span>
                                    <span>{formatCurrency(item.amount)}</span>
                                </div>
                            ))}
                            {wealthData?.breakdown.length === 0 && (
                                <p className="text-sm text-muted-foreground italic col-span-full">No savings accumulated yet.</p>
                            )}
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Main Budget Section */}
            <Card>
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Budget Categories</CardTitle>
                    </div>
                    <Button variant="outline" size="sm" onClick={syncTemplate} className="w-full md:w-auto">
                        <RefreshCw className="h-4 w-4 mr-2" /> Sync Template
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* Add Category */}
                    <div className="flex flex-col md:flex-row md:items-end gap-3 mb-6 p-4 border rounded-lg bg-card/50">
                        <div className="flex-1 space-y-1">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">New Category</p>
                            <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Name" className="h-12 md:h-10" />
                        </div>
                        <div className="grid grid-cols-2 md:flex gap-3">
                            <div className="md:w-32 space-y-1">
                                <p className="text-[10px] font-bold uppercase text-muted-foreground">Tag</p>
                                <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Tag" className="h-12 md:h-10" />
                            </div>
                            <div className="md:w-32 space-y-1">
                                <p className="text-[10px] font-bold uppercase text-muted-foreground">Budget</p>
                                <MoneyInput value={newPlanned} onValueChange={setNewPlanned} placeholder="0" className="h-12 md:h-10" />
                            </div>
                        </div>
                        <Button className="w-full md:w-auto h-12 md:h-10" onClick={addBudget}><Plus className="h-4 w-4 mr-2" /> Add Category</Button>
                    </div>

                    {/* List of Budgets */}
                    <div className="space-y-4">
                        {budgetSummaries.map(budget => (
                            <BudgetGroup key={budget.id} budget={budget} onDelete={() => deleteBudget(budget.id)} />
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Close Month Modal Overlay */}
            {showCloseModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md bg-background shadow-lg">
                        <CardHeader>
                            <CardTitle>Close Month: {currentMonth}</CardTitle>
                            <CardDescription>
                                {savings >= 0 ? "You have a surplus!" : "You have a deficit."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center py-4">
                                <p className="text-sm text-muted-foreground">Net Result</p>
                                <div className={`text-4xl font-bold ${savings >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {formatCurrency(savings)}
                                </div>
                            </div>

                            {/* Surplus Options */}
                            {savings > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="radio"
                                            id="rollover"
                                            name="action"
                                            checked={surplusAction === "rollover"}
                                            onChange={() => setSurplusAction("rollover")}
                                        />
                                        <label htmlFor="rollover" className="text-sm font-medium">Carry Over to Next Month</label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="radio"
                                            id="savings"
                                            name="action"
                                            checked={surplusAction === "savings"}
                                            onChange={() => setSurplusAction("savings")}
                                        />
                                        <label htmlFor="savings" className="text-sm font-medium">Add to Savings / Fund</label>
                                    </div>

                                    {surplusAction === "savings" && (
                                        <select
                                            className="w-full p-2 border rounded mt-2 text-sm"
                                            onChange={(e) => setSelectedSavingsBudget(e.target.value)}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Select Fund...</option>
                                            {savingsOptions.map(b => (
                                                <option key={b.id} value={b.id}>{b.category} ({formatCurrency(b.actual)})</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}

                            {/* Deficit Message */}
                            {savings < 0 && (
                                <div className="bg-red-50 text-red-800 p-3 rounded text-sm flex items-start space-x-2">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    <p>This deficit will be deducted significantly from next month's available budget.</p>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="ghost" onClick={() => setShowCloseModal(false)}>Cancel</Button>
                            <Button onClick={processCloseMonth}>
                                Confirm & Next Month <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
}

function BudgetGroup({ budget, onDelete }: { budget: any, onDelete: () => void }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showMobileLog, setShowMobileLog] = useState(false);
    const [newTransDesc, setNewTransDesc] = useState("");
    const [newTransAmount, setNewTransAmount] = useState(0);

    const tagColor = TAG_COLORS[budget.tag] || TAG_COLORS["default"];
    const percent = Math.min(Math.round((budget.actual / budget.plannedAmount) * 100) || 0, 100);
    const remaining = budget.plannedAmount - budget.actual;

    const updateBudget = async (val: number) => {
        await db.budgets.update(budget.id, { plannedAmount: val });
    };

    const addTransaction = async () => {
        if (!newTransDesc && newTransAmount === 0) return;
        await db.transactions.add({
            id: crypto.randomUUID(),
            budgetId: budget.id,
            description: newTransDesc || "Expense",
            amount: newTransAmount,
            date: new Date().toISOString(),
            updatedAt: Date.now(),
            synced: 0
        });
        setNewTransDesc("");
        setNewTransAmount(0);
        setShowMobileLog(false);
    };

    const deleteTransaction = async (id: string) => {
        await db.transaction('rw', [db.transactions, db.deleted_records], async () => {
            await db.deleted_records.add({ itemId: id, table: 'transactions', updatedAt: Date.now(), synced: 0 });
            await db.transactions.delete(id);
        });
    };

    return (
        <div className="space-y-2">
            {/* Desktop View (Table-like Row) */}
            <div className={`hidden md:block border rounded-lg overflow-hidden ${isExpanded ? 'ring-1 ring-primary' : ''}`}>
                <div className="flex items-center p-3 bg-card/40 hover:bg-card/60 transition-colors">
                    <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="mr-2">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>

                    <div className="flex-1 flex items-center space-x-3">
                        <span className="font-medium text-lg">{budget.category}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border border-opacity-50 ${tagColor}`}>
                            {budget.tag}
                        </span>
                    </div>

                    <div className="flex items-center space-x-6 mr-4">
                        <div className="text-right">
                            <p className="text-[10px] text-muted-foreground uppercase opacity-70">Planned</p>
                            <MoneyInput
                                value={budget.plannedAmount}
                                onValueChange={updateBudget}
                                className="h-8 w-28 text-right bg-transparent border-transparent hover:border-input focus:bg-background"
                            />
                        </div>
                        <div className="text-right w-28">
                            <p className="text-[10px] text-muted-foreground uppercase opacity-70">Actual</p>
                            <div className="h-8 flex items-center justify-end font-bold">
                                {formatCurrency(budget.actual)}
                            </div>
                        </div>
                        <div className="text-right w-24">
                            <p className="text-[10px] text-muted-foreground uppercase opacity-70">Remaining</p>
                            <div className={`h-8 flex items-center justify-end font-bold ${remaining < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                {formatCurrency(remaining)}
                            </div>
                        </div>
                    </div>

                    <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>

                {isExpanded && (
                    <div className="bg-secondary/20 p-4 border-t space-y-3">
                        <div className="flex items-center space-x-2 mb-2">
                            <div className="flex-1">
                                <Input
                                    placeholder="Log description"
                                    value={newTransDesc}
                                    onChange={e => setNewTransDesc(e.target.value)}
                                    className="h-8"
                                />
                            </div>
                            <div className="w-32">
                                <MoneyInput
                                    value={newTransAmount}
                                    onValueChange={setNewTransAmount}
                                    placeholder="Amount"
                                    className="h-8"
                                />
                            </div>
                            <Button size="sm" onClick={addTransaction}>Log</Button>
                        </div>

                        <div className="space-y-1 pl-2">
                            {budget.transactions && budget.transactions.map((t: any) => (
                                <div key={t.id} className="flex items-center justify-between text-sm p-1 hover:bg-black/5 rounded group relative">
                                    <div className="flex items-center text-muted-foreground">
                                        <span className="w-20 text-[10px] opacity-70">{format(new Date(t.date), "MMM d")}</span>
                                        <span className="font-medium text-foreground">{t.description}</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span>{formatCurrency(t.amount)}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                            onClick={() => deleteTransaction(t.id)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile View (Card) */}
            <div
                className="md:hidden border rounded-xl p-4 bg-card shadow-sm space-y-3 active:scale-[0.98] transition-transform"
                onClick={() => setShowMobileLog(true)}
            >
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-gray-900 leading-tight">{budget.category}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border border-opacity-50 mt-1 inline-block ${tagColor}`}>
                            {budget.tag}
                        </span>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Remaining</p>
                        <p className={`text-lg font-black ${remaining < 0 ? 'text-destructive' : 'text-primary'}`}>
                            {formatCurrency(remaining)}
                        </p>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full transition-all duration-500",
                                percent > 90 ? "bg-destructive" : percent > 70 ? "bg-orange-500" : "bg-primary"
                            )}
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                        <span>{formatCurrency(budget.actual)} spent</span>
                        <span>{formatCurrency(budget.plannedAmount)} goal</span>
                    </div>
                </div>
            </div>

            {/* Mobile Transaction Modal */}
            {showMobileLog && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-end md:hidden">
                    <div className="bg-background w-full rounded-t-3xl p-6 pb-12 animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold">{budget.category}</h3>
                                <p className="text-sm text-muted-foreground">Log new transaction</p>
                            </div>
                            <Button variant="ghost" className="rounded-full" onClick={(e) => { e.stopPropagation(); setShowMobileLog(false); }}>✕</Button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Description</label>
                                <Input
                                    placeholder="Food, Groceries, etc."
                                    className="h-14 text-lg"
                                    value={newTransDesc}
                                    onChange={e => setNewTransDesc(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Amount (UGX)</label>
                                <MoneyInput
                                    className="h-14 text-2xl font-black"
                                    value={newTransAmount}
                                    onValueChange={setNewTransAmount}
                                />
                            </div>

                            <Button className="w-full h-14 text-lg font-bold" onClick={addTransaction}>
                                Save Transaction
                            </Button>

                            <div className="pt-4 border-t">
                                <p className="text-xs font-bold uppercase text-muted-foreground mb-3">Recent Logs</p>
                                <div className="space-y-3 max-h-40 overflow-y-auto">
                                    {budget.transactions?.map((t: any) => (
                                        <div key={t.id} className="flex justify-between items-center">
                                            <div>
                                                <p className="font-medium">{t.description}</p>
                                                <p className="text-[10px] text-muted-foreground">{format(new Date(t.date), "MMM d, h:mm a")}</p>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <span className="font-bold">{formatCurrency(t.amount)}</span>
                                                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => deleteTransaction(t.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {budget.transactions?.length === 0 && <p className="text-sm italic text-muted-foreground">No transactions yet.</p>}
                                </div>
                            </div>

                            <Button variant="outline" className="w-full h-12 border-destructive text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); setShowMobileLog(false); }}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete Budget Category
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
