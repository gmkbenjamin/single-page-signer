import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Eye, EyeOff, QrCode, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

export const Vault = () => {
    const { secrets, deleteSecret } = useAuth();
    const [revealed, setRevealed] = useState<Record<string, boolean>>({});

    // Secrets are now loaded from context

    const toggleReveal = (id: string) => {
        setRevealed(prev => ({ ...prev, [id]: !prev[id] }));
    }

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this secret?')) {
            await deleteSecret(id);
            // Context updates automatically
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    }

    if (secrets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                <div className="w-24 h-24 bg-surfaceHighlight/50 rounded-full flex items-center justify-center mb-6">
                    <Plus size={40} className="text-textMuted" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-textMain">Your Vault is Empty</h2>
                <p className="text-textMuted max-w-sm mb-8 text-sm">
                    Create your first secure key or mnemonic to get started. All data is encrypted and stored locally on your device.
                </p>
                <Link to="/generate" className="px-6 py-3 bg-primary hover:bg-primaryHover text-white rounded-lg font-medium transition-colors shadow-lg shadow-primary/20 flex items-center gap-2">
                    <Plus size={18} />
                    Create Secret
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">My Secrets</h1>
                <Link to="/generate" className="p-2 bg-primary text-white rounded-lg hover:bg-primaryHover transition-colors shadow-lg shadow-primary/20">
                    <Plus size={20} />
                </Link>
            </div>

            <div className="grid gap-4">
                <AnimatePresence>
                    {secrets.map((secret) => (
                        <motion.div
                            key={secret.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-surface border border-border rounded-xl overflow-hidden shadow-md group"
                        >
                            <div className="p-5 flex flex-col gap-4">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-surfaceHighlight rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            <QrCode size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg leading-tight">{secret.name}</h3>
                                            <span className="text-[10px] uppercase tracking-wider font-bold text-textMuted bg-surfaceHighlight px-1.5 py-0.5 rounded">{secret.type}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => toggleReveal(secret.id)}
                                            className="p-2 hover:bg-surfaceHighlight rounded text-textMuted hover:text-textMain transition-colors"
                                            title={revealed[secret.id] ? "Hide" : "Reveal"}
                                        >
                                            {revealed[secret.id] ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(secret.id)}
                                            className="p-2 hover:bg-error/10 hover:text-error rounded text-textMuted transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                {revealed[secret.id] && (
                                    <div className="p-3 bg-background/50 rounded-lg border border-border/50 relative group/code">
                                        <code className="font-mono text-xs sm:text-sm break-all text-textMuted block">
                                            {secret.value}
                                        </code>
                                        <button
                                            onClick={() => copyToClipboard(secret.value)}
                                            className="absolute top-2 right-2 p-1.5 bg-surface border border-border rounded text-textMuted hover:text-primary opacity-0 group-hover/code:opacity-100 transition-opacity"
                                            title="Copy"
                                        >
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <Link
                                        to={`/qr/${secret.id}`}
                                        className="flex-1 py-2.5 bg-surfaceHighlight hover:bg-primary hover:text-white rounded-lg text-center text-sm font-medium transition-all duration-200 border border-border hover:border-transparent flex items-center justify-center gap-2"
                                    >
                                        <QrCode size={16} />
                                        Show QR
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    )
}
