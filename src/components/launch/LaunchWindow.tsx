import { ChevronDown, Languages, Monitor, Settings, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BsPauseCircle, BsPlayCircle } from "react-icons/bs";
import { MdCancel, MdRestartAlt } from "react-icons/md";
import { toast } from "sonner";
import { useI18n, useScopedT } from "@/contexts/I18nContext";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import { getLocaleName } from "@/i18n/loader";
import { useAudioLevelMeter } from "../../hooks/useAudioLevelMeter";
import { useCameraDevices } from "../../hooks/useCameraDevices";
import { useMicrophoneDevices } from "../../hooks/useMicrophoneDevices";
import { useScreenRecorder } from "../../hooks/useScreenRecorder";
import { requestCameraAccess } from "../../lib/requestCameraAccess";
import { formatTimePadded } from "../../utils/timeUtils";
import { AudioLevelMeter } from "../ui/audio-level-meter";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Tooltip } from "../ui/tooltip";
import styles from "./LaunchWindow.module.css";

const WindowIcon = ({ className }: { className?: string }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="20"
		height="20"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<rect x="2" y="4" width="20" height="16" rx="2" />
		<line x1="2" y1="9" x2="22" y2="9" />
		<circle cx="6" cy="6.5" r="0.75" fill="currentColor" />
		<circle cx="9" cy="6.5" r="0.75" fill="currentColor" />
		<circle cx="12" cy="6.5" r="0.75" fill="currentColor" />
	</svg>
);

const AreaIcon = ({ className }: { className?: string }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="20"
		height="20"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		strokeDasharray="4 4"
		className={className}
	>
		<rect x="3" y="3" width="18" height="18" rx="2" />
	</svg>
);

const DeviceIcon = ({ className }: { className?: string }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="20"
		height="20"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<rect x="7" y="2" width="10" height="20" rx="2" />
		<rect x="9" y="4" width="6" height="5" rx="1" />
		<circle cx="10.5" cy="12" r="0.75" fill="currentColor" />
		<circle cx="13.5" cy="12" r="0.75" fill="currentColor" />
		<circle cx="10.5" cy="15" r="0.75" fill="currentColor" />
		<circle cx="13.5" cy="15" r="0.75" fill="currentColor" />
		<circle cx="12" cy="18" r="0.75" fill="currentColor" />
	</svg>
);

const SystemAudioIcon = ({ enabled, className }: { enabled: boolean; className?: string }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<rect x="2" y="3" width="20" height="14" rx="2" />
		<line x1="8" y1="21" x2="16" y2="21" />
		<line x1="12" y1="17" x2="12" y2="21" />
		{enabled ? (
			<path d="M9 12V9a2 2 0 0 1 2-2h3v2h-3v3a2 2 0 1 1-2-2z" fill="currentColor" />
		) : (
			<>
				<path d="M9 12V9a2 2 0 0 1 2-2h3" />
				<line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="2" />
			</>
		)}
	</svg>
);

function sanitizeCameraLabel(label: string): string {
	const cleaned = label.replace(/\s*\([^)]*\)\s*$/, "").trim();
	return cleaned || label;
}

