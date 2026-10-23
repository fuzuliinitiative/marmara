/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Marmara: Ayarlar penceresi
 *
 * libadwaita'nın AdwPreferencesDialog'una göre: tarayıcı penceresinin içinde,
 * yuvarlak köşeli bir iletişim kutusu. Solda sayfalar, üstte arama, sağda
 * gruplanmış satırlar (kart içinde başlık + açıklama + denetim).
 *
 * Her ayar doğrudan Firefox'un kendi ayarına (pref) bağlanır; böylece about:
 * preferences sayfasıyla aynı değerleri okur ve yazar. Metinler
 * l10n/*\/marmara.ftl dosyasında ("marmara-settings-<anahtar>" ve açıklamalar
 * için "-sub" ekiyle). Görünüm theme/browser/settings.css'te.
 *
 * utilityOverlay.js'teki openPreferences() buraya yönlendirilir
 * (scripts/patch_omni.py).
 */

const HTML_NS = "http://www.w3.org/1999/xhtml";
const ICON = name =>
  ({
    general: "chrome://browser/skin/preferences/category-general.svg",
    startup: "chrome://browser/skin/home.svg",
    privacy: "chrome://browser/skin/preferences/category-privacy-security.svg",
    passwords: "chrome://browser/skin/login.svg",
    downloads: "chrome://browser/skin/downloads/downloads.svg",
    data: "chrome://browser/skin/save.svg",
  })[name] ?? `chrome://global/skin/icons/${name}.svg`;

const PREF_DARK = "ui.systemUsesDarkTheme";
const PREF_CONTENT_SCHEME = "layout.css.prefers-color-scheme.content-override";
const PREF_LOCALE = "intl.locale.requested";

// Güncelleme denetimi: yalnızca kullanıcı düğmeye basınca GitHub'a tek bir istek gider.
// Marmara'nın GitHub proje yolu ("kullanıcı/proje"). Boşsa güncelleme grubu gizlenir.
// En son sürüm, projenin en son release'inin etiketidir ("v1.1" ya da "1.1").
const GITHUB_PROJECT = "fuzuliinitiative/marmara";
const UPDATE_TIMEOUT_MS = 10000;
const FLATPAK_ID = "io.github.fuzuliinitiative.Marmara";

// Arayüz dilleri (Marmara yalnızca bunları taşır). Değer: intl.locale.requested.
const LANGUAGES = [
  ["tr", "Türkçe"],
  ["en-US", "English"],
];

// ---------------------------------------------------------------------------
// Ayar bağlayıcıları: her biri { get(), set(değer) } döndürür
// ---------------------------------------------------------------------------

const prefs = Services.prefs;

/** Mantıksal ayar; invert ile tersi gösterilir. Birden fazla ayar yazılabilir. */
function boolPref(name, { invert = false, also = [] } = {}) {
  return {
    get: () => prefs.getBoolPref(name, false) !== invert,
    set: value => {
      for (const pref of [name, ...also]) {
        prefs.setBoolPref(pref, value !== invert);
      }
    },
  };
}

function valuePref(name, onValue, offValue) {
  return {
    get: () => prefs.getIntPref(name, offValue) == onValue,
    set: value => prefs.setIntPref(name, value ? onValue : offValue),
  };
}

const themeBinding = {
  get() {
    if (!prefs.prefHasUserValue(PREF_DARK)) {
      return "auto";
    }
    return prefs.getIntPref(PREF_DARK) == 1 ? "dark" : "light";
  },
  set(value) {
    if (value == "auto") {
      prefs.clearUserPref(PREF_DARK);
    } else {
      prefs.setIntPref(PREF_DARK, value == "dark" ? 1 : 0);
    }
    // Web siteleri her zaman tarayıcının temasını izlesin.
    prefs.clearUserPref(PREF_CONTENT_SCHEME);
  },
};

const sessionBinding = {
  get: () => prefs.getIntPref("browser.startup.page", 1) == 3,
  set: value => prefs.setIntPref("browser.startup.page", value ? 3 : 1),
};

