import { encode, decode, addExtension, Encoder } from 'cbor-x';
import { deflateSync, gunzipSync } from 'fflate';
import { ethers } from 'ethers';
import { deriveSOLKeys } from './wallets';
import bs58 from 'bs58';

// --- CBOR Setup ---
class Tag303 { public value: any; constructor(value: any) { this.value = value; } }
class Tag304 { public value: any; constructor(value: any) { this.value = value; } }
class Tag1103 { public value: any; constructor(value: any) { this.value = value; } }
class Tag37 { public value: any; constructor(value: any) { this.value = value; } }

const registerExtensions = () => {
    addExtension({ Class: Tag303, tag: 303, encode(i: any, e: any) { return e(i.value); }, decode(d: any) { return new Tag303(d); } });
    addExtension({ Class: Tag304, tag: 304, encode(i: any, e: any) { return e(i.value); }, decode(d: any) { return new Tag304(d); } });
    addExtension({ Class: Tag1103, tag: 1103, encode(i: any, e: any) { return e(i.value); }, decode(d: any) { return new Tag1103(d); } });
    addExtension({ Class: Tag37, tag: 37, encode(i: any, e: any) { return e(i.value); }, decode(d: any) { return new Tag37(d); } });
};
registerExtensions();

// EXACT Bytewords list
const BYTEWORDS = [
    "able", "acid", "also", "apex", "aqua", "arch", "atom", "aunt",
    "away", "axis", "back", "bald", "barn", "belt", "beta", "bias",
    "blue", "body", "brag", "brew", "bulb", "buzz", "calm", "cash",
    "cats", "chef", "city", "claw", "code", "cola", "cook", "cost",
    "crux", "curl", "cusp", "cyan", "dark", "data", "days", "deli",
    "dice", "diet", "door", "down", "draw", "drop", "drum", "dull",
    "duty", "each", "easy", "echo", "edge", "epic", "even", "exam",
    "exit", "eyes", "fact", "fair", "fern", "figs", "film", "fish",
    "fizz", "flap", "flew", "flux", "foxy", "free", "frog", "fuel",
    "fund", "gala", "game", "gear", "gems", "gift", "girl", "glow",
    "good", "gray", "grim", "guru", "gush", "gyro", "half", "hang",
    "hard", "hawk", "heat", "help", "high", "hill", "holy", "hope",
    "horn", "huts", "iced", "idea", "idle", "inch", "inky", "into",
    "iris", "iron", "item", "jade", "jazz", "join", "jolt", "jowl",
    "judo", "jugs", "jump", "junk", "jury", "keep", "keno", "kept",
    "keys", "kick", "kiln", "king", "kite", "kiwi", "knob", "lamb",
    "lava", "lazy", "leaf", "legs", "liar", "limp", "lion", "list",
    "logo", "loud", "love", "luau", "luck", "lung", "main", "many",
    "math", "maze", "memo", "menu", "meow", "mild", "mint", "miss",
    "monk", "nail", "navy", "need", "news", "next", "noon", "note",
    "numb", "obey", "oboe", "omit", "onyx", "open", "oval", "owls",
    "paid", "part", "peck", "play", "plus", "poem", "pool", "pose",
    "puff", "puma", "purr", "quad", "quiz", "race", "ramp", "real",
    "redo", "rich", "road", "rock", "roof", "ruby", "ruin", "runs",
    "rust", "safe", "saga", "scar", "sets", "silk", "skew", "slot",
    "soap", "solo", "song", "stub", "surf", "swan", "taco", "task",
    "taxi", "tent", "tied", "time", "tiny", "toil", "tomb", "toys",
    "trip", "tuna", "twin", "ugly", "undo", "unit", "urge", "user",
    "vast", "very", "veto", "vial", "vibe", "view", "visa", "void",
    "vows", "wall", "wand", "warm", "wasp", "wave", "waxy", "webs",
    "what", "when", "whiz", "wolf", "work", "yank", "yawn", "yell",
    "yoga", "yurt", "zaps", "zero", "zest", "zinc", "zone", "zoom"
];

