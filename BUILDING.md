# Building from source

These steps produce an exact copy of the Firefox add-on submitted to addons.mozilla.org. CI rebuilds the add-on from its sources zip on every run and compares the result file by file.

## Requirements

- **Operating system:** Linux, macOS or Windows with WSL. Checked in Mozilla's default review environment (Ubuntu 24.04 LTS on ARM64, Node.js 24.14.0, npm 11.9.0), on Ubuntu 26.04 LTS (x64) in CI, and on macOS (ARM64).
- **Node.js 24 or later**, with the npm that comes with it. Checked with Node.js 24.14.0, 24.22.3 and 26.13.1. Install it from https://nodejs.org or with nvm (`nvm install 24`).
- **pnpm 12.21.0.** Nothing to install: the build script fetches this exact version through npx, as pinned in `package.json` (`packageManager`).
- About 500 MB of disk space for dependencies and a network connection for the first install.

## Build

From the root of the source code:

```bash
bash scripts/build-firefox.sh
```

The script checks the Node.js version, installs the locked dependencies (`pnpm install --frozen-lockfile`) and builds the add-on (`pnpm build:firefox`). The result is in `.output/firefox-mv3`, with the same files as the uploaded package.

The same steps by hand:

```bash
npx --yes pnpm@12.21.0 install --frozen-lockfile
npx --yes pnpm@12.21.0 build:firefox
```