const dohBinding = {
  // 0/1 varsayılan, 2 öncelikli, 3 yalnızca, 5 kapalı
  get: () => [2, 3].includes(prefs.getIntPref("network.trr.mode", 0)),
  set: value => prefs.setIntPref("network.trr.mode", value ? 2 : 5),
};

const extensionUpdateBinding = {
  get: () =>
    prefs.getBoolPref("extensions.update.enabled", true) &&
    prefs.getBoolPref("extensions.update.autoUpdateDefault", true),
  set: value => {
    prefs.setBoolPref("extensions.update.enabled", value);
    prefs.setBoolPref("extensions.update.autoUpdateDefault", value);
  },
};

const referrerBinding = {
  get: () => prefs.getIntPref("network.http.referer.XOriginPolicy", 0) == 2,
  set: value => prefs.setIntPref("network.http.referer.XOriginPolicy", value ? 2 : 0),
};

const localeBinding = {
  get() {
    const requested = prefs.getStringPref(PREF_LOCALE, "");
    const first = requested.split(",")[0].trim();
    return LANGUAGES.some(([code]) => code == first) ? first : LANGUAGES[0][0];
  },
  set: value => prefs.setStringPref(PREF_LOCALE, value),
};

// ---------------------------------------------------------------------------
// Eylemler
// ---------------------------------------------------------------------------

function shellService(win) {
  try {
    return win.getShellService?.();
  } catch (e) {
    return null;
  }
}

function isFlatpak() {
  try {
    return Cc["@mozilla.org/gio-service;1"].getService(Ci.nsIGIOService).isRunningUnderFlatpak;
  } catch (e) {
    return false;
  }
}

/** Yazılım merkezinde (GNOME Software, Bazaar) Marmara'nın sayfasını açar; olmazsa false */
function openInSoftwareCenter(win) {
  try {
    const uri = Services.io.newURI(`appstream://${FLATPAK_ID}`);
    Cc["@mozilla.org/uriloader/external-protocol-service;1"]
      .getService(Ci.nsIExternalProtocolService)
      .loadURI(uri, Services.scriptSecurityManager.getSystemPrincipal(), null, win.browsingContext, false, true);
    return true;
  } catch (e) {
    console.error("Marmara yazılım merkezi:", e);
    return false;
  }
}

function canSetDefaultBrowser(win) {
  const gio = Cc["@mozilla.org/gio-service;1"];
  const flatpak = gio ? gio.getService(Ci.nsIGIOService).isRunningUnderFlatpak : false;
  return (
    !!shellService(win) &&
    !flatpak &&
    Services.policies.isAllowed("setDefaultBrowser")
  );
}

function isDefaultBrowser(win) {
  try {
    return !!shellService(win)?.isDefaultBrowser(false, true);
  } catch (e) {
    return false;
  }
}