const BYTEWORDS_LOOKUP: { [key: string]: number } = {};
for (let i = 0; i < BYTEWORDS.length; i++) {
    const word = BYTEWORDS[i];
    const key = word[0] + word[word.length - 1];
    BYTEWORDS_LOOKUP[key] = i;
}

function bytewordsDecode(encoded: string): Uint8Array {
    const data: number[] = [];
    for (let i = 0; i < encoded.length; i += 2) {
        const pair = encoded.slice(i, i + 2);
        if (BYTEWORDS_LOOKUP[pair] !== undefined) {
            data.push(BYTEWORDS_LOOKUP[pair]);
        }
    }
    if (data.length < 4) return new Uint8Array(data);
    return new Uint8Array(data.slice(0, -4));
}

function bytewordsEncode(data: Uint8Array): string {
    const crc = crc32(data);
    const combined = new Uint8Array(data.length + 4);
    combined.set(data);
    new DataView(combined.buffer).setUint32(data.length, crc, false);
    let res = "";
    for (let i = 0; i < combined.length; i++) {
        const w = BYTEWORDS[combined[i]];
        res += w[0] + w[w.length - 1];
    }
    return res;
}

const CRC_TABLE = new Int32Array(256);
for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    CRC_TABLE[i] = c;
}

function crc32(data: Uint8Array): number {
    let crc = -1;
    for (let i = 0; i < data.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xFF];
    return (crc ^ -1) >>> 0;
}

function pakoGzip(data: Uint8Array): Uint8Array {
    const header = new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03]);
    const compressed = deflateSync(data, { level: 6 });
    const trailer = new Uint8Array(8);
    const view = new DataView(trailer.buffer);
    view.setUint32(0, crc32(data), true); view.setUint32(4, data.length, true);
    const result = new Uint8Array(header.length + compressed.length + trailer.length);
    result.set(header); result.set(compressed, header.length); result.set(trailer, header.length + compressed.length);
    return result;
}

export const jsonify = (obj: any): any => {
    if (obj instanceof Map) {
        const out: any = {};
        for (const [k, v] of obj.entries()) out[k] = jsonify(v);
        return out;
    }
    if (Array.isArray(obj)) return obj.map(jsonify);
    if (obj instanceof Tag303 || obj instanceof Tag304 || obj instanceof Tag1103 || obj instanceof Tag37) {
        return { _tag: obj.constructor.name.replace('Tag', ''), value: jsonify(obj.value) }
    }
    if (Buffer.isBuffer(obj)) return `0x${obj.toString('hex')}`;
    if (obj instanceof Uint8Array) return `0x${Buffer.from(obj).toString('hex')}`;
    return obj;
};

// --- Xoshiro256 ---
class Xoshiro256 {
    private s: bigint[] = [0n, 0n, 0n, 0n];
    private static MAX_UINT64 = 0xFFFFFFFFFFFFFFFFn;

    private setS(arr: Uint8Array) {
        for (let i = 0; i < 4; i++) {
            const o = i * 8;
            let v = 0n;
            for (let n = 0; n < 8; n++) {
                v <<= 8n;
                v |= BigInt(arr[o + n]);
            }
            this.s[i] = v;
        }
    }

    static fromBytes(seed: Uint8Array): Xoshiro256 {
        const digest = ethers.getBytes(ethers.sha256(seed));
        const x = new Xoshiro256();
        x.setS(digest);
        return x;
    }

    private rotl(x: bigint, k: number): bigint {
        return ((x << BigInt(k)) | (x >> BigInt(64 - k))) & Xoshiro256.MAX_UINT64;
    }

    next(): bigint {
        const result = (this.rotl((this.s[1] * 5n) & Xoshiro256.MAX_UINT64, 7) * 9n) & Xoshiro256.MAX_UINT64;
        const t = (this.s[1] << 17n) & Xoshiro256.MAX_UINT64;
        this.s[2] ^= this.s[0];
        this.s[3] ^= this.s[1];
        this.s[1] ^= this.s[2];
        this.s[0] ^= this.s[3];
        this.s[2] ^= t;
        this.s[3] = this.rotl(this.s[3], 45) & Xoshiro256.MAX_UINT64;
        return result;
    }

