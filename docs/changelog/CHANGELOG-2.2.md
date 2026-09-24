# Battle Spirits Eternal Simulator — 2.2.0

## Windows Application

- Product name changed to **Battle Spirits** for the installed application.
- NSIS installer now targets `Battle-Spirits-Setup-2.2.0.exe`.
- Installed folder contains:
  - `Battle Spirits.exe`
  - `Battle Spirits Updater.exe`
  - `Battle Spirits Server.exe`
- Desktop and Start Menu shortcuts continue to be created by the installer.

## Updater

- Added a dedicated updater UI.
- Update source uses a simple `latest.json` manifest.
- Update package download supports SHA-256 verification.
- The downloaded NSIS installer is launched automatically.
- Settings now exposes an optional update-manifest URL.
- Build script generates `release/latest.json` beside the Windows installer.

## Player data persistence

- Decks, profile and settings are persisted under Electron user data instead of relying only on files inside the installation.
- Existing 2.1 localStorage data is migrated automatically on first 2.2 read.
- Internal user-data app identity remains compatible with 2.1 to avoid losing previous data when the visible executable name changes.

## LAN Server app

- Online backend can now run inside `Battle Spirits Server.exe`.
- Server window shows status, port, cards loaded, rooms and connected players.
- Server can be started/stopped from the GUI.
- The old `RODAR_SERVIDOR_ONLINE.bat` remains available for development/debugging.

## Gameplay

No intentional gameplay-rule changes were made in 2.2. The 2.1 arena/manual-core behavior is preserved.
