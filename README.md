# CrossEverything

> The "Everything" experience, finally on macOS and Linux.

**CrossEverything** is a blazing fast file search utility designed specifically for macOS and Linux users who miss the instant search capabilities of "Everything" on Windows.

While Windows users have the original tool, **CrossEverything** brings that same instant indexing and zero-latency search performance to the rest of the ecosystem.

## Key Features

- **⚡️ Instant Search:** Real-time results as you type, indexed in seconds.
- **🍎 MacOS Native:** Designed to look and feel like a first-class macOS citizen.
- **🐧 Linux Ready:** Lightweight and fast on major Linux distributions.
- **🔍 Power User Tools:** Support for Regex, case matching, and advanced filters.

---

## Installation

Download the latest version for your operating system from the [GitHub Releases](https://github.com/GyeongHoKim/cross-everything/releases) page.

### 🍎 macOS

1. Download the `.dmg` file from the latest release.
2. Open the downloaded file and drag CrossEverything to your Applications folder.
3. Open the terminal and run `xattr -cr /Applications/cross-everything.app`
4. Launch the app from Applications.

> **Note:** On first launch, you must grant **Full Disk Access** in `System Settings > Privacy & Security` to allow file indexing.

### 🐧 Linux

1. Download the appropriate package for your distribution:
   - **Debian/Ubuntu:** `.deb` package
   - **Other distributions:** `.AppImage` (universal)
2. Install or run the downloaded file.
3. Launch CrossEverything from your application menu.

---

## Usage

1. **Launch** CrossEverything.
2. Grant the necessary **File System permissions** when prompted.
3. Wait a moment for the initial index to build.
4. Start typing to find any file, instantly.

### Search Syntax

- `ext:jpg` - Search for JPG files.
- `folder:Downloads` - Search within the Downloads folder.
- `regex:^IMG_\d+` - Use regular expressions.

---

## FAQ

**Q: Is there a Windows version?**
A: No. Windows already has the original [Everything](https://www.voidtools.com/) by voidtools, which is excellent. CrossEverything is strictly for macOS and Linux users who want that same experience.

---

## Development

### Prerequisites

[Prerequisites](https://tauri.app/start/prerequisites/#linux)

### Build from source

```bash
# Clone the repository
git clone https://github.com/GyeongHoKim/crosseverything.git

# Install dependencies
npm install

# Run in development mode
npm tauri dev

# Build production binary
npm tauri build
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