    nextDouble(): number {
        return Number(this.next()) / (Number(Xoshiro256.MAX_UINT64) + 1);
    }

    nextInt(low: number, high: number): number {
        return Math.floor(this.nextDouble() * (high - low + 1) + low);
    }
}

// --- Random Sampler ---
class RandomSampler {
    private probs: number[];
    private aliases: number[];

    constructor(probabilities: number[]) {
        const n = probabilities.length;
        this.probs = new Array(n).fill(0);
        this.aliases = new Array(n).fill(0);

        const total = probabilities.reduce((a, b) => a + b, 0);
        const probs = probabilities.map(p => (p / total) * n);

        const small: number[] = [];
        const large: number[] = [];

        probs.forEach((p, i) => (p < 1.0 ? small : large).push(i));

        while (small.length > 0 && large.length > 0) {
            const less = small.pop()!;
            const more = large.pop()!;
            this.probs[less] = probs[less];
            this.aliases[less] = more;
            probs[more] = (probs[more] + probs[less]) - 1.0;
            (probs[more] < 1.0 ? small : large).push(more);
        }

        for (const i of [...large, ...small]) {
            this.probs[i] = 1.0;
        }
    }

    next(randomFunc: () => number): number {
        const r1 = randomFunc();
        const r2 = randomFunc();
        const n = this.probs.length;
        const i = Math.floor(r1 * n);
        return r2 < this.probs[i] ? i : this.aliases[i];
    }
}

function shuffled<T>(items: T[], rng: Xoshiro256): T[] {
    const remaining = [...items];
    const result: T[] = [];
    while (remaining.length > 0) {
        const index = rng.nextInt(0, remaining.length - 1);
        result.push(remaining.splice(index, 1)[0]);
    }
    return result;
}

function chooseDegree(seqLen: number, rng: Xoshiro256): number {
    const probs: number[] = [];
    for (let i = 1; i <= seqLen; i++) { probs.push(1.0 / i); }
    return new RandomSampler(probs).next(() => rng.nextDouble()) + 1;
}

function intToBytes(n: number): Uint8Array {
    const arr = new Uint8Array(4);
    arr[0] = (n >> 24) & 0xFF; arr[1] = (n >> 16) & 0xFF;
    arr[2] = (n >> 8) & 0xFF; arr[3] = n & 0xFF;
    return arr;
}

function chooseFragments(seqNum: number, seqLen: number, checksum: number): Set<number> {
    if (seqNum <= seqLen) return new Set([seqNum - 1]);
    const seed = new Uint8Array([...intToBytes(seqNum), ...intToBytes(checksum)]);
    const rng = Xoshiro256.fromBytes(seed);
    const degree = chooseDegree(seqLen, rng);
    const indexes = Array.from({ length: seqLen }, (_, i) => i);
    return new Set(shuffled(indexes, rng).slice(0, degree));
}

function xorInto(target: Uint8Array, source: Uint8Array) {
    for (let i = 0; i < target.length; i++) target[i] ^= source[i];
}

class FountainPart {
    indexes: Set<number>;
    data: Uint8Array;
    constructor(indexes: Set<number>, data: Uint8Array) {
        this.indexes = indexes;
        this.data = data;
    }
    isSimple() { return this.indexes.size === 1; }
    index(): number { return this.indexes.values().next().value!; }
}

class FountainDecoder {
    receivedPartIndexes = new Set<number>();
    processedPartsCount = 0;
    resultValue: Uint8Array | null = null;
    expectedPartCount: number | null = null;
    expectedMessageLen: number | null = null;
    expectedChecksum: number | null = null;
    expectedFragmentLen: number | null = null;
    simpleParts = new Map<number, FountainPart>();
    mixedParts = new Map<string, FountainPart>();
    queuedParts: FountainPart[] = [];

