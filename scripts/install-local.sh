#!/usr/bin/env bash
# Derlenen Marmara'yı yalnızca bu kullanıcı için uygulama menüsüne ekler.
# Root yetkisi gerekmez; kaldırmak için: ./scripts/install-local.sh --remove
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/dist/marmara"
APPS="$HOME/.local/share/applications"
ICONS="$HOME/.local/share/icons/hicolor"
BIN="$HOME/.local/bin"

if [ "${1:-}" = "--remove" ]; then
  rm -f "$APPS/marmara.desktop" "$BIN/marmara" "$ICONS/scalable/apps/marmara.svg"
  for s in 16 32 48 64 128 256 512; do rm -f "$ICONS/${s}x${s}/apps/marmara.png"; done
  update-desktop-database "$APPS" 2>/dev/null || true
  echo "Marmara menüden kaldırıldı (dist/ klasörü duruyor)."
  exit 0
fi

[ -x "$DIST/marmara" ] || { echo "Önce ./build.sh çalıştırın." >&2; exit 1; }

mkdir -p "$APPS" "$BIN" "$ICONS/scalable/apps"
ln -sf "$DIST/marmara" "$BIN/marmara"
install -m644 "$ROOT/branding/marmara-icon.svg" "$ICONS/scalable/apps/marmara.svg"
for s in 16 32 48 64 128 256 512; do
  install -Dm644 "$ROOT/branding/icons/icon$s.png" "$ICONS/${s}x${s}/apps/marmara.png"
done
sed "s|^Exec=marmara|Exec=$DIST/marmara|" "$DIST/marmara.desktop" > "$APPS/marmara.desktop"
update-desktop-database "$APPS" 2>/dev/null || true
gtk-update-icon-cache -q -t "$ICONS" 2>/dev/null || true
echo "Marmara uygulama menüsüne eklendi."
