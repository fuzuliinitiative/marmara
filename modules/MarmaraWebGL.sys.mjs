/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Marmara: WebGL izni, site ayarları panelinin içinde.
 *
 * LibreWolf bir site WebGL kullanmak istediğinde adres çubuğuna ayrı bir simge
 * koyuyor. Marmara bu simgeyi gizler (theme/browser/sitepanel.css) ve aynı
 * izni Firefox'un "bağlantı güvenliği ve site ayarları" paneline bir anahtar
 * olarak ekler. Anahtar, LibreWolf'un istem penceresinin kullandığı "webgl"
 * iznini okur ve yazar; değişince sayfa yeniden yüklenir.
 *
 * components.manifest'teki "browser-window-delayed-startup" kaydıyla her
 * tarayıcı penceresi için initWindow çağrılır.
 */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  PrivateBrowsingUtils: "resource://gre/modules/PrivateBrowsingUtils.sys.mjs",
});

const HTML_NS = "http://www.w3.org/1999/xhtml";
const PERMISSION = "webgl";
const PANEL_ID = "trustpanel-popup";
const AFTER_ID = "trustpanel-toggle-section";
const PROMPT_ID = "webgl-permissions-prompt";

function webPrincipal(win) {
  let principal = win.gBrowser.contentPrincipal;
  if (
    principal?.isContentPrincipal &&
    (principal.schemeIs("https") || principal.schemeIs("http"))
  ) {
    return principal;
  }
  return null;
}

function buildSection(doc) {
  let section = doc.createXULElement("vbox");
  section.id = "marmara-webgl-section";

  let row = doc.createXULElement("hbox");
  row.id = "marmara-webgl-row";
  row.setAttribute("align", "center");

  let label = doc.createXULElement("label");
  label.className = "trustpanel-header";
  label.setAttribute("data-l10n-id", "marmara-webgl-label");

  let toggle = doc.createElementNS(HTML_NS, "moz-toggle");
  toggle.id = "marmara-webgl-toggle";
  toggle.setAttribute("data-l10n-id", "marmara-webgl-toggle");
  toggle.setAttribute("data-l10n-attrs", "aria-label");

  let description = doc.createXULElement("description");
  description.id = "marmara-webgl-description";
  description.setAttribute("data-l10n-id", "marmara-webgl-description");

  row.append(label, toggle);
  section.append(row, description);
  return section;
}

function onToggle(win, toggle) {
  let principal = webPrincipal(win);
  if (!principal) {
    return;
  }
  let isPrivate = lazy.PrivateBrowsingUtils.isWindowPrivate(win);
  Services.perms.addFromPrincipal(
    principal,
    PERMISSION,
    toggle.pressed ? Ci.nsIPermissionManager.ALLOW_ACTION : Ci.nsIPermissionManager.DENY_ACTION,
    isPrivate ? Ci.nsIPermissionManager.EXPIRE_SESSION : Ci.nsIPermissionManager.EXPIRE_NEVER
  );

  // Bekleyen izin istemini kapat; sayfa yeni izinle yeniden yüklensin.
  let browser = win.gBrowser.selectedBrowser;
  let notification = win.PopupNotifications.getNotification(PROMPT_ID, browser);
  if (notification) {
    win.PopupNotifications.remove(notification);
  }
  win.gBrowser.reloadTab(win.gBrowser.selectedTab);
}

function prepare(win, panel) {
  let doc = win.document;
  let section = panel.querySelector("#marmara-webgl-section");
  if (!section) {
    let after = panel.querySelector(`#${AFTER_ID}`);
    if (!after) {
      console.warn("Marmara WebGL: site paneli yapısı değişmiş");
      return;
    }
    section = buildSection(doc);
    after.after(section);
    section
      .querySelector("#marmara-webgl-toggle")
      .addEventListener("toggle", e => onToggle(win, e.target));
  }

  let principal = webPrincipal(win);
  section.hidden = !principal;
  if (principal) {
    section.querySelector("#marmara-webgl-toggle").pressed =
      Services.perms.testPermissionFromPrincipal(principal, PERMISSION) ==
      Ci.nsIPermissionManager.ALLOW_ACTION;
  }
}

export const MarmaraWebGL = {
  /** browser-window-delayed-startup: ilk bağımsız değişken pencerenin kendisi */
  initWindow(win) {
    if (!win?.toolbar?.visible) {
      return;
    }
    win.MozXULElement.insertFTLIfNeeded("browser/marmara.ftl");
    // Panel şablondan ilk açılışta oluşturuluyor; bu yüzden belge düzeyinde dinliyoruz.
    win.document.addEventListener(
      "popupshowing",
      event => {
        if (event.target.id == PANEL_ID) {
          try {
            prepare(win, event.target);
          } catch (e) {
            console.error("Marmara WebGL:", e);
          }
        }
      },
      true
    );
  },
};
