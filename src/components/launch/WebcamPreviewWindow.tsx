import { type CSSProperties, useEffect, useRef, useState } from "react";

const DEFAULT_STATE: WebcamPreviewState = {
    recording: false,
    webcamEnabled: false,
    webcamDeviceId: undefined,
    mirrored: true,
    shape: "rectangle",
    blur: 0,
};

export function WebcamPreviewWindow() {
    const [previewState, setPreviewState] = useState<WebcamPreviewState>(DEFAULT_STATE);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        let mounted = true;
        void window.electronAPI
            .getWebcamPreviewState()
            .then((state) => {
                if (!mounted || !state) return;
                setPreviewState(state);
            })
            .catch((error) => {
                console.error("[webcam-preview] Failed to fetch initial preview state:", error);
            });

        const cleanup = window.electronAPI.onWebcamPreviewState((state) => {
            setPreviewState(state);
        });

        return () => {
            mounted = false;
            cleanup();
        };
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !previewState.webcamEnabled) {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
            if (video) {
                video.srcObject = null;
            }
            return;
        }

        let cancelled = false;

        const startPreviewStream = async () => {
            try {
                console.info("[webcam-preview] Starting stream", {
                    deviceId: previewState.webcamDeviceId ?? "default",
                });
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: previewState.webcamDeviceId
                        ? { deviceId: { exact: previewState.webcamDeviceId } }
                        : true,
                });

                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                if (streamRef.current) {
                    streamRef.current.getTracks().forEach((track) => track.stop());
                }
                streamRef.current = stream;
                video.srcObject = stream;
                await video.play().catch((error) => {
                    console.error("[webcam-preview] video.play() failed:", error);
                });
            } catch (error) {
                console.error("[webcam-preview] getUserMedia failed:", error);
            }
        };

        void startPreviewStream();

        return () => {
            cancelled = true;
        };
    }, [previewState.webcamEnabled, previewState.webcamDeviceId]);

    const disableWebcam = async () => {
        try {
            await window.electronAPI.requestWebcamEnabled(false);
            await window.electronAPI.closeWebcamPreview();
        } catch (error) {
            console.error("[webcam-preview] Failed to disable webcam:", error);
        }
    };

    return (
        <div
            className="group w-[280px] h-[220px]"
            style={{
                background: "transparent",
                WebkitAppRegion: "drag",
            } as CSSProperties & { WebkitAppRegion: "drag" }}
        >
            <div
                className="relative w-full h-full overflow-hidden border-[2px] border-white/15"
                style={{
                    borderRadius: 24,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
                    background: "transparent",
                }}
            >
                <video
                    ref={videoRef}
                    muted
                    playsInline
                    autoPlay
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{
                        transform: previewState.mirrored ? "scaleX(-1)" : "none",
                        filter: previewState.blur > 0 ? `blur(${previewState.blur}px)` : "none",
                    }}
                />

                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        background:
                            "radial-gradient(circle at center, rgba(0,0,0,0) 58%, rgba(0,0,0,0.14) 100%)",
                    }}
                />

                <button
                    type="button"
                    onClick={() => {
                        void disableWebcam();
                    }}
                    className="absolute right-3 top-3 h-5 w-5 rounded-full bg-[rgba(0,0,0,0.6)] text-white text-[14px] leading-none flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                    style={{ WebkitAppRegion: "no-drag" } as CSSProperties & { WebkitAppRegion: "no-drag" }}
                    aria-label="Disable camera"
                    title="Disable camera"
                >
                    ×
                </button>
            </div>
        </div>
    );
}
