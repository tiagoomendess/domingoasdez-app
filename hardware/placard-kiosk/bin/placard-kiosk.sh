#!/usr/bin/env bash
#
# Launches the fullscreen browser. Starts on the local loader page, which
# redirects to domingoasdez.com/placard once the device is online.
#
# cage is a tiny Wayland kiosk compositor: it runs exactly one app, full
# screen, with no desktop, no window chrome and nothing to tap out of.
#
set -euo pipefail

export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
mkdir -p "$XDG_RUNTIME_DIR"

# Hide the mouse pointer: use the transparent cursor theme provision.sh built.
# wlroots (cage) reads these at startup.
if [ -e /usr/share/icons/blank/cursors/left_ptr ]; then
	export XCURSOR_THEME=blank
	export XCURSOR_PATH=/usr/share/icons
	export XCURSOR_SIZE=1
fi

PROFILE_DIR="${PLACARD_PROFILE_DIR:-/data/placard/chromium}"
mkdir -p "$PROFILE_DIR"

# Keep the screen awake (no DPMS, no console blanking).
# cage handles the Wayland side; this covers the kernel console too.
LOADER_URL="http://localhost:8080/"

CHROMIUM_BIN="$(command -v chromium-browser || command -v chromium)"

# Board-specific extra flags, written by provision.sh. Empty on roomy boards
# (Pi 3/4); on a Pi Zero 2 W it carries the low-memory flags.
PLACARD_CHROMIUM_EXTRA_FLAGS=""
[ -f /etc/default/placard-kiosk ] && . /etc/default/placard-kiosk

flags=(
	--kiosk
	--noerrdialogs
	--disable-infobars
	--disable-session-crashed-bubble
	--disable-features=Translate,TranslateUI
	--check-for-update-interval=31536000
	--autoplay-policy=no-user-gesture-required
	--ozone-platform=wayland
	--enable-features=OverlayScrollbar
	--hide-scrollbars
	--start-fullscreen
	--user-data-dir="$PROFILE_DIR"
)
# shellcheck disable=SC2206  # intentional word-splitting of the flag list
flags+=($PLACARD_CHROMIUM_EXTRA_FLAGS)
flags+=(--app="$LOADER_URL")

exec cage -d -- "$CHROMIUM_BIN" "${flags[@]}"
