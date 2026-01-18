import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AuthPage({ onLogin }: { onLogin?: () => void }) {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');

    const handleAuth = async () => {
        setLoading(true);
        setError(null);
        try {
            if (mode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
            }
            if (onLogin) {
                onLogin();
            } else {
                navigate('/');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader>
                    <CardTitle className="text-xl md:text-2xl">{mode === 'signin' ? 'Sign In' : 'Create Account'}</CardTitle>
                    <CardDescription className="text-sm">
                        {mode === 'signin' ? 'Welcome back to your finance tracker' : 'Start tracking your wealth today'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                            {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <Input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-11 md:h-10"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Password</label>
                        <Input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-11 md:h-10"
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-3 pb-6 md:pb-4">
                    <Button className="w-full h-11 md:h-10 text-base md:text-sm" onClick={handleAuth} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {mode === 'signin' ? 'Sign In' : 'Sign Up'}
                    </Button>
                    <Button
                        variant="link"
                        className="w-full text-sm text-muted-foreground h-auto py-2"
                        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                    >
                        {mode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
