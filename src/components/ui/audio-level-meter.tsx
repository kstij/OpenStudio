interface AudioLevelMeterProps {
	level: number; // 0-100
	className?: string;
}

export function AudioLevelMeter({ level, className = "" }: AudioLevelMeterProps) {
	// Render as a horizontal fill bar — matches Screen Studio style
	return (
		<div className={`relative rounded-full overflow-hidden bg-white/10 ${className}`}>
			<div
				className="absolute inset-y-0 left-0 rounded-full bg-white transition-all duration-75 ease-out"
				style={{ width: `${Math.max(0, Math.min(100, level))}%` }}
			/>
		</div>
	);
}
