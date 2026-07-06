import { Check, ScreenShare, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useScopedT } from "@/contexts/I18nContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import styles from "./SourceSelector.module.css";

interface DesktopSource {
	id: string;
	name: string;
	thumbnail: string | null;
	display_id: string;
	appIcon: string | null;
}

export function SourceSelector() {
	const tc = useScopedT("common");
	const [sources, setSources] = useState<DesktopSource[]>([]);
	const [selectedSource, setSelectedSource] = useState<DesktopSource | null>(null);
	const [loading, setLoading] = useState(true);

	const query = new URLSearchParams(window.location.search);
	const defaultTabParam =
		query.get("defaultTab") === "windows"
			? "windows"
			: query.get("defaultTab") === "screens"
				? "screens"
				: undefined;

	useEffect(() => {
		async function fetchSources() {
			setLoading(true);
			try {
				const rawSources = await window.electronAPI.getSources({
					types: ["screen", "window"],
					thumbnailSize: { width: 320, height: 180 },
					fetchWindowIcons: true,
				});
				setSources(
					rawSources.map((source) => ({
						id: source.id,
						name:
							source.id.startsWith("window:") && source.name.includes(" — ")
								? source.name.split(" — ")[1] || source.name
								: source.name,
						thumbnail: source.thumbnail,
						display_id: source.display_id,
						appIcon: source.appIcon,
					})),
				);
			} catch (error) {
				console.error("Error loading sources:", error);
			} finally {
				setLoading(false);
			}
		}
		fetchSources();
	}, []);

	const screenSources = sources.filter((s) => s.id.startsWith("screen:"));
	const windowSources = sources.filter((s) => s.id.startsWith("window:"));

	const handleSourceSelect = (source: DesktopSource) => setSelectedSource(source);
	const handleShare = async () => {
		if (selectedSource) await window.electronAPI.selectSource(selectedSource);
	};

	if (loading) {
		return (
			<div className="h-screen w-screen flex items-center justify-center bg-zinc-950 text-white">
				<div className="text-center flex flex-col items-center">
					<div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-white mb-3" />
					<p className="text-sm text-zinc-400 font-medium tracking-wide">Loading windows...</p>
				</div>
			</div>
		);
	}

	const renderSourceCard = (source: DesktopSource) => {
		const isSelected = selectedSource?.id === source.id;
		return (
			<div
				key={source.id}
				className={`${styles.sourceCard} ${isSelected ? styles.selected : ""} relative flex flex-col overflow-hidden group`}
				onClick={() => handleSourceSelect(source)}
			>
				<div className="relative aspect-video overflow-hidden bg-zinc-900 flex-shrink-0">
					{source.thumbnail ? (
						<img
							src={source.thumbnail}
							alt={source.name}
							className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
						/>
					) : (
						<div className="w-full h-full flex items-center justify-center bg-zinc-900">
							<ScreenShare className="w-8 h-8 text-zinc-600" />
						</div>
					)}
					{isSelected && <div className="absolute inset-0 bg-white/5 pointer-events-none" />}
					{isSelected && (
						<div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white shadow-lg flex items-center justify-center border border-white/20 animate-scale-up">
							<Check className="w-3.5 h-3.5 text-zinc-950 stroke-[3.5]" />
						</div>
					)}
				</div>
				<div className="p-2.5 flex items-center gap-2 bg-zinc-950/40 border-t border-white/[0.04] flex-1 min-h-0">
					{source.appIcon && (
						<img
							src={source.appIcon}
							alt=""
							className="w-4 h-4 rounded object-contain flex-shrink-0"
						/>
					)}
					<span className="text-xs text-zinc-200 font-semibold truncate flex-1 tracking-wide">
						{source.name}
					</span>
				</div>
			</div>
		);
	};

	return (
		<div className="w-screen h-screen flex flex-col bg-gradient-to-b from-[#2D2D2D] to-[#1A1A1A] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
			{/* Header */}
			<div className="px-6 py-4 flex items-center justify-between border-b border-white/[0.06] bg-black/10">
				<div>
					<h2 className="text-sm font-bold text-white tracking-wide">Select Source</h2>
					<p className="text-[11px] text-zinc-400 font-medium">Choose what you want to record</p>
				</div>
				<button
					onClick={() => window.close()}
					className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors duration-150 border-none cursor-pointer"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			{/* Tabs & Content */}
			<div className="flex-1 flex flex-col min-h-0 px-6 pt-4">
				<Tabs
					defaultValue={defaultTabParam || (screenSources.length === 0 ? "windows" : "screens")}
					className="flex-1 flex flex-col min-h-0"
				>
					<TabsList className="grid grid-cols-2 p-1 bg-black/40 border border-white/[0.04] rounded-xl mb-4">
						<TabsTrigger
							value="screens"
							className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-lg text-zinc-400 rounded-lg text-xs font-semibold py-1.5 transition-all cursor-pointer border border-transparent data-[state=active]:border-white/[0.04]"
						>
							Screens ({screenSources.length})
						</TabsTrigger>
						<TabsTrigger
							value="windows"
							className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-lg text-zinc-400 rounded-lg text-xs font-semibold py-1.5 transition-all cursor-pointer border border-transparent data-[state=active]:border-white/[0.04]"
						>
							Windows ({windowSources.length})
						</TabsTrigger>
					</TabsList>

					<div className="flex-1 min-h-0 relative mb-4">
						<TabsContent value="screens" className="h-full mt-0 overflow-y-auto pr-1">
							<div className="grid grid-cols-2 gap-3.5 pb-2">
								{screenSources.map(renderSourceCard)}
							</div>
						</TabsContent>
						<TabsContent value="windows" className="h-full mt-0 overflow-y-auto pr-1">
							<div className="grid grid-cols-2 gap-3.5 pb-2">
								{windowSources.map(renderSourceCard)}
							</div>
						</TabsContent>
					</div>
				</Tabs>
			</div>

			{/* Footer Actions */}
			<div className="px-6 py-4 flex items-center justify-end gap-3 border-t border-white/[0.06] bg-black/10">
				<button
					onClick={() => window.close()}
					className="px-5 py-2 text-xs font-bold text-zinc-400 hover:text-white rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all duration-150 border border-white/[0.04] cursor-pointer"
				>
					{tc("actions.cancel")}
				</button>
				<button
					onClick={handleShare}
					disabled={!selectedSource}
					className="px-6 py-2 text-xs font-bold bg-white hover:bg-zinc-200 active:scale-95 text-zinc-950 disabled:opacity-30 disabled:pointer-events-none rounded-xl shadow-lg transition-all duration-150 border-none cursor-pointer"
				>
					{tc("actions.share")}
				</button>
			</div>
		</div>
	);
}