    receivePart(seqNum: number, total: number, size: number, checksum: number, data: Uint8Array): boolean {
        if (this.resultValue) return false;
        if (!this.validatePart(total, size, checksum, data.length)) return false;

        const indexes = chooseFragments(seqNum, total, checksum);
        const part = new FountainPart(indexes, new Uint8Array(data));
        this.queuedParts.push(part);

        while (!this.resultValue && this.queuedParts.length > 0) {
            const p = this.queuedParts.shift()!;
            if (p.isSimple()) this.processSimplePart(p);
            else this.processMixedPart(p);
        }
        this.processedPartsCount++;
        return true;
    }

    private validatePart(total: number, size: number, checksum: number, dataLen: number): boolean {
        if (this.expectedPartCount === null) {
            this.expectedPartCount = total;
            this.expectedMessageLen = size;
            this.expectedChecksum = checksum;
            this.expectedFragmentLen = dataLen;
        } else {
            if (this.expectedPartCount !== total || this.expectedMessageLen !== size ||
                this.expectedChecksum !== checksum || this.expectedFragmentLen !== dataLen) {
                return false;
            }
        }
        return true;
    }

    private processSimplePart(part: FountainPart) {
        const idx = part.index();
        if (this.receivedPartIndexes.has(idx)) return;
        this.simpleParts.set(idx, part);
        this.receivedPartIndexes.add(idx);

        if (this.receivedPartIndexes.size === this.expectedPartCount && this.expectedPartCount > 0) {
            const sorted = Array.from(this.simpleParts.values()).sort((a, b) => a.index() - b.index());
            const firstPartLen = sorted[0]?.data.length || 0;
            const combined = new Uint8Array(sorted.length * firstPartLen);
            let offset = 0;
            for (const p of sorted) {
                combined.set(p.data, offset);
                offset += p.data.length;
            }
            const finalMessage = combined.slice(0, this.expectedMessageLen || 0);
            if (crc32(finalMessage) !== this.expectedChecksum) {
                console.error("Checksum mismatch!");
                this.reset();
                return;
            }
            this.resultValue = finalMessage;
        } else {
            this.reduceMixedBy(part);
        }
    }

    private processMixedPart(part: FountainPart) {
        const key = Array.from(part.indexes).sort().join(',');
        if (this.mixedParts.has(key)) return;

        let reduced = part;
        for (const p of Array.from(this.simpleParts.values())) {
            reduced = this.reducePart(reduced, p);
        }
        for (const p of Array.from(this.mixedParts.values())) {
            reduced = this.reducePart(reduced, p);
        }

        if (reduced.isSimple()) {
            this.queuedParts.push(reduced);
        } else {
            this.reduceMixedBy(reduced);
            const newKey = Array.from(reduced.indexes).sort().join(',');
            this.mixedParts.set(newKey, reduced);
        }
    }

    private reduceMixedBy(part: FountainPart) {
        const newMixed = new Map<string, FountainPart>();
        for (const m of Array.from(this.mixedParts.values())) {
            const reduced = this.reducePart(m, part);
            if (reduced.isSimple()) {
                this.queuedParts.push(reduced);
            } else {
                const key = Array.from(reduced.indexes).sort().join(',');
                newMixed.set(key, reduced);
            }
        }
        this.mixedParts = newMixed;
    }

    private reducePart(a: FountainPart, b: FountainPart): FountainPart {
        const isSubset = Array.from(b.indexes).every(idx => a.indexes.has(idx));
        if (isSubset && a.indexes.size > b.indexes.size) {
            const newIndexes = new Set(a.indexes);
            for (const idx of b.indexes) newIndexes.delete(idx);
            const newData = new Uint8Array(a.data);
            xorInto(newData, b.data);
            return new FountainPart(newIndexes, newData);
        }
        return a;
    }

    private reset() {
        this.receivedPartIndexes.clear();
        this.simpleParts.clear();
        this.mixedParts.clear();
        this.queuedParts = [];
        this.processedPartsCount = 0;
    }
}

let activeDecoder: FountainDecoder | null = null;
let activeUrType: string | null = null;

export const resetUrDecoder = () => {
    activeDecoder = null;
    activeUrType = null;
};

