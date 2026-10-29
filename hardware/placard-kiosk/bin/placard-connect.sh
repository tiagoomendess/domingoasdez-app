#!/usr/bin/env bash
#
# Brings the placard online, then exits. NetworkManager keeps the connection
# afterwards (and reconnects on its own if it drops during a match).
#
# Order of attempts:
#   1. Saved networks, incl. this device's fixed hotspot "domingoasdez-XXXX".
#      NetworkManager autoconnects to any it can see. We just wait ~10 s.
#   2. If still offline, we show the hotspot instructions on the local screen
#      and, as a fallback for iPhones (whose hotspot name can't be changed),
#      try this device's own password against the strongest nearby networks.
#
# The whole search only runs during setup, before the device is online. It
# never runs in the background once a match is on screen.
#
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
STATUS="${PLACARD_STATUS_FILE:-/run/placard/status.json}"
WAIT_BEFORE_HOTSPOT=10   # seconds to wait for a saved network first
MAX_CANDIDATES=6         # strongest nearby networks to try in the fallback
PER_TRY_TIMEOUT=8        # seconds to allow per candidate

mkdir -p "$(dirname "$STATUS")"

eval "$("$HERE/placard-credentials.sh" --env)"

write_status() {
	# $1 state, $2 message, $3 trying-ssid (optional)
	local tmp="$STATUS.tmp"
	cat > "$tmp" <<EOF
{
  "state": "$1",
  "message": "$2",
  "ssid": "${PLACARD_SSID}",
  "password": "${PLACARD_PASSWORD}",
  "trying": "${3:-}",
  "ts": $(date +%s)
}
EOF
	mv "$tmp" "$STATUS"
}

online() {
	[ "$(nmcli -t -f CONNECTIVITY general status 2>/dev/null)" = "full" ]
}

ensure_fixed_hotspot_saved() {
	# Pre-save this device's own hotspot so NM tries it first, automatically.
	if ! nmcli -t -f NAME connection show | grep -qx "$PLACARD_SSID"; then
		nmcli connection add type wifi con-name "$PLACARD_SSID" ssid "$PLACARD_SSID" \
			wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$PLACARD_PASSWORD" \
			connection.autoconnect yes >/dev/null 2>&1 || true
	fi
}

write_status connecting "A ligar à rede..."
ensure_fixed_hotspot_saved

# --- 1. Wait for any saved network (incl. the fixed hotspot) ----------------
for _ in $(seq 1 "$WAIT_BEFORE_HOTSPOT"); do
	if online; then
		write_status online "Ligado"
		exit 0
	fi
	sleep 1
done

# --- 2. Show hotspot instructions and start the fallback search -------------
write_status need_hotspot "Cria um hotspot com esta palavra-passe"

while true; do
	if online; then
		write_status online "Ligado"
		exit 0
	fi

	# Rescan and build a candidate list: WPA-PSK, named, non-enterprise.
	# Sorted by signal strength (closest phone is usually the strongest).
	mapfile -t candidates < <(
		nmcli -t -f SIGNAL,SECURITY,SSID dev wifi list --rescan yes 2>/dev/null \
			| sort -t: -k1 -nr \
			| while IFS=: read -r signal security ssid; do
				[ -n "$ssid" ] || continue
				case "$security" in
					*802.1X*) continue ;;        # skip enterprise (needs a login)
					*WPA*|*wpa*) : ;;             # keep WPA/WPA2/WPA3 personal
					*) continue ;;               # skip open networks
				esac
				[ "$ssid" = "$PLACARD_SSID" ] && continue  # already a saved conn
				printf '%s\n' "$ssid"
			done \
			| awk '!seen[$0]++' \
			| head -n "$MAX_CANDIDATES"
	)

	for ssid in "${candidates[@]}"; do
		online && break
		write_status need_hotspot "A procurar o teu telemóvel..." "$ssid"

		if timeout "$PER_TRY_TIMEOUT" nmcli dev wifi connect "$ssid" \
			password "$PLACARD_PASSWORD" >/dev/null 2>&1 && online; then
			write_status online "Ligado"
			exit 0
		fi

		# Wrong password or no internet behind it: drop the profile and move on.
		nmcli connection delete "$ssid" >/dev/null 2>&1 || true
	done

	write_status need_hotspot "Cria um hotspot com esta palavra-passe"
	sleep 3
done
