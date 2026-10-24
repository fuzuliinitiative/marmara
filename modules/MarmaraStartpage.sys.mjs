/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Marmara başlangıç sayfası: about:marmara
 *
 * Tarayıcının kendi sayfasıdır (eklenti değil): açılış sayfası ve yeni sekme
 * olarak gelir; seçilen arama motoru tarayıcının varsayılanı olur. Sayfanın
 * dosyaları chrome://browser/content/marmara/ altında (startpage/ klasörü).
 *
 * components.manifest'teki "browser-before-ui-startup" kaydıyla her açılışta
 * bir kez çalışır: about:marmara'yı kaydeder ve yeni sekme adresini ona yöneltir.
 */

const PAGE = "chrome://browser/content/marmara/startpage.html";
const CID = Components.ID("{3e5d1d9c-7a64-4c0f-8d3e-6b2a2d9d4f17}");
const PREF_NEWTAB = "marmara.newtab.page"; // "start" | "blank" | "custom"
const PREF_NEWTAB_URL = "marmara.newtab.url";

/** Yalnızca http(s) adresi kabul eder; şema yoksa https eklenir. Geçersizse null. */
export function normalizeUrl(raw) {
  let value = String(raw ?? "").trim();
  if (!value) {
    return null;
  }
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    value = "https://" + value;
  }
  try {
    const url = new URL(value);
    return url.protocol == "http:" || url.protocol == "https:" ? url.href : null;
  } catch {
    return null;
  }
}
const CONTRACT = "@mozilla.org/network/protocol/about;1?what=marmara";

class AboutMarmara {
  QueryInterface = ChromeUtils.generateQI([Ci.nsIAboutModule]);

  newChannel(_uri, loadInfo) {
    const channel = Services.io.newChannelFromURIWithLoadInfo(
      Services.io.newURI(PAGE),
      loadInfo
    );
    channel.owner = Services.scriptSecurityManager.getSystemPrincipal();
    return channel;
  }

  getURIFlags() {
    return Ci.nsIAboutModule.ALLOW_SCRIPT | Ci.nsIAboutModule.IS_SECURE_CHROME_UI;
  }

  getChromeURI() {
    return Services.io.newURI(PAGE);
  }
}

const factory = {
  QueryInterface: ChromeUtils.generateQI([Ci.nsIFactory]),
  createInstance(iid) {
    return new AboutMarmara().QueryInterface(iid);
  },
};

export const MarmaraStartpage = {
  init() {
    try {
      Components.manager
        .QueryInterface(Ci.nsIComponentRegistrar)
        .registerFactory(CID, "about:marmara", CONTRACT, factory);
    } catch (e) {
      console.error("Marmara: about:marmara kaydedilemedi", e);
      return;
    }
    try {
      const { AboutNewTab } = ChromeUtils.importESModule(
        "resource:///modules/AboutNewTab.sys.mjs"
      );
      // Ayarlar > Başlangıç ve sekmeler'deki seçim
      const target = () => {
        switch (Services.prefs.getStringPref(PREF_NEWTAB, "start")) {
          case "blank":
            return "about:blank";
          case "custom":
            return normalizeUrl(Services.prefs.getStringPref(PREF_NEWTAB_URL, "")) ?? "about:marmara";
          default:
            return "about:marmara";
        }
      };
      AboutNewTab.newTabURL = target();
      const prefObserver = { observe: () => (AboutNewTab.newTabURL = target()) };
      Services.prefs.addObserver(PREF_NEWTAB, prefObserver);
      Services.prefs.addObserver(PREF_NEWTAB_URL, prefObserver);
      // Eski eklenti kaldırılırken ya da başka bir eklenti yeni sekmeyi
      // değiştirirse adres sıfırlanabilir; bizimkine geri döndür.
      Services.obs.addObserver(
        {
          observe(_subject, _topic, url) {
            if (url != target()) {
              AboutNewTab.newTabURL = target();
            }
          },
        },
        "newtab-url-changed"
      );
    } catch (e) {
      console.error("Marmara: yeni sekme adresi ayarlanamadı", e);
    }
  },
};
