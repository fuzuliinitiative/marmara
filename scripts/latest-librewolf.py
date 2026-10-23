#!/usr/bin/env python3
"""LibreWolf'un en son Linux sürümünü bulur.

Çıktı (GITHUB_OUTPUT biçiminde, stdout'a):
    version=158.0.1
    tag=158.0.1-2
    url=https://dl.librewolf.net/librewolf/158.0.1-2/librewolf-158.0.1-2-linux-x86_64-package.tar.xz

LibreWolf sürümleri LibreWolf Forge'da (librewolf.dev/librewolf/bsys6) yayımlanır;
dosyalar dl.librewolf.net'ten indirilir. Etiketler "<firefox sürümü>-<yapı no>" biçimindedir.
Sürüm bulunamazsa sıfırdan farklı kodla çıkar.
"""
import json
import re
import sys
import urllib.request

API = "https://librewolf.dev/api/v1/repos/librewolf/bsys6/releases?limit=20"
PAGE = "https://librewolf.dev/librewolf/bsys6/releases"
DOWNLOAD = "https://dl.librewolf.net/librewolf/{tag}/librewolf-{tag}-linux-x86_64-package.tar.xz"
TAG = re.compile(r"^(\d+(?:\.\d+)*)-(\d+)$")


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "marmara-ci"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", "replace")


def tags_from_api() -> list[str]:
    return [release["tag_name"] for release in json.loads(fetch(API))]


def tags_from_page() -> list[str]:
    return re.findall(r"/releases/tag/(\d+(?:\.\d+)*-\d+)", fetch(PAGE))


def main() -> int:
    tags: list[str] = []
    for source in (tags_from_api, tags_from_page):
        try:
            tags = source()
        except Exception as error:  # noqa: BLE001 - bir sonrakini dene
            print(f"{source.__name__}: {error}", file=sys.stderr)
        if tags:
            break

    candidates = []
    for tag in tags:
        match = TAG.match(tag)
        if match:
            numbers = tuple(int(part) for part in match.group(1).split("."))
            candidates.append((numbers, int(match.group(2)), tag, match.group(1)))
    if not candidates:
        print("LibreWolf sürümü bulunamadı", file=sys.stderr)
        return 1

    # Sayısal olarak en büyük (sıra listeye güvenilmez)
    _, _, tag, version = max(candidates)
    print(f"version={version}")
    print(f"tag={tag}")
    print(f"url={DOWNLOAD.format(tag=tag)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
