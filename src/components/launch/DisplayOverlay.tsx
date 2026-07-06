import { ChevronDown, Play } from "lucide-react";
import React, { useEffect, useState } from "react";

export default function DisplayOverlay() {
	const [label, setLabel] = useState("Display");
	const [width, setWidth] = useState("1920");
	const [height, setHeight] = useState("1080");
	const [displayId, setDisplayId] = useState("");

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		setLabel(params.get("label") || "Display");
		setWidth(params.get("width") || "1920");
		setHeight(params.get("height") || "1080");
		setDisplayId(params.get("displayId") || "");

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				window.electronAPI.closeDisplayOverlays();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const handleStartRecording = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (displayId && window.electronAPI) {
			window.electronAPI.selectDisplayAndStart(displayId);
		}
	};

	const handleClose = () => {
		if (window.electronAPI) {
			window.electronAPI.closeDisplayOverlays();
		}
	};

	return (
		<div
			onClick={handleClose}
			className="w-screen h-screen relative flex items-center justify-center bg-black/55 backdrop-blur-[1px] cursor-default select-none border-4 border-[#5B41FF] shadow-[inset_0_0_50px_rgba(91,65,255,0.25)] transition-all duration-300 animate-fade-in"
		>
			<div
				onClick={(e) => e.stopPropagation()}
				className="flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-xl shadow-2xl max-w-md animate-scale-up"
			>
				<h1 className="text-white text-3xl font-bold tracking-tight mb-2">{label}</h1>
				<p className="text-zinc-400 text-sm font-semibold tracking-wide uppercase mb-6">
					{width}×{height} • 60FPS
				</p>

				<button
					onClick={handleStartRecording}
					className="flex items-center gap-3 px-6 py-3 bg-[#5B41FF] hover:bg-[#4E34E1] active:scale-95 text-white font-medium rounded-xl shadow-lg transition-all duration-200 cursor-pointer border-none outline-none group"
				>
					<div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
						<Play className="w-3 h-3 text-[#5B41FF] fill-current stroke-[3] translate-x-[0.5px]" />
					</div>
					<span className="text-sm font-bold tracking-wide">Start recording</span>
					<div className="h-4 w-[1px] bg-white/20 ml-1" />
					<ChevronDown className="w-4 h-4 opacity-75 group-hover:opacity-100 transition-opacity" />
				</button>
			</div>
		</div>
	);
}
