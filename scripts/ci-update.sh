#!/usr/bin/env bash
# GitLab CI: LibreWolf'un yeni sürümünü izler, Marmara'yı onunla yeniden derler.
#
#   - Sürüm değişmediyse hiçbir şey yapmaz.
#   - Derleme başarılıysa Marmara'nın son basamağını artırır, değişikliği
#     varsayılan dala gönderir, arşivi paket deposuna yükler ve release açar.
#   - Derleme başarısızsa "LibreWolf <sürüm> ile derleme başarısız" issue'su açar.
#
# Gerekli CI değişkeni: GITLAB_TOKEN (proje erişim belirteci; api + write_repository,
# rol: Maintainer). Gerisi GitLab'ın hazır değişkenleri.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

: "${GITLAB_TOKEN:?GITLAB_TOKEN CI değişkeni tanımlı değil (README, GitLab bölümü)}"
API="$CI_API_V4_URL/projects/$CI_PROJECT_ID"
auth=(--header "PRIVATE-TOKEN: $GITLAB_TOKEN")

latest="$(python3 scripts/latest-librewolf.py)"
version="$(printf '%s\n' "$latest" | sed -n 's/^version=//p')"
url="$(printf '%s\n' "$latest" | sed -n 's/^url=//p')"
current="$(tr -d '[:space:]' < LIBREWOLF_VERSION)"
if [ "$version" = "$current" ]; then
  echo "LibreWolf $current güncel; yapılacak bir şey yok."
  exit 0
fi
echo "Yeni LibreWolf: $current → $version"

curl -fL --retry 3 -o librewolf.tar.xz "$url"

if ! ./build.sh librewolf.tar.xz --tarball --offline; then
  title="LibreWolf $version ile derleme başarısız"
  existing="$(curl -fsS "${auth[@]}" --get --data-urlencode "search=$title" --data "state=opened" "$API/issues" | jq length)"
  if [ "$existing" = 0 ]; then
    curl -fsS "${auth[@]}" -X POST "$API/issues" \
      --data-urlencode "title=$title" \
      --data-urlencode "description=Otomatik derleme başarısız oldu; yamalar yeni Firefox yapısıyla uyuşmuyor olabilir. Ayrıntı: $CI_PIPELINE_URL" >/dev/null
  fi
  exit 1
fi

new="$(scripts/bump-version.sh --patch)"
echo "$version" > LIBREWOLF_VERSION

git config user.name "marmara-ci"
git config user.email "marmara-ci@users.noreply.gitlab.com"
git add VERSION LIBREWOLF_VERSION modules/MarmaraAbout.sys.mjs config/distribution.ini packaging/linux/marmara.desktop
git commit -m "LibreWolf $version sürümüne geçildi (Marmara $new) [skip ci]"
git push "https://oauth2:${GITLAB_TOKEN}@${CI_SERVER_HOST}/${CI_PROJECT_PATH}.git" "HEAD:${CI_DEFAULT_BRANCH}"

file="marmara-$new-linux-x86_64.tar.xz"
cp "dist/marmara-$version-linux-x86_64.tar.xz" "$file"
curl -fsS "${auth[@]}" --upload-file "$file" "$API/packages/generic/marmara/$new/$file" >/dev/null
link="$CI_API_V4_URL/projects/$CI_PROJECT_ID/packages/generic/marmara/$new/$file"

jq -n --arg tag "v$new" --arg name "Marmara $new" --arg lw "$version" --arg link "$link" --arg file "$file" \
  '{tag_name:$tag, ref:"HEAD", name:$name, description:"LibreWolf \($lw) üzerine otomatik derlendi.",
    assets:{links:[{name:$file, url:$link, link_type:"package"}]}}' \
  | curl -fsS "${auth[@]}" -H "Content-Type: application/json" -X POST "$API/releases" -d @- >/dev/null
echo "Yayımlandı: Marmara $new (LibreWolf $version)"
