# Placard kiosk (Raspberry Pi)

Turns a Raspberry Pi into a plug-and-play screen for the [`/placard`](../../docs/pages/conta/placard.md) feature. It boots straight into a fullscreen browser, gets online by itself (or guides whoever is setting it up to make a hotspot), then shows `domingoasdez.com/placard`.

## What it does

1. Boots into a fullscreen Chromium (via `cage`, a minimal kiosk compositor). No desktop, nothing to tap out of.
2. Shows a local **"A ligar…"** screen immediately.
3. Tries saved Wi-Fi networks for 10 seconds (including this device's own fixed hotspot name, `domingoasdez-XXXX`).
4. If still offline, shows **hotspot instructions with this device's password**, and keeps trying the password against the strongest nearby networks until one connects (this covers iPhones, whose hotspot name can't be set).
5. Once online, redirects to `https://domingoasdez.com/placard`. The web page handles everything from there (pairing QR, reconnect, keeping the last state if the network drops).
6. The working network is saved, so next time it connects on its own.

Each device has a **unique SSID and a random 12-character password**, derived from the Pi's serial and generated on first boot. The alphabet avoids look-alike characters (no `0/O`, `1/l/I`), so it's easy to read off the screen and type.

## Files

```
hardware/placard-kiosk/
  provision.sh                  # run once on a fresh Pi — installs everything
  bin/
    placard-credentials.sh      # generates/prints this device's SSID + password
    placard-connect.sh          # network bring-up: saved nets, then hotspot search
    placard-kiosk.sh            # launches cage + Chromium in kiosk mode
  web/
    index.html                  # the local connecting/hotspot screen
  config/
    placard-web.service         # serves web/ on localhost:8080
    placard-connect.service     # runs placard-connect.sh at boot
    placard-kiosk.service       # runs the kiosk browser at boot
```

Nothing here is secret and nothing is device-specific until first boot — flash the **same image** to every unit; each one generates its own credentials.

---

## 1. Flash the SD card

1. Install **Raspberry Pi Imager** on your PC.
2. Choose OS → **Raspberry Pi OS Lite (64-bit)** (Bookworm). *Lite* = no desktop, which is what you want.
3. Click the gear / "Edit settings" before writing and set:
   - **Hostname:** e.g. `placard-01`.
   - **Enable SSH**, with a password or your public key (so you can finish setup without a keyboard on the Pi).
   - **Set username/password** — keep the default `pi` user; the kiosk runs as a separate `placard` user the script creates.
   - **Configure Wi-Fi** with a network you have handy (your phone/office). This is only so the Pi can reach the internet to install packages. It isn't the match-day network.
   - **Locale:** `Europe/Lisbon`, keyboard `pt`.
