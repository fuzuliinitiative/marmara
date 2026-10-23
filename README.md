# Marmara

**Simple and transparent.**

🇹🇷 [Türkçe](README.tr.md)

Marmara is built on [LibreWolf](https://librewolf.net) (and so on Firefox). It takes
LibreWolf's privacy-hardened browser and gives it a clean design that follows the GNOME
Human Interface Guidelines, simple settings, a few extras and its own name. It is not a from-scratch browser and it does not compile Firefox:
it repacks LibreWolf's ready-made files, so every new LibreWolf release can become a new
Marmara release automatically.

![Adwaita-style tabs and address bar](flatpak/screenshot-1.png)

## The idea

Marmara takes its inspiration from jellyfish, and so does its logo.

- **Transparent**, like a jellyfish: the code is open source, nothing is hidden, there is
  no telemetry, and nothing is chosen for you.
- **Simple**, like its shape: easy to use and functional. Sensible defaults, a small
  settings window instead of hundreds of options, and a clean design that follows the
  GNOME Human Interface Guidelines.

## Features

- **Adwaita-style design:** address bar in the title bar, tabs below, libadwaita
  colors and corners, light and dark mode, system accent color.
- **Private by default:** LibreWolf's settings — no telemetry, strict tracking protection,
  HTTPS-only.
- **Useful extensions built in:** uBlock Origin, Privacy Badger, ClearURLs and
  ToS;DR are installed on first run and also work in private windows.
- **Terms of service at a glance:** the address bar shows the
  [ToS;DR](https://tosdr.org) rating of the site you are visiting.
- **Simple settings:** one small Adwaita-style window instead of a long page of
  options, with search.
- **First-run welcome:** pick your language, theme and search engine yourself.
  Nothing is chosen for you.
- **Its own identity:** own name, logo, profile folder (`~/.marmara`) and window class.
  It can run next to LibreWolf.

| | |
|---|---|
| ![ToS;DR rating in the address bar](flatpak/screenshot-2.png) | ![Start page in light and dark](flatpak/screenshot-3.png) |
| ![Compact app menu](flatpak/screenshot-4.png) | |

## Install

### Flatpak (Linux)

```sh
flatpak remote-add --user marmara https://fuzuliinitiative.github.io/marmara/marmara.flatpakrepo
flatpak install --user marmara io.github.fuzuliinitiative.Marmara
flatpak run io.github.fuzuliinitiative.Marmara
```

Update with:

```sh
flatpak update io.github.fuzuliinitiative.Marmara
```

Marmara tells you in **Settings → General → Updates** when a new version is out.
The repository is signed; the key is included in `marmara.flatpakrepo`.

> Marmara is not on Flathub (yet), so software centers like Bazaar will not list it.
> GNOME Software and the commands above work.

### Windows

Download `Marmara-<version>-windows-x86_64-setup.exe` from the
[latest release](https://github.com/fuzuliinitiative/marmara/releases/latest) and run it.
No administrator rights are needed. It installs for your user, adds Start menu and
desktop shortcuts, and can be removed from Windows *Installed apps* (your profile —
bookmarks, history — is kept).

> The installer is not code-signed, so Windows SmartScreen may warn you; choose
> *More info → Run anyway*. Updates are one click: when a new version is out, press
> **Update now** in **Settings → General → Updates**. Marmara downloads the installer,
> checks its checksum, installs over the old version and restarts.
>
> A portable `marmara-<version>-windows-x86_64.zip` (unpack anywhere, run `marmara.exe`)
> is also published; it does not update itself and opens the release page instead.

### From the release archive (Linux)

Download `marmara-<version>-linux-x86_64.tar.xz` from the
[latest release](https://github.com/fuzuliinitiative/marmara/releases/latest), unpack it
and run `./marmara/marmara`.

## Reporting problems

Open an [issue](https://github.com/fuzuliinitiative/marmara/issues/new). Marmara's
**About → Report an issue** button goes to the same place.

## Building it yourself

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Marmara's own files and the files modified from LibreWolf/Firefox are under the
[Mozilla Public License 2.0](LICENSE).

**The name "Marmara" and its logo are not covered by that license.** You may fork the
code freely, but a modified version may not use the Marmara name or logo. See
[TRADEMARK.md](TRADEMARK.md).

Marmara is not developed or endorsed by Mozilla or the LibreWolf project. "Firefox" and
"LibreWolf" belong to their owners and are only mentioned to say where Marmara comes
from. Preinstalled extensions belong to their developers and are downloaded unchanged
from addons.mozilla.org.
