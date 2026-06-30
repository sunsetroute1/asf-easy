# ASF Easy

A simple Windows launcher and setup wizard for [ArchiSteamFarm](https://github.com/JustArchiNET/ArchiSteamFarm).

ASF Easy handles the parts that trip up new users:

1. **Prerequisites** — checks and silently installs Visual C++ Redistributable (elevated/UAC)
2. **Download** the official `ASF-win-x64.zip` release (includes bundled .NET — no separate .NET install)
3. **Add accounts** — configure one or more Steam bots without hand-editing JSON
4. **Steam Guard guide** — in-app checklist for email codes and ASF 2FA
5. **Run ASF** — start/stop, open the built-in ASF-ui dashboard, and control everything from the system tray

## Prerequisites (handled automatically)

For **ASF win-x64**, the official docs require:

| Component | Included in ASF Easy? |
|-----------|------------------------|
| .NET runtime | Bundled inside ASF win-x64 — no separate install |
| Visual C++ Redistributable (x64) | Downloaded and installed silently (UAC prompt) |
| Windows 10/11 64-bit, build 1607+ | Checked; install Windows Update manually if too old |

ASF Easy does **not** install the .NET SDK (not needed unless you use the generic ASF package).

## Features

- Multi-bot account setup with add/remove
- Preserves bot configs when reinstalling ASF
- System tray icon with start/stop/dashboard shortcuts
- Optional **Start with Windows** and **Start ASF on launch**
- Close-to-tray behavior so ASF keeps running in the background

## Requirements

- Windows 10/11
- Node.js 18+ (for development/build only)

End users can run a packaged portable `.exe` without installing Node.

## Development

```bash
npm install
npm run dev
```

## Build a portable app

```bash
npm run package
```

The portable executable is written to `release/`.

If packaging fails on Windows due to file locks or symlink permissions, close any running `ASF Easy.exe` instances and retry. You can also run the unpacked build from `release/win-unpacked/`.

## Where files go

ASF Easy stores data under:

`%APPDATA%/asf-easy/`

- `asf/` — downloaded ArchiSteamFarm files
- `settings.json` — wizard state and background preferences

Bot credentials live in `%APPDATA%/asf-easy/asf/config/*.json`, same as a manual ASF install.

## Pushing to Git

This project is ready for a new repository:

```bash
git init
git add .
git commit -m "Initial commit: ASF Easy launcher"
git remote add origin <your-repo-url>
git push -u origin main
```

## Notes

- Credentials are saved in ASF config JSON files locally on your PC.
- Steam Guard / 2FA prompts are handled inside ASF after first login — see the Steam Guard step in the app.
- For advanced features (plugins, IPC passwords, trading), use the ASF dashboard or edit configs directly.

## License

MIT
