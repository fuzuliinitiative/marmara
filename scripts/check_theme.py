#!/usr/bin/env python3
"""Temanın dayandığı adların yeni LibreWolf/Firefox sürümünde hâlâ var olup
olmadığını kontrol eder.

Kullanım:
  python3 scripts/check_theme.py --browser <browser-omni-klasörü> --gre <gre-omni-klasörü> [--strict]

Üç şeye bakar:
  1. Token'lar: Ezdiğimiz her --değişken Firefox kodunda hâlâ okunuyor mu?
  2. Kimlikler ve sınıflar: Seçicilerdeki #id ve .sınıf adları arayüzde var mı?
  3. Öznitelikler: [customtitlebar] gibi öznitelikler hâlâ kullanılıyor mu?

Bulunamayan her ad, hangi tema dosyasında geçtiğiyle birlikte listelenir.
Bu bir Firefox güncellemesinden sonra neyin kırıldığını gösterir.
--strict ile bulunamayan bir şey varsa çıkış kodu 1 olur.
"""
from __future__ import annotations

import argparse
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
THEME = ROOT / "theme"

SCAN_SUFFIXES = {".css", ".xhtml", ".html", ".js", ".mjs", ".xml"}
SKIP_PARTS = {"marmara", "localization", "locale", "devtools", "builtin-addons", "pdfjs"}

# Bizim kendi tanımladığımız ya da tarayıcının her zaman sağladığı adlar
OWN_PREFIX = "--mm-"
OWN_NAME_PREFIX = "marmara"  # kendi oluşturduğumuz kimlik/sınıf/öznitelikler
ALWAYS_OK_ATTRS = {"selected", "hidden", "collapsed"}


def load_corpus(dirs: list[pathlib.Path]) -> str:
    chunks = []
    for d in dirs:
        for f in d.rglob("*"):
            if f.suffix not in SCAN_SUFFIXES or not f.is_file():
                continue
            if SKIP_PARTS.intersection(f.relative_to(d).parts):
                continue
            try:
                chunks.append(f.read_text(encoding="utf-8"))
            except UnicodeDecodeError:
                pass
    return "\n".join(chunks)


def strip_comments(css: str) -> str:
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def split_selectors_and_decls(css: str) -> tuple[str, str]:
    """Kaba ama yeterli: { öncesi seçici/at-rule, } öncesi bildirim."""
    selectors, decls = [], []
    for m in re.finditer(r"([^{}]*)\{([^{}]*)", css):
        selectors.append(m.group(1))
        decls.append(m.group(2))
    return "\n".join(selectors), "\n".join(decls)


def collect(theme_files: list[pathlib.Path]):
    tokens: dict[str, set[str]] = {}
    ids: dict[str, set[str]] = {}
    classes: dict[str, set[str]] = {}
    attrs: dict[str, set[str]] = {}
    for f in theme_files:
        css = strip_comments(f.read_text(encoding="utf-8"))
        rel = str(f.relative_to(ROOT))
        sel, decl = split_selectors_and_decls(css)
        for name in re.findall(r"(--[a-zA-Z0-9-]+)\s*:", decl):
            if not name.startswith(OWN_PREFIX):
                tokens.setdefault(name, set()).add(rel)
        sel = re.sub(r'url\([^)]*\)|"[^"]*"', "", sel)          # @import adresleri, metinler
        sel = re.sub(r"@media[^\n{]*", "", sel)
        own = lambda n: n.startswith(OWN_NAME_PREFIX)
        for name in re.findall(r"#([a-zA-Z_][\w-]*)", sel):
            if not own(name):
                ids.setdefault(name, set()).add(rel)
        for name in re.findall(r"(?<![\w-])\.([a-zA-Z_][\w-]*)", sel):
            if not own(name):
                classes.setdefault(name, set()).add(rel)
        for name in re.findall(r"\[([a-zA-Z_][\w-]*)", sel):
            if name not in ALWAYS_OK_ATTRS and not own(name):
                attrs.setdefault(name, set()).add(rel)
    return tokens, ids, classes, attrs


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--browser", required=True, type=pathlib.Path)
    ap.add_argument("--gre", required=True, type=pathlib.Path)
    ap.add_argument("--strict", action="store_true")
    args = ap.parse_args()

    corpus = load_corpus([args.browser, args.gre])
    theme_files = sorted(THEME.rglob("*.css")) + sorted((ROOT / "addons").glob("*.css"))
    tokens, ids, classes, attrs = collect(theme_files)

    problems: list[str] = []

    def check(kind: str, names: dict[str, set[str]], pattern) -> int:
        ok = 0
        for name, where in sorted(names.items()):
            if re.search(pattern(name), corpus):
                ok += 1
            else:
                problems.append(f"{kind:<10} {name:<45} ({', '.join(sorted(where))})")
        return ok

    n_tok = check("token", tokens, lambda n: r"var\(\s*" + re.escape(n) + r"\b")
    def id_pattern(n: str) -> str:
        # Ayarlar sayfası kimlikleri JS'te üretiliyor: id = "setting-control-" + ayar kimliği
        if n.startswith("setting-control-"):
            return r'id: "' + re.escape(n[len("setting-control-"):]) + '"'
        return r'(id="|#)' + re.escape(n) + r"\b"

    n_id = check("kimlik", ids, id_pattern)
    n_cls = check("sınıf", classes, lambda n: r"(?<![\w-])" + re.escape(n) + r"(?![\w-])")
    n_att = check("öznitelik", attrs, lambda n: r"(?<![\w-])" + re.escape(n) + r"(?![\w-])")

    print(f"  token'lar:   {n_tok}/{len(tokens)} kullanımda")
    print(f"  kimlikler:   {n_id}/{len(ids)} bulundu")
    print(f"  sınıflar:    {n_cls}/{len(classes)} bulundu")
    print(f"  öznitelikler:{n_att}/{len(attrs)} bulundu")
    if problems:
        print("\n  Bu sürümde bulunamayanlar (ilgili tema kuralı artık etkisiz olabilir):")
        for p in problems:
            print("   ✗", p)
        return 1 if args.strict else 0
    print("  Tüm adlar yerinde ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
