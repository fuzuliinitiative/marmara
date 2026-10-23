#!/usr/bin/env bash
# Marmara sürüm numarasını her yerde birden günceller.
#   scripts/bump-version.sh 1.1      → VERSION + üç dosyadaki kopyaları
#   scripts/bump-version.sh --patch  → son basamağı bir artırır (1.0 → 1.0.1, 1.0.1 → 1.0.2)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

arg="${1:?kullanım: bump-version.sh <sürüm>|--patch}"
if [ "$arg" = "--patch" ]; then
  current="$(tr -d '[:space:]' < VERSION)"
  IFS=. read -r -a parts <<< "$current"
  [ "${#parts[@]}" -ge 3 ] || parts+=(0)
  parts[-1]=$(( ${parts[-1]} + 1 ))
  new="$(IFS=.; echo "${parts[*]}")"
else
  new="$arg"
fi
[[ "$new" =~ ^[0-9]+(\.[0-9]+)*$ ]] || { echo "geçersiz sürüm: $new" >&2; exit 1; }

echo "$new" > VERSION
sed -i "s/^const VERSION = \".*\";/const VERSION = \"$new\";/" modules/MarmaraAbout.sys.mjs
sed -i "s/^version=.*/version=$new/" config/distribution.ini
sed -i "s/^Version=.*/Version=$new/" packaging/linux/marmara.desktop
echo "$new"
