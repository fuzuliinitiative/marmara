/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Marmara: Temel ayarlar sayfası
 *
 * Ayarlar ilk açıldığında bu sayfa gelir. Görünüm (tema), arama motoru, dil ve
 * "Tarayıcı verilerini içe aktar" grupları, kendi sayfalarına gitmeden burada bir arada durur.
 * Marmara varsayılan tarayıcı değilse en üstte bunu söyleyen bir kutu çıkar. Gruplar
 * Firefox'un kendi dosyalarında tanımlı (appearance.mjs, search.mjs,
 * languages.mjs, account-sync.mjs); bu dosya yalnızca o dosyaları yükletir, böylece gruplar
 * kayıt olur ve sayfa onları çizebilir.
 *
 * chrome://browser/content/preferences/config/marmara-basics.mjs olarak
 * paketlenir; sayfanın tanımı scripts/patch_omni.py ile preferences.js'ye eklenir.
 */

import { Preferences } from "chrome://global/content/preferences/Preferences.mjs";
import { SettingGroupManager } from "chrome://browser/content/preferences/config/SettingGroupManager.mjs";

for (let name of ["appearance", "search", "languages", "account-sync"]) {
  ChromeUtils.importESModule(
    `chrome://browser/content/preferences/config/${name}.mjs`,
    { global: "current" }
  );
}

// ---------------------------------------------------------------------------
// Dışa aktar: yer imleri (HTML) ve geçmiş (CSV)
// ---------------------------------------------------------------------------

/** Kaydetme penceresini açar; seçilen dosyanın yolunu döndürür (iptalde null). */
async function pickSavePath(titleId, defaultName, filter) {
  let title = await document.l10n.formatValue(titleId);
  let fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
  fp.init(window.browsingContext, title, Ci.nsIFilePicker.modeSave);
  fp.appendFilters(filter);
  fp.defaultString = defaultName;
  let result = await new Promise(resolve => fp.open(resolve));
  return result == Ci.nsIFilePicker.returnCancel ? null : fp.file.path;
}

function csvCell(value) {
  let text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

Preferences.addSetting({
  id: "marmaraExportBookmarks",
  async onUserClick() {
    try {
      let path = await pickSavePath(
        "marmara-export-bookmarks-title",
        "yer-imleri.html",
        Ci.nsIFilePicker.filterHTML
      );
      if (path) {
        let { BookmarkHTMLUtils } = ChromeUtils.importESModule(
          "resource://gre/modules/BookmarkHTMLUtils.sys.mjs"
        );
        await BookmarkHTMLUtils.exportToFile(path);
      }
    } catch (e) {
      console.error("Marmara: yer imleri dışa aktarılamadı", e);
    }
  },
});

Preferences.addSetting({
  id: "marmaraExportHistory",
  async onUserClick() {
    try {
      let path = await pickSavePath(
        "marmara-export-history-title",
        "gecmis.csv",
        Ci.nsIFilePicker.filterAll
      );
      if (!path) {
        return;
      }
      let { PlacesUtils } = ChromeUtils.importESModule(
        "resource://gre/modules/PlacesUtils.sys.mjs"
      );
      let db = await PlacesUtils.promiseDBConnection();
      let rows = await db.execute(
        `SELECT url, title, visit_count, last_visit_date
           FROM moz_places
          WHERE visit_count > 0 AND last_visit_date NOT NULL
          ORDER BY last_visit_date DESC`
      );
      let lines = ["url,title,visit_count,last_visit"];
      for (let row of rows) {
        let when = new Date(row.getResultByName("last_visit_date") / 1000).toISOString();
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
      await IOUtils.writeUTF8(path, "\ufeff" + lines.join("\r\n") + "\r\n");
    } catch (e) {
      console.error("Marmara: geçmiş dışa aktarılamadı", e);
    }
  },
});

SettingGroupManager.registerGroup("marmaraExport", {
  l10nId: "marmara-export-group",
  headingLevel: 2,
  iconSrc: "chrome://browser/skin/save.svg",
  items: [
    {
      id: "marmaraExportBookmarks",
      l10nId: "marmara-export-bookmarks",
      control: "moz-box-button",
    },
    {
      id: "marmaraExportHistory",
      l10nId: "marmara-export-history",
      control: "moz-box-button",
    },
  ],
});

// Varsayılan tarayıcı: yalnızca Marmara varsayılan değilse görünür (Firefox'un
// "varsayılan değil" kutusu ve "Varsayılan yap" düğmesi). Görünür öğesi
// olmayan grup kendiliğinden gizlendiği için varsayılanken sayfada iz kalmaz.
SettingGroupManager.registerGroup(
  "marmaraDefaultBrowser",
  window.createDefaultBrowserConfig({ includeIsDefaultPane: false })
);
