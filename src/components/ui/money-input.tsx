import * as React from "react"
import { Input } from "@/components/ui/input"
import type { InputProps } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface MoneyInputProps extends Omit<InputProps, "value" | "onChange"> {
    value: number
    onValueChange: (value: number) => void
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
    ({ className, value, onValueChange, ...props }, ref) => {
        const [displayValue, setDisplayValue] = React.useState("")

        React.useEffect(() => {
            // Format on external value change if not focused or if vastly different?
            // Simple strategy: Always format valid numbers to locale string
            const formatted = new Intl.NumberFormat("en-US").format(value)
            setDisplayValue(value === 0 && displayValue === "" ? "" : formatted)
        }, [value])

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const inputValue = e.target.value

            // Allow digits and commas only
            const rawValue = inputValue.replace(/,/g, "")

            if (rawValue === "") {
                setDisplayValue("")
                onValueChange(0)
                return
            }

            if (!/^\d*$/.test(rawValue)) {
                return // Ignore non-digits
            }

            const numberValue = parseInt(rawValue, 10)
            setDisplayValue(new Intl.NumberFormat("en-US").format(numberValue))
            onValueChange(numberValue)
        }

        return (
            <Input
                key="money-input"
                type="text"
                inputMode="numeric"
                className={cn(className)}
                value={displayValue}
                onChange={handleChange}
                ref={ref}
                {...props}
            />
        )
    }
)
MoneyInput.displayName = "MoneyInput"
