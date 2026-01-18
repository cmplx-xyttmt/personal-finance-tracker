export const BUDGET_TEMPLATE = [
    { category: "Household Maintenance & Utilities", plannedAmount: 200000, tag: "Variable" },
    { category: "Cats & Pets", plannedAmount: 250000, tag: "Variable" },
    { category: "Car Fuel", plannedAmount: 500000, tag: "Variable" },
    { category: "Car Garage (Sinking Fund)", plannedAmount: 200000, tag: "Sinking Fund" },
    { category: "Weekly Groceries", plannedAmount: 720000, tag: "Variable" },
    { category: "Sports & Fitness", plannedAmount: 320000, tag: "Lifestyle" },
    { category: "Co-working Space", plannedAmount: 360000, tag: "Variable" },
    { category: "Subscriptions", plannedAmount: 72000, tag: "Fixed" },
    { category: "Dating & Social", plannedAmount: 400000, tag: "Lifestyle" },
    { category: "Travel Fund", plannedAmount: 500000, tag: "Savings" },
    { category: "Emergency Buffer", plannedAmount: 2300000, tag: "Sinking Fund" },
    { category: "Internet", plannedAmount: 250000, tag: "Fixed" },
    { category: "Medical Sinking Fund", plannedAmount: 100000, tag: "Sinking Fund" }
];

export const TAG_COLORS: Record<string, string> = {
    "Fixed": "bg-blue-100 text-blue-800 border-blue-200",
    "Variable": "bg-orange-100 text-orange-800 border-orange-200",
    "Sinking Fund": "bg-purple-100 text-purple-800 border-purple-200",
    "Lifestyle": "bg-pink-100 text-pink-800 border-pink-200",
    "Growth": "bg-green-100 text-green-800 border-green-200",
    "Savings": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "default": "bg-gray-100 text-gray-800 border-gray-200"
};