// --- Main Parse Logic ---
export const parseUrData = (urData: string): any => {
    const lower = urData.toLowerCase();
    const parts = lower.split('/');
    if (parts.length < 2) return null;

    const type = parts[0];
    const body = parts[parts.length - 1];

    console.log(`DEBUG: Parsing UR type: ${type}`);


    try {
        const cborBytes = bytewordsDecode(body);
        let decoded = decode(cborBytes);

        console.log("DEBUG: Initial Decoded Structure:", Array.isArray(decoded) ? "Array" : typeof decoded, decoded);

        // Fountain Wrapper Check
        if (Array.isArray(decoded) && decoded.length >= 5 && typeof decoded[0] === 'number') {
            const [seqNum, total, size, checksum, data] = decoded;
            console.log(`DEBUG: Fountain Part detected: ${seqNum}/${total}, size=${size}`);
            const dataBytes = data instanceof Uint8Array ? data : new Uint8Array(data);

            if (total === 1) {
                decoded = decode(dataBytes);
            } else {
                if (!activeDecoder || activeUrType !== type || activeDecoder.expectedPartCount !== total) {
                    activeDecoder = new FountainDecoder();
                    activeUrType = type;
                }

                const ok = activeDecoder.receivePart(seqNum, total, size, checksum, dataBytes);
                if (!ok) {
                    activeDecoder = new FountainDecoder();
                    activeUrType = type;
                    activeDecoder.receivePart(seqNum, total, size, checksum, dataBytes);
                }

                if (activeDecoder.resultValue) {
                    try {
                        decoded = decode(activeDecoder.resultValue);
                        activeDecoder = null;
                        activeUrType = null;
                    } catch (e) {
                        console.error("Failed to decode finished Fountain message", e);
                        activeDecoder = null;
                        activeUrType = null;
                        return { type: 'error', message: 'Decoding failed' };
                    }
                } else {
                    return {
                        type: 'collecting',
                        current: activeDecoder.receivedPartIndexes.size,
                        total: total,
                        processed: activeDecoder.processedPartsCount
                    };
                }
            }
        }

        // Final Parsing
        if (type === "ur:eth-sign-request" || type === "ur:eth-sign-request".toUpperCase()) {
            let path = "";
            if (decoded[5]?.value?.[1]) {
                const cs = decoded[5].value[1];
                for (let i = 0; i < cs.length; i += 2) path += `/${cs[i]}${cs[i + 1] ? "'" : ""}`;
                path = "m" + path;
            }
            return {
                type: 'eth-sign-request',
                id: decoded[1]?.value ? Buffer.from(decoded[1].value).toString('hex') : null,
                payload: decoded[2],
                dataType: decoded[3] || 1,
                chainId: decoded[4] || 1,
                derivationPath: path,
                address: decoded[6] ? "0x" + Buffer.from(decoded[6]).toString('hex') : null,
                origin: decoded[7] || null,
                json: jsonify(decoded),
                original_ur: urData,
                isAirGap: false
            };
        }

        if (type === "ur:sol-sign-request" || type === "ur:sol-sign-request".toUpperCase()) {
            let reqId = null;
            if (decoded[1]?.value) reqId = Buffer.from(decoded[1].value).toString('hex');
            else if (decoded[1] instanceof Uint8Array) reqId = Buffer.from(decoded[1]).toString('hex');

            return {
                type: 'sol-sign-request',
                id: reqId,
                payload: decoded[2],
                json: jsonify(decoded),
                original_ur: urData
            };
        }

        if (type === "ur:bytes" || type === "ur:bytes".toUpperCase()) {
            console.log("DEBUG: Processing UR:BYTES");
            try {
                // Check if GZipped (Magic 1f 8b)
                let payload = decoded;
                if (payload instanceof Uint8Array || Buffer.isBuffer(payload)) {
                    const p = payload as Uint8Array;
                    if (p.length > 2 && p[0] === 0x1f && p[1] === 0x8b) {
                        console.log("DEBUG: Detected GZIP, inflating...");
                        payload = gunzipSync(p);
                        // Decode the inner CBOR (which should be [3, [msg]])
                        payload = decode(payload);
                        console.log("DEBUG: Inflated & Decoded:", payload);
                    }
                }

                // AirGap V3 Envelope Check: [3, [message]]
                // message = [ver, type, proto, id, data]
                if (Array.isArray(payload) && payload.length >= 2 && payload[0] === 3 && Array.isArray(payload[1]) && payload[1].length > 0) {
                    const innerMsg = payload[1][0];
                    console.log("DEBUG: AirGap Message:", innerMsg);

                    if (Array.isArray(innerMsg) && innerMsg.length >= 5) {
                        const type = innerMsg[1];
                        let proto = innerMsg[2];
                        const id = innerMsg[3];
                        const data = innerMsg[4];

                        // Convert proto to string if bytes
                        if (proto instanceof Uint8Array || Buffer.isBuffer(proto)) {
                            proto = Buffer.from(proto).toString('utf8');
                        }

                        console.log(`DEBUG: AirGap Type: ${type}, Protocol: ${proto}`);

                        // Type 6 = TransactionSignRequest (Legacy)
                        // Type 7 = MessageSignRequest
                        if ((type === 6 || type === 7) && (proto === "eth" || proto === "ethereum")) {
                            console.log(`DEBUG: Detected AirGap ETH Sign Request (Type ${type})`);

                            let payloadData: any = data;
                            let dataType = 1; // Default: Transaction

                            // IAC V3 Deserialization Helper
                            const iacV3Deserialize = (val: any) => {
                                if (val instanceof Uint8Array || Buffer.isBuffer(val)) {
                                    const buf = Buffer.from(val);
                                    if (buf.length > 0) {
                                        const prefix = buf[0];
                                        const content = buf.subarray(1);
                                        if (prefix === 1) return "0x" + content.toString('hex'); // 0x-prefixed
                                        if (prefix === 2) return content.toString('hex'); // Raw hex (or string?) -> Just return hex, SignConfirm logic handles it?
                                        // Actually, SignConfirm expects "0x..." for hex or just text.
                                        // If prefix 2 (default), it's likely just UTF8 text encoded as bytes?
                                        // iacV3Serialize uses Buffer.from(clean, 'hex'). 
                                        // If clean was non-hex string, it returns s.
                                        // So if we received bytes, it MUST be hex-able.
                                        // Let's return hex string for safety, SignConfirm converts 0x hex back to bytes.
                                        if (prefix === 3) return "0x" + content.toString('hex').substring(1); // Odd handling?
                                        if (prefix === 4) return content.toString('hex').substring(1);

                                        return buf.toString('utf8'); // Fallback?
                                    }
                                }
                                return val;
                            };

                            // If Type 7, Payload is [url, message, xpub?. callback?]
                            // We want the message (index 1)
                            if (type === 7 && Array.isArray(data) && data.length >= 2) {
                                payloadData = iacV3Deserialize(data[1]);
                                dataType = 3; // Raw Bytes / SIWE
                            }

                            return {
                                type: 'eth-sign-request',
                                id: String(id),
                                payload: payloadData,
                                dataType: dataType,
                                chainId: 1, // Unknown from envelope
                                derivationPath: "m/44'/60'/0'/0/0", // Default
                                origin: "AirGap Wallet",
                                json: jsonify(payload),
                                original_ur: urData,
                                isAirGap: true
                            };
                        }
                    }
                }

                return {
                    type: 'ur:bytes',
                    payload: payload, // Return full payload structure for Import page to parse
                    json: jsonify(payload),
                    original_ur: urData
                };
            } catch (e) {
                console.error("DEBUG: Error processing UR:BYTES", e);
            }
        }

        return { type: 'unknown', data: decoded, ur_type: type };

    } catch (e) {
        console.error("UR Parse Error", e);
    }
    return null;
};

