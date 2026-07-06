import path from "node:path";
import { fileURLToPath } from "node:url";
import { BrowserWindow, ipcMain, screen } from "electron";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const RENDERER_DIST = path.join(APP_ROOT, "dist");
const HEADLESS = process.env["HEADLESS"] === "true";

let hudOverlayWindow: BrowserWindow | null = null;

ipcMain.on("hud-overlay-hide", () => {
	if (hudOverlayWindow && !hudOverlayWindow.isDestroyed()) {
		hudOverlayWindow.minimize();
	}
});

ipcMain.on("set-hud-height", (_event, height: number) => {
	if (hudOverlayWindow && !hudOverlayWindow.isDestroyed()) {
		const primaryDisplay = screen.getPrimaryDisplay();
		const { workArea } = primaryDisplay;
		const [currentWidth] = hudOverlayWindow.getSize();
		const targetHeight = Math.round(height);

		// Shift y-coordinate upwards by the height difference so the window grows upwards
		const targetY = Math.floor(workArea.y + workArea.height - 100 - (targetHeight - 95));
		const [currentX] = hudOverlayWindow.getPosition();

		hudOverlayWindow.setBounds(
			{
				x: currentX,
				y: targetY,
				width: currentWidth,
				height: targetHeight,
			},
			false,
		);
	}
});

ipcMain.on("set-hud-content-protection", (_event, protect: boolean) => {
	if (hudOverlayWindow && !hudOverlayWindow.isDestroyed()) {
		hudOverlayWindow.setContentProtection(protect);
	}
});

export function createHudOverlayWindow(): BrowserWindow {
	const primaryDisplay = screen.getPrimaryDisplay();
	const { workArea } = primaryDisplay;

	const windowWidth = 860;
	const windowHeight = 95;

	const x = Math.floor(workArea.x + (workArea.width - windowWidth) / 2);
	const y = Math.floor(workArea.y + workArea.height - 100);

	const win = new BrowserWindow({
		width: windowWidth,
		height: windowHeight,
		minWidth: 860,
		maxWidth: 860,
		minHeight: 95,
		maxHeight: 420,
		x: x,
		y: y,
		frame: false,
		transparent: true,
		backgroundColor: "#00000000",
		vibrancy: undefined,
		visualEffectState: undefined,
		resizable: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		hasShadow: false,
		show: !HEADLESS,
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			nodeIntegration: false,
			contextIsolation: true,
			backgroundThrottling: false,
		},
	});

	win.webContents.on("did-finish-load", () => {
		win?.webContents.send("main-process-message", new Date().toLocaleString());
	});

	hudOverlayWindow = win;

	win.on("closed", () => {
		if (hudOverlayWindow === win) {
			hudOverlayWindow = null;
		}
	});

	if (VITE_DEV_SERVER_URL) {
		win.loadURL(VITE_DEV_SERVER_URL + "?windowType=hud-overlay");
	} else {
		win.loadFile(path.join(RENDERER_DIST, "index.html"), {
			query: { windowType: "hud-overlay" },
		});
	}

	// Visible in screenshots by default; hidden from screen capture only during recording.
	win.setContentProtection(false);

	return win;
}

export function createEditorWindow(): BrowserWindow {
	const isMac = process.platform === "darwin";

	const win = new BrowserWindow({
		width: 1200,
		height: 800,
		minWidth: 800,
		minHeight: 600,
		...(isMac && {
			titleBarStyle: "hiddenInset",
			trafficLightPosition: { x: 12, y: 12 },
		}),
		transparent: false,
		resizable: true,
		alwaysOnTop: false,
		skipTaskbar: false,
		title: "OpenStudio",
		backgroundColor: "#000000",
		show: !HEADLESS,
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			nodeIntegration: false,
			contextIsolation: true,
			webSecurity: false,
			backgroundThrottling: false,
		},
	});

	// Maximize the window by default
	win.maximize();

	win.webContents.on("did-finish-load", () => {
		win?.webContents.send("main-process-message", new Date().toLocaleString());
	});

	if (VITE_DEV_SERVER_URL) {
		win.loadURL(VITE_DEV_SERVER_URL + "?windowType=editor");
	} else {
		win.loadFile(path.join(RENDERER_DIST, "index.html"), {
			query: { windowType: "editor" },
		});
	}

	return win;
}

export function createSourceSelectorWindow(defaultTab?: string): BrowserWindow {
	const { width, height } = screen.getPrimaryDisplay().workAreaSize;

	const win = new BrowserWindow({
		width: 620,
		height: 420,
		minHeight: 350,
		maxHeight: 500,
		x: Math.round((width - 620) / 2),
		y: Math.round((height - 420) / 2),
		frame: false,
		resizable: false,
		alwaysOnTop: true,
		transparent: true,
		backgroundColor: "#00000000",
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			nodeIntegration: false,
			contextIsolation: true,
		},
	});

	if (VITE_DEV_SERVER_URL) {
		const url =
			VITE_DEV_SERVER_URL +
			`?windowType=source-selector${defaultTab ? `&defaultTab=${defaultTab}` : ""}`;
		win.loadURL(url);
	} else {
		win.loadFile(path.join(RENDERER_DIST, "index.html"), {
			query: { windowType: "source-selector", ...(defaultTab && { defaultTab }) },
		});
	}

	return win;
}

