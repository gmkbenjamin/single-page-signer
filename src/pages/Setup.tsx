import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Lock, ArrowRight } from 'lucide-react';

export const Setup = () => {
    const { setup } = useAuth();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Password length check removed
        // if (password.length < 8) { ... }

        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        await setup(password);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-textMain animate-fade-in">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 bg-primary/20 rounded-2xl mb-4 text-primary">
                        <Shield size={48} />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Setup Vault</h1>
                    <p className="text-textMuted">Set a password to encrypt your vault (optional).</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-6 shadow-xl">
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-textMuted mb-2">New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                placeholder="Optional"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-textMuted mb-2">Confirm Password</label>
                            <input
                                type="password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                placeholder="Confirm (if set)"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-error text-sm mb-4 bg-error/10 p-3 rounded-lg">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="bg-surfaceHighlight/50 p-4 rounded-lg mb-6 text-xs text-textMuted border border-border">
                        <h4 className="font-bold text-textMain mb-1 flex items-center gap-2"><Lock size={12} /> Encryption Details</h4>
                        <ul className="list-disc list-inside space-y-1 ml-1">
                            <li>AES-256-GCM Encryption</li>
                            <li>PBKDF2-SHA256 (300k iterations)</li>
                            <li>Data never leaves your device</li>
                        </ul>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-primary hover:bg-primaryHover text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? 'Encrypting...' : 'Create Vault'}
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </form>
            </div>
        </div>
    );
};

// Quick helper for error icon since I forgot to import it in the variable block above but used it in JSX
import { AlertCircle } from 'lucide-react';
