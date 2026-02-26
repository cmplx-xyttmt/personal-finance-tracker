import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import { formatCurrency } from "@/lib/formatters";

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTransfer: (sourceCategory: string, destBudgetId: string, amount: number) => Promise<void>;
    wealthBreakdown: { category: string; amount: number }[];
    currentBudgets: { id: string; category: string }[];
}

export function TransferModal({ isOpen, onClose, onTransfer, wealthBreakdown, currentBudgets }: TransferModalProps) {
    const [sourceCategory, setSourceCategory] = useState("");
    const [destBudgetId, setDestBudgetId] = useState("");
    const [amount, setAmount] = useState(0);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const selectedSource = wealthBreakdown.find(w => w.category === sourceCategory);

    const handleTransfer = async () => {
        if (!sourceCategory || !destBudgetId || amount <= 0) return;
        if (selectedSource && amount > selectedSource.amount) {
            if (!confirm("The transfer amount exceeds the current balance in this wealth category. Proceed anyway?")) {
                return;
            }
        }

        setLoading(true);
        try {
            await onTransfer(sourceCategory, destBudgetId, amount);
            onClose();
        } catch (error) {
            console.error("Transfer failed:", error);
            alert("Transfer failed. Check console for details.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-background shadow-lg">
                <CardHeader>
                    <CardTitle>Move Money from Wealth</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Source (Wealth Category)</label>
                        <select 
                            className="w-full p-2 border rounded bg-background"
                            value={sourceCategory}
                            onChange={(e) => setSourceCategory(e.target.value)}
                        >
                            <option value="">Select Source...</option>
                            {wealthBreakdown.map(w => (
                                <option key={w.category} value={w.category}>
                                    {w.category} ({formatCurrency(w.amount)})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Destination (Current Budget)</label>
                        <select 
                            className="w-full p-2 border rounded bg-background"
                            value={destBudgetId}
                            onChange={(e) => setDestBudgetId(e.target.value)}
                        >
                            <option value="">Select Destination...</option>
                            {currentBudgets.map(b => (
                                <option key={b.id} value={b.id}>
                                    {b.category}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Amount</label>
                        <MoneyInput value={amount} onValueChange={setAmount} />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button onClick={handleTransfer} disabled={loading || !sourceCategory || !destBudgetId || amount <= 0}>
                        {loading ? "Processing..." : "Confirm Transfer"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
