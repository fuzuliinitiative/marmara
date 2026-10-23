#!/usr/bin/env python3
"""LibreWolf'un en son Linux sürümünü bulur.

Çıktı (GITHUB_OUTPUT biçiminde, stdout'a):
    version=158.0.1
    url=https://.../librewolf-158.0.1-1-linux-x86_64-package.tar.xz

LibreWolf sürümlerini GitLab'da yayımlıyor (librewolf-community/browser/linux).
Yayın ya da dosya bulunamazsa sıfırdan farklı kodla çıkar.
"""
import json
import re
import sys
import urllib.request

API = "https://gitlab.com/api/v4/projects/44042130/releases?per_page=10"
PATTERN = re.compile(r"librewolf-(\d+(?:\.\d+)*)-\d+-linux-x86_64-package\.tar\.xz$")


def main() -> int:
    with urllib.request.urlopen(API, timeout=30) as resp:
        releases = json.load(resp)
    for release in releases:
        links = release.get("assets", {}).get("links", [])
        for link in links:
            name = link.get("name", "") or link.get("url", "")
            match = PATTERN.search(name) or PATTERN.search(link.get("url", ""))
            if match:
                print(f"version={match.group(1)}")
                print(f"url={link.get('direct_asset_url') or link['url']}")
                return 0
    print("LibreWolf Linux paketi bulunamadı", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
