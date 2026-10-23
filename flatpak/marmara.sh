#!/bin/sh
# Flatpak başlatıcısı: geçici dosyalar önbellek klasörüne gider, sonra Marmara açılır.
export TMPDIR="${XDG_CACHE_HOME:-$HOME/.cache}/tmp"
mkdir -p "$TMPDIR"
exec /app/lib/marmara/marmara "$@"
