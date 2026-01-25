import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Check, ShieldAlert, FileJson, Copy, CheckCircle2, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { signEthData, signSolData, getWalletXPub } from '../utils/wallets';
import { generateEthSignatureUr, generateSolSignatureUr, generateEthSignatureEip4527 } from '../utils/ur';
import clsx from 'clsx';

export const SignConfirm = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { secrets } = useAuth();
    const request = location.state?.request;

    const [selectedSecretId, setSelectedSecretId] = useState(secrets[0]?.id || "");
    const [signatureUr, setSignatureUr] = useState<string | null>(null);
    const [isSigning, setIsSigning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showRaw, setShowRaw] = useState(false);

    if (!request) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <ShieldAlert size={48} className="text-error mb-4" />
                <h2 className="text-xl font-bold mb-2">Invalid Request</h2>
                <p className="text-textMuted mb-6">No transaction data found to sign.</p>
                <button onClick={() => navigate('/scan')} className="px-6 py-2 bg-surfaceHighlight rounded-lg">Go Back</button>
            </div>
        );
    }

    const handleSign = async () => {
        const secret = secrets.find(s => s.id === selectedSecretId);
        if (!secret) return;

        setIsSigning(true);
        setError(null);

        try {
            // Ensure payload is a clean Uint8Array
            let payload: Uint8Array;
            if (typeof request.payload === 'string') {
                payload = request.payload.startsWith('0x')
                    ? new Uint8Array(Buffer.from(request.payload.slice(2), 'hex'))
                    : new TextEncoder().encode(request.payload);
            } else {
                payload = new Uint8Array(request.payload);
            }

            let sig: string;
            let ur: string;

            if (request.type === 'sol-sign-request') {
                sig = signSolData(secret.value, payload);
                ur = generateSolSignatureUr(sig, request.id);
            } else {
                sig = await signEthData(
                    secret.value,
                    payload,
                    request.dataType,
                    request.derivationPath
                );

                // ID might be integer (AirGap) or UUID string (Standard).
                // request.isAirGap is set by parseUrData if envelope was AirGap (UR:BYTES).

                if (request.isAirGap) {
                    const xpub = getWalletXPub(secret.value, request.derivationPath || "m/44'/60'/0'");
                    ur = generateEthSignatureUr(sig, request.id, payload, xpub);
                } else {
                    // Standard EIP-4527 (MetaMask / Rabby / imToken)
                    ur = generateEthSignatureEip4527(sig, request.id);
                }
            }
            setSignatureUr(ur);
        } catch (e: any) {
            setError(e.message || "Signing failed");
        } finally {
            setIsSigning(false);
        }
    };

    const copySignature = () => {
        if (signatureUr) {
            navigator.clipboard.writeText(signatureUr.split('/')[1]); // Just the body or whole thing?
            // Usually wallets want the whole UR: prefix
            navigator.clipboard.writeText(signatureUr);
            alert("Signature copied!");
        }
    };

    return (
        <div className="flex flex-col items-center h-full animate-fade-in pb-10 px-4 max-w-lg mx-auto overflow-y-auto">
            <div className="w-full flex items-center justify-between mb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-surfaceHighlight rounded-full text-textMuted hover:text-textMain transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold">Confirm Signature</h1>
                <div className="w-9" />
            </div>

            {!signatureUr ? (
                <div className="w-full space-y-6">
                    {/* Request Details */}
                    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                        <div className="flex items-center gap-3 border-b border-border pb-3">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                <FileJson size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold">{request.origin || "Unknown Origin"}</h3>
                                <p className="text-[10px] text-textMuted uppercase tracking-wider">
                                    {request.type === 'sol-sign-request' ? "Solana Transaction" : (request.dataType === 3 ? "Message Signing" : "Legacy Transaction")}
                                    {request.chainId ? ` • Chain ID: ${request.chainId}` : ""}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] text-textMuted uppercase font-black mb-1 block">Recipient / Address</label>
                                <code className="block text-xs break-all bg-background/50 p-2 rounded border border-border/50">
                                    {request.address || "Any"}
                                </code>
                            </div>

                            <div>
                                <label className="text-[10px] text-textMuted uppercase font-black mb-1 block">Derivation Path</label>
                                <code className="block text-xs bg-background/50 p-2 rounded border border-border/50 text-success font-bold">
                                    {request.derivationPath || "Default"}
                                </code>
                            </div>

                            {request.dataType === 3 && (
                                <div>
                                    <label className="text-[10px] text-textMuted uppercase font-black mb-1 block">Message Content</label>
                                    <pre className="text-[10px] p-3 bg-background/80 rounded border border-border overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
                                        {(() => {
                                            const val = request.payload;
                                            if (typeof val === 'string') {
                                                // Check if it's hex and decodable to utf8
                                                if (val.startsWith('0x')) {
                                                    try {
                                                        const decoded = Buffer.from(val.slice(2), 'hex').toString('utf8');
                                                        // If mostly printable characters, show decoded
                                                        if (/^[\x20-\x7E\s]*$/.test(decoded)) return decoded;
                                                    } catch (e) { }
                                                }
                                                return val;
                                            } else if (val instanceof Uint8Array) {
                                                return Buffer.from(val).toString('utf8');
                                            } else {
                                                return JSON.stringify(request.json, null, 2);
                                            }
                                        })()}
                                    </pre>
                                </div>
                            )}

                            {/* Raw UR Display */}
                            <div className="pt-2">
                                <label className="text-[10px] text-textMuted uppercase font-black mb-1 block flex items-center gap-1">
                                    <Eye size={10} /> Original UR Request
                                </label>
                                <code className="block text-[9px] font-mono break-all bg-background/30 p-2 rounded border border-border/30 opacity-60 max-h-16 overflow-y-auto">
                                    {request.original_ur || "No UR available"}
                                </code>
                            </div>

                            {/* Human Readable Toggle */}
                            <div className="pt-2">
                                <button
                                    onClick={() => setShowRaw(!showRaw)}
                                    className="flex items-center gap-2 text-[10px] text-primary uppercase font-black tracking-widest hover:opacity-80 transition-opacity"
                                >
                                    {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    {showRaw ? "Hide Decoded Payload" : "Show Decoded Payload (JSON)"}
                                </button>

                                {showRaw && (
                                    <div className="mt-2 bg-background/80 p-3 rounded-lg border border-border/50 animate-fade-in">
                                        <pre className="font-mono text-[9px] text-textMain leading-normal overflow-x-auto whitespace-pre-wrap">
                                            {JSON.stringify(request.json, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Wallet Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-textMuted ml-1">Select Wallet to Sign With</label>
                        <div className="grid gap-2">
                            {secrets.filter(s => s.type === 'mnemonic').map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setSelectedSecretId(s.id)}
                                    className={clsx(
                                        "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                                        selectedSecretId === s.id ? "bg-primary/5 border-primary shadow-sm" : "bg-surface border-border hover:border-surfaceHighlight"
                                    )}
                                >
                                    <div>
                                        <div className="font-bold text-sm">{s.name}</div>
                                        <div className="text-[10px] text-textMuted break-all opacity-60">ID: {s.id.slice(0, 16)}...</div>
                                    </div>
                                    {selectedSecretId === s.id && <Check size={18} className="text-primary" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-xs">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleSign}
                        disabled={isSigning || secrets.length === 0}
                        className="w-full py-4 bg-primary hover:bg-primaryHover text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:translate-y-0 active:scale-95"
                    >
                        {isSigning ? "Signing..." : "Approve and Sign"}
                    </button>

                    <p className="text-center text-[10px] text-textMuted italic">
                        By signing, you authorizing this transaction using your airgapped private key.
                    </p>
                </div>
            ) : (
                <div className="w-full flex flex-col items-center animate-slide-up">
                    <div className="mb-6 flex flex-col items-center">
                        <div className="w-12 h-12 bg-success/10 text-success rounded-full flex items-center justify-center mb-2">
                            <CheckCircle2 size={24} />
                        </div>
                        <h2 className="text-xl font-bold">Transaction Signed</h2>
                        <p className="text-xs text-textMuted">Scan this signature with your online wallet</p>
                    </div>

                    <div className="bg-white p-4 rounded-3xl shadow-2xl mb-6 ring-1 ring-black/5">
                        <QRCodeSVG value={signatureUr} size={280} level="M" includeMargin={true} />
                    </div>

                    <div className="w-full bg-surface border border-border rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-textMuted uppercase font-black tracking-widest">{signatureUr.split('/')[0]}</span>
                            <button onClick={copySignature} className="p-1 hover:bg-surfaceHighlight rounded transition-colors">
                                <Copy size={14} className="text-textMuted" />
                            </button>
                        </div>
                        <code className="block font-mono text-[9px] break-all bg-background/50 p-2 rounded border border-border/50 max-h-20 overflow-y-auto">
                            {signatureUr}
                        </code>
                    </div>

                    <button
                        onClick={() => navigate('/')}
                        className="w-full mt-8 py-3 bg-surfaceHighlight hover:bg-surface border border-border rounded-xl font-bold transition-all"
                    >
                        Done
                    </button>
                </div>
            )}
        </div>
    );
};