async function pickSavePath(win, title, defaultName, filter) {
  const picker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
  picker.init(win.browsingContext, title, Ci.nsIFilePicker.modeSave);
  picker.appendFilters(filter);
  picker.defaultString = defaultName;
  const result = await new Promise(resolve => picker.open(resolve));
  return result == Ci.nsIFilePicker.returnCancel ? null : picker.file.path;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function exportBookmarks(win) {
  const path = await pickSavePath(win, "", "yer-imleri.html", Ci.nsIFilePicker.filterHTML);
  if (path) {
    const { BookmarkHTMLUtils } = ChromeUtils.importESModule(
      "resource://gre/modules/BookmarkHTMLUtils.sys.mjs"
    );
    await BookmarkHTMLUtils.exportToFile(path);
  }
}

async function exportHistory(win) {
  const path = await pickSavePath(win, "", "gecmis.csv", Ci.nsIFilePicker.filterAll);
  if (!path) {
    return;
  }
  const { PlacesUtils } = ChromeUtils.importESModule("resource://gre/modules/PlacesUtils.sys.mjs");
  const db = await PlacesUtils.promiseDBConnection();
  const rows = await db.execute(
    `SELECT url, title, visit_count, last_visit_date
       FROM moz_places
      WHERE visit_count > 0 AND last_visit_date NOT NULL
      ORDER BY last_visit_date DESC`
  );
  const lines = ["url,title,visit_count,last_visit"];
  for (const row of rows) {
    const when = new Date(row.getResultByName("last_visit_date") / 1000).toISOString();
    lines.push(
      [
        row.getResultByName("url"),
        row.getResultByName("title"),
        row.getResultByName("visit_count"),
        when,
      ]
        .map(csvCell)
        .join(",")
    );
  }
  await IOUtils.writeUTF8(path, "﻿" + lines.join("\r\n") + "\r\n");
}

async function chooseDownloadFolder(win) {
  const picker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
  picker.init(win.browsingContext, "", Ci.nsIFilePicker.modeGetFolder);
  const result = await new Promise(resolve => picker.open(resolve));
  if (result == Ci.nsIFilePicker.returnOK) {
    prefs.setIntPref("browser.download.folderList", 2);
    prefs.setComplexValue("browser.download.dir", Ci.nsIFile, picker.file);
  }
}

function addSearchEngine(win) {
  win.openDialog(
    "chrome://browser/content/search/addEngine.xhtml",
    "",
    "chrome,modal,centerscreen,resizable=no",
    { mode: "NEW" }
  );
}

/** "1.10" > "1.9": sürüm numaralarını sayı sayı karşılaştırır */
function isNewer(candidate, current) {
  const a = String(candidate).split(".").map(Number);
  const b = String(current).split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff) {
      return diff > 0;
    }
  }
  return false;
}

function currentVersion() {
  const { MARMARA_VERSION } = ChromeUtils.importESModule("resource:///modules/MarmaraAbout.sys.mjs");
  return MARMARA_VERSION;
}

