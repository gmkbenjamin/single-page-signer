import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, ShieldCheck } from 'lucide-react';
import { useAuth, type VaultSecret } from '../contexts/AuthContext';

export const Import = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { addSecret } = useAuth();
    const request = location.state?.request;

    const [name, setName] = useState('');
    const [payloadDetails, setPayloadDetails] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // ... (rest of useEffect)

    // ... 

    // UI Display Error if present


    useEffect(() => {
        if (request?.type === 'ur:bytes' && request.payload) {
            try {
                // Determine structure: [3, [message]] -> message = [ver, type, proto, id, payload]
                // Payload is usually AccountShareResponse for AirGap
                const root = request.payload;

                let details: any = {};

                // Assume structure match (AirGap V3 Sync)
                if (Array.isArray(root) && root.length > 0) {
                    // Check for tag 3 wrapper [3, [msg]]
                    let inner = root;
                    if (inner[0] === 3 && Array.isArray(inner[1])) {
                        inner = inner[1];
                    }

                    // Now inner should be [message]
                    // message = [ver, type, proto, id, data]
                    if (Array.isArray(inner) && inner.length > 0) {
                        const msg = inner[0];
                        if (Array.isArray(msg) && msg.length >= 5) {
                            const data = msg[4];
                            // data is array: [derivation, groupId, label, isActive, isExt, masterFp, pubKey]
                            if (Array.isArray(data)) {
                                details = {
                                    label: data[2],
                                    fingerprint: data[5],
                                    publicKey: data[6],
                                    derivation: data[0]
                                };

                                // Clean up hex strings if needed
                                if (details.label && typeof details.label !== 'string') details.label = "Imported Wallet";

                                setName(details.label || "Imported Wallet");
                            }
                        }
                    }
                }

                setPayloadDetails(details);

            } catch (e) {
                console.error("Error parsing sync payload", e);
                setError("Failed to parse wallet data.");
            }
        }
    }, [request]);

    const handleSave = async () => {
        if (!payloadDetails) return;

        // Create a "Watch Only" secret? 
        // For now, we just save it as a generic "text" or "key" since we don't have full watch-only support in VaultSecret type yet?
        // Actually, let's save the extended public key if present.

        const secret: VaultSecret = {
            id: Math.random().toString(36).substring(2, 15),
            name: name,
            value: JSON.stringify(payloadDetails, null, 2), // Store mostly for reference
            type: 'text', // Marking as text for now
            createdAt: Date.now()
        };

        await addSecret(secret);
        navigate('/');
    };

    if (!request) return <div className="p-10 text-center">No Data</div>;

    return (
        <div className="max-w-md mx-auto animate-fade-in p-6">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-surfaceHighlight rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold">Import Wallet</h1>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex flex-col items-center mb-4">
                    <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mb-3">
                        <ShieldCheck size={32} />
                    </div>
                    <h2 className="text-lg font-bold">Wallet Synced</h2>
                    <p className="text-sm text-textMuted">Ready to save to vault</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-textMuted uppercase mb-1 block">Label</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-background border border-border rounded-lg p-2 text-sm"
                        />
                    </div>

                    {payloadDetails && (
                        <div className="bg-background/50 rounded-lg p-3 text-xs space-y-2 font-mono">
                            {payloadDetails.derivation && (
                                <div>
                                    <span className="text-textMuted">Path:</span> {payloadDetails.derivation}
                                </div>
                            )}
                            {payloadDetails.fingerprint && (
                                <div>
                                    <span className="text-textMuted">Fingerprint:</span> {
                                        typeof payloadDetails.fingerprint === 'string' ? payloadDetails.fingerprint :
                                            "0x" + Buffer.from(payloadDetails.fingerprint).toString('hex')
                                    }
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pt-2">
                        <label className="text-xs font-bold text-textMuted uppercase mb-1 block">Raw Payload</label>
                        <pre className="text-[10px] bg-background p-2 rounded max-h-32 overflow-auto break-all">
                            {JSON.stringify(request.json, null, 2)}
                        </pre>
                    </div>

                    {error && (
                        <div className="bg-error/10 text-error p-3 rounded-lg text-xs">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        className="w-full py-3 bg-primary hover:bg-primaryHover text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <Save size={18} /> Save to Vault
                    </button>
                </div>
            </div>
        </div>
    );
};