// --- Generation Helpers ---
// Define separate encoder for standard usage to verify clean output
const extensionList: any[] = [
    { Class: Tag303, tag: 303, encode(i: any, e: any) { return e(i.value); }, decode(d: any) { return new Tag303(d); } },
    { Class: Tag304, tag: 304, encode(i: any, e: any) { return e(i.value); }, decode(d: any) { return new Tag304(d); } },
    { Class: Tag1103, tag: 1103, encode(i: any, e: any) { return e(i.value); }, decode(d: any) { return new Tag1103(d); } },
    { Class: Tag37, tag: 37, encode(i: any, e: any) { return e(i.value); }, decode(d: any) { return new Tag37(d); } }
];

// @ts-ignore - extensions option might not be in type definitions but is supported
const stdEncoder = new Encoder({ mapsAsObjects: false, extensions: extensionList });

export const generateUrCryptoHdKey = (mnemonic: string, name: string = "Vault") => {
    const accountNode = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'");
    const masterFp = parseInt(ethers.HDNodeWallet.fromPhrase(mnemonic).fingerprint.substring(2), 16);
    const parentFp = parseInt(ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'").fingerprint.substring(2), 16);
    const kpMap = new Map<number, any>([[1, [44, true, 60, true, 0, true]], [2, masterFp]]);
    const hdMap = new Map<number, any>([[3, Buffer.from(accountNode.publicKey.substring(2), 'hex')], [4, Buffer.from(accountNode.chainCode.substring(2), 'hex')], [6, new Tag304(kpMap)], [8, parentFp], [9, name]]);
    const tagged = new Tag303(hdMap);
    // Use stdEncoder here too to ensure standard compliance
    return { ur: `UR:CRYPTO-HDKEY/${bytewordsEncode(stdEncoder.encode(tagged)).toUpperCase()}`, json: jsonify(tagged) };
};

// --- Serialization Helper ---
const iacV3Serialize = (s: string): any => {
    if (!s) return "";
    let clean = s; let prefix = 2; // Default (non-0x hex?)
    if (s.startsWith("0x")) { clean = s.substring(2); prefix = 1; } // 0x-prefixed
    if (!/^[0-9a-fA-F]+$/.test(clean)) return s; // Not hex, return as string
    if (clean.length % 2 !== 0) { clean = '0' + clean; prefix = (prefix === 1) ? 3 : 4; } // Odd length
    const bytes = Buffer.from(clean, 'hex');
    const result = new Uint8Array(bytes.length + 1);
    result[0] = prefix; result.set(bytes, 1);
    return result;
};

export const generateAirGapUrBytes = (mnemonic: string, name: string = "Vault") => {
    const masterFpHex = ethers.HDNodeWallet.fromPhrase(mnemonic).fingerprint.substring(2);
    const accountNode = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'");

    // Use helper
    const msgUpdated = [
        1,
        4,
        "eth",
        Math.floor(Math.random() * 100000000),
        [
            "m/44'/60'/0'",
            iacV3Serialize(masterFpHex),
            name,
            true,
            true,
            iacV3Serialize(masterFpHex),
            accountNode.extendedKey // Keep as string
        ]
    ];

    const zipped = pakoGzip(encode([3, [msgUpdated]]));
    return { ur: `UR:BYTES/${bytewordsEncode(encode(zipped)).toUpperCase()}`, json: { _type: "AirGap IAC v3 Sync", message: jsonify(msgUpdated) } };
};

export const generateBackpackUr = (mnemonic: string) => {
    const keys = deriveSOLKeys(mnemonic);
    const masterFp = parseInt(ethers.HDNodeWallet.fromPhrase(mnemonic).fingerprint.substring(2), 16);
    const kp = new Map<number, any>([[1, [44, true, 501, true, 0, true, 0, true]], [2, masterFp]]);
    const hdk = new Tag303(new Map<number, any>([[3, bs58.decode(keys.publicKey)], [6, new Tag304(kp)], [9, "AirGap SOL"]]));
    const mt = new Tag1103(new Map<number, any>([[1, masterFp], [2, [hdk]]]));
    return { ur: `UR:CRYPTO-MULTI-ACCOUNTS/${bytewordsEncode(encode(mt)).toUpperCase()}`, json: jsonify(mt) };
};

export const generateSolSignatureUr = (sig: string, id?: string) => {
    const map = new Map<number, any>();
    if (id) map.set(1, new Tag37(Buffer.from(id, 'hex')));
    map.set(2, Buffer.from(sig, 'hex'));
    return `UR:SOL-SIGNATURE/${bytewordsEncode(encode(map)).toUpperCase()}`;
};

export const generateEthSignatureUr = (sig: string, id: string | number, message: string | Uint8Array, xpub: string) => {
    // AirGap V3 SignedMessage (Type 8)
    // Structure: [1, 8, "eth", id, [message, xpub, signature]]

    // Helper
    const iacV3Serialize = (s: string): any => {
        if (!s) return "";
        let clean = s; let prefix = 2; // Default (non-0x hex?)
        if (s.startsWith("0x")) { clean = s.substring(2); prefix = 1; }
        if (!/^[0-9a-fA-F]+$/.test(clean)) return s;
        if (clean.length % 2 !== 0) { clean = '0' + clean; prefix = (prefix === 1) ? 3 : 4; }
        const bytes = Buffer.from(clean, 'hex');
        const result = new Uint8Array(bytes.length + 1);
        result[0] = prefix; result.set(bytes, 1);
        return result;
    };

    // 1. Serialize Signature
    let signature = sig;
    if (!signature.startsWith("0x")) signature = "0x" + signature;
    const serializedSig = iacV3Serialize(signature);

    // 2. Serialize Message
    // The message should be passed as a Hex String (0x-prefixed) so iacV3Serialize treats it as bytes
    // If it's a string (SIWE), convert to hex
    let msgHex = "";
    if (typeof message === 'string') {
        if (message.startsWith("0x")) msgHex = message;
        else msgHex = "0x" + Buffer.from(message, 'utf8').toString('hex');
    } else { // Uint8Array
        msgHex = "0x" + Buffer.from(message).toString('hex');
    }
    const serializedMsg = iacV3Serialize(msgHex);

    // 3. ID Handling (Prefer Int)
    let msgId: any = id;
    if (!msgId) msgId = Math.floor(Math.random() * 100000000);

    // Parse numeric string to int
    if (typeof msgId === 'string' && /^\d+$/.test(msgId)) {
        msgId = parseInt(msgId, 10);
    }

    // 4. Construct Payload [msg, xpub, sig]
    const payload = [serializedMsg, xpub, serializedSig];

    const messageArray = [
        1,              // Version
        8,              // Type 8 = SignedMessage / MessageResponse
        "eth",          // Protocol
        msgId,          // Request ID
        payload         // [msg, xpub, sig]
    ];

    const envelope = [3, [messageArray]];
    const cborData = encode(envelope);
    const zipped = pakoGzip(cborData);

    return `UR:BYTES/${bytewordsEncode(encode(zipped)).toUpperCase()}`;
};

export const generateEthSignatureEip4527 = (sig: string, id: string | number) => {
    // EIP-4527 "ETH-SIGNATURE"
    // { 1: uuid(request-id), 2: signature(bytes) }

    // Parse UUID from ID
    const map = new Map<number, any>();

    if (id) {
        let uuidBytes: Buffer | null = null;
        if (typeof id === 'string') {
            // ID from parseUrData is always a hex string of the bytes.
            // We decode it back to bytes.
            try {
                // Remove hyphens if present (though parseUrData produces clean hex)
                const clean = id.replace(/-/g, '');
                uuidBytes = Buffer.from(clean, 'hex');
            } catch (e) {
                // Should not happen if flow is correct, but fallback to utf8
                uuidBytes = Buffer.from(id, 'utf8');
            }
        } else if ((id as any) instanceof Uint8Array) {
            uuidBytes = Buffer.from(id as any);
        } else {
            // Number
            const hash = ethers.sha256(Buffer.from(String(id), 'utf8'));
            uuidBytes = Buffer.from(hash.slice(2, 34), 'hex');
        }

        if (uuidBytes) map.set(1, new Tag37(uuidBytes));
    }

    let signature = sig;
    if (signature.startsWith("0x")) signature = signature.substring(2);

    map.set(2, Buffer.from(signature, 'hex'));

    // Use matched stdEncoder (Global) which has Tag37 registered
    return `UR:ETH-SIGNATURE/${bytewordsEncode(stdEncoder.encode(map)).toUpperCase()}`;
};
