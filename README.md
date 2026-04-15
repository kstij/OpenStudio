> [!WARNING]
> OpenStudio is under active development. Expect occasional bugs while features stabilize.

<p align="center">
  <img src="public/openstudio.png" alt="OpenStudio Logo" width="72" />
</p>

# <p align="center">OpenStudio</p>

<p align="center"><strong>Create polished screen recordings with an open, customizable desktop workflow.</strong></p>

<p align="center">
  <img src="public/preview3.png" alt="OpenStudio Preview 3" style="height: 0.2467; margin-right: 12px;" />
  <img src="public/preview4.png" alt="OpenStudio Preview 4" style="height: 0.1678; margin-right: 12px;" />
</p>

## What OpenStudio Does
- Capture a full display or a selected window.
- Record microphone audio, system audio, and optional webcam.
- Use live webcam controls (shape, size, position, mirror, blur).
- Edit with trim ranges, speed ranges, and zoom regions.
- Add annotations (text, images, arrows) on top of your recording.
- Customize scene styling with wallpapers, colors, gradients, shadow, blur, and corner radius.
- Export to MP4 or GIF in multiple aspect ratios and output sizes.
- Save and load project sessions for later editing (`.openstudio`).

## Tech Stack
- Electron
- React
- TypeScript
- Vite
- PixiJS

## Getting Started

Install dependencies:

```bash
npm install
```

Run development app:

```bash
npm run dev
```

Build desktop packages:

```bash
npm run build
```

Platform-specific builds:

```bash
npm run build:mac
npm run build:win
npm run build:linux
```

## Platform Notes

System audio capture relies on Electron desktop capture APIs and may vary by platform:
- **macOS**: Requires screen recording/accessibility permissions. Newer macOS versions may additionally prompt for audio capture permissions.
- **Windows**: Usually works out of the box.
- **Linux**: Best support with PipeWire-based environments.

## macOS Gatekeeper (Unsigned Builds)

If macOS blocks launch for an unsigned build:

```bash
xattr -rd com.apple.quarantine /Applications/OpenStudio.app
```

## Contributing

Contributions are welcome. Use your preferred collaboration workflow for issue tracking, planning, and pull/merge requests.

## License

This project is licensed under the [MIT License](./LICENSE).