4. Write the card, put it in the Pi, connect HDMI to the TV, and power it with the **official Raspberry Pi power supply** (not the TV's USB port — undervoltage is the #1 cause of crashes).

## 2. Copy this folder onto the Pi

From your PC, with the Pi on the same network (replace the host/user):

```bash
scp -r hardware/placard-kiosk pi@placard-01.local:/home/pi/
```

(Or clone the repo on the Pi, or copy the folder onto the SD card's boot partition before first boot.)

## 3. Run the provisioning script

SSH in and run it once:

```bash
ssh pi@placard-01.local
sudo bash /home/pi/placard-kiosk/provision.sh
```

It installs the browser and kiosk compositor, creates the `placard` user, installs the services, turns on the hardware watchdog, and prints this device's credentials at the end:

```
SSID: domingoasdez-7K3F
Password: 7K3FM9QX2HPA
```

**Write the SSID and password on a sticker on the box.** If a screen ever needs setting up and won't show the text, you still have it.

## 4. Reboot

```bash
sudo reboot
```

The Pi now boots into the kiosk. On a network it already knows it goes straight to the placard; otherwise it shows the hotspot screen.

---

## Match-day setup (what the club does)

If the TV shows the hotspot screen:

- **Android:** make a hotspot named exactly `domingoasdez-XXXX` (shown on screen) with the password shown. Instant connect.
- **iPhone (name can't be changed):** Definições → Hotspot pessoal, set the password to the one on screen, turn on **"Maximizar compatibilidade"**, and leave that screen open. The Pi finds it within a few seconds and connects.

Once connected, the Pi remembers it. Next match the same phone's hotspot connects with no steps.

> Why the password-only search? An iPhone's hotspot is always named after the phone, so a fixed name can't work for everyone. Matching on the password instead lets any phone work. The search only runs during setup, before the screen is online — never during a match.

---

## Keeping it alive during a match

The code already covers the software side (watchdog reboots a freeze; Chromium auto-restarts; NetworkManager reconnects; the web page keeps the last score on screen through a blip). The rest is hardware:

- **Official PSU.** Repeat because it matters most.
- **Endurance SD card** (SanDisk High Endurance / Samsung PRO Endurance), 16–32 GB.
- **Passive metal case** (Flirc or "armor"). No fan to fail, dust-proof, runs cool in a hot booth.
- **Short rigid HDMI adapter** and fix the box to the back of the TV, so nothing hangs off the port.

## Optional: bulletproof the SD card against power cuts

Clubs will pull the plug instead of shutting down. A journaled ext4 root on an endurance card usually survives this, but to be safe you can make the root filesystem **read-only** while keeping the browser profile and credentials writable.

The browser profile holds the `dad_placard` cookie, which **is the screen's identity** — if it's lost on every reboot, the club has to pair again every match. So the profile must stay on a writable partition. The scripts already put it at `/data/placard`. To harden:

1. Create a small writable partition and mount it at `/data` (e.g. shrink the root partition by 1 GB with `parted`, `mkfs.ext4` the new one, add it to `/etc/fstab` as `/data`). Re-run `provision.sh` so `/data/placard` is created there.
2. Enable the overlay (read-only root) with:
   ```bash
   sudo raspi-config nonint enable_overlayfs
   ```
   Everything under `/` becomes a throwaway RAM overlay; only `/data` persists. To make changes later, `sudo raspi-config nonint disable_overlayfs && sudo reboot`, edit, then enable again.

If you skip this, just use an endurance card — it's good enough for most setups.

---

## Troubleshooting

| Symptom | Check |
|---|---|
| Black screen, no browser | `journalctl -u placard-kiosk -b` — usually a GPU/seat permission; confirm the `placard` user is in `video,render,input,tty`. |
| Stuck on "A ligar…" | `journalctl -u placard-connect -b`. Check `nmcli dev wifi list` sees networks. |
| Hotspot screen never connects | iPhone needs "Maximizar compatibilidade" **on** and the hotspot settings screen **open**. On a Pi Zero 2 W (2.4 GHz only) this is required. |
| New code every reboot | The profile isn't persisting. Confirm `/data` is a real writable mount and `PLACARD_PROFILE_DIR` resolves there. |
| Want to re-read credentials | `sudo /opt/placard/bin/placard-credentials.sh` |
| Change which URL it opens | Edit `LOADER_URL`/`PLACARD_URL` in `bin/placard-kiosk.sh` and `web/index.html`, re-run `provision.sh`. |

## Two tiers (same image, same scripts)

The **same SD image works on both boards** — `provision.sh` detects the board from its RAM and applies the right setup automatically. It prints the model it found (`cat /proc/device-tree/model` tells you too).

| | **Complete** | **Cheap** |
|---|---|---|
| Board | **Raspberry Pi 4 (2 GB)** | **Pi Zero 2 W** |
| Rough cost | ~€75–85 | ~€40 |
| Wi-Fi | 2.4 + 5 GHz | 2.4 GHz only |
| RAM | 2 GB | 512 MB |
| Ads | images **and** video | **images only** |
| iPhone hotspot | works either way | needs "Maximizar compatibilidade" **on** |
| Extra tuning | none | zram + GPU/Chromium flags (automatic) |
| HDMI / power | micro-HDMI / USB-C | mini-HDMI / micro-USB |

On a **low-memory board (< 768 MB)** the script automatically:
- enables **zram** (compressed RAM swap) so a spike doesn't OOM-kill Chromium,
- raises `gpu_mem` to 128 for the Wayland compositor,
- adds lean Chromium flags (`--process-per-site`, one renderer, no `/dev/shm`).

On a **Pi 3/4** none of that is applied — it runs the plain, roomy setup.

> The Zero 2 W is a genuine budget option for a booth with image ads. Test one real unit through a full match (including an ad break) before buying a batch. The Pi 4 removes every caveat and is the safe default.

Either board: **official PSU**, **endurance SD card**, **passive metal case**. For the Zero 2 W, note it uses **mini-HDMI** (not micro) and **micro-USB** power — get the right adapters.
