import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth, type VaultSecret } from '../contexts/AuthContext';
import { ArrowLeft, Copy, Eye, EyeOff } from 'lucide-react';
import { deriveETHAddress, deriveSOLKeys } from '../utils/wallets';
import { generateAirGapUrBytes, generateUrCryptoHdKey, generateBackpackUr } from '../utils/ur';
import clsx from 'clsx';

type Tab = 'secret' | 'eth' | 'sol';
type UrFormat = 'airgap' | 'metamask' | 'backpack';

export const ShowQR = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { secrets } = useAuth();
    const [secret, setSecret] = useState<VaultSecret | null>(null);
    const [tab, setTab] = useState<Tab>('secret');
    const [showKey, setShowKey] = useState(false);
    const [isUR, setIsUR] = useState(false);
    const [urFormat, setUrFormat] = useState<UrFormat>('airgap');

    // Derived Data
    const [ethAddr, setEthAddr] = useState('');
    const [solAddr, setSolAddr] = useState('');

    useEffect(() => {
        const found = secrets.find(s => s.id === id);
        if (found) {
            setSecret(found);
            if (found.type === 'mnemonic') {
                try {
                    setEthAddr(deriveETHAddress(found.value));
                    setSolAddr(deriveSOLKeys(found.value).publicKey);
                    setTab('eth'); // Default to ETH for mnemonics
                } catch (e) {
                    console.error("Derivation failed", e);
                }
            } else {
                setTab('secret');
            }
        } else {
            navigate('/');
        }
    }, [id, navigate, secrets]);

    if (!secret) return null;

    const handleTabChange = (newTab: Tab) => {
        if (newTab === 'secret') {
            if (!window.confirm("WARNING: You are about to display your unencrypted private secret. Ensure you are in a safe location. Continue?")) {
                return;
            }
        }
        setTab(newTab);
        if (newTab === 'secret') setIsUR(false);
        if (newTab === 'sol') setUrFormat('backpack');
        if (newTab === 'eth') setUrFormat('metamask');
    };

    const getCurrentValue = (): string => {
        if (isUR) {
            let res: any;
            if (tab === 'eth') {
                res = urFormat === 'airgap' ? generateAirGapUrBytes(secret.value, secret.name) : generateUrCryptoHdKey(secret.value, secret.name);
            } else if (tab === 'sol') {
                res = generateBackpackUr(secret.value);
            }
            return res?.ur || "";
        }

        switch (tab) {
            case 'eth': return ethAddr;
            case 'sol': return solAddr;
            default: return secret.value;
        }
    };

    const getCurrentJson = (): any => {
        if (!isUR) return null;
        let res: any;
        if (tab === 'eth') {
            res = urFormat === 'airgap' ? generateAirGapUrBytes(secret.value, secret.name) : generateUrCryptoHdKey(secret.value, secret.name);
        } else if (tab === 'sol') {
            res = generateBackpackUr(secret.value);
        }
        return res?.json || null;
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(getCurrentValue());
        alert("Copied to clipboard!");
    };

    return (
        <div className="flex flex-col items-center h-full animate-fade-in pb-10">
            {/* Header */}
            <div className="w-full max-w-2xl flex items-center justify-between mb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-surfaceHighlight rounded-full transition-colors flex items-center gap-2 text-textMuted hover:text-textMain">
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>
                <div className="text-center">
                    <h1 className="text-xl font-bold">{secret.name}</h1>
                    <span className="text-xs uppercase text-textMuted bg-surfaceHighlight px-2 rounded-full">{secret.type}</span>
                </div>
                <div className="w-10" />
            </div>

            {/* Main Tabs */}
            {secret.type === 'mnemonic' && (
                <>
                    <div className="flex gap-2 mb-4 bg-surface p-1 rounded-xl border border-border">
                        <button onClick={() => handleTabChange('eth')} className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-all", tab === 'eth' ? "bg-[#627eea] text-white shadow" : "text-textMuted hover:text-textMain")}>Ethereum</button>
                        <button onClick={() => handleTabChange('sol')} className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-all", tab === 'sol' ? "bg-[#14f195] text-black shadow" : "text-textMuted hover:text-textMain")}>Solana</button>
                        <button onClick={() => handleTabChange('secret')} className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-all", tab === 'secret' ? "bg-error/10 text-error hover:bg-error/20" : "text-textMuted hover:text-textMain")}>Show Secret</button>
                    </div>

                    {/* UR Mode Selection */}
                    {tab !== 'secret' && (
                        <div className="flex flex-col items-center gap-3 mb-6">
                            <div className="flex gap-2 items-center bg-surfaceHighlight/30 p-1 rounded-lg">
                                <button
                                    onClick={() => setIsUR(false)}
                                    className={clsx("px-3 py-1 text-xs rounded-md transition-all font-bold", !isUR ? "bg-surface shadow text-textMain" : "text-textMuted hover:text-textMain")}
                                >
                                    Standard Address
                                </button>
                                <button
                                    onClick={() => setIsUR(true)}
                                    className={clsx("px-3 py-1 text-xs rounded-md transition-all font-bold", isUR ? "bg-primary text-white shadow" : "text-textMuted hover:text-textMain")}
                                >
                                    Account Share (UR)
                                </button>
                            </div>

                            {isUR && tab === 'eth' && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setUrFormat('metamask')}
                                        className={clsx(
                                            "px-3 py-1 text-[10px] uppercase tracking-wider rounded border transition-all",
                                            urFormat === 'metamask' ? "border-primary text-primary bg-primary/5" : "border-border text-textMuted"
                                        )}
                                    >
                                        MetaMask/Rabby
                                    </button>
                                    <button
                                        onClick={() => setUrFormat('airgap')}
                                        className={clsx(
                                            "px-3 py-1 text-[10px] uppercase tracking-wider rounded border transition-all",
                                            urFormat === 'airgap' ? "border-primary text-primary bg-primary/5" : "border-border text-textMuted"
                                        )}
                                    >
                                        AirGap Wallet
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* QR Card */}
            <div className="bg-white p-4 rounded-xl shadow-2xl mb-6">
                <QRCodeSVG
                    value={getCurrentValue()}
                    size={280}
                    level={"L"}
                    includeMargin={true}
                />
            </div>

            {/* Info Box */}
            <div className="w-full max-w-md bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-textMuted uppercase font-bold tracking-wider">
                        {isUR ? "UR Encoded Data" : (tab === 'secret' ? "Secret Content" : "Public Address")}
                    </span>
                    <div className="flex gap-2">
                        {tab === 'secret' && !isUR && (
                            <button onClick={() => setShowKey(!showKey)} className="text-textMuted hover:text-primary">
                                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        )}
                        <button onClick={copyToClipboard} className="text-textMuted hover:text-primary">
                            <Copy size={16} />
                        </button>
                    </div>
                </div>

                <code className="block font-mono text-[10px] break-all text-textMain bg-background p-3 rounded border border-border h-24 overflow-y-auto">
                    {(tab !== 'secret' || showKey) ? getCurrentValue() : "••••••••••••••••••••••••"}
                </code>
            </div>

            {/* Decoded Content (JSON) */}
            {isUR && (
                <div className="w-full max-w-md bg-surface border border-border rounded-xl p-4 mt-4 border-l-4 border-l-primary">
                    <h3 className="text-[10px] text-primary uppercase font-black tracking-widest mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Human Readable Payload (Decoded)
                    </h3>
                    <div className="bg-background/80 p-3 rounded-lg border border-border/50">
                        <pre className="font-mono text-[9px] text-textMain leading-normal overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(getCurrentJson(), null, 2)}
                        </pre>
                    </div>
                </div>
            )}

            {/* Warning for Secrets */}
            {tab === 'secret' && (
                <div className="w-full max-w-md mt-4 p-3 bg-error/10 border border-error/20 rounded-lg flex gap-3 items-start">
                    <div className="text-error mt-0.5"><EyeOff size={18} /></div>
                    <div>
                        <h4 className="text-error text-sm font-bold">Private Secret Displayed</h4>
                        <p className="text-textMuted text-[11px]">
                            This QR code contains your **unencrypted private seed**.
                            Anyone who scans this can access your funds.
                        </p>
                    </div>
                </div>
            )}

            {/* Data Details */}
            <div className="w-full max-w-md mt-6 pt-4 border-t border-border">
                <h3 className="text-xs font-bold mb-2 text-textMain uppercase tracking-tighter opacity-50">Technical Details</h3>
                <div className="grid grid-cols-[100px_1fr] gap-1 text-[10px]">
                    <div className="text-textMuted">Format:</div>
                    <div className="font-mono text-primary">
                        {isUR ? (urFormat === 'metamask' ? "UR:CRYPTO-HDKEY" : (tab === 'sol' ? "UR:CRYPTO-MULTI-ACCOUNTS" : "UR:BYTES")) :
                            (tab === 'secret' ? "BIP39 Mnemonic" : "Address")}
                    </div>

                    <div className="text-textMuted">Compatible:</div>
                    <div className="text-textMain">
                        {isUR ? (urFormat === 'metamask' ? "MetaMask, Rabby, imToken" : (tab === 'sol' ? "Backpack, Phantom" : "AirGap Wallet")) : "Standard Wallets"}
                    </div>

                    <div className="text-textMuted">Length:</div>
                    <div className="font-mono text-textMain">{getCurrentValue().length} characters</div>
                </div>
            </div>

            <p className="mt-8 text-textMuted max-w-sm text-center text-xs opacity-70">
                {isUR ?
                    `Scan with your choosing wallet app to import as a watch-only account.` :
                    "Scan to transfer the address or secret."
                }
            </p>
        </div>
    );
};