export function LaunchWindow() {
	const t = useScopedT("launch");
	const { locale, setLocale } = useI18n();

	const {
		recording,
		paused,
		elapsedSeconds,
		toggleRecording,
		togglePaused,
		restartRecording,
		cancelRecording,
		microphoneEnabled,
		setMicrophoneEnabled,
		microphoneDeviceId,
		setMicrophoneDeviceId,
		systemAudioEnabled,
		setSystemAudioEnabled,
		webcamEnabled,
		setWebcamEnabled,
		webcamDeviceId,
		setWebcamDeviceId,
	} = useScreenRecorder();

	const showMicControls = microphoneEnabled && !recording;

	const {
		devices: micDevices,
		selectedDeviceId: selectedMicId,
		setSelectedDeviceId: setSelectedMicId,
	} = useMicrophoneDevices(true);
	const {
		devices: cameraDevices,
		selectedDeviceId: selectedCameraId,
		setSelectedDeviceId: setSelectedCameraId,
		isLoading: isCameraDevicesLoading,
		error: cameraDevicesError,
	} = useCameraDevices(true);

	const selectedMicLabel =
		micDevices.find((d) => d.deviceId === (microphoneDeviceId || selectedMicId))?.label ||
		t("audio.defaultMicrophone");
	const selectedCameraLabel = isCameraDevicesLoading
		? t("webcam.searching")
		: cameraDevicesError
			? t("webcam.unavailable")
			: cameraDevices.length === 0
				? t("webcam.noneFound")
				: sanitizeCameraLabel(
						cameraDevices.find((d) => d.deviceId === (webcamDeviceId || selectedCameraId))?.label ||
							t("webcam.defaultCamera"),
					);

	const { level } = useAudioLevelMeter({
		enabled: showMicControls,
		deviceId: microphoneDeviceId,
	});

	useEffect(() => {
		if (selectedMicId && selectedMicId !== "default") {
			setMicrophoneDeviceId(selectedMicId);
		}
	}, [selectedMicId, setMicrophoneDeviceId]);

	useEffect(() => {
		if (selectedCameraId) {
			setWebcamDeviceId(selectedCameraId);
		}
	}, [selectedCameraId, setWebcamDeviceId]);

	useEffect(() => {
		if (!import.meta.env.DEV) {
			return;
		}

		void requestCameraAccess().catch((error) => {
			console.warn("Failed to trigger camera access request during development:", error);
		});
	}, []);

	const [selectedSource, setSelectedSource] = useState("Screen");
	const [hasSelectedSource, setHasSelectedSource] = useState(false);

	useEffect(() => {
		const checkSelectedSource = async () => {
			if (window.electronAPI) {
				const source = await window.electronAPI.getSelectedSource();
				if (source) {
					setSelectedSource(source.name);
					setHasSelectedSource(true);
				} else {
					setSelectedSource("Screen");
					setHasSelectedSource(false);
				}
			}
		};

		checkSelectedSource();

		const interval = setInterval(checkSelectedSource, 500);
		return () => clearInterval(interval);
	}, []);

	const [activeMode, setActiveMode] = useState<"display" | "window" | "area" | "device">("display");

	const [hideDesktopIcons, setHideDesktopIcons] = useState(false);
	const [hideDockIcon, setHideDockIcon] = useState(true);
	const [highlightArea, setHighlightArea] = useState(true);
	const [openQuickShare, setOpenQuickShare] = useState(true);
	const [showSpeakerNotes, setShowSpeakerNotes] = useState(false);
	const [countdownSeconds, setCountdownSeconds] = useState(3);

	const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
	const [micMenuOpen, setMicMenuOpen] = useState(false);
	const [audioMenuOpen, setAudioMenuOpen] = useState(false);
	const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
	const [showCancelConfirm, setShowCancelConfirm] = useState(false);

	useEffect(() => {
		const handleBlur = () => {
			setCameraMenuOpen(false);
			setMicMenuOpen(false);
			setAudioMenuOpen(false);
			setSettingsMenuOpen(false);
		};
		window.addEventListener("blur", handleBlur);
		return () => window.removeEventListener("blur", handleBlur);
	}, []);

	// Dynamically resize the HUD window: expand when a dropdown is open, shrink back to bar height when all closed
	useEffect(() => {
		if (!window.electronAPI?.setHudHeight) return;
		const anyOpen = cameraMenuOpen || micMenuOpen || audioMenuOpen || settingsMenuOpen;
		window.electronAPI.setHudHeight(anyOpen ? 420 : 95);
	}, [cameraMenuOpen, micMenuOpen, audioMenuOpen, settingsMenuOpen]);

	// Toggle content protection: visible in screenshots, hidden during screen recording
	useEffect(() => {
		window.electronAPI?.setHudContentProtection?.(recording);
		if (!recording) setShowCancelConfirm(false);
	}, [recording]);

	useEffect(() => {
		if (hasSelectedSource) {
			const name = selectedSource.toLowerCase();
			if (name.includes("screen") || name.includes("display")) {
				setActiveMode("display");
			} else {
				setActiveMode("window");
			}
		}
	}, [selectedSource, hasSelectedSource]);

	useEffect(() => {
		if (window.electronAPI && window.electronAPI.onStartRecording) {
			const unsubscribe = window.electronAPI.onStartRecording(() => {
				toggleRecording();
			});
			return () => unsubscribe();
		}
	}, [toggleRecording]);

	const micAutoEnabled = useRef(false);
	const cameraAutoEnabled = useRef(false);

	// Auto-enable microphone if available and not yet set
	useEffect(() => {
		if (!micAutoEnabled.current && micDevices.length > 0) {
			micAutoEnabled.current = true;
			setMicrophoneEnabled(true);
			const firstDev = micDevices[0].deviceId;
			setSelectedMicId(firstDev);
			setMicrophoneDeviceId(firstDev);
		}
	}, [micDevices, setMicrophoneEnabled, setMicrophoneDeviceId, setSelectedMicId]);

	// Auto-enable camera if available and not yet set
	useEffect(() => {
		if (!cameraAutoEnabled.current && cameraDevices.length > 0) {
			cameraAutoEnabled.current = true;
			const firstDev = cameraDevices[0].deviceId;
			setSelectedCameraId(firstDev);
			setWebcamDeviceId(firstDev);
			setWebcamEnabled(true);
			if (window.electronAPI) {
				window.electronAPI.openWebcamPreview();
			}
		}
	}, [cameraDevices, setWebcamEnabled, setWebcamDeviceId, setSelectedCameraId]);

	const openSourceSelector = (defaultTab?: string) => {
		if (window.electronAPI) {
			window.electronAPI.openSourceSelector(defaultTab);
		}
	};

	const openVideoFile = async () => {
		const result = await window.electronAPI.openVideoFilePicker();

		if (result.canceled) {
			return;
		}

		if (result.success && result.path) {
			await window.electronAPI.setCurrentVideoPath(result.path);
			await window.electronAPI.switchToEditor();
		}
	};

	const openProjectFile = async () => {
		const result = await window.electronAPI.loadProjectFile();
		if (result.canceled || !result.success) return;
		await window.electronAPI.switchToEditor();
	};

	const sendHudOverlayHide = () => {
		if (window.electronAPI && window.electronAPI.hudOverlayHide) {
			window.electronAPI.hudOverlayHide();
		}
	};
	const sendHudOverlayClose = () => {
		if (window.electronAPI && window.electronAPI.hudOverlayClose) {
			window.electronAPI.hudOverlayClose();
		}
	};

	const toggleMicrophone = () => {
		if (!recording) {
			setMicrophoneEnabled(!microphoneEnabled);
		}
	};

	const toggleWebcam = async () => {
		if (recording) {
			return;
		}

		if (webcamEnabled) {
			await setWebcamEnabled(false);
			await window.electronAPI.closeWebcamPreview();
			return;
		}

		const enabled = await setWebcamEnabled(true);
		if (!enabled) {
			return;
		}

		await window.electronAPI.openWebcamPreview();
	};

	if (recording) {
		return (
			<div
				className={`w-screen h-screen ${styles.hudViewportPadding} ${styles.hudRootTransparent}`}
			>
				<div
					className={`fixed top-[15px] left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 bg-[#2E2D2C] border border-white/[0.08] rounded-[20px] shadow-2xl select-none ${styles.electronDrag}`}
				>
					{showCancelConfirm ? (
						// ── Cancel confirmation inline ──
						<>
							<span className="text-[12px] text-white/80 font-medium">Discard recording?</span>
							<button
								onClick={() => setShowCancelConfirm(false)}
								className={`px-3 py-1 rounded-lg text-[12px] text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer border-none bg-transparent ${styles.electronNoDrag}`}
							>
								Keep
							</button>
							<button
								onClick={() => {
									setShowCancelConfirm(false);
									cancelRecording();
								}}
								className={`px-3 py-1 rounded-lg text-[12px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer border-none bg-transparent font-medium ${styles.electronNoDrag}`}
							>
								Discard
							</button>
						</>
					) : (
						// ── Normal recording controls ──
						<>
							{/* Stop Recording button */}
							<button
								onClick={toggleRecording}
								className={`w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 text-white flex items-center justify-center transition-all duration-150 cursor-pointer shadow-md border-none ${styles.electronNoDrag}`}
								title="Stop Recording"
							>
								<div className="w-3 h-3 bg-white rounded-sm" />
							</button>

							<div className="h-6 w-[1px] bg-white/10" />

							{/* Timer */}
							<div className="flex items-center gap-2">
								<span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
								<span className="text-white text-sm font-semibold font-mono tabular-nums">
									{formatTimePadded(elapsedSeconds)}
								</span>
							</div>

							<div className="h-6 w-[1px] bg-white/10" />

							{/* Pause / Resume */}
							<Tooltip
								content={paused ? t("tooltips.resumeRecording") : t("tooltips.pauseRecording")}
							>
								<button
									onClick={togglePaused}
									className={`p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors cursor-pointer border-none bg-transparent ${styles.electronNoDrag}`}
								>
									{paused ? (
										<BsPlayCircle className="w-5 h-5 text-emerald-400" />
									) : (
										<BsPauseCircle className="w-5 h-5" />
									)}
								</button>
							</Tooltip>

							{/* Restart */}
							<Tooltip content={t("tooltips.restartRecording")}>
								<button
									onClick={restartRecording}
									className={`p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors cursor-pointer border-none bg-transparent ${styles.electronNoDrag}`}
								>
									<MdRestartAlt className="w-5 h-5" />
								</button>
							</Tooltip>

							{/* Cancel with confirmation */}
							<Tooltip content={t("tooltips.cancelRecording")}>
								<button
									onClick={() => setShowCancelConfirm(true)}
									className={`p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors cursor-pointer border-none bg-transparent ${styles.electronNoDrag}`}
								>
									<MdCancel className="w-5 h-5 text-rose-400" />
								</button>
							</Tooltip>
						</>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className={`w-screen h-screen ${styles.hudViewportPadding} ${styles.hudRootTransparent}`}>
			{/* Mic level meter is now embedded inside the mic button */}

			<div
				className={`fixed top-[15px] left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 bg-[#2E2D2C] border border-white/[0.08] rounded-[20px] shadow-2xl select-none ${styles.electronDrag}`}
			>
				{/* 1. Close Button on the left */}
				<button
					onClick={sendHudOverlayClose}
					className={`w-7 h-7 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center transition-all duration-150 cursor-pointer shadow-md select-none border-none outline-none ${styles.electronNoDrag}`}
					title="Close App"
				>
					<X className="w-4 h-4 stroke-[3]" />
				</button>

				<div className="h-8 w-[1px] bg-white/10" />

				{/* 2. Mode selectors (Display, Window, Area, Device) */}
				<div className="flex items-center gap-1">
					<Tooltip
						content={`Select Screen to Record${hasSelectedSource && activeMode === "display" ? `: ${selectedSource}` : ""}`}
					>
						<button
							onClick={() => {
								setActiveMode("display");
								if (window.electronAPI && window.electronAPI.openDisplayOverlays) {
									window.electronAPI.openDisplayOverlays();
								} else {
									openSourceSelector("screens");
								}
							}}
							className={`flex flex-col items-center justify-center gap-1.5 px-3 py-1 rounded-lg transition-all duration-150 cursor-pointer border-none bg-transparent outline-none ${styles.electronNoDrag} ${
								activeMode === "display"
									? "text-white font-medium scale-[1.03]"
									: "text-white/45 hover:text-white hover:bg-white/5"
							}`}
						>
							<Monitor className="w-5 h-5" />
							<span className="text-[10px]">Display</span>
						</button>
					</Tooltip>

					<Tooltip
						content={`Select Window to Record${hasSelectedSource && activeMode === "window" ? `: ${selectedSource}` : ""}`}
					>
						<button
							onClick={() => {
								setActiveMode("window");
								openSourceSelector("windows");
							}}
							className={`flex flex-col items-center justify-center gap-1.5 px-3 py-1 rounded-lg transition-all duration-150 cursor-pointer border-none bg-transparent outline-none ${styles.electronNoDrag} ${
								activeMode === "window"
									? "text-white font-medium scale-[1.03]"
									: "text-white/45 hover:text-white hover:bg-white/5"
							}`}
						>
							<WindowIcon />
							<span className="text-[10px]">Window</span>
						</button>
					</Tooltip>

					<button
						onClick={() => {
							setActiveMode("area");
							window.electronAPI?.openAreaSelector();
						}}
						className={`flex flex-col items-center justify-center gap-1.5 px-3 py-1 rounded-lg transition-all duration-150 cursor-pointer border-none bg-transparent outline-none ${styles.electronNoDrag} ${
							activeMode === "area"
								? "text-white font-medium scale-[1.03]"
								: "text-white/45 hover:text-white hover:bg-white/5"
						}`}
					>
						<AreaIcon />
						<span className="text-[10px]">Area</span>
					</button>

					<button
						onClick={() => {
							setActiveMode("device");
							toast.info("Device recording is coming soon!");
						}}
						className={`flex flex-col items-center justify-center gap-1.5 px-3 py-1 rounded-lg transition-all duration-150 cursor-pointer border-none bg-transparent outline-none ${styles.electronNoDrag} ${
							activeMode === "device"
								? "text-white font-medium scale-[1.03]"
								: "text-white/45 hover:text-white hover:bg-white/5"
						}`}
					>
						<DeviceIcon />
						<span className="text-[10px]">Device</span>
					</button>
				</div>

				<div className="h-8 w-[1px] bg-white/10" />

				{/* 3. Camera, Microphone, System Audio toggles */}
				<div className="flex items-center gap-4">
					{/* Camera Dropdown */}
					<DropdownMenu open={cameraMenuOpen} onOpenChange={setCameraMenuOpen}>
						<DropdownMenuTrigger asChild>
							<button
								className={`flex items-center gap-2 hover:bg-white/5 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer text-left outline-none border-none bg-transparent w-[110px] ${styles.electronNoDrag}`}
							>
								{webcamEnabled ? (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										className="text-white"
									>
										<path d="m22 8-6 4 6 4V8Z" />
										<rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
									</svg>
								) : (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										className="text-white/40"
									>
										<path d="m22 8-6 4 6 4V8Z" />
										<rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
										<line x1="2" x2="22" y1="2" y2="22" />
									</svg>
								)}
								<span
									className={`text-[11px] truncate flex-1 min-w-0 ${
										webcamEnabled ? "text-white font-medium" : "text-white/40"
									}`}
								>
									{webcamEnabled ? selectedCameraLabel : "No camera"}
								</span>
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							side="top"
							sideOffset={6}
							align="start"
							avoidCollisions={true}
							className="bg-[#1C1C1E] border border-zinc-800 text-white min-w-[220px] rounded-xl shadow-2xl p-1 outline-none"
						>
							{isCameraDevicesLoading ? (
								<DropdownMenuItem disabled className="text-xs text-white/40 px-3 py-1.5 rounded-lg">
									Searching...
								</DropdownMenuItem>
							) : cameraDevices.length === 0 ? (
								<DropdownMenuItem disabled className="text-xs text-white/40 px-3 py-1.5 rounded-lg">
									No cameras found
								</DropdownMenuItem>
							) : (
								cameraDevices.map((device) => {
									const isActive =
										webcamEnabled && (webcamDeviceId || selectedCameraId) === device.deviceId;
									return (
										<DropdownMenuItem
											key={device.deviceId}
											onClick={async () => {
												if (!webcamEnabled) {
													await toggleWebcam();
												}
												setSelectedCameraId(device.deviceId);
												setWebcamDeviceId(device.deviceId);
											}}
											className="text-[13px] px-3 py-1.5 rounded-lg flex items-center gap-2 text-zinc-300 focus:bg-[#323236] focus:text-white cursor-pointer outline-none"
										>
											<span className="w-4 flex-shrink-0">{isActive ? "✓" : ""}</span>
											<span>{sanitizeCameraLabel(device.label)}</span>
										</DropdownMenuItem>
									);
								})
							)}

							<DropdownMenuSeparator className="bg-white/10" />

							{/* Resolution Submenu */}
							<DropdownMenuSub>
								<DropdownMenuSubTrigger className="text-[13px] px-3 py-1.5 rounded-lg flex items-center justify-between text-zinc-300 focus:bg-[#323236] focus:text-white cursor-pointer outline-none">
									<div className="flex items-center gap-2">
										<span className="w-4 flex-shrink-0" />
										<span>Max camera resolution</span>
									</div>
									<span className="text-xs opacity-50">❯</span>
								</DropdownMenuSubTrigger>
								<DropdownMenuPortal>
									<DropdownMenuSubContent className="bg-[#1C1C1E] border border-zinc-800 text-white min-w-[140px] rounded-xl shadow-2xl p-1">
										<DropdownMenuItem className="text-[13px] px-3 py-1.5 rounded-lg flex items-center gap-2 text-zinc-300 focus:bg-[#323236] focus:text-white cursor-pointer outline-none">
											<span className="w-4 flex-shrink-0">✓</span>
											<span>1080p (default)</span>
										</DropdownMenuItem>
										<DropdownMenuItem className="text-[13px] px-3 py-1.5 rounded-lg flex items-center gap-2 text-zinc-300 focus:bg-[#323236] focus:text-white cursor-pointer outline-none">
											<span className="w-4 flex-shrink-0" />
											<span>720p</span>
										</DropdownMenuItem>
									</DropdownMenuSubContent>
								</DropdownMenuPortal>
							</DropdownMenuSub>

							{/* Hide Camera Preview / Show Camera Preview */}
							<DropdownMenuItem
								onClick={toggleWebcam}
								className="text-[13px] px-3 py-1.5 rounded-lg flex items-center gap-2 text-zinc-300 focus:bg-[#323236] focus:text-white cursor-pointer outline-none"
							>
								<span className="w-4 flex-shrink-0" />
								<span>{webcamEnabled ? "Hide camera preview" : "Show camera preview"}</span>
							</DropdownMenuItem>

							<DropdownMenuSeparator className="bg-white/10" />

							{/* Don't record camera */}
							<DropdownMenuItem
								onClick={async () => {
									if (webcamEnabled) {
										await toggleWebcam();
									}
								}}
								className="text-[13px] px-3 py-1.5 rounded-lg flex items-center gap-2 text-zinc-300 focus:bg-[#323236] focus:text-white cursor-pointer outline-none"
							>
								<span className="w-4 flex-shrink-0">{!webcamEnabled ? "✓" : ""}</span>
								<span>Don't record camera</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					{/* Microphone Dropdown */}
					<DropdownMenu open={micMenuOpen} onOpenChange={setMicMenuOpen}>
						<DropdownMenuTrigger asChild>
							<button
								className={`flex flex-col hover:bg-white/5 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer text-left outline-none border-none bg-transparent w-[130px] gap-1 ${styles.electronNoDrag}`}
							>
								<div className="flex items-center gap-2 w-full min-w-0">
									{microphoneEnabled ? (
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="18"
											height="18"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
											className="flex-shrink-0 text-white"
										>
											<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
											<path d="M19 10v1a7 7 0 0 1-14 0v-1" />
											<line x1="12" x2="12" y1="19" y2="22" />
										</svg>
									) : (
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="18"
											height="18"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
											className="flex-shrink-0 text-white/40"
										>
											<line x1="2" x2="22" y1="2" y2="22" />
											<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
											<path d="M19 10v1a7 7 0 0 1-14 0v-1" />
											<line x1="12" x2="12" y1="19" y2="22" />
										</svg>
									)}
									<span
										className={`text-[11px] truncate flex-1 min-w-0 ${
											microphoneEnabled ? "text-white font-medium" : "text-white/40"
										}`}
									>
										{microphoneEnabled ? selectedMicLabel : "No microphone"}
									</span>
								</div>
								{microphoneEnabled && <AudioLevelMeter level={level} className="w-full h-[3px]" />}
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							side="top"
							sideOffset={6}
							align="start"
							avoidCollisions={true}
							className="bg-[#1C1C1E] border border-zinc-800 text-white min-w-[220px] rounded-xl shadow-2xl p-1 outline-none"
						>
							{micDevices.map((device) => {
								const isActive =
									microphoneEnabled && (microphoneDeviceId || selectedMicId) === device.deviceId;
								return (
									<DropdownMenuItem
										key={device.deviceId}
										onClick={() => {
											if (!microphoneEnabled) {
												toggleMicrophone();
											}
											setSelectedMicId(device.deviceId);
											setMicrophoneDeviceId(device.deviceId);
										}}
										className="text-[13px] px-3 py-1.5 rounded-lg flex items-center gap-2 text-zinc-300 focus:bg-[#323236] focus:text-white cursor-pointer outline-none"
									>
										<span className="w-4 flex-shrink-0">{isActive ? "✓" : ""}</span>
										<span>{device.label}</span>
									</DropdownMenuItem>
								);
							})}

							<DropdownMenuSeparator className="bg-white/10" />

							<DropdownMenuItem
								onClick={() => setMicrophoneEnabled(false)}
								className="text-[13px] px-3 py-1.5 rounded-lg flex items-center gap-2 text-zinc-300 focus:bg-[#323236] focus:text-white cursor-pointer outline-none"
							>
								<span className="w-4 flex-shrink-0">{!microphoneEnabled ? "✓" : ""}</span>
								<span>Don't record microphone</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					{/* System Audio Dropdown */}
					<DropdownMenu open={audioMenuOpen} onOpenChange={setAudioMenuOpen}>
						<DropdownMenuTrigger asChild>
							<button
								className={`flex items-center gap-2 hover:bg-white/5 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer text-left outline-none border-none bg-transparent w-[125px] ${styles.electronNoDrag}`}
							>
								<SystemAudioIcon
									enabled={systemAudioEnabled}
									className={systemAudioEnabled ? "text-white" : "text-white/40"}
								/>
								<span
									className={`text-[11px] truncate flex-1 min-w-0 ${
										systemAudioEnabled ? "text-white font-medium" : "text-white/40"
									}`}
								>
									{systemAudioEnabled ? "System audio" : "No system audio"}
								</span>
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							side="top"
							sideOffset={6}
							align="start"
							avoidCollisions={true}
							className="bg-[#1C1C1E] border border-zinc-800 text-white min-w-[240px] rounded-xl shadow-2xl p-1 outline-none"
						>
							<DropdownMenuItem
								onClick={() => setSystemAudioEnabled(true)}
								className="text-[13px] px-3 py-1.5 rounded-lg flex items-center gap-2 text-zinc-300 focus:bg-[#323236] focus:text-white cursor-pointer outline-none"
							>
								<span className="w-4 flex-shrink-0">{systemAudioEnabled ? "✓" : ""}</span>
								<span>Record system audio from all apps</span>
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => {
									setSystemAudioEnabled(true);
									toast.info("Recording from selected apps is coming soon!");
								}}
								className="text-[13px] px-3 py-1.5 rounded-lg flex items-center gap-2 text-zinc-300 focus:bg-[#323236] focus:text-white cursor-pointer outline-none"
							>
								<span className="w-4 flex-shrink-0" />
								<span>Record system audio from selected apps</span>
							</DropdownMenuItem>

							<DropdownMenuSeparator className="bg-white/10" />

							<DropdownMenuItem
								onClick={() => setSystemAudioEnabled(false)}
								className="text-[13px] px-3 py-1.5 rounded-lg flex items-center gap-2 text-zinc-300 focus:bg-[#323236] focus:text-white cursor-pointer outline-none"
							>
								<span className="w-4 flex-shrink-0">{!systemAudioEnabled ? "✓" : ""}</span>
								<span>Don't record system audio</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<div className="h-8 w-[1px] bg-white/10" />

				{/* 4. Settings and Optional Record Button */}
				<div className="flex items-center gap-1.5">
					{/* Settings gear only — record button removed, recording started via Start Recording flow */}
					<DropdownMenu open={settingsMenuOpen} onOpenChange={setSettingsMenuOpen}>
						<DropdownMenuTrigger asChild>
							<button
								className={`flex items-center gap-1 hover:bg-white/5 rounded-lg p-1.5 transition-colors cursor-pointer outline-none border-none bg-transparent text-white/60 hover:text-white ${styles.electronNoDrag}`}
							>
								<Settings className="w-5 h-5" />
								<ChevronDown className="w-3.5 h-3.5" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							side="top"
							sideOffset={6}
							align="end"
							avoidCollisions={true}
							className="bg-[#1C1C1E] border border-zinc-800 text-white min-w-[280px] rounded-xl shadow-2xl p-1 outline-none"
						>
							<DropdownMenuItem
								onClick={() => setHideDesktopIcons(!hideDesktopIcons)}
								className="text-[13px] px-3 py-1.5 rounded-lg flex items-center gap-2 text-zinc-300 focus:bg-[#323236] focus:text-white cursor-pointer outline-none"
							>
								<span className="w-4 flex-shrink-0">{hideDesktopIcons ? "✓" : ""}</span>
								<span>Hide desktop icons in recorded video</span>
							</DropdownMenuItem>

							<DropdownMenuItem
								onClick={() => setHideDockIcon(!hideDockIcon)}
								className="text-[13px] px-3 py-1.5 rounded-lg flex items-center gap-2 text-zinc-300 focus:bg-[#323236] focus:text-white cursor-pointer outline-none"
							>
								<span className="w-4 flex-shrink-0">{hideDockIcon ? "✓" : ""}</span>
								<span>Hide Screen Studio dock icon while recording</span>
							</DropdownMenuItem>

							<DropdownMenuItem
								onClick={() => setHighlightArea(!highlightArea)}
								className="text-[13px] px-3 py-1.5 rounded-lg flex items-center gap-2 text-zinc-300 focus:bg-[#323236] focus:text-white cursor-pointer outline-none"
							>
								<span className="w-4 flex-shrink-0">{highlightArea ? "✓" : ""}</span>
								<span>Highlight recorded area during recording</span>
							</DropdownMenuItem>

							<DropdownMenuSeparator className="bg-white/10" />

							<DropdownMenuItem
								onClick={() => setOpenQuickShare(!openQuickShare)}
								className="text-[13px] px-3 py-1.5 rounded-lg flex items-center gap-2 text-zinc-300 focus:bg-[#323236] focus:text-white cursor-pointer outline-none"
							>
								<span className="w-4 flex-shrink-0">{openQuickShare ? "✓" : ""}</span>
								<span>Open quick share widget after recording</span>
							</DropdownMenuItem>

							<DropdownMenuSeparator className="bg-white/10" />

							<DropdownMenuItem
								onClick={() => setShowSpeakerNotes(!showSpeakerNotes)}
								className="text-[13px] px-3 py-1.5 rounded-lg flex items-center justify-between text-zinc-300 focus:bg-[#323236] focus:text-white cursor-pointer outline-none"
							>
								<div className="flex items-center gap-2">
									<span className="w-4 flex-shrink-0">{showSpeakerNotes ? "✓" : ""}</span>
									<span>Show speaker notes</span>
								</div>
								<span className="text-[11px] text-zinc-500 font-mono">⌥⌘/</span>
							</DropdownMenuItem>

							<DropdownMenuSeparator className="bg-white/10" />

							{/* Countdown Submenu */}
							<DropdownMenuSub>
								<DropdownMenuSubTrigger className="text-[13px] px-3 py-1.5 rounded-lg flex items-center justify-between text-zinc-300 focus:bg-[#323236] focus:text-white cursor-pointer outline-none">
									<div className="flex items-center gap-2">
										<span className="w-4 flex-shrink-0" />
										<span>Recording countdown</span>
									</div>
									<span className="text-xs opacity-50">❯</span>
								</DropdownMenuSubTrigger>
								<DropdownMenuPortal>
									<DropdownMenuSubContent className="bg-[#1C1C1E] border border-zinc-800 text-white min-w-[140px] rounded-xl shadow-2xl p-1">
										{[0, 3, 5, 10].map((sec) => (
											<DropdownMenuItem
												key={sec}
												onClick={() => setCountdownSeconds(sec)}
												className="text-[13px] px-3 py-1.5 rounded-lg flex items-center gap-2 text-zinc-300 focus:bg-[#323236] focus:text-white cursor-pointer outline-none"
											>
												<span className="w-4 flex-shrink-0">
													{countdownSeconds === sec ? "✓" : ""}
												</span>
												<span>{sec === 0 ? "None" : `${sec} seconds`}</span>
											</DropdownMenuItem>
										))}
									</DropdownMenuSubContent>
								</DropdownMenuPortal>
							</DropdownMenuSub>

							{/* Advanced Submenu */}
							<DropdownMenuSub>
								<DropdownMenuSubTrigger className="text-[13px] px-3 py-1.5 rounded-lg flex items-center justify-between text-zinc-300 focus:bg-[#323236] focus:text-white cursor-pointer outline-none">
									<div className="flex items-center gap-2">
										<span className="w-4 flex-shrink-0" />
										<span>Advanced</span>
									</div>
									<span className="text-xs opacity-50">❯</span>
								</DropdownMenuSubTrigger>
								<DropdownMenuPortal>
									<DropdownMenuSubContent className="bg-[#1C1C1E] border border-zinc-800 text-white min-w-[180px] rounded-xl shadow-2xl p-1">
										<DropdownMenuItem
											onClick={openVideoFile}
											className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-1.5 px-3 rounded-lg"
										>
											Open Video File...
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={openProjectFile}
											className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-1.5 px-3 rounded-lg"
										>
											Open Project File...
										</DropdownMenuItem>
										<DropdownMenuSeparator className="bg-white/10" />

										{/* Language selection inside Advanced */}
										<DropdownMenuSub>
											<DropdownMenuSubTrigger className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-1.5 px-3 rounded-lg flex items-center gap-2">
												<Languages className="w-3.5 h-3.5" />
												<span>Select Language</span>
											</DropdownMenuSubTrigger>
											<DropdownMenuPortal>
												<DropdownMenuSubContent className="bg-[#1C1C1E] border border-zinc-800 text-white min-w-[120px] rounded-xl shadow-2xl p-1">
													{SUPPORTED_LOCALES.map((loc) => (
														<DropdownMenuItem
															key={loc}
															onClick={() => setLocale(loc)}
															className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-1.5 px-3 rounded-lg flex items-center justify-between"
														>
															<span>{getLocaleName(loc)}</span>
															{locale === loc && (
																<span className="w-1.5 h-1.5 rounded-full bg-[#5078EA]" />
															)}
														</DropdownMenuItem>
													))}
												</DropdownMenuSubContent>
											</DropdownMenuPortal>
										</DropdownMenuSub>

										<DropdownMenuSeparator className="bg-white/10" />
										<DropdownMenuItem
											onClick={sendHudOverlayHide}
											className="text-xs focus:bg-white/10 focus:text-white cursor-pointer py-1.5 px-3 rounded-lg"
										>
											Hide HUD
										</DropdownMenuItem>
									</DropdownMenuSubContent>
								</DropdownMenuPortal>
							</DropdownMenuSub>

							<DropdownMenuSeparator className="bg-white/10" />

							{/* Settings... Button */}
							<DropdownMenuItem
								onClick={() => {
									toast.success("Main settings panel opened.");
								}}
								className="text-[13px] px-3 py-1.5 rounded-lg flex items-center gap-2 text-zinc-300 focus:bg-[#323236] focus:text-white cursor-pointer outline-none font-semibold"
							>
								<span className="w-4 flex-shrink-0" />
								<span>Settings...</span>
							</DropdownMenuItem>

							<DropdownMenuSeparator className="bg-white/10" />
							<DropdownMenuItem
								onClick={sendHudOverlayClose}
								className="text-[13px] px-3 py-1.5 rounded-lg flex items-center gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer outline-none"
							>
								<span className="w-4 flex-shrink-0" />
								<span>Quit OpenStudio</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</div>
	);
}
