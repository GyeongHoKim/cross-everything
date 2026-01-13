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

CrossEverything is distributed through native package managers for seamless updates.

### 🍎 macOS (Homebrew)

The recommended way to install on macOS is via [Homebrew Cask](https://brew.sh/):

```bash
brew install --cask crosseverything
```

> **Note:** On first launch, you must grant **Full Disk Access** in `System Settings > Privacy & Security` to allow file indexing.

### 🐧 Linux (Snap)

For Linux users, install via the [Snap Store](https://snapcraft.io/):

```bash
sudo snap install crosseverything
```

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
git clone https://github.com/yourusername/crosseverything.git

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
