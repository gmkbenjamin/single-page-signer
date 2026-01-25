import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Save, Key, FileText, ArrowLeft } from 'lucide-react';
import { generateMnemonic } from '../utils/wallets';
import { useAuth, type VaultSecret } from '../contexts/AuthContext';
import clsx from 'clsx';

const generateId = () => Math.random().toString(36).substring(2, 15);

export const Generate = () => {
    const navigate = useNavigate();
    const [type, setType] = useState<'mnemonic' | 'text'>('mnemonic');
    const [name, setName] = useState('');
    const [value, setValue] = useState('');
    const [generated, setGenerated] = useState(false);

    const handleGenerate = () => {
        if (type === 'mnemonic') {
            const mnemonic = generateMnemonic();
            setValue(mnemonic);

            // Generate a random name using 3 random words from a temporary mnemonic
            // We use a separate generation to avoid leaking any words from the actual secret
            const tempWords = generateMnemonic().split(' ');
            const randomName = `${tempWords[0]}-${tempWords[1]}-${tempWords[2]}`;
            setName(randomName); // Capitalize first letter? nice to have but raw words are fine

            setGenerated(true);
        }
    };

    const { addSecret } = useAuth();

    // ...

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !value) return;

        const secret: VaultSecret = {
            id: generateId(),
            name,
            value,
            type,
            createdAt: Date.now(),
        };

        await addSecret(secret);
        navigate('/');
    };

    return (
        <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-surfaceHighlight rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold">Create Secret</h1>
            </div>

            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                <div className="flex gap-4 mb-6 border-b border-border pb-6">
                    <button
                        onClick={() => { setType('mnemonic'); setGenerated(false); setValue('') }}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            type === 'mnemonic' ? "bg-primary text-white" : "text-textMuted hover:text-textMain hover:bg-surfaceHighlight"
                        )}
                    >
                        <Key size={16} /> Mnemonic
                    </button>
                    <button
                        onClick={() => { setType('text'); setValue('') }}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            type === 'text' ? "bg-primary text-white" : "text-textMuted hover:text-textMain hover:bg-surfaceHighlight"
                        )}
                    >
                        <FileText size={16} /> Text / Key
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-textMuted mb-1">Label Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Main Wallet"
                            className="w-full bg-background border border-border rounded-lg px-4 py-2 text-textMain focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-textMuted mb-2 flex justify-between">
                            Secret Content
                            {type === 'mnemonic' && (
                                <button
                                    type="button"
                                    onClick={handleGenerate}
                                    className="text-primary text-xs flex items-center gap-1 hover:underline"
                                >
                                    <RefreshCw size={12} /> Generate Random
                                </button>
                            )}
                        </label>

                        <textarea
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={type === 'mnemonic' ? "Generate or paste 12/24 words..." : "Enter your private key or secret text..."}
                            className="w-full h-32 bg-background border border-border rounded-lg p-4 font-mono text-sm text-textMain focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
                            readOnly={type === 'mnemonic' && generated} // If generated, maybe read only until edited?
                            required
                        />
                        {type === 'mnemonic' && generated && (
                            <p className="text-xs text-primary mt-2">
                                Write this down! This mnemonic will generate your keys.
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={!name || !value}
                            className="px-6 py-2 bg-success text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Save size={18} />
                            Save to Vault
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
