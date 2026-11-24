#!/usr/bin/env bash
# Builds the Firefox add-on from source into .output/firefox-mv3, matching
# the uploaded package byte for byte. Needs only Node.js and npm: the pnpm
# version pinned in package.json is fetched through npx, so a different
# global pnpm (or none) cannot change the result.
set -euo pipefail
cd "$(dirname "$0")/.."

major=$(node -p 'process.versions.node.split(".")[0]')
if [ "$major" -lt 24 ]; then
	echo "Node.js 24 or later is required (found $(node -v))." >&2
	exit 1
fi

pnpm_version=$(node -p 'require("./package.json").packageManager.split("@")[1]')
pnpm() { npx --yes "pnpm@${pnpm_version}" "$@"; }

pnpm install --frozen-lockfile
pnpm build:firefox
echo "Built .output/firefox-mv3"
