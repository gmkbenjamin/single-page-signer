import { ethers } from 'ethers';
import * as bip39 from 'bip39';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export const generateMnemonic = (): string => bip39.generateMnemonic(256);
export const validateMnemonic = (mnemonic: string): boolean => bip39.validateMnemonic(mnemonic);

export const deriveETHAddress = (mnemonic: string): string => {
    return ethers.Wallet.fromPhrase(mnemonic).address;
};

export const getWalletXPub = (mnemonic: string, path: string = "m/44'/60'/0'"): string => {
    // AirGap expects the Account Extended Public Key (m/44'/60'/0')
    const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, path); // This has private key
    return wallet.neuter().extendedKey; // .neuter() removes private key, returning xpub...
};

export const deriveSOLKeys = (mnemonic: string): { publicKey: string, secretKey: Uint8Array } => {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const kp = nacl.sign.keyPair.fromSeed(seed.slice(0, 32));
    return { publicKey: bs58.encode(kp.publicKey), secretKey: kp.secretKey };
};

/**
 * Sign standard ETH message (personal_sign)
 */
export const signEthMessage = (mnemonic: string, message: string | Uint8Array, path?: string): string => {
    const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, path || "m/44'/60'/0'/0/0");
    // personal_sign adds "\x19Ethereum Signed Message:\n" prefix
    return wallet.signingKey.sign(ethers.hashMessage(message)).serialized;
};

/**
 * Sign ETH Transaction or Typed Data
 */
export const signEthData = async (mnemonic: string, data: Uint8Array, dataType: number, path?: string): Promise<string> => {
    const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, path || "m/44'/60'/0'/0/0");

    // EIP-4527 Data Types:
    // 1: eth-transaction-data (legacy/RLP)
    // 2: eth-typed-data (EIP-712)
    // 3: eth-raw-bytes (personal_sign)
    // 4: eth-typed-transaction (EIP-2718)

    if (dataType === 3) {
        return wallet.signingKey.sign(ethers.hashMessage(data)).serialized;
    }

    if (dataType === 1 || dataType === 4) {
        // Sign raw transaction bytes - ethers signTransaction expects a transaction object usually
        // but for UR we often get the RLP to sign directly. 
        // Actually, for UR it's often the raw bytes to be hashed and signed.
        // MetaMask/Rabby expects the signature of the keccak256 of the data.
        const hash = ethers.keccak256(data);
        return wallet.signingKey.sign(hash).serialized;
    }

    if (dataType === 2) {
        // EIP-712 requires structured data parsing which is heavy. 
        // Fallback to signing the hash if possible or treating as raw.
        const hash = ethers.keccak256(data);
        return wallet.signingKey.sign(hash).serialized;
    }

    throw new Error("Unsupported data type for signing");
};

/**
 * Sign Solana Transaction
 */
export const signSolData = (mnemonic: string, data: Uint8Array): string => {
    const { secretKey } = deriveSOLKeys(mnemonic);
    const signature = nacl.sign.detached(data, secretKey);
    return Buffer.from(signature).toString('hex');
};
