import { Application, Graphics, Sprite } from "pixi.js";
import {
	computeCompositeLayout,
	type RenderRect,
	type Size,
	type StyledRenderRect,
	type WebcamLayoutPreset,
	type WebcamSizePreset,
} from "@/lib/compositeLayout";
import { resolveScreenPadding, type CropRegion, type ScreenLayoutPreset, type WebcamMaskShape } from "../types";

interface LayoutParams {
	container: HTMLDivElement;
	app: Application;
	videoSprite: Sprite;
	maskGraphics: Graphics;
	videoElement: HTMLVideoElement;
	cropRegion?: CropRegion;
	lockedVideoDimensions?: { width: number; height: number } | null;
	borderRadius?: number;
	padding?: number;
	screenLayoutPreset?: ScreenLayoutPreset;
	webcamDimensions?: Size | null;
	webcamLayoutPreset?: WebcamLayoutPreset;
	webcamSizePreset?: WebcamSizePreset;
	webcamPosition?: { cx: number; cy: number } | null;
	webcamMaskShape?: WebcamMaskShape;
}

interface LayoutResult {
	stageSize: { width: number; height: number };
	videoSize: { width: number; height: number };
	baseScale: number;
	baseOffset: { x: number; y: number };
	maskRect: RenderRect;
	webcamRect: StyledRenderRect | null;
	cropBounds: { startX: number; endX: number; startY: number; endY: number };
}

const WEBCAM_AUTO_ZOOM_OUT_PADDING_BOOST = 10;

export function layoutVideoContent(params: LayoutParams): LayoutResult | null {
	const {
		container,
		app,
		videoSprite,
		maskGraphics,
		videoElement,
		cropRegion,
		lockedVideoDimensions,
		borderRadius = 0,
		padding = 0,
		screenLayoutPreset = "full-screen",
		webcamDimensions,
		webcamLayoutPreset,
		webcamSizePreset,
		webcamPosition,
		webcamMaskShape,
	} = params;

	const videoWidth = lockedVideoDimensions?.width || videoElement.videoWidth;
	const videoHeight = lockedVideoDimensions?.height || videoElement.videoHeight;

	if (!videoWidth || !videoHeight) {
		return null;
	}

	const width = container.clientWidth;
	const height = container.clientHeight;

	if (!width || !height) {
		return null;
	}

	app.renderer.resize(width, height);
	app.canvas.style.width = "100%";
	app.canvas.style.height = "100%";

	// Apply crop region
	const crop = cropRegion || { x: 0, y: 0, width: 1, height: 1 };

	// Calculate the cropped dimensions
	const croppedVideoWidth = videoWidth * crop.width;
	const croppedVideoHeight = videoHeight * crop.height;

	const cropStartX = crop.x * videoWidth;
	const cropStartY = crop.y * videoHeight;
	const cropEndX = cropStartX + croppedVideoWidth;
	const cropEndY = cropStartY + croppedVideoHeight;

	// Calculate scale to fit the cropped area in the viewport
	// Padding is treated as px from the layout preset/custom value.
	// Vertical stack ignores padding — it's full-bleed
	const hasWebcamOverlay = Boolean(webcamDimensions);
	const resolvedPadding = resolveScreenPadding(screenLayoutPreset, padding);
	const isZeroCustomPadding = screenLayoutPreset === "custom" && resolvedPadding <= 0;
	const shouldFillCanvas = screenLayoutPreset === "full-screen" || isZeroCustomPadding;
	const effectivePadding =
		webcamLayoutPreset === "vertical-stack" || shouldFillCanvas
			? 0
			: Math.max(
				0,
				resolvedPadding +
				(hasWebcamOverlay && webcamLayoutPreset === "picture-in-picture"
					? WEBCAM_AUTO_ZOOM_OUT_PADDING_BOOST
					: 0),
			);
	const maxDisplayWidth = Math.max(1, width - effectivePadding * 2);
	const maxDisplayHeight = Math.max(1, height - effectivePadding * 2);

	const compositeLayout = computeCompositeLayout({
		canvasSize: { width, height },
		maxContentSize: { width: maxDisplayWidth, height: maxDisplayHeight },
		screenSize: { width: croppedVideoWidth, height: croppedVideoHeight },
		webcamSize: webcamDimensions,
		layoutPreset: webcamLayoutPreset,
		webcamSizePreset,
		webcamPosition,
		webcamMaskShape,
	});

	if (!compositeLayout) {
		return null;
	}

	const screenRect = shouldFillCanvas
		? { x: 0, y: 0, width, height }
		: compositeLayout.screenRect;
	const screenCover = shouldFillCanvas || Boolean(compositeLayout.screenCover);

	// Cover mode: scale to fill the rect (may crop), otherwise fit-to-width
	let scale: number;
	if (screenCover) {
		scale = Math.max(screenRect.width / croppedVideoWidth, screenRect.height / croppedVideoHeight);
	} else {
		scale = screenRect.width / croppedVideoWidth;
	}

	videoSprite.scale.set(scale);

	// Calculate display size of the full video at this scale
	const fullVideoDisplayWidth = videoWidth * scale;
	const fullVideoDisplayHeight = videoHeight * scale;

	// Position the video so the cropped region is centered within the screenRect
	const croppedDisplayWidth = croppedVideoWidth * scale;
	const croppedDisplayHeight = croppedVideoHeight * scale;
	const offsetX = screenRect.x + (screenRect.width - croppedDisplayWidth) / 2;
	const offsetY = screenRect.y + (screenRect.height - croppedDisplayHeight) / 2;
	const spriteX = offsetX - crop.x * fullVideoDisplayWidth;
	const spriteY = offsetY - crop.y * fullVideoDisplayHeight;

	videoSprite.position.set(spriteX, spriteY);

	// Apply border radius — mask clips the video to the screenRect
	maskGraphics.clear();
	maskGraphics.roundRect(
		screenRect.x,
		screenRect.y,
		screenRect.width,
		screenRect.height,
		borderRadius,
	);
	maskGraphics.fill({ color: 0xffffff });

	return {
		stageSize: { width, height },
		videoSize: { width: croppedVideoWidth, height: croppedVideoHeight },
		baseScale: scale,
		baseOffset: { x: spriteX, y: spriteY },
		maskRect: screenRect,
		webcamRect: compositeLayout.webcamRect,
		cropBounds: { startX: cropStartX, endX: cropEndX, startY: cropStartY, endY: cropEndY },
	};
}
