#!/usr/bin/env python3
"""PNG dosyalarından .ico üretir (bağımlılık yok; PNG çerçeveli ICO, Vista ve üstü).

Kullanım: make_ico.py <çıkış.ico> <png> [<png> ...]
"""
import struct
import sys


def png_size(data: bytes) -> tuple[int, int]:
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise SystemExit("PNG değil")
    return struct.unpack(">II", data[16:24])


def main() -> int:
    out, *files = sys.argv[1:]
    if not files:
        raise SystemExit(__doc__)
    frames = []
    for path in files:
        data = open(path, "rb").read()
        w, h = png_size(data)
        frames.append((w, h, data))
    header = struct.pack("<HHH", 0, 1, len(frames))
    offset = 6 + 16 * len(frames)
    entries = b""
    body = b""
    for w, h, data in frames:
        entries += struct.pack("<BBBBHHII", w % 256, h % 256, 0, 0, 1, 32, len(data), offset)
        body += data
        offset += len(data)
    open(out, "wb").write(header + entries + body)
    return 0


if __name__ == "__main__":
    sys.exit(main())
