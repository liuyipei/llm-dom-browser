# Platform-Specific Setup Guide

Detailed installation and troubleshooting instructions for Windows, macOS, and Linux.

## Windows Setup Guide

If you're new to development on Windows, follow these detailed instructions:

### Prerequisites for Windows 11

1. **Install Node.js**
   - Download Node.js 22.x or later from [nodejs.org](https://nodejs.org/)
   - Use the Windows Installer (.msi) - 64-bit recommended
   - During installation, check the box for "Automatically install the necessary tools"
   - After installation, open a new Command Prompt or PowerShell window
   - Verify installation:
     ```powershell
     node --version
     npm --version
     ```

2. **Install Git** (optional, for cloning the repository)
   - Download from [git-scm.com](https://git-scm.com/download/win)
   - Use default installation options

3. **Choose a Terminal**
   - **PowerShell** (recommended, built into Windows 11)
   - **Command Prompt** (cmd.exe)
   - **Windows Terminal** (modern option, available from Microsoft Store)

### Installation on Windows

1. **Open PowerShell or Command Prompt**
   - Press `Win + X` and select "Terminal" or "PowerShell"
   - Or search for "PowerShell" in the Start menu

2. **Navigate to the project directory**
   ```powershell
   cd path\to\llm-dom-browser
   ```

3. **Install dependencies**
   ```powershell
   npm install
   ```

   **Note**: On Windows, Electron download might take a few minutes depending on your internet connection. The installer is ~150 MB.

   **If you encounter errors**, try:
   ```powershell
   npm cache clean --force
   npm install
   ```

### Running on Windows

```powershell
npm start
```

Or for development mode:

```powershell
npm run dev
```

### Building for Windows Distribution

To create a Windows installer:

```powershell
npm run build:win
```

This creates an installer in the `dist` folder:
- `LLM DOM Browser Setup x.x.x.exe` (NSIS installer)

You can also build for all platforms (if you have the prerequisites):

```powershell
npm run build
```

**Platform-specific builds:**
- `npm run build:win` - Windows installer
- `npm run build:mac` - macOS DMG (requires macOS)
- `npm run build:linux` - Linux AppImage and .deb

### Windows-Specific Troubleshooting

#### Issue: "Execution of scripts is disabled on this system"

If you see this error when running npm commands in PowerShell:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Then confirm with `Y`.

#### Issue: npm install fails with network errors

Try using the official npm registry:

```powershell
npm config set registry https://registry.npmjs.org/
npm install
```

#### Issue: Antivirus blocking Electron

Some antivirus software may flag Electron applications. You may need to:
1. Add the project folder to your antivirus exclusions
2. Temporarily disable real-time protection during `npm install`
3. After installation, re-enable your antivirus

#### Issue: "node-gyp" errors during installation

The `pdf-parse` package requires native modules. If you see build errors:

1. Install Windows Build Tools (may require administrator):
   ```powershell
   npm install --global windows-build-tools
   ```

2. Or install Visual Studio Build Tools manually:
   - Download [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/)
   - Select "Desktop development with C++"

#### Issue: Path too long errors

Windows has a 260-character path limit by default. To fix:

1. Enable long paths in Windows (requires administrator):
   - Run as administrator:
     ```powershell
     New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
     ```
   - Or use Group Policy: `Computer Configuration → Administrative Templates → System → Filesystem → Enable Win32 long paths`

2. Or move the project to a shorter path like `C:\projects\llm-browser`

### Windows File Paths in Code

The application handles Windows paths automatically. When testing:
- Use forward slashes in code: `src/main.js` (Node.js converts automatically)
- Backslashes work in terminal: `src\main.js`
- For file:// URLs, the app converts Windows paths correctly

### Windows Performance Tips

- **First launch**: May take 10-15 seconds while Electron initializes
- **Subsequent launches**: Should be faster (~3-5 seconds)
- **Windows Defender**: May scan the app on first run, causing delays

## macOS Setup Guide

Comprehensive instructions for setting up on macOS (Intel and Apple Silicon).

### Prerequisites for macOS

1. **Install Node.js**

   **Option A: Using Homebrew (Recommended)**
   ```bash
   # Install Homebrew if you don't have it
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

   # Install Node.js
   brew install node@22
   ```

   **Option B: Direct Download**
   - Download Node.js 22.x or later from [nodejs.org](https://nodejs.org/)
   - Choose the .pkg installer for macOS
   - The installer works on both Intel and Apple Silicon Macs
   - Verify installation:
     ```bash
     node --version
     npm --version
     ```

2. **Terminal**
   - Use the built-in Terminal app (Applications → Utilities → Terminal)
   - Or use [iTerm2](https://iterm2.com/) for advanced features

3. **Git** (optional, usually pre-installed)
   - Check if installed: `git --version`
   - If not installed, macOS will prompt you to install Xcode Command Line Tools

### Installation on macOS

1. **Open Terminal**
   - Press `Cmd + Space`, type "Terminal", and press Enter
   - Or go to Applications → Utilities → Terminal

2. **Navigate to the project directory**
   ```bash
   cd /path/to/llm-dom-browser
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

   **Note**: Electron download is ~150 MB. The first install may take a few minutes. macOS will download the Universal binary (works on Intel and Apple Silicon).

   **If you encounter errors**, try:
   ```bash
   npm cache clean --force
   npm install
   ```

### Running on macOS

```bash
npm start
```

Or for development mode:

```bash
npm run dev
```

### Building for macOS Distribution

To create a macOS installer:

```bash
npm run build:mac
```

This creates a DMG in the `dist` folder:
- `LLM DOM Browser-x.x.x-universal.dmg` (works on both Intel and Apple Silicon)
- `LLM DOM Browser-x.x.x-arm64.dmg` (Apple Silicon only)
- `LLM DOM Browser-x.x.x-x64.dmg` (Intel only)

**Platform-specific builds:**
- `npm run build:mac` - macOS DMG
- `npm run build:win` - Windows installer (can build on macOS)
- `npm run build:linux` - Linux AppImage and .deb (can build on macOS)

### macOS-Specific Troubleshooting

#### Issue: "Cannot be opened because the developer cannot be verified"

This is macOS Gatekeeper blocking the app. To fix:

**Option 1: Control-click to open**
1. Locate the app in Finder
2. Control-click (or right-click) the app icon
3. Choose "Open" from the menu
4. Click "Open" in the dialog

**Option 2: Allow in System Preferences**
1. Try to open the app (it will be blocked)
2. Go to System Preferences → Security & Privacy → General
3. Click "Open Anyway" next to the blocked app message
4. Confirm by clicking "Open"

**Option 3: Remove quarantine attribute (development)**
```bash
xattr -cr /Applications/LLM\ DOM\ Browser.app
```

#### Issue: "xcrun: error: invalid active developer path"

This means Xcode Command Line Tools are missing or outdated:

```bash
xcode-select --install
```

Follow the prompts to install the tools. This is required for building native modules like `pdf-parse`.

#### Issue: npm install fails with permission errors

**Never use sudo with npm!** Instead, fix npm permissions:

```bash
# Create a directory for global packages
mkdir ~/.npm-global

# Configure npm to use this directory
npm config set prefix '~/.npm-global'

# Add to your PATH (add this line to ~/.zshrc or ~/.bash_profile)
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc

# Reload your profile
source ~/.zshrc

# Now install packages globally without sudo
npm install -g electron
```

#### Issue: "gyp: No Xcode or CLT version detected"

The `pdf-parse` package needs build tools:

```bash
# Install Xcode Command Line Tools
sudo xcode-select --install

# If you have Xcode installed, also run:
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

#### Issue: Homebrew node conflicts with downloaded Node.js

If you have both Homebrew and downloaded Node.js:

```bash
# Check which node is being used
which node

# Use Homebrew version (recommended)
brew link --overwrite node@22

# Or uninstall Homebrew version if you prefer direct download
brew uninstall node
```

#### Issue: App is slow on first launch

macOS performs security checks on first launch:
- First launch: 15-30 seconds (Gatekeeper verification, code signature check)
- Subsequent launches: 2-5 seconds
- For development builds, verification is faster

### macOS Performance Tips

- **Apple Silicon vs Intel**: Performance is identical due to universal binary
- **First launch**: macOS verifies code signature (15-30 seconds)
- **Subsequent launches**: Much faster (~2-5 seconds)
- **Building**: Code signing requires Apple Developer account for distribution
- **Gatekeeper**: Development builds may trigger security warnings (use `xattr -cr` to remove)

### macOS File Paths

```bash
# User home directory
~/llm-dom-browser

# Applications folder
/Applications/LLM DOM Browser.app

# Application Support (for user data)
~/Library/Application Support/llm-dom-browser
```

## Linux Setup Guide

Instructions for major Linux distributions (Ubuntu/Debian, Fedora/RHEL, Arch).

### Prerequisites for Linux

1. **Install Node.js**

   **Ubuntu/Debian:**
   ```bash
   # Install Node.js 22.x from NodeSource
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Verify installation
   node --version
   npm --version
   ```

   **Fedora/RHEL/CentOS:**
   ```bash
   # Install Node.js 22.x from NodeSource
   curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
   sudo dnf install -y nodejs

   # Or using yum on older systems
   sudo yum install -y nodejs
   ```

   **Arch Linux:**
   ```bash
   # Node.js is in the official repositories
   sudo pacman -S nodejs npm
   ```

   **Using nvm (Node Version Manager) - All Distros:**
   ```bash
   # Install nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

   # Reload shell
   source ~/.bashrc  # or ~/.zshrc

   # Install Node.js 22
   nvm install 22
   nvm use 22
   ```

2. **Install build dependencies** (required for native modules)

   **Ubuntu/Debian:**
   ```bash
   sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
   ```

   **Fedora/RHEL:**
   ```bash
   sudo dnf install -y gcc-c++ make cairo-devel pango-devel libjpeg-turbo-devel giflib-devel
   ```

   **Arch Linux:**
   ```bash
   sudo pacman -S base-devel cairo pango libjpeg-turbo giflib
   ```

3. **Install Git** (optional)
   ```bash
   # Ubuntu/Debian
   sudo apt-get install -y git

   # Fedora/RHEL
   sudo dnf install -y git

   # Arch
   sudo pacman -S git
   ```

### Installation on Linux

1. **Open Terminal**
   - Press `Ctrl + Alt + T` (most distros)
   - Or search for "Terminal" in your application menu

2. **Navigate to the project directory**
   ```bash
   cd /path/to/llm-dom-browser
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

   **Note**: Electron download is ~150 MB. First install may take several minutes.

   **If you encounter errors**, try:
   ```bash
   npm cache clean --force
   npm install
   ```

### Running on Linux

```bash
npm start
```

Or for development mode:

```bash
npm run dev
```

### Building for Linux Distribution

To create Linux installers:

```bash
npm run build:linux
```

This creates packages in the `dist` folder:
- `LLM-DOM-Browser-x.x.x.AppImage` (portable, works on all distros)
- `llm-dom-browser_x.x.x_amd64.deb` (Debian/Ubuntu)

**Platform-specific builds:**
- `npm run build:linux` - Linux AppImage + .deb
- `npm run build:win` - Windows installer (can build on Linux)
- `npm run build:mac` - macOS DMG (requires macOS)

### Linux-Specific Troubleshooting

#### Issue: "Electron failed to install correctly"

Missing libraries for Electron. Install dependencies:

**Ubuntu/Debian:**
```bash
sudo apt-get install -y libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0 libdrm2 libgbm1 libxcb-dri3-0
```

**Fedora/RHEL:**
```bash
sudo dnf install -y gtk3 libnotify nss libXScrnSaver libXtst xdg-utils at-spi2-core libdrm mesa-libgbm
```

**Arch:**
```bash
sudo pacman -S gtk3 libnotify nss libxss libxtst xdg-utils at-spi2-core libdrm mesa
```

#### Issue: Permission denied errors

Fix npm global directory permissions:

```bash
# Create directory for global packages
mkdir -p ~/.npm-global

# Configure npm
npm config set prefix '~/.npm-global'

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### Issue: "Error: ENOSPC: System limit for number of file watchers reached"

Increase the inotify watch limit:

```bash
# Temporary fix
sudo sysctl fs.inotify.max_user_watches=524288

# Permanent fix
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### Issue: AppImage won't run

Make the AppImage executable:

```bash
chmod +x LLM-DOM-Browser-*.AppImage
./LLM-DOM-Browser-*.AppImage
```

If still not working, install FUSE:

```bash
# Ubuntu/Debian
sudo apt-get install -y fuse libfuse2

# Fedora/RHEL
sudo dnf install -y fuse fuse-libs

# Arch
sudo pacman -S fuse2
```

#### Issue: Sandbox errors on Debian/Ubuntu

Electron needs kernel user namespaces:

```bash
# Check if enabled
sysctl kernel.unprivileged_userns_clone

# If disabled (0), enable it
echo 'kernel.unprivileged_userns_clone=1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Or run with --no-sandbox (not recommended)
npm start -- --no-sandbox
```

#### Issue: "node-gyp" build errors

Install build tools:

**Ubuntu/Debian:**
```bash
sudo apt-get install -y python3 make g++
```

**Fedora/RHEL:**
```bash
sudo dnf install -y python3 make gcc-c++
```

**Arch:**
```bash
sudo pacman -S python make gcc
```

### Linux Performance Tips

- **First launch**: 5-10 seconds (faster than Windows/macOS, no signature verification)
- **Subsequent launches**: 2-3 seconds
- **AppImage vs .deb**: AppImage is portable but slightly slower to launch
- **Wayland vs X11**: Works on both, but X11 may have better performance in some distros

### Linux File Paths

```bash
# User home directory
~/llm-dom-browser

# Application installation (if using .deb)
/opt/LLM DOM Browser

# Desktop entry
~/.local/share/applications/llm-dom-browser.desktop

# User data
~/.config/llm-dom-browser
```

### Distribution-Specific Notes

**Ubuntu/Debian:**
- .deb package integrates with Software Center
- Automatic updates via apt (if configured)

**Fedora/RHEL:**
- May need to build RPM manually using `electron-builder --linux rpm`
- SELinux may block some operations (check `audit.log`)

**Arch Linux:**
- Can create PKGBUILD for AUR distribution
- Most up-to-date Node.js in official repos

**Wayland Users:**
- Some distros (Ubuntu 22.04+, Fedora 40+) default to Wayland
- Electron works well on Wayland, but for X11 compatibility:
  ```bash
  # Force X11 mode if needed
  GDK_BACKEND=x11 npm start
  ```

