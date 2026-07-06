import React, { useCallback, useEffect, useRef, useState } from "react";

interface Selection {
	x: number;
	y: number;
	width: number;
	height: number;
}

// Helper: get normalized rect from two corners
const normalize = (x1: number, y1: number, x2: number, y2: number): Selection => ({
	x: Math.min(x1, x2),
	y: Math.min(y1, y2),
	width: Math.abs(x2 - x1),
	height: Math.abs(y2 - y1),
});

export default function AreaSelectorWindow() {
	const [selection, setSelection] = useState<Selection | null>(null);
	const [dragging, setDragging] = useState(false);
	const startRef = useRef<{ x: number; y: number } | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const onMouseDown = useCallback((e: React.MouseEvent) => {
		// Only primary button
		if (e.button !== 0) return;
		startRef.current = { x: e.clientX, y: e.clientY };
		setSelection(null);
		setDragging(true);
	}, []);

	const onMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (!dragging || !startRef.current) return;
			setSelection(normalize(startRef.current.x, startRef.current.y, e.clientX, e.clientY));
		},
		[dragging],
	);

	const onMouseUp = useCallback(
		(e: React.MouseEvent) => {
			if (!dragging || !startRef.current) return;
			setDragging(false);
			const sel = normalize(startRef.current.x, startRef.current.y, e.clientX, e.clientY);
			// Require at least a 10x10 selection
			if (sel.width < 10 || sel.height < 10) {
				setSelection(null);
			} else {
				setSelection(sel);
			}
			startRef.current = null;
		},
		[dragging],
	);

	// Escape to cancel
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				window.electronAPI?.closeAreaSelector();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const handleStartRecording = async () => {
		if (!selection || !window.electronAPI?.confirmAreaSelection) return;
		await window.electronAPI.confirmAreaSelection(selection);
	};

	const sel = selection;

	// Build SVG clip path to show selected area brighter
	const hasSel = sel && sel.width > 0 && sel.height > 0;

	return (
		<div
			ref={containerRef}
			className="fixed inset-0 overflow-hidden"
			style={{ cursor: dragging ? "crosshair" : "crosshair", userSelect: "none" }}
			onMouseDown={onMouseDown}
			onMouseMove={onMouseMove}
			onMouseUp={onMouseUp}
		>
			{/* Dark overlay with cutout */}
			<svg
				className="absolute inset-0 w-full h-full pointer-events-none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<defs>
					<mask id="cutout">
						<rect width="100%" height="100%" fill="white" />
						{hasSel && (
							<rect x={sel.x} y={sel.y} width={sel.width} height={sel.height} fill="black" />
						)}
					</mask>
				</defs>
				{/* Dim overlay outside selection */}
				<rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#cutout)" />
				{/* Selection border */}
				{hasSel && (
					<rect
						x={sel.x}
						y={sel.y}
						width={sel.width}
						height={sel.height}
						fill="none"
						stroke="rgba(255,255,255,0.85)"
						strokeWidth="1.5"
						strokeDasharray="6 3"
					/>
				)}
				{/* Corner handles */}
				{hasSel &&
					[
						[sel.x, sel.y],
						[sel.x + sel.width, sel.y],
						[sel.x, sel.y + sel.height],
						[sel.x + sel.width, sel.y + sel.height],
						[sel.x + sel.width / 2, sel.y],
						[sel.x + sel.width / 2, sel.y + sel.height],
						[sel.x, sel.y + sel.height / 2],
						[sel.x + sel.width, sel.y + sel.height / 2],
					].map(([cx, cy], i) => (
						<circle
							key={i}
							cx={cx}
							cy={cy}
							r={5}
							fill="white"
							stroke="rgba(0,0,0,0.4)"
							strokeWidth="1"
						/>
					))}
			</svg>

			{/* Info panel + Start Recording button — appears when selection is made */}
			{hasSel && !dragging && (
				<div
					className="absolute pointer-events-auto"
					style={{
						left: sel.x + sel.width / 2,
						top: sel.y + sel.height + 16,
						transform: "translateX(-50%)",
					}}
					onMouseDown={(e) => e.stopPropagation()}
				>
					<div
						className="flex flex-col gap-3 rounded-2xl shadow-2xl overflow-hidden"
						style={{ background: "#1C1C1E", border: "1px solid rgba(255,255,255,0.12)" }}
					>
						{/* Size + position row */}
						<div className="flex items-center gap-3 px-4 pt-4 pb-0">
							<div className="flex items-center gap-2">
								<span className="text-[11px] text-white/40 font-medium">Size</span>
								<div className="flex items-center gap-1.5">
									<div className="bg-white/[0.07] rounded-md px-2 py-1 text-[12px] text-white font-mono font-medium min-w-[44px] text-center">
										{Math.round(sel.width)}
									</div>
									<span className="text-white/30 text-xs">×</span>
									<div className="bg-white/[0.07] rounded-md px-2 py-1 text-[12px] text-white font-mono font-medium min-w-[44px] text-center">
										{Math.round(sel.height)}
									</div>
									<span className="text-white/40 text-[11px]">px</span>
								</div>
							</div>
							<div className="w-px h-4 bg-white/10" />
							<div className="flex items-center gap-2">
								<span className="text-[11px] text-white/40 font-medium">Position</span>
								<div className="flex items-center gap-1.5">
									<div className="bg-white/[0.07] rounded-md px-2 py-1 text-[12px] text-white font-mono font-medium min-w-[40px] text-center">
										{Math.round(sel.x)}
									</div>
									<div className="bg-white/[0.07] rounded-md px-2 py-1 text-[12px] text-white font-mono font-medium min-w-[40px] text-center">
										{Math.round(sel.y)}
									</div>
									<span className="text-white/40 text-[11px]">px</span>
								</div>
							</div>
						</div>

						{/* Divider */}
						<div className="mx-4 h-px bg-white/[0.08]" />

						{/* Action buttons */}
						<div className="flex items-center gap-2 px-4 pb-4">
							<button
								className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium text-white/60 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer border-none outline-none"
								style={{ background: "rgba(255,255,255,0.05)" }}
								onClick={() => window.electronAPI?.closeAreaSelector()}
							>
								Cancel
							</button>
							<button
								className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold text-white transition-all cursor-pointer border-none outline-none shadow-lg"
								style={{
									background: "linear-gradient(135deg, #5B63EA 0%, #7C5CEA 100%)",
									boxShadow: "0 4px 16px rgba(91,99,234,0.45)",
								}}
								onClick={handleStartRecording}
							>
								<span
									className="w-2 h-2 rounded-full bg-white inline-block"
									style={{ boxShadow: "0 0 6px rgba(255,255,255,0.8)" }}
								/>
								Start Recording
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Hint text when no selection yet */}
			{!hasSel && (
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
					<div
						className="px-5 py-3 rounded-2xl text-[13px] text-white/70 font-medium"
						style={{
							background: "rgba(28,28,30,0.85)",
							border: "1px solid rgba(255,255,255,0.1)",
							backdropFilter: "blur(12px)",
						}}
					>
						Drag to select the recording area · <span className="text-white/40">Esc to cancel</span>
					</div>
				</div>
			)}
		</div>
	);
}
