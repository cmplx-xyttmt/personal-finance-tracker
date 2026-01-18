export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-UG", {
        style: "currency",
        currency: "UGX",
        minimumFractionDigits: 0, // UGX typically doesn't use cents
        maximumFractionDigits: 0,
    }).format(amount);
};
