import React, { createContext, useContext, useEffect, useState } from 'react';
import { type EncryptedVaultData, decryptVault, encryptVault } from '../utils/crypto';

// Re-export VaultSecret type for convenience
export interface VaultSecret {
    id: string;
    name: string;
    value: string;
    type: 'mnemonic' | 'private_key' | 'text';
    createdAt: number;
}

const VAULT_KEY = 'airgap_vault_data';

interface AuthContextType {
    isLocked: boolean;
    isEmpty: boolean;
    secrets: VaultSecret[];
    pk: string | null; // Password cache (optional, or just keep derived key in memory if we wanted to be super secure, but string pass is easier for re-encryption)

    unlock: (password: string) => Promise<boolean>;
    setup: (password: string) => Promise<void>;
    lock: () => void;
    addSecret: (secret: VaultSecret) => Promise<void>;
    deleteSecret: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isLocked, setIsLocked] = useState(true);
    const [isEmpty, setIsEmpty] = useState(true);
    const [secrets, setSecrets] = useState<VaultSecret[]>([]);
    const [password, setPassword] = useState<string | null>(null);

    // Initial check
    useEffect(() => {
        const stored = localStorage.getItem(VAULT_KEY);
        if (stored) {
            setIsEmpty(false);
            setIsLocked(true);
        } else {
            setIsEmpty(true);
            setIsLocked(true); // Technically locked until setup
        }
    }, []);

    const unlock = async (pwd: string): Promise<boolean> => {
        const stored = localStorage.getItem(VAULT_KEY);
        if (!stored) return false;

        try {
            const encryptedData: EncryptedVaultData = JSON.parse(stored);
            const decryptedSecrets = await decryptVault(encryptedData, pwd);
            setSecrets(decryptedSecrets);
            setPassword(pwd);
            setIsLocked(false);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const setup = async (pwd: string) => {
        // Create empty vault
        const data: VaultSecret[] = [];
        const encrypted = await encryptVault(data, pwd);
        localStorage.setItem(VAULT_KEY, JSON.stringify(encrypted));

        setPassword(pwd);
        setSecrets(data);
        setIsEmpty(false);
        setIsLocked(false);
    };

    const lock = () => {
        setSecrets([]);
        setPassword(null);
        setIsLocked(true);
    };

    const addSecret = async (secret: VaultSecret) => {
        if (password === null) throw new Error("Vault is locked");

        const updated = [...secrets, secret];
        const encrypted = await encryptVault(updated, password);
        localStorage.setItem(VAULT_KEY, JSON.stringify(encrypted));
        setSecrets(updated);
    };

    const deleteSecret = async (id: string) => {
        if (password === null) throw new Error("Vault is locked");

        const updated = secrets.filter(s => s.id !== id);
        const encrypted = await encryptVault(updated, password);
        localStorage.setItem(VAULT_KEY, JSON.stringify(encrypted));
        setSecrets(updated);
    };

    return (
        <AuthContext.Provider value={{
            isLocked,
            isEmpty,
            secrets,
            pk: password,
            unlock,
            setup,
            lock,
            addSecret,
            deleteSecret
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
