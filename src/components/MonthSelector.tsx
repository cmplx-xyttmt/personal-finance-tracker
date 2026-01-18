import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, format, subMonths, parse } from "date-fns";

interface MonthSelectorProps {
    currentMonth: string; // YYYY-MM
    onMonthChange: (month: string) => void;
}

export function MonthSelector({ currentMonth, onMonthChange }: MonthSelectorProps) {
    const date = parse(currentMonth, "yyyy-MM", new Date());

    const handlePrevious = () => {
        onMonthChange(format(subMonths(date, 1), "yyyy-MM"));
    };

    const handleNext = () => {
        onMonthChange(format(addMonths(date, 1), "yyyy-MM"));
    };

    return (
        <div className="flex items-center space-x-4">
            <Button variant="outline" size="icon" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold w-40 text-center">
                {format(date, "MMMM yyyy")}
            </h2>
            <Button variant="outline" size="icon" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