export function createWebcamPreviewWindow(): BrowserWindow {
	const { workArea } = screen.getPrimaryDisplay();
	const width = 280;
	const height = 220;

	const win = new BrowserWindow({
		width,
		height,
		x: Math.round(workArea.x + workArea.width - width - 24),
		y: Math.round(workArea.y + workArea.height - height - 24),
		frame: false,
		transparent: true,
		resizable: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		show: !HEADLESS,
		hasShadow: true,
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			nodeIntegration: false,
			contextIsolation: true,
			backgroundThrottling: false,
		},
	});

	// Keep preview monitor-only and out of desktop captures when possible.
	win.setContentProtection(true);
	win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

	if (VITE_DEV_SERVER_URL) {
		win.loadURL(`${VITE_DEV_SERVER_URL}?windowType=webcam-preview`);
	} else {
		win.loadFile(path.join(RENDERER_DIST, "index.html"), {
			query: { windowType: "webcam-preview" },
		});
	}

	return win;
}

let displayOverlayWindows: BrowserWindow[] = [];

export function createDisplayOverlayWindows(displayNames: Record<string, string>): void {
	closeDisplayOverlayWindows();

	const displays = screen.getAllDisplays();
	for (const display of displays) {
		const displayName = displayNames[display.id.toString()] || `Display ${display.id}`;
		const win = new BrowserWindow({
			x: display.bounds.x,
			y: display.bounds.y,
			width: display.bounds.width,
			height: display.bounds.height,
			frame: false,
			transparent: true,
			resizable: false,
			alwaysOnTop: true,
			skipTaskbar: true,
			hasShadow: false,
			enableLargerThanScreen: true,
			webPreferences: {
				preload: path.join(__dirname, "preload.mjs"),
				nodeIntegration: false,
				contextIsolation: true,
			},
		});

		win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

		const queryParams = new URLSearchParams({
			windowType: "display-overlay",
			displayId: display.id.toString(),
			label: displayName,
			width: display.bounds.width.toString(),
			height: display.bounds.height.toString(),
		});

		if (VITE_DEV_SERVER_URL) {
			win.loadURL(`${VITE_DEV_SERVER_URL}?${queryParams.toString()}`);
		} else {
			win.loadFile(path.join(RENDERER_DIST, "index.html"), {
				query: Object.fromEntries(queryParams.entries()),
			});
		}

		displayOverlayWindows.push(win);
	}
}

export function closeDisplayOverlayWindows(): void {
	for (const win of displayOverlayWindows) {
		if (win && !win.isDestroyed()) {
			win.close();
		}
	}
	displayOverlayWindows = [];
}

export function getDisplayOverlayWindows(): BrowserWindow[] {
	return displayOverlayWindows;
}

// ─── Area Selector ─────────────────────────────────────────────────────────

let areaSelectorWindow: BrowserWindow | null = null;

export interface AreaSelection {
	x: number;
	y: number;
	width: number;
	height: number;
}

export function createAreaSelectorWindow(): BrowserWindow {
	// Close any existing one
	if (areaSelectorWindow && !areaSelectorWindow.isDestroyed()) {
		areaSelectorWindow.close();
	}

	const { bounds } = screen.getPrimaryDisplay();

	const win = new BrowserWindow({
		x: bounds.x,
		y: bounds.y,
		width: bounds.width,
		height: bounds.height,
		frame: false,
		transparent: true,
		backgroundColor: "#00000000",
		resizable: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		hasShadow: false,
		enableLargerThanScreen: true,
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			nodeIntegration: false,
			contextIsolation: true,
		},
	});

	win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

	if (VITE_DEV_SERVER_URL) {
		win.loadURL(`${VITE_DEV_SERVER_URL}?windowType=area-selector`);
	} else {
		win.loadFile(path.join(RENDERER_DIST, "index.html"), {
			query: { windowType: "area-selector" },
		});
	}

	win.on("closed", () => {
		if (areaSelectorWindow === win) areaSelectorWindow = null;
	});

	areaSelectorWindow = win;
	return win;
}

export function closeAreaSelectorWindow(): void {
	if (areaSelectorWindow && !areaSelectorWindow.isDestroyed()) {
		areaSelectorWindow.close();
	}
	areaSelectorWindow = null;
}

export function getAreaSelectorWindow(): BrowserWindow | null {
	return areaSelectorWindow;
}

ipcMain.handle("open-area-selector", () => {
	createAreaSelectorWindow();
	return { success: true };
});

ipcMain.handle("close-area-selector", () => {
	closeAreaSelectorWindow();
	return { success: true };
});
