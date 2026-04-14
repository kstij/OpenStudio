import { useEffect, useState } from "react";
import { LaunchWindow } from "./components/launch/LaunchWindow";
import { SourceSelector } from "./components/launch/SourceSelector";
import { WebcamPreviewWindow } from "./components/launch/WebcamPreviewWindow";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { ShortcutsConfigDialog } from "./components/video-editor/ShortcutsConfigDialog";
import VideoEditor from "./components/video-editor/VideoEditor";
import { ShortcutsProvider } from "./contexts/ShortcutsContext";
import { loadAllCustomFonts } from "./lib/customFonts";

export default function App() {
	const [windowType, setWindowType] = useState("");

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const type = params.get("windowType") || "";
		setWindowType(type);
		if (type === "hud-overlay" || type === "source-selector" || type === "webcam-preview") {
			document.body.style.background = "transparent";
			document.body.style.backgroundColor = "transparent";
			document.documentElement.style.background = "transparent";
			document.documentElement.style.backgroundColor = "transparent";
			const root = document.getElementById("root");
			root?.style.setProperty("background", "transparent");
			root?.style.setProperty("background-color", "transparent");
		}

		// Load custom fonts on app initialization
		loadAllCustomFonts().catch((error) => {
			console.error("Failed to load custom fonts:", error);
		});

		return () => {
			document.body.style.removeProperty("background");
			document.body.style.removeProperty("background-color");
			document.documentElement.style.removeProperty("background");
			document.documentElement.style.removeProperty("background-color");
			const root = document.getElementById("root");
			root?.style.removeProperty("background");
			root?.style.removeProperty("background-color");
		};
	}, []);

	const content = (() => {
		switch (windowType) {
			case "hud-overlay":
				return <LaunchWindow />;
			case "source-selector":
				return <SourceSelector />;
			case "webcam-preview":
				return <WebcamPreviewWindow />;
			case "editor":
				return (
					<ShortcutsProvider>
						<VideoEditor />
						<ShortcutsConfigDialog />
					</ShortcutsProvider>
				);
			default:
				return (
					<div className="w-full h-full bg-background text-foreground">
						<h1>OpenStudio</h1>
					</div>
				);
		}
	})();

	return (
		<TooltipProvider>
			{content}
			<Toaster theme="dark" className="pointer-events-auto" />
		</TooltipProvider>
	);
}
