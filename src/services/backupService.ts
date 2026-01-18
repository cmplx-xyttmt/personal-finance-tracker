import { db, type Month, type Budget, type Transaction, type Bond } from '@/db/db';
import { format } from 'date-fns';

export interface BackupData {
    version: string;
    exportDate: string;
    months: Month[];
    budgets: Budget[];
    transactions: Transaction[];
    bonds: Bond[];
}

export const backupService = {
    /**
     * Export all data from the database as a JSON file
     */
    async exportData(): Promise<void> {
        try {
            // Fetch all data in parallel
            const [months, budgets, transactions, bonds] = await Promise.all([
                db.months.toArray(),
                db.budgets.toArray(),
                db.transactions.toArray(),
                db.bonds.toArray()
            ]);

            const backupData: BackupData = {
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                months,
                budgets,
                transactions,
                bonds
            };

            // Create JSON blob
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            // Create download link
            const link = document.createElement('a');
            const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
            link.href = url;
            link.download = `finance_backup_${dateStr}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            throw new Error('Failed to export data. Please try again.');
        }
    },

    /**
     * Import data from a JSON file and restore it to the database
     * WARNING: This will overwrite all existing data
     */
    async importData(file: File): Promise<void> {
        try {
            // Read file
            const text = await file.text();
            const backupData: BackupData = JSON.parse(text);

            // Validate backup structure
            if (!backupData.months || !backupData.budgets || !backupData.transactions || !backupData.bonds) {
                throw new Error('Invalid backup file format');
            }

            // Clear existing data
            await Promise.all([
                db.months.clear(),
                db.budgets.clear(),
                db.transactions.clear(),
                db.bonds.clear()
            ]);

            // Restore data
            await Promise.all([
                backupData.months.length > 0 ? db.months.bulkAdd(backupData.months) : Promise.resolve(),
                backupData.budgets.length > 0 ? db.budgets.bulkAdd(backupData.budgets) : Promise.resolve(),
                backupData.transactions.length > 0 ? db.transactions.bulkAdd(backupData.transactions) : Promise.resolve(),
                backupData.bonds.length > 0 ? db.bonds.bulkAdd(backupData.bonds) : Promise.resolve()
            ]);
        } catch (error) {
            console.error('Import failed:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to import data. Please check the file format.');
        }
    }
};

