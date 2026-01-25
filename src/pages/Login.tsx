import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, AlertCircle, ArrowRight } from 'lucide-react';

export const Login = () => {
    const { unlock, isEmpty } = useAuth();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Small delay to allow UI to update
        await new Promise(r => setTimeout(r, 100));

        const success = await unlock(password);
        if (!success) {
            setError('Incorrect password');
            setLoading(false);
        }
    };

    if (isEmpty) return null; // Should be handled by Setup component

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-textMain animate-fade-in">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 bg-primary/20 rounded-2xl mb-4 text-primary">
                        <Lock size={48} />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
                    <p className="text-textMuted">Enter your password to unlock your secure vault.</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-6 shadow-xl">
                    <label className="block text-sm font-medium text-textMuted mb-2">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white mb-4 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        placeholder="••••••••"
                        autoFocus
                    />

                    {error && (
                        <div className="flex items-center gap-2 text-error text-sm mb-4 bg-error/10 p-3 rounded-lg">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-primary hover:bg-primaryHover text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? 'Unlocking...' : 'Unlock Vault'}
                        {!loading && <ArrowRight size={18} />}
                    </button>

                    <p className="mt-4 text-center text-xs text-textMuted">
                        Data stored locally. If you lose your password, your data is lost forever.
                    </p>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            if (confirm("DANGER: This will PERMANENTLY DELETE all your secrets. This action cannot be undone. Are you sure?")) {
                                localStorage.clear();
                                window.location.reload();
                            }
                        }}
                        className="text-xs text-error/70 hover:text-error hover:underline transition-colors"
                    >
                        Forgot Password? Reset & Wipe Vault
                    </button>
                </div>
            </div>
        </div>
    );
};
