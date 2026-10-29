#!/usr/bin/env bash
#
# Turns a fresh Raspberry Pi OS Lite (Bookworm, 64-bit) install into a placard
# kiosk. Run once, as root, with internet available:
#
#     sudo bash provision.sh
#
# Idempotent: safe to run again after editing a script or the loader page.
#
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
	echo "Run with sudo." >&2
	exit 1
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
KIOSK_USER=placard

echo "==> Installing packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
	cage \
	chromium-browser \
	network-manager \
	python3 \
	fonts-dejavu-core \
	watchdog
# On some images the browser package is just "chromium".
command -v chromium-browser >/dev/null 2>&1 || apt-get install -y --no-install-recommends chromium || true

echo "==> Making NetworkManager own the Wi-Fi"
systemctl enable NetworkManager >/dev/null 2>&1 || true
# Disable the old dhcpcd/wpa_supplicant path if present, so NM is in charge.
systemctl disable --now dhcpcd 2>/dev/null || true

# Raspberry Pi soft-blocks the Wi-Fi radio (rfkill) until the regulatory
# country is set. Without this the radio stays "disabled", nmcli sees no
# networks, and the hotspot search finds nothing. Default to Portugal;
# override with PLACARD_WIFI_COUNTRY=XX.
WIFI_COUNTRY="${PLACARD_WIFI_COUNTRY:-PT}"
command -v raspi-config >/dev/null 2>&1 && raspi-config nonint do_wifi_country "$WIFI_COUNTRY" >/dev/null 2>&1 || true
rfkill unblock wifi 2>/dev/null || true
nmcli radio wifi on 2>/dev/null || true
echo "    Wi-Fi radio enabled (country $WIFI_COUNTRY)"

echo "==> Creating the kiosk user"
if ! id "$KIOSK_USER" >/dev/null 2>&1; then
	useradd -m -s /bin/bash "$KIOSK_USER"
fi
# Needs the video/render/input/tty seats for cage, and netdev for nmcli.
usermod -aG video,render,input,tty,netdev "$KIOSK_USER"

echo "==> Setting up the persistent data partition"
# Chromium's profile (the dad_placard cookie = the screen's identity) and the
# device credentials live here so they survive reboots and a read-only root.
DATA_DIR=/data/placard
mkdir -p "$DATA_DIR/chromium"
chown -R "$KIOSK_USER:$KIOSK_USER" /data
# If you created a dedicated /data partition (see README), it is already
# mounted here by fstab; otherwise this is just a folder on the root fs.

echo "==> Installing files to /opt/placard"
mkdir -p /opt/placard/bin /opt/placard/web
install -m 0755 "$HERE/bin/placard-credentials.sh" /opt/placard/bin/
install -m 0755 "$HERE/bin/placard-connect.sh"     /opt/placard/bin/
install -m 0755 "$HERE/bin/placard-kiosk.sh"        /opt/placard/bin/
install -m 0644 "$HERE/web/index.html"              /opt/placard/web/
chown -R "$KIOSK_USER:$KIOSK_USER" /opt/placard

# status.json lives on a tmpfs so the SD card isn't written every second.
mkdir -p /run/placard
chown "$KIOSK_USER:$KIOSK_USER" /run/placard
cat > /etc/tmpfiles.d/placard.conf <<EOF
d /run/placard 0755 $KIOSK_USER $KIOSK_USER -
EOF

echo "==> Generating this device's credentials"
PLACARD_DATA_DIR="$DATA_DIR" /opt/placard/bin/placard-credentials.sh
chown -R "$KIOSK_USER:$KIOSK_USER" "$DATA_DIR"

echo "==> Installing systemd services"
install -m 0644 "$HERE/config/placard-web.service"     /etc/systemd/system/
install -m 0644 "$HERE/config/placard-connect.service" /etc/systemd/system/
install -m 0644 "$HERE/config/placard-kiosk.service"   /etc/systemd/system/
systemctl daemon-reload
systemctl enable placard-web.service placard-connect.service placard-kiosk.service

echo "==> Hiding the mouse cursor"
# cage has no flag to hide the pointer, so we install a fully transparent
# cursor theme and point the compositor at it (wlroots honours XCURSOR_THEME).
# Best-effort: wrapped in a function called from an `if`, so a failure here
# can never abort provisioning (set -e is suppressed in that context).
apt-get install -y --no-install-recommends x11-apps >/dev/null 2>&1 || true  # xcursorgen
build_blank_cursor() {
	local theme=/usr/share/icons/blank
	install -d "$theme/cursors"
	# A valid 1x1 transparent PNG, written by Python so the CRCs are correct.
	# (A hand-made base64 blob tripped "libpng IDAT CRC error" in xcursorgen.)
	if ! python3 - <<'PY'
import zlib, struct
def chunk(tag, data):
    body = tag + data
    return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xffffffff)
