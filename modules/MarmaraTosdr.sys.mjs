/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Marmara: Hizmet Koşulları Notu (ToS;DR)
 *
 * Adres çubuğunda, Firefox'un kalkan simgesinin yerinde açık sitenin ToS;DR
 * notunu (A–E) gösterir. Nota tıklayınca ayrıntılar açılır; oradan Firefox'un
 * bağlantı güvenliği ve site ayarları paneline de geçilebilir.
 *
 * Kalkan yalnızca bağlantı güvenliyken gizlenir. Güvensiz bağlantı, sertifika
 * uyarısı ya da veri ihlali uyarısı varsa kalkan notun yanında görünmeye devam
 * eder.
 *
 * Gizlilik:
 *  - ToS;DR'a yalnızca sitenin kayıtlı alan adı (ör. "google.com") gönderilir,
 *    alt alan adı ya da sayfa adresi gönderilmez.
 *  - Sonuçlar yalnızca bellekte, bu oturum boyunca tutulur; diske yazılmaz.
 *  - Gizli pencerelerde varsayılan olarak hiçbir şey sorulmaz.
 *
 * Ayarlar (about:config):
 *  marmara.tosdr.enabled         (bool, varsayılan true)
 *  marmara.tosdr.privateWindows  (bool, varsayılan false)
 *
 * components.manifest'teki "browser-window-delayed-startup" kaydıyla her
 * tarayıcı penceresi için initWindow çağrılır.
 *
 * API: https://docs.tosdr.org/developer/tos-dr-developers/restful-api
 */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  PrivateBrowsingUtils: "resource://gre/modules/PrivateBrowsingUtils.sys.mjs",
  clearTimeout: "resource://gre/modules/Timer.sys.mjs",
  setTimeout: "resource://gre/modules/Timer.sys.mjs",
});

const API = "https://api.tosdr.org";
const SITE = "https://tosdr.org";
const PREF_ENABLED = "marmara.tosdr.enabled";
const PREF_PRIVATE = "marmara.tosdr.privateWindows";
const TIMEOUT_MS = 10000;
const MAX_POINTS = 12;
const API_LANGS = ["de", "nl", "fr", "es"]; // ToS;DR'ın madde çevirisi sunduğu diller
const CLASS_ORDER = { blocker: 0, bad: 1, good: 2, neutral: 3 };
const HTML_NS = "http://www.w3.org/1999/xhtml";

// ---------------------------------------------------------------------------
// Veri: oturum boyunca bellekte
// ---------------------------------------------------------------------------

const searchCache = new Map(); // kayıtlı alan adı -> Promise<services[]>
const detailsCache = new Map(); // "id:dil" -> Promise<details>

function memo(map, key, compute) {
  if (!map.has(key)) {
    map.set(
      key,
      compute().catch(e => {
        map.delete(key); // hatalar önbelleğe alınmasın
        throw e;
      })
    );
  }
  return map.get(key);
}

