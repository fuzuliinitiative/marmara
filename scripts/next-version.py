#!/usr/bin/env python3
"""CI için Marmara'nın bir sonraki sürüm numarasını yazar.

    next-version.py <VERSION dosyası> [son-release-etiketi]

Hiç release yoksa VERSION'daki numara kullanılır. Varsa son release'in son
basamağı bir artırılır; ama elle yükseltilmiş VERSION daha büyükse o kullanılır.
"""
import re
import sys


def parse(text: str) -> tuple[int, ...]:
    text = text.strip().lstrip("vV")
    if not re.fullmatch(r"\d+(\.\d+)*", text):
        raise SystemExit(f"geçersiz sürüm: {text!r}")
    return tuple(int(part) for part in text.split("."))


def pad(version: tuple[int, ...]) -> tuple[int, ...]:
    return version + (0,) * (3 - len(version))


def main() -> None:
    file_version = parse(open(sys.argv[1], encoding="utf-8").read())
    tag = sys.argv[2] if len(sys.argv) > 2 else ""
    if not tag.strip():
        print(".".join(map(str, file_version)))
        return
    released = pad(parse(tag))
    bumped = released[:-1] + (released[-1] + 1,)
    chosen = file_version if pad(file_version) > pad(bumped) else bumped
    print(".".join(map(str, chosen)))


main()
