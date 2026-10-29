#!/usr/bin/env bash
#
# Generates (once) and prints this device's Wi-Fi setup credentials.
#
# The SSID suffix is derived from the Pi's hardware serial so it is stable and
# unique per board. The password is random, generated on first run and then
# kept on the persistent /data partition so it never changes for this device.
#
# Alphabet has no look-alike characters (no 0/O/1/l/I), the same set the
# pairing code uses, because people type these by hand from the screen.
#
set -euo pipefail

DATA_DIR="${PLACARD_DATA_DIR:-/data/placard}"
CRED_FILE="$DATA_DIR/credentials.env"
ALPHABET='23456789ABCDEFGHJKMNPQRSTUVWXYZ'

mkdir -p "$DATA_DIR"

# Stable per-device suffix from the hardware serial.
serial="$(tr -d '\0' < /sys/firmware/devicetree/base/serial-number 2>/dev/null || true)"
if [ -z "$serial" ]; then
	serial="$(grep -m1 -i '^Serial' /proc/cpuinfo 2>/dev/null | awk '{print $3}')"
fi
[ -n "$serial" ] || serial="$(cat /etc/machine-id)"

suffix="$(printf '%s' "$serial" | sha256sum | tr -dc "$ALPHABET" | cut -c1-4)"
# sha256 hex only contains 0-9a-f; map to the alphabet deterministically instead.
suffix="$(printf '%s' "$serial" | sha256sum | awk '{print $1}')"
out=''
for i in 0 1 2 3; do
	byte="0x${suffix:$((i * 2)):2}"
	idx=$(( byte % ${#ALPHABET} ))
	out="$out${ALPHABET:$idx:1}"
done
SSID="domingoasdez-$out"

# Random 12-char password, generated once.
gen_password() {
	local p='' n=${#ALPHABET}
	for _ in $(seq 1 12); do
		local r
		r=$(( $(od -An -N2 -tu2 /dev/urandom) % n ))
		p="$p${ALPHABET:$r:1}"
	done
	printf '%s' "$p"
}

if [ -f "$CRED_FILE" ]; then
	# shellcheck disable=SC1090
	. "$CRED_FILE"
else
	PLACARD_SSID="$SSID"
	PLACARD_PASSWORD="$(gen_password)"
	umask 077
	cat > "$CRED_FILE" <<EOF
PLACARD_SSID="$PLACARD_SSID"
PLACARD_PASSWORD="$PLACARD_PASSWORD"
EOF
fi

# Keep SSID in sync with the serial even if the file predates a board swap.
if [ "${PLACARD_SSID:-}" != "$SSID" ]; then
	PLACARD_SSID="$SSID"
	umask 077
	cat > "$CRED_FILE" <<EOF
PLACARD_SSID="$PLACARD_SSID"
PLACARD_PASSWORD="$PLACARD_PASSWORD"
EOF
fi

case "${1:-}" in
	--ssid)     printf '%s\n' "$PLACARD_SSID" ;;
	--password) printf '%s\n' "$PLACARD_PASSWORD" ;;
	--env)      printf 'PLACARD_SSID=%s\nPLACARD_PASSWORD=%s\n' "$PLACARD_SSID" "$PLACARD_PASSWORD" ;;
	*)          printf 'SSID: %s\nPassword: %s\n' "$PLACARD_SSID" "$PLACARD_PASSWORD" ;;
esac