async function getJSON(url) {
  let controller = new AbortController();
  let timer = lazy.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let response = await fetch(url, {
      signal: controller.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`ToS;DR: HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    lazy.clearTimeout(timer);
  }
}

function baseDomain(host) {
  try {
    return Services.eTLD.getBaseDomainFromHost(host);
  } catch {
    return null; // IP adresi, tek etiketli ad vb.
  }
}

/** "a.b.example.com" → ["a.b.example.com", "b.example.com", "example.com"] */
function hostCandidates(host, base) {
  let out = [];
  let h = host.replace(/^www\./, "");
  while (h && h.length >= base.length) {
    out.push(h);
    if (h == base) {
      break;
    }
    h = h.slice(h.indexOf(".") + 1);
  }
  return out;
}

/** @returns {Promise<{id, name, rating, reviewed} | null>} */
async function lookup(host) {
  let base = baseDomain(host);
  if (!base) {
    return null;
  }
  let services = await memo(searchCache, base, async () => {
    let data = await getJSON(`${API}/search/v5/?query=${encodeURIComponent(base)}`);
    return Array.isArray(data?.services) ? data.services : [];
  });
  // En özel eşleşme önce: mail.google.com, sonra google.com
  for (let candidate of hostCandidates(host, base)) {
    let match = services.find(s =>
      (s.urls || []).some(u => String(u).toLowerCase() == candidate)
    );
    if (match) {
      return {
        id: match.id,
        name: match.name,
        rating: match.rating,
        reviewed: !!match.is_comprehensively_reviewed,
      };
    }
  }
  return null;
}

function apiLang() {
  let lang = Services.locale.appLocaleAsBCP47.split("-")[0];
  return API_LANGS.includes(lang) ? lang : null;
}

async function details(id) {
  let lang = apiLang();
  return memo(detailsCache, `${id}:${lang || "en"}`, async () => {
    let data = await getJSON(
      `${API}/service/v3/?id=${encodeURIComponent(id)}${lang ? `&lang=${lang}` : ""}`
    );
    let seen = new Set();
    let points = (data.points || [])
      .filter(p => p.status == "approved" && p.case)
      .map(p => ({
        title: p.case.localized_title || p.case.title || p.title,
        classification: p.case.classification || "neutral",
        weight: p.case.weight || 0,
      }))
      .filter(p => p.title && !seen.has(p.title) && seen.add(p.title))
      .sort(
        (a, b) =>
          (CLASS_ORDER[a.classification] ?? 9) - (CLASS_ORDER[b.classification] ?? 9) ||
          b.weight - a.weight
      );
    return {
      name: data.name,
      rating: data.rating,
      reviewed: !!data.is_comprehensively_reviewed,
      points,
    };
  });
}

function normalizeGrade(rating) {
  let grade = typeof rating == "string" ? rating.trim().toUpperCase() : "";
  return /^[A-E]$/.test(grade) ? grade : null;
}

// ---------------------------------------------------------------------------
// Pencere arayüzü
// ---------------------------------------------------------------------------

class WindowUI {
  constructor(win) {
    this.win = win;
    this.doc = win.document;
    this.host = null;
    this.service = null;

    let trust = this.doc.getElementById("trust-icon-container");
    this.urlbar = this.doc.getElementById("urlbar");
    if (!trust || !this.urlbar) {
      console.warn("Marmara ToS;DR: adres çubuğu öğeleri bulunamadı");
      return;
    }

    win.MozXULElement.insertFTLIfNeeded("browser/marmara.ftl");
    this.#buildBadge(trust);
    this.#buildPanel();

    this.progressListener = {
      onLocationChange: () => this.update(),
      QueryInterface: ChromeUtils.generateQI([
        "nsIWebProgressListener",
        "nsISupportsWeakReference",
      ]),
    };
    win.gBrowser.addProgressListener(this.progressListener);
    win.gBrowser.tabContainer.addEventListener("TabSelect", this);

    this.prefObserver = () => {
      this.host = null;
      this.update();
    };
    Services.prefs.addObserver(PREF_ENABLED, this.prefObserver);
    Services.prefs.addObserver(PREF_PRIVATE, this.prefObserver);

    win.addEventListener("unload", this, { once: true });
    this.update();
  }

  // ---- Öğeler ----

  #html(tag, attrs = {}) {
    let el = this.doc.createElementNS(HTML_NS, tag);
    for (let [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v);
    }
    return el;
  }

  #buildBadge(trust) {
    let box = this.doc.createXULElement("box");
    box.id = "marmara-tosdr-box";
    box.setAttribute("role", "button");
    box.setAttribute("align", "center");
    box.hidden = true;
    let letter = this.#html("span", { class: "marmara-tosdr-grade" });
    box.append(letter);
    trust.before(box);
    box.addEventListener("click", this);
    box.addEventListener("keydown", this);
    this.box = box;
    this.letter = letter;
  }

  #buildPanel() {
    let panel = this.doc.createXULElement("panel");
    panel.id = "marmara-tosdr-panel";
    panel.setAttribute("type", "arrow");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("orient", "vertical");
    panel.setAttribute("aria-labelledby", "marmara-tosdr-service");
    panel.addEventListener("popuphidden", () => this.box.removeAttribute("open"));

    // Öğeleri DOM ile kuruyoruz; ayrıcalıklı belgelerde HTML dizesi ayrıştırmaya gerek yok.
    let h = (tag, attrs = {}, ...children) => {
      let el = this.#html(tag, attrs);
      el.append(...children);
      return el;
    };
    let body = h(
      "div",
      { class: "marmara-tosdr-body" },
      h(
        "div",
        { class: "marmara-tosdr-card marmara-tosdr-summary" },
        h("div", { class: "marmara-tosdr-grade marmara-tosdr-grade-large", "aria-hidden": "true" }),
        h(
          "div",
          { class: "marmara-tosdr-summary-text" },
          h("div", { id: "marmara-tosdr-service", class: "marmara-tosdr-title" }),
          h("div", { class: "marmara-tosdr-grade-label" }),
          h("div", { class: "marmara-tosdr-grade-text marmara-tosdr-dim" }),
          h("div", {
            class: "marmara-tosdr-not-reviewed marmara-tosdr-dim marmara-tosdr-small",
            "data-l10n-id": "marmara-tosdr-not-reviewed",
          })
        )
      ),
      h("div", { class: "marmara-tosdr-heading", "data-l10n-id": "marmara-tosdr-points-heading" }),
      h("div", { class: "marmara-tosdr-status marmara-tosdr-dim" }),
      h("ul", { class: "marmara-tosdr-card marmara-tosdr-points" }),
      h("button", {
        class: "marmara-tosdr-button",
        "data-action": "details",
        "data-l10n-id": "marmara-tosdr-details-link",
      }),
      h("button", {
        class: "marmara-tosdr-button",
        "data-action": "site-info",
        "data-l10n-id": "marmara-tosdr-site-info",
      }),
      h(
        "div",
        { class: "marmara-tosdr-footer marmara-tosdr-dim marmara-tosdr-small" },
        h("div", { "data-l10n-id": "marmara-tosdr-privacy" }),
        h("div", { "data-l10n-id": "marmara-tosdr-attribution" })
      )
    );
    body.addEventListener("click", this);
    panel.append(body);
    this.doc.getElementById("mainPopupSet").append(panel);
    this.panel = panel;
    this.body = body;
  }

  // ---- Olaylar ----

  handleEvent(event) {
    switch (event.type) {
      case "TabSelect":
        this.update();
        break;
      case "click":
        if (event.currentTarget == this.box) {
          if (event.button == 0) {
            this.togglePanel(event);
          }
        } else {
          this.#onPanelClick(event);
        }
        break;
      case "keydown":
        if (event.key == "Enter" || event.key == " ") {
          event.preventDefault();
          this.togglePanel(event);
        }
        break;
      case "unload":
        this.destroy();
        break;
    }
  }

  #onPanelClick(event) {
    let action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) {
      return;
    }
    this.panel.hidePopup();
    if (action == "details" && this.service) {
      this.win.openWebLinkIn(
        `${SITE}/en/service/${encodeURIComponent(this.service.id)}`,
        "tab"
      );
    } else if (action == "site-info") {
      // Firefox'un kalkan paneli: bağlantı güvenliği, izinler, izleme koruması
      if (this.win.gTrustPanelHandler?.showPopup) {
        this.win.gTrustPanelHandler.showPopup({ reason: "shieldButtonClicked" });
      } else {
        this.win.BrowserCommands?.pageInfo?.();
      }
    }
  }

  destroy() {
    try {
      this.win.gBrowser.removeProgressListener(this.progressListener);
      this.win.gBrowser.tabContainer.removeEventListener("TabSelect", this);
    } catch {}
    Services.prefs.removeObserver(PREF_ENABLED, this.prefObserver);
    Services.prefs.removeObserver(PREF_PRIVATE, this.prefObserver);
  }

  // ---- Durum ----

  #enabledHere() {
    if (!Services.prefs.getBoolPref(PREF_ENABLED, true)) {
      return false;
    }
    if (
      lazy.PrivateBrowsingUtils.isWindowPrivate(this.win) &&
      !Services.prefs.getBoolPref(PREF_PRIVATE, false)
    ) {
      return false;
    }
    return true;
  }

  update() {
    let uri = this.win.gBrowser.selectedBrowser?.currentURI;
    let host = null;
    if (this.#enabledHere() && uri && (uri.schemeIs("https") || uri.schemeIs("http"))) {
      try {
        host = uri.asciiHost || null;
      } catch {}
    }

    if (host == this.host) {
      return; // aynı site (sayfa içi gezinme, aynı siteye sekme geçişi)
    }
    this.host = host;
    this.service = null;
    this.#show(null);
    if (this.panel?.state == "open") {
      this.panel.hidePopup();
    }
    if (!host) {
      return;
    }

    lookup(host).then(
      service => {
        if (this.host == host) {
          this.service = service;
          this.#show(service);
        }
      },
      e => console.warn("Marmara ToS;DR:", e)
    );
  }

  #show(service) {
    let grade = normalizeGrade(service?.rating);
    this.box.hidden = !grade;
    this.urlbar.toggleAttribute("marmara-graded", !!grade);
    if (grade) {
      this.box.setAttribute("grade", grade);
      this.letter.textContent = grade;
      this.doc.l10n.setAttributes(this.box, "marmara-tosdr-badge", {
        grade,
        service: service.name,
      });
    }
  }

  // ---- Panel ----

  togglePanel(event) {
    if (this.panel.state == "open" || this.panel.state == "showing") {
      this.panel.hidePopup();
      return;
    }
    if (!this.service) {
      return;
    }
    this.#renderPanel(this.service, null, "loading");
    this.box.setAttribute("open", "true");
    this.panel.openPopup(this.box, {
      position: "bottomleft topleft",
      triggerEvent: event,
    });

    let service = this.service;
    details(service.id).then(
      d => this.service == service && this.#renderPanel(service, d, "done"),
      e => {
        console.warn("Marmara ToS;DR:", e);
        this.service == service && this.#renderPanel(service, null, "error");
      }
    );
  }

  #renderPanel(service, data, state) {
    let $ = sel => this.body.querySelector(sel);
    let grade = normalizeGrade(data?.rating ?? service.rating);

    let big = $(".marmara-tosdr-grade-large");
    big.textContent = grade || "?";
    big.setAttribute("grade", grade || "none");

    $("#marmara-tosdr-service").textContent = data?.name || service.name;
    this.doc.l10n.setAttributes($(".marmara-tosdr-grade-label"), "marmara-tosdr-grade-label", {
      grade: grade || "?",
    });
    if (grade) {
      this.doc.l10n.setAttributes(
        $(".marmara-tosdr-grade-text"),
        `marmara-tosdr-grade-${grade.toLowerCase()}`
      );
    }
    $(".marmara-tosdr-not-reviewed").hidden = data ? data.reviewed : service.reviewed;

    let status = $(".marmara-tosdr-status");
    let list = $(".marmara-tosdr-points");
    list.textContent = "";
    let points = data?.points || [];
    for (let point of points.slice(0, MAX_POINTS)) {
      let li = this.#html("li", { "data-class": point.classification });
      li.append(this.#html("span", { class: "marmara-tosdr-dot", "aria-hidden": "true" }));
      let text = this.#html("span");
      text.textContent = point.title;
      li.append(text);
      list.append(li);
    }
    list.hidden = points.length == 0;

    let statusId = {
      loading: "marmara-tosdr-loading",
      error: "marmara-tosdr-error",
      done: points.length ? null : "marmara-tosdr-no-points",
    }[state];
    status.hidden = !statusId;
    if (statusId) {
      this.doc.l10n.setAttributes(status, statusId);
    }
  }
}

const windows = new WeakMap();

export const MarmaraTosdr = {
  /** browser-window-delayed-startup: ilk bağımsız değişken pencerenin kendisi */
  initWindow(win) {
    if (!win?.toolbar?.visible || windows.has(win)) {
      return; // açılır pencerelerde adres çubuğu yok
    }
    windows.set(win, new WindowUI(win));
  },

  // Testler ve hata ayıklama için
  _lookup: lookup,
  _details: details,
};