raw = b'\x00\x00\x00\x00\x00'  # one scanline: filter byte + transparent RGBA
png = b'\x89PNG\r\n\x1a\n'
png += chunk(b'IHDR', struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0))
png += chunk(b'IDAT', zlib.compress(raw, 9))
png += chunk(b'IEND', b'')
open('/tmp/blank.png', 'wb').write(png)
PY
	then
		return 1
	fi
	echo '24 0 0 /tmp/blank.png' > /tmp/blank.cursor
	command -v xcursorgen >/dev/null 2>&1 || return 1
	xcursorgen /tmp/blank.cursor "$theme/cursors/left_ptr" || return 1
	# Map every cursor name Chromium/cage might request to the blank one.
	local name
	for name in default pointer arrow top_left_arrow hand1 hand2 text xterm \
		watch wait progress crosshair move grab grabbing; do
		ln -sf left_ptr "$theme/cursors/$name"
	done
	cat > "$theme/index.theme" <<'EOF'
[Icon Theme]
Name=blank
Comment=Transparent cursor for the placard kiosk
EOF
	rm -f /tmp/blank.png /tmp/blank.cursor
	return 0
}
if build_blank_cursor; then
	echo "    Blank cursor theme installed"
else
	echo "    Could not build the cursor theme — cursor will hide via page CSS only"
	rm -f /usr/share/icons/blank/index.theme /usr/share/icons/blank/cursors/left_ptr 2>/dev/null || true
fi

echo "==> Console/boot tweaks"
# Quiet, fast, no login prompt stealing tty1 from the kiosk.
systemctl disable getty@tty1.service 2>/dev/null || true
# Disable console blanking.
if ! grep -q 'consoleblank=0' /boot/firmware/cmdline.txt 2>/dev/null; then
	sed -i 's/$/ consoleblank=0/' /boot/firmware/cmdline.txt
fi

echo "==> Board tuning"
MEM_KB=$(awk '/MemTotal/{print $2}' /proc/meminfo)
MODEL="$(tr -d '\0' < /proc/device-tree/model 2>/dev/null || echo unknown)"
echo "    Board: $MODEL (${MEM_KB} kB RAM)"
if [ "${MEM_KB:-0}" -lt 786432 ]; then
	# < 768 MB = a 512 MB board (Pi Zero 2 W). Apply the lightweight setup.
	echo "    Low-memory board — applying lightweight (Zero 2 W) tuning"

	# Compressed RAM swap, so a memory spike doesn't get Chromium OOM-killed.
	apt-get install -y --no-install-recommends zram-tools >/dev/null 2>&1 || true
	cat > /etc/default/zramswap <<'EOF'
ALGO=lz4
PERCENT=50
PRIORITY=100
EOF
	systemctl enable zramswap >/dev/null 2>&1 || true
	systemctl restart zramswap >/dev/null 2>&1 || true

	# Give the Wayland compositor enough GPU memory on the old VideoCore IV.
	if grep -q '^gpu_mem=' /boot/firmware/config.txt; then
		sed -i 's/^gpu_mem=.*/gpu_mem=128/' /boot/firmware/config.txt
	else
		echo 'gpu_mem=128' >> /boot/firmware/config.txt
	fi

	# Lean Chromium flags for 512 MB (picked up by placard-kiosk.sh).
	cat > /etc/default/placard-kiosk <<'EOF'
# Extra Chromium flags for low-memory boards (Pi Zero 2 W).
PLACARD_CHROMIUM_EXTRA_FLAGS="--process-per-site --renderer-process-limit=1 --disable-dev-shm-usage --disable-gpu-shader-disk-cache"
EOF
else
	echo "    Roomy board (Pi 3/4) — no extra tuning needed"
	# Clear any low-memory flags left over from a re-used card.
	rm -f /etc/default/placard-kiosk
fi

echo "==> Hardware watchdog (reboots a frozen Pi)"
if ! grep -q '^dtparam=watchdog=on' /boot/firmware/config.txt; then
	echo 'dtparam=watchdog=on' >> /boot/firmware/config.txt
fi
sed -i 's/^#\?watchdog-device.*/watchdog-device = \/dev\/watchdog/' /etc/watchdog.conf || true
sed -i 's/^#\?max-load-1.*/max-load-1 = 24/' /etc/watchdog.conf || true
grep -q '^watchdog-timeout' /etc/watchdog.conf || echo 'watchdog-timeout = 15' >> /etc/watchdog.conf
systemctl enable watchdog >/dev/null 2>&1 || true

echo "==> Turning on the TV via HDMI-CEC at boot (best effort)"
cat > /etc/systemd/system/placard-cec.service <<'EOF'
[Unit]
Description=Turn the TV on via HDMI-CEC
After=placard-kiosk.service
[Service]
Type=oneshot
ExecStart=/bin/sh -c 'command -v cec-ctl >/dev/null && cec-ctl --playback -S && cec-ctl --to 0 --image-view-on || true'
[Install]
WantedBy=multi-user.target
EOF
apt-get install -y --no-install-recommends v4l-utils >/dev/null 2>&1 || true
systemctl enable placard-cec.service >/dev/null 2>&1 || true

echo
echo "==> Done. This device's Wi-Fi setup credentials:"
PLACARD_DATA_DIR="$DATA_DIR" /opt/placard/bin/placard-credentials.sh
echo
echo "Save a real Wi-Fi network now if you have one here, e.g.:"
echo "    nmcli dev wifi connect \"<SSID>\" password \"<password>\""
echo "Then reboot:  sudo reboot"
