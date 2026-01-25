import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Copy, CheckCircle, AlertCircle, Monitor, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { parseUrData, resetUrDecoder } from '../utils/ur';
import jsQR from 'jsqr';
import clsx from 'clsx';

export const Scan = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState<'camera' | 'screen'>('camera');
    const [result, setResult] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<{ current: number, total: number } | null>(null);

    // Camera Refs
    const readerRef = useRef<Html5Qrcode | null>(null);

    // Screen Refs
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        let mounted = true;

        // Cleanup function definition using Refs (must be robust to multiple calls)
        const stopAll = async () => {
            // Stop Camera
            if (readerRef.current) {
                try {
                    if (readerRef.current.isScanning) {
                        await readerRef.current.stop();
                    }
                    readerRef.current.clear(); // Always clear
                } catch (e) {
                    // console.error("Error stopping camera", e);
                }
            }

            // Stop Screen
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };

        // Screen Loop Logic
        const scanScreenLoop = () => {
            if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
            if (!mounted) return;

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                });

                if (code) {
                    const req = parseUrData(code.data);

                    if (req?.type === 'collecting') {
                        setProgress({ current: req.current, total: req.total });
                        return; // Keep scanning
                    }

                    if (req?.type === 'eth-sign-request' || req?.type === 'sol-sign-request' || req?.type === 'ur:bytes') {
                        setResult(code.data);
                        stopAll();
                        setProgress(null);

                        if (req.type !== 'ur:bytes') {
                            navigate('/sign', { state: { request: req } });
                        }
                    }
                    return;
                }
            }
            animationFrameRef.current = requestAnimationFrame(scanScreenLoop);
        };

        const startScreen = async () => {
            try {
                // @ts-ignore - getDisplayMedia exists
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false });
                if (!mounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();

                    stream.getVideoTracks()[0].onended = () => {
                        if (mounted) setError("Screen sharing stopped by user.");
                        stopAll();
                    };

                    scanScreenLoop();
                }
            } catch (err) {
                console.error(err);
                if (mounted) setError("Screen sharing denied or cancelled.");
            }
        };

        // Initialize Scanner
        const init = async () => {
            await stopAll();
            if (!mounted) return;

            if (isScanning && !result) {
                if (mode === 'camera') {
                    // Start Camera
                    try {
                        if (!document.getElementById("reader")) return;
                        const reader = new Html5Qrcode("reader", {
                            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                            verbose: false
                        });
                        readerRef.current = reader;

                        await reader.start(
                            { facingMode: "environment" },
                            { fps: 10, qrbox: { width: 250, height: 250 } },
                            (decodedText) => {
                                if (mounted) {
                                    const req = parseUrData(decodedText);

                                    if (req?.type === 'collecting') {
                                        console.log("Setting progress state:", req.current, req.total);
                                        setProgress({ current: req.current, total: req.total });
                                        return; // Keep scanning
                                    }

                                    if (req?.type === 'eth-sign-request' || req?.type === 'sol-sign-request' || req?.type === 'ur:bytes') {
                                        setResult(decodedText);
                                        stopAll();
                                        setProgress(null);

                                        if (req.type === 'ur:bytes') {
                                            // Assume it's a Sync/Import request
                                            navigate('/import', { state: { request: req } });
                                        } else {
                                            navigate('/sign', { state: { request: req } });
                                        }
                                    }
                                }
                            },
                            () => { }
                        );
                    } catch (err) {
                        if (mounted) {
                            console.error(err);
                            let msg = "Camera access denied.";
                            if (window.location.protocol === 'file:') msg += " (Browsers block camera on file://)";
                            setError(msg);
                        }
                    }
                }

                if (mode === 'screen') {
                    startScreen();
                }
            }
        }

        const timer = setTimeout(init, 100);

        return () => {
            mounted = false;
            clearTimeout(timer);
            stopAll();
        }
    }, [mode, isScanning, result]);

    const handleReset = () => {
        setResult(null);
        setError(null);
        setIsScanning(true);
        resetUrDecoder();
    };

    const copyToClipboard = () => {
        if (result) {
            navigator.clipboard.writeText(result);
            alert("Copied!");
        }
    };

    return (
        <div className="flex flex-col items-center h-full max-w-md mx-auto animate-fade-in">
            <h1 className="text-2xl font-bold mb-4 self-start">Scan QR Code</h1>

            {/* Mode Switcher */}
            <div className="flex gap-2 mb-4 bg-surface rounded-lg p-1 border border-border">
                <button
                    onClick={() => setMode('camera')}
                    className={clsx(
                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                        mode === 'camera' ? "bg-primary text-white shadow-sm" : "text-textMuted hover:text-textMain"
                    )}
                >
                    <Camera size={16} /> Device Camera
                </button>
                <button
                    onClick={() => setMode('screen')}
                    className={clsx(
                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                        mode === 'screen' ? "bg-primary text-white shadow-sm" : "text-textMuted hover:text-textMain"
                    )}
                >
                    <Monitor size={16} /> Screen / RTSP
                </button>
            </div>

            <div className="w-full relative bg-surface aspect-square rounded-2xl overflow-hidden border border-border shadow-2xl">
                {!result && !error && (
                    <>
                        {mode === 'camera' && <div id="reader" className="w-full h-full object-cover" />}
                        {mode === 'screen' && (
                            <>
                                <video ref={videoRef} className="w-full h-full object-contain bg-black" muted playsInline />
                                <canvas ref={canvasRef} className="hidden" />
                                <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
                                    <p className="px-3 py-1 bg-black/60 backdrop-blur rounded-full text-xs text-white/80">
                                        Select the window with your RTSP stream
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Overlay */}
                        <div className="absolute inset-0 pointer-events-none border-[30px] border-black/50 z-10">
                            <div className="absolute inset-0 border-2 border-primary/50 m-[-2px] animate-pulse"></div>
                        </div>

                        {/* Progress Overlay */}
                        {progress && (
                            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent z-20 flex flex-col items-center">
                                <div className="text-white font-bold text-sm mb-2 drop-shadow-md">
                                    Scanning Multipart UR ({progress.current}/{progress.total})
                                </div>
                                <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}

                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20">
                        <AlertCircle size={48} className="text-error mb-4" />
                        <p className="text-textMuted">{error}</p>
                        <button onClick={handleReset} className="mt-4 px-4 py-2 bg-surfaceHighlight rounded text-sm hover:bg-surface">Retry</button>
                    </div>
                )}

                {result && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 flex flex-col items-center justify-center bg-surface p-6 text-center z-30"
                    >
                        <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mb-4">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Scan Successful</h3>
                        <div className="w-full p-3 bg-background rounded border border-border font-mono text-xs break-all max-h-32 overflow-y-auto mb-4 text-left">
                            {result}
                        </div>
                        <div className="flex gap-2 w-full">
                            <button onClick={copyToClipboard} className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-primaryHover transition-colors">
                                <Copy size={16} /> Copy
                            </button>
                            <button onClick={handleReset} className="px-4 py-2 bg-surfaceHighlight text-textMuted hover:text-textMain rounded-lg text-sm transition-colors">
                                Scan Again
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>

            <p className="mt-6 text-textMuted text-xs sm:text-sm text-center max-w-xs">
                {mode === 'camera'
                    ? "Point camera at a QR code."
                    : "Share the window or screen displaying your QR code (e.g., VLC player, Image Viewer)."}
            </p>
        </div>
    );
};
