import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { backupService } from '@/services/backupService';
import { Download, Upload, AlertTriangle, Loader2 } from 'lucide-react';

export function Settings() {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [importSuccess, setImportSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        setIsExporting(true);
        setImportError(null);
        try {
            await backupService.exportData();
        } catch (error) {
            setImportError(error instanceof Error ? error.message : 'Export failed');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportError(null);
        setImportSuccess(false);

        try {
            await backupService.importData(file);
            setImportSuccess(true);
            // Reload page to reflect changes
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            setImportError(error instanceof Error ? error.message : 'Import failed');
        } finally {
            setIsImporting(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground mt-2">Manage your data and preferences</p>
            </div>

            {/* Data Management */}
            <Card>
                <CardHeader>
                    <CardTitle>Data Management</CardTitle>
                    <CardDescription>Backup and restore your financial data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium">Export Backup</h3>
                        <p className="text-sm text-muted-foreground">
                            Download a JSON file containing all your data (months, budgets, transactions, and bonds).
                        </p>
                        <Button 
                            onClick={handleExport} 
                            disabled={isExporting}
                            variant="outline"
                            className="w-full md:w-auto"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4 mr-2" />
                                    Export Backup
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="border-t pt-4 space-y-2">
                        <div className="flex items-start space-x-2">
                            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Restoring from a backup file will <strong>completely replace</strong> all your current data.
                                    This action cannot be undone. Make sure you have a recent backup before proceeding.
                                </p>
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Button
                            onClick={handleImportClick}
                            disabled={isImporting}
                            variant="destructive"
                            className="w-full md:w-auto"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Restore from File
                                </>
                            )}
                        </Button>
                        {importError && (
                            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                                {importError}
                            </div>
                        )}
                        {importSuccess && (
                            <div className="bg-green-500/15 text-green-600 dark:text-green-400 text-sm p-3 rounded-md">
                                Data imported successfully! Reloading page...
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