/** { version, url } ya da hata fırlatır */
async function fetchLatest(win) {
  // Yanıt gelmezse (adres yok, ağ kapalı) sonsuza kadar beklemesin
  const controller = new win.AbortController();
  const timer = win.setTimeout(() => controller.abort(), UPDATE_TIMEOUT_MS);
  let info;
  try {
    const response = await win.fetch(`https://api.github.com/repos/${GITHUB_PROJECT}/releases/latest`, {
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    info = await response.json();
  } finally {
    win.clearTimeout(timer);
  }
  const version = String(info?.tag_name ?? "").replace(/^v/i, "");
  if (!/^\d+(\.\d+)*$/.test(version)) {
    throw new Error("geçersiz sürüm etiketi");
  }
  return { version, url: `https://github.com/${GITHUB_PROJECT}/releases/latest` };
}

function restartBrowser() {
  Services.startup.quit(Ci.nsIAppStartup.eAttemptQuit | Ci.nsIAppStartup.eRestart);
}

// ---------------------------------------------------------------------------
// Sayfa tanımları
//
// Satır türleri:
//   switch   { k, bind, sub? }                 aç/kapa
//   choice   { k, bind, options: [[değer, iletiAnahtarı|metin]], sub? }
//   segments { k, bind, options }              yan yana seçenek düğmeleri
//   engine   { k }                             arama motoru seçicisi (özel)
//   button   { k, run(win), icon, sub?, show?(win) }
// Metinler: marmara-settings-<k>, açıklama için marmara-settings-<k>-sub
// ---------------------------------------------------------------------------

const PAGES = [
  {
    id: "general",
    icon: "general",
    groups: [
      {
        k: "default-browser",
        show: win => canSetDefaultBrowser(win) && !isDefaultBrowser(win),
        rows: [
          {
            type: "button",
            k: "make-default",
            sub: true,
            icon: "arrow-right",
            run: async win => {
              await shellService(win)?.setDefaultBrowser(false);
            },
          },
        ],
      },
      {
        k: "appearance",
        rows: [
          {
            type: "segments",
            k: "theme",
            bind: themeBinding,
            options: [
              ["auto", "marmara-settings-theme-auto"],
              ["light", "marmara-settings-theme-light"],
              ["dark", "marmara-settings-theme-dark"],
            ],
          },
        ],
      },
      {
        k: "search",
        rows: [
          { type: "engine", k: "engine", sub: true },
          {
            type: "switch",
            k: "suggestions",
            bind: boolPref("browser.search.suggest.enabled"),
          },
          { type: "button", k: "add-engine", icon: "arrow-right", run: addSearchEngine },
        ],
      },
      {
        k: "updates",
        show: () => !!GITHUB_PROJECT,
        rows: [{ type: "update", k: "update" }],
      },
      {
        k: "language",
        rows: [
          {
            type: "choice",
            k: "ui-language",
            bind: localeBinding,
            options: LANGUAGES,
            restart: true,
          },
        ],
      },
    ],
  },
  {
    id: "startup",
    icon: "startup",
    groups: [
      {
        k: "startup",
        rows: [
          { type: "switch", k: "restore-session", bind: sessionBinding },
          { type: "switch", k: "warn-close", bind: boolPref("browser.tabs.warnOnClose") },
          {
            type: "switch",
            k: "recent-tabs",
            sub: true,
            bind: boolPref("browser.ctrlTab.sortByRecentlyUsed"),
          },
        ],
      },
    ],
  },
  {
    id: "privacy",
    icon: "privacy",
    groups: [
      {
        k: "tracking",
        rows: [
          {
            type: "switch",
            k: "gpc",
            sub: true,
            bind: boolPref("privacy.globalprivacycontrol.enabled", {
              also: ["privacy.globalprivacycontrol.functionality.enabled"],
            }),
          },
          {
            type: "switch",
            k: "fingerprint",
            sub: true,
            bind: boolPref("privacy.resistFingerprinting"),
          },
          {
            type: "switch",
            k: "letterboxing",
            sub: true,
            bind: boolPref("privacy.resistFingerprinting.letterboxing"),
          },
          { type: "switch", k: "referrer", sub: true, bind: referrerBinding },
        ],
      },
      {
        k: "connection",
        rows: [
          { type: "switch", k: "https-only", sub: true, bind: boolPref("dom.security.https_only_mode") },
          { type: "switch", k: "doh", sub: true, bind: dohBinding },
          { type: "switch", k: "ipv6", bind: boolPref("network.dns.disableIPv6", { invert: true }) },
        ],
      },
      {
        k: "data",
        rows: [
          { type: "switch", k: "remember-history", bind: boolPref("places.history.enabled") },
          { type: "switch", k: "update-addons", sub: true, bind: extensionUpdateBinding },
          {
            type: "button",
            k: "clear-data",
            icon: "arrow-right",
            run: win => win.Sanitizer.showUI(win),
          },
        ],
      },
    ],
  },
  {
    id: "passwords",
    icon: "passwords",
    groups: [
      {
        k: "passwords",
        rows: [
          { type: "switch", k: "save-logins", bind: boolPref("signon.rememberSignons") },
          {
            type: "switch",
            k: "autofill-addresses",
            bind: boolPref("extensions.formautofill.addresses.enabled"),
          },
          {
            type: "switch",
            k: "autofill-cards",
            bind: boolPref("extensions.formautofill.creditCards.enabled"),
          },
          {
            type: "button",
            k: "saved-logins",
            icon: "open-in-new",
            run: win => win.openTrustedLinkIn("about:logins", "tab"),
          },
        ],
      },
    ],
  },
  {
    id: "downloads",
    icon: "downloads",
    groups: [
      {
        k: "downloads",
        rows: [
          {
            type: "switch",
            k: "ask-download",
            bind: boolPref("browser.download.useDownloadDir", { invert: true }),
          },
          {
            type: "button",
            k: "download-folder",
            icon: "arrow-right",
            run: chooseDownloadFolder,
          },
        ],
      },
    ],
  },
  {
    id: "data",
    icon: "data",
    groups: [
      {
        k: "import-export",
        rows: [
          {
            type: "button",
            k: "import",
            icon: "arrow-right",
            run: win => {
              const { MigrationUtils } = ChromeUtils.importESModule(
                "resource:///modules/MigrationUtils.sys.mjs"
              );
              MigrationUtils.showMigrationWizard(win, {
                entrypoint: MigrationUtils.MIGRATION_ENTRYPOINTS.FILE_MENU,
              });
            },
          },
          { type: "button", k: "export-bookmarks", icon: "arrow-right", run: exportBookmarks },
          { type: "button", k: "export-history", icon: "arrow-right", run: exportHistory },
        ],
      },
      {
        k: "extensions",
        rows: [
          {
            type: "button",
            k: "addons",
            icon: "open-in-new",
            run: win => win.openTrustedLinkIn("about:addons", "tab"),
          },
        ],
      },
    ],
  },
];

// Firefox'un eski bölüm adlarını yeni sayfalara eşler (openPreferences("paneX"))
const PANE_ALIASES = [
  [/privacy|security|etp|doh/i, "privacy"],
  [/home|startup|tabs/i, "startup"],
  [/passwords|autofill|logins/i, "passwords"],
  [/download|applications/i, "downloads"],
  [/sync|import|backup/i, "data"],
];

// ---------------------------------------------------------------------------
// Arayüz
// ---------------------------------------------------------------------------

function create(doc, tag, { className, l10n, text, attrs } = {}, ...children) {
  const node = doc.createElementNS(HTML_NS, tag);
  if (className) {
    node.className = className;
  }
  if (l10n) {
    node.setAttribute("data-l10n-id", l10n);
  }
  if (text) {
    node.textContent = text;
  }
  for (const [name, value] of Object.entries(attrs ?? {})) {
    node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
}

// Aramada süzülen satırlar (yeniden başlatma uyarısı hariç)
const ROWS = ".marmara-settings-card > :not(.marmara-settings-notice)";

const id = key => `marmara-settings-${key}`;

class SettingsDialog {
  constructor(win) {
    this.win = win;
    this.doc = win.document;
    this.pages = new Map(); // sayfa kimliği -> { button, section }
    this.rules = [];
  }

  icon(name, className = "marmara-settings-icon") {
    return create(this.doc, "img", { className, attrs: { src: ICON(name), alt: "" } });
  }

  /** Satırın başlığı ve (varsa) açıklaması */
  #labels(spec) {
    const labels = create(
      this.doc,
      "div",
      { className: "marmara-settings-labels" },
      create(this.doc, "span", { className: "marmara-settings-title", l10n: id(spec.k) })
    );
    if (spec.sub) {
      labels.append(create(this.doc, "span", { className: "marmara-settings-sub", l10n: id(`${spec.k}-sub`) }));
    }
    return labels;
  }

  #row(spec, ...children) {
    return create(this.doc, "div", { className: "marmara-settings-row" }, this.#labels(spec), ...children);
  }

  #switchRow(spec) {
    const toggle = create(this.doc, "button", {
      className: "marmara-switch",
      attrs: { type: "button", role: "switch", "aria-checked": String(spec.bind.get()) },
    }, create(this.doc, "span", { className: "marmara-switch-knob" }));
    const row = this.#row(spec, toggle);
    row.classList.add("clickable");
    const flip = () => {
      const next = toggle.getAttribute("aria-checked") != "true";
      try {
        spec.bind.set(next);
      } catch (e) {
        console.error("Marmara ayarlar:", e);
      }
      toggle.setAttribute("aria-checked", String(spec.bind.get()));
    };
    row.addEventListener("click", event => {
      if (event.target != toggle && !toggle.contains(event.target)) {
        flip();
      }
    });
    toggle.addEventListener("click", flip);
    return row;
  }

  #restartNotice() {
    const notice = create(
      this.doc,
      "div",
      { className: "marmara-settings-row marmara-settings-notice", attrs: { hidden: "" } },
      create(this.doc, "span", { l10n: id("restart-needed") })
    );
    const button = create(this.doc, "button", {
      className: "marmara-settings-pill suggested",
      l10n: id("restart"),
      attrs: { type: "button" },
    });
    button.addEventListener("click", restartBrowser);
    notice.append(button);
    return notice;
  }

  #selectControl(options, current, onChange) {
    const select = create(this.doc, "select", { className: "marmara-settings-select" });
    for (const [value, label] of options) {
      const option = create(this.doc, "option", { attrs: { value } });
      if (label.startsWith("marmara-")) {
        option.setAttribute("data-l10n-id", label);
      } else {
        option.textContent = label;
      }
      select.append(option);
    }
    select.value = current;
    select.addEventListener("change", () => onChange(select.value));
    return select;
  }

  #choiceRows(spec) {
    const select = this.#selectControl(spec.options, spec.bind.get(), value => {
      spec.bind.set(value);
      if (notice) {
        notice.hidden = false;
      }
    });
    const notice = spec.restart ? this.#restartNotice() : null;
    return [this.#row(spec, select), ...(notice ? [notice] : [])];
  }

  #segmentsRow(spec) {
    const strip = create(this.doc, "div", { className: "marmara-settings-segments", attrs: { role: "radiogroup" } });
    const sync = () => {
      for (const button of strip.children) {
        button.setAttribute("aria-checked", String(button.dataset.value == spec.bind.get()));
      }
    };
    for (const [value, label] of spec.options) {
      const button = create(this.doc, "button", {
        className: "marmara-settings-segment",
        l10n: label,
        attrs: { type: "button", role: "radio", "data-value": value },
      });
      button.addEventListener("click", () => {
        spec.bind.set(value);
        sync();
      });
      strip.append(button);
    }
    sync();
    return this.#row(spec, strip);
  }

  #engineRow(spec) {
    const select = this.#selectControl([], "", () => {});
    const row = this.#row(spec, select);
    (async () => {
      try {
        const { SearchService } = ChromeUtils.importESModule(
          "moz-src:///toolkit/components/search/SearchService.sys.mjs"
        );
        await SearchService.init();
        const engines = await SearchService.getVisibleEngines();
        const current = await SearchService.getDefault();
        for (const engine of engines) {
          const option = create(this.doc, "option", { text: engine.name, attrs: { value: engine.id } });
          select.append(option);
        }
        select.value = current.id;
        select.addEventListener("change", async () => {
          const engine = engines.find(e => e.id == select.value);
          if (engine) {
            const reason = SearchService.CHANGE_REASON.USER;
            await SearchService.setDefault(engine, reason);
            await SearchService.setDefaultPrivate(engine, reason);
          }
        });
      } catch (e) {
        console.error("Marmara ayarlar (arama motorları):", e);
      }
    })();
    return row;
  }

  #buttonRow(spec) {
    const row = create(
      this.doc,
      "button",
      { className: "marmara-settings-row clickable action", attrs: { type: "button" } },
      this.#labels(spec),
      this.icon(spec.icon ?? "arrow-right")
    );
    row.addEventListener("click", async () => {
      try {
        await spec.run(this.win);
      } catch (e) {
        console.error("Marmara ayarlar:", e);
      }
      this.#applyRules();
    });
    return row;
  }

  /** Sürüm durumu + "Denetle" / "İndir" düğmesi */
  #updateRow(spec) {
    const version = currentVersion();
    const title = create(this.doc, "span", { className: "marmara-settings-title", l10n: id("update"), attrs: { "data-l10n-args": JSON.stringify({ version }) } });
    const status = create(this.doc, "span", { className: "marmara-settings-sub", l10n: id("update-idle") });
    const labels = create(this.doc, "div", { className: "marmara-settings-labels" }, title, status);
    const button = create(this.doc, "button", { className: "marmara-settings-pill", l10n: id("update-check"), attrs: { type: "button" } });
    const row = create(this.doc, "div", { className: "marmara-settings-row" }, labels, button);

    let downloadUrl = null;
    const setState = (state, args = {}) => {
      status.setAttribute("data-l10n-id", id(`update-${state}`));
      status.setAttribute("data-l10n-args", JSON.stringify(args));
      const download = isFlatpak() ? "update-open-store" : "update-download";
      button.setAttribute("data-l10n-id", id(state == "available" ? download : "update-check"));
      button.classList.toggle("suggested", state == "available");
      button.disabled = state == "checking";
      this.doc.l10n.translateFragment(row);
    };

    button.addEventListener("click", async () => {
      if (downloadUrl) {
        // Flatpak'ta güncelleme yazılım merkezinden yapılır; açılamazsa release sayfası
        if (!(isFlatpak() && openInSoftwareCenter(this.win))) {
          this.win.openTrustedLinkIn(downloadUrl, "tab");
        }
        this.close();
        return;
      }
      setState("checking");
      try {
        const info = await fetchLatest(this.win);
        if (isNewer(info.version, version)) {
          downloadUrl = info.url;
          setState("available", { version: info.version });
        } else {
          setState("current");
        }
      } catch (e) {
        console.error("Marmara güncelleme denetimi:", e);
        setState("error");
      }
    });
    return row;
  }

  #rows(spec) {
    switch (spec.type) {
      case "switch":
        return [this.#switchRow(spec)];
      case "choice":
        return this.#choiceRows(spec);
      case "segments":
        return [this.#segmentsRow(spec)];
      case "engine":
        return [this.#engineRow(spec)];
      case "button":
        return [this.#buttonRow(spec)];
      case "update":
        return [this.#updateRow(spec)];
      default:
        return [];
    }
  }

  #group(spec) {
    const card = create(this.doc, "div", { className: "marmara-settings-card" });
    for (const row of spec.rows) {
      card.append(...this.#rows(row));
    }
    const group = create(
      this.doc,
      "section",
      { className: "marmara-settings-group" },
      create(this.doc, "h2", { l10n: id(`group-${spec.k}`) }),
      card
    );
    if (spec.show) {
      // Koşullu grup: ayar değişince yeniden değerlendirilir (örn. varsayılan yapıldıktan sonra gizlenir)
      this.rules.push(() => {
        group.dataset.hiddenByRule = spec.show(this.win) ? "0" : "1";
        group.hidden = group.dataset.hiddenByRule == "1" || this.dialog.classList.contains("searching");
      });
    }
    group.dataset.hiddenByRule = "0";
    return group;
  }

  #page(spec) {
    const button = create(
      this.doc,
      "button",
      { className: "marmara-settings-nav", attrs: { type: "button", role: "tab" } },
      this.icon(spec.icon),
      create(this.doc, "span", { l10n: id(`page-${spec.id}`) })
    );
    button.addEventListener("click", () => this.showPage(spec.id));
    const section = create(
      this.doc,
      "div",
      { className: "marmara-settings-page", attrs: { role: "tabpanel", hidden: "" } },
      ...spec.groups.map(group => this.#group(group))
    );
    this.pages.set(spec.id, { button, section });
    return { button, section };
  }

  showPage(pageId) {
    this.search.value = "";
    this.#filter("");
    for (const [key, { button, section }] of this.pages) {
      const active = key == pageId;
      section.hidden = !active;
      button.setAttribute("aria-selected", String(active));
    }
    this.title.setAttribute("data-l10n-id", id(`page-${pageId}`));
    this.doc.l10n.translateFragment(this.title);
    this.content.scrollTop = 0;
  }

  /** Arama: tüm sayfalarda eşleşen satırları gösterir */
  #filter(query) {
    const needle = query.trim().toLocaleLowerCase();
    this.dialog.classList.toggle("searching", !!needle);
    this.empty.hidden = true;
    if (!needle) {
      for (const el of this.dialog.querySelectorAll(ROWS)) {
        el.hidden = false;
      }
      for (const group of this.dialog.querySelectorAll(".marmara-settings-group")) {
        group.hidden = group.dataset.hiddenByRule == "1";
      }
      return;
    }
    let found = 0;
    for (const [, { section }] of this.pages) {
      section.hidden = false;
      for (const group of section.querySelectorAll(".marmara-settings-group")) {
        let visibleRows = 0;
        for (const row of group.querySelectorAll(ROWS)) {
          const match = row.textContent.toLocaleLowerCase().includes(needle);
          row.hidden = !match;
          visibleRows += match ? 1 : 0;
        }
        group.hidden = visibleRows == 0 || group.dataset.hiddenByRule == "1";
        found += group.hidden ? 0 : visibleRows;
      }
    }
    for (const { button } of this.pages.values()) {
      button.setAttribute("aria-selected", "false");
    }
    this.title.setAttribute("data-l10n-id", id("search-results"));
    this.doc.l10n.translateFragment(this.title);
    this.empty.hidden = found > 0;
  }

  #applyRules() {
    for (const rule of this.rules) {
      rule();
    }
  }

  close() {
    this.dialog?.close();
  }

  open(startPage) {
    const { doc } = this;

    const nav = create(doc, "nav", { className: "marmara-settings-sidebar", attrs: { role: "tablist" } });
    this.content = create(doc, "div", { className: "marmara-settings-content" });
    this.empty = create(doc, "p", {
      className: "marmara-settings-empty",
      l10n: id("no-results"),
      attrs: { hidden: "" },
    });
    this.content.append(this.empty);
    for (const spec of PAGES) {
      const { button, section } = this.#page(spec);
      nav.append(button);
      this.content.append(section);
    }
    this.search = create(doc, "input", {
      className: "marmara-settings-search",
      attrs: { type: "search", autocomplete: "off", "data-l10n-id": id("search"), "data-l10n-attrs": "placeholder, aria-label" },
    });
    this.search.addEventListener("input", () => this.#filter(this.search.value));

    const close = create(
      doc,
      "button",
      { className: "marmara-settings-round", l10n: id("close"), attrs: { type: "button" } },
      this.icon("close")
    );
    close.addEventListener("click", () => this.close());

    this.title = create(doc, "h1", { className: "marmara-settings-heading" });
    const header = create(doc, "header", { className: "marmara-settings-header" }, this.title, close);
    const side = create(doc, "div", { className: "marmara-settings-side" }, this.search, nav);
    const main = create(doc, "main", { className: "marmara-settings-main" }, header, this.content);

    this.dialog = create(
      doc,
      "dialog",
      { className: "marmara-settings-dialog", attrs: { "aria-labelledby": "marmara-settings-heading" } },
      side,
      main
    );
    this.title.id = "marmara-settings-heading";
    this.dialog.addEventListener("click", event => {
      if (event.target == this.dialog) {
        this.close();
      }
    });
    this.dialog.addEventListener("close", () => this.dialog.remove());

    this.#applyRules();
    doc.documentElement.append(this.dialog);
    doc.l10n.translateFragment(this.dialog);
    this.showPage(PAGES.some(p => p.id == startPage) ? startPage : PAGES[0].id);
    this.dialog.showModal();
  }
}

export const MarmaraSettings = {
  /** Ayarları verilen tarayıcı penceresinde açar. paneID eski Firefox bölüm adı olabilir. */
  show(win, paneID) {
    const existing = win.document.querySelector("dialog.marmara-settings-dialog");
    if (existing) {
      return;
    }
    const start = PANE_ALIASES.find(([pattern]) => pattern.test(paneID ?? ""))?.[1] ?? "general";
    new SettingsDialog(win).open(start);
  },
};
