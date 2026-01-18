import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { Plus, Trash2, ChevronDown, ChevronUp, TrendingUp, RefreshCw } from "lucide-react";
import { db } from "@/db/db";
import { MonthSelector } from "@/components/MonthSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { MoneyInput } from "@/components/ui/money-input";
import { BUDGET_TEMPLATE, TAG_COLORS } from "@/lib/constants";

export function Dashboard() {
    const [currentMonth, setCurrentMonth] = useState(format(new Date(), "yyyy-MM"));

    // Layout State
    const [isWealthExpanded, setIsWealthExpanded] = useState(false);

    // New Budget Form State
    const [newCategory, setNewCategory] = useState("");
    const [newPlanned, setNewPlanned] = useState(0);
    const [newTag, setNewTag] = useState("Variable");

    // --- Monthly Queries ---
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

    // --- Wealth/Historical Queries ---
    const wealthData = useLiveQuery(async () => {
        const savingBudgets = await db.budgets
            .filter(b => ["Savings", "Sinking Fund", "Growth"].includes(b.tag))
            .toArray();

        if (!savingBudgets || savingBudgets.length === 0) return { total: 0, breakdown: [] };

        const budgetIds = savingBudgets.map(b => b.id);
        const savingTrans = await db.transactions.where("budgetId").anyOf(budgetIds).toArray();

        const breakdownMap = new Map<string, number>();
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

    // --- Auto Population ---
    useEffect(() => {
        const populate = async () => {
            const count = await db.budgets.where("monthId").equals(currentMonth).count();
            if (count === 0) {
                await db.budgets.bulkAdd(BUDGET_TEMPLATE.map(t => ({
                    monthId: currentMonth,
                    category: t.category,
                    plannedAmount: t.plannedAmount,
                    tag: t.tag
                })));
            }
        };
        populate();
    }, [currentMonth]);

    // --- Sync Template ---
    // --- Sync Template ---
    const syncTemplate = async () => {
        const existingCats = budgets?.map(b => b.category) || [];
        const missing = BUDGET_TEMPLATE.filter(t => !existingCats.includes(t.category));

        // 1. Add missing categories
        if (missing.length > 0) {
            await db.budgets.bulkAdd(missing.map(t => ({
                monthId: currentMonth,
                category: t.category,
                plannedAmount: t.plannedAmount,
                tag: t.tag
            })));
        }

        // 2. Update mismatches for existing categories (Tags only)
        if (budgets) {
            const updates = [];
            for (const budget of budgets) {
                const template = BUDGET_TEMPLATE.find(t => t.category === budget.category);
                if (template && template.tag !== budget.tag) {
                    updates.push(db.budgets.update(budget.id, { tag: template.tag }));
                }
            }
            if (updates.length > 0) {
                await Promise.all(updates);
            }
        }
    };

    // --- Derived State (Monthly) ---
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

    // --- Handlers ---
    const updateIncome = async (val: number) => {
        await db.months.put({
            id: currentMonth,
            expectedIncome: val,
            savingsGoal: monthData?.savingsGoal || 0,
        });
    };

    const addBudget = async () => {
        if (!newCategory) return;
        await db.budgets.add({
            monthId: currentMonth,
            category: newCategory,
            plannedAmount: newPlanned,
            tag: newTag
        });
        setNewCategory("");
        setNewPlanned(0);
    };

    const deleteBudget = async (id: number) => {
        await db.transactions.where("budgetId").equals(id).delete();
        await db.budgets.delete(id);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Monthly Planner</h1>
                <MonthSelector currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
            </div>

            {/* Top Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-4">
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

            {/* Wealth Distribution (Collapsible) */}
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
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Budget Categories</CardTitle>
                    </div>
                    <Button variant="outline" size="sm" onClick={syncTemplate}>
                        <RefreshCw className="h-4 w-4 mr-2" /> Sync Template
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* Add Category */}
                    <div className="flex items-end space-x-2 mb-6 p-4 border rounded-lg bg-card/50">
                        <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">New Category</p>
                            <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Name" />
                        </div>
                        <div className="w-32 space-y-1">
                            <p className="text-sm font-medium">Tag</p>
                            <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Tag" />
                        </div>
                        <div className="w-32 space-y-1">
                            <p className="text-sm font-medium">Budget</p>
                            <MoneyInput value={newPlanned} onValueChange={setNewPlanned} placeholder="0" />
                        </div>
                        <Button onClick={addBudget}><Plus className="h-4 w-4 mr-2" /> Add</Button>
                    </div>

                    {/* List of Budgets */}
                    <div className="space-y-4">
                        {budgetSummaries.map(budget => (
                            <BudgetGroup key={budget.id} budget={budget} onDelete={() => deleteBudget(budget.id)} />

                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ... BudgetGroup component code ...


function BudgetGroup({ budget, onDelete }: { budget: any, onDelete: () => void }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [newTransDesc, setNewTransDesc] = useState("");
    const [newTransAmount, setNewTransAmount] = useState(0);

    const tagColor = TAG_COLORS[budget.tag] || TAG_COLORS["default"];

    const updateBudget = async (val: number) => {
        await db.budgets.update(budget.id, { plannedAmount: val });
    };

    const addTransaction = async () => {
        if (!newTransDesc && newTransAmount === 0) return;
        await db.transactions.add({
            budgetId: budget.id,
            description: newTransDesc || "Expense",
            amount: newTransAmount,
            date: new Date().toISOString()
        });
        setNewTransDesc("");
        setNewTransAmount(0);
    };

    const deleteTransaction = async (id: number) => {
        await db.transactions.delete(id);
    };

    return (
        <div className={`border rounded-lg overflow-hidden ${isExpanded ? 'ring-1 ring-primary' : ''}`}>
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
                        <div className={`h-8 flex items-center justify-end font-bold ${budget.plannedAmount - budget.actual < 0 ? 'text-destructive' : 'text-green-600'}`}>
                            {formatCurrency(budget.plannedAmount - budget.actual)}
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
                        {budget.transactions?.length === 0 && (
                            <p className="text-xs text-muted-foreground italic pl-2">No items logged yet.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
