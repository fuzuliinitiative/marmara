/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Marmara: arama motoru seçici
 *
 * Arama motorlarının logoları, yuvarlak köşeli tek bir kutuda yan yana durur.
 * Bir logoya tıklamak o motoru hemen varsayılan yapar (ayrı bir "kaydet" yok).
 *
 * Ayarlar altyapısıyla şöyle konuşur (moz-radio-group gibi):
 *   <marmara-engine-picker>            kapsayıcı; "value" = seçili motorun kimliği
 *     <marmara-engine-option>          her motor için bir tane; value, label, iconSrc
 *   Seçim değişince kapsayıcı kabarcıklanan bir "change" olayı yollar.
 *
 * Seçenekleri (motor listesi, logoları) ayarlar altyapısı verir: bu dosya
 * yalnızca görünümü çizer. scripts/patch_omni.py, setting-control.mjs'ye bu
 * iki öğeyi tanıtır ve preferences.xhtml'e bu dosyayı ekler.
 */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

const STYLES = "chrome://browser/content/preferences/widgets/marmara-engine-picker.css";

export class MarmaraEngineOption extends MozLitElement {
  static properties = {
    value: { type: String },
    label: { type: String },
    iconSrc: { type: String, attribute: "iconsrc" },
    checked: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  constructor() {
    super();
    this.value = "";
    this.label = "";
    this.iconSrc = "";
    this.checked = false;
    this.disabled = false;
  }

  #onClick() {
    if (this.disabled) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent("marmara-engine-select", {
        bubbles: true,
        detail: { value: this.value },
      })
    );
  }

  render() {
    return html`
      <link rel="stylesheet" href=${STYLES} />
      <button
        type="button"
        role="radio"
        class="option"
        aria-checked=${this.checked ? "true" : "false"}
        title=${this.label}
        ?disabled=${this.disabled}
        @click=${this.#onClick}
      >
        <img class="icon" src=${this.iconSrc} alt="" />
        <span class="name">${this.label}</span>
      </button>
    `;
  }
}
customElements.define("marmara-engine-option", MarmaraEngineOption);

export class MarmaraEnginePicker extends MozLitElement {
  static properties = {
    value: { type: String },
    disabled: { type: Boolean, reflect: true },
    addLabel: { type: String, state: true },
  };

  constructor() {
    super();
    this.value = "";
    this.disabled = false;
    this.addLabel = "";
    this.addEventListener("marmara-engine-select", e => {
      e.stopPropagation();
      if (this.disabled || e.detail.value === this.value) {
        return;
      }
      this.value = e.detail.value;
      this.#syncOptions();
      this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    });
  }

  connectedCallback() {
    super.connectedCallback();
    // "+" kutusunun adı: Firefox'un kendi "Arama motoru ekle" çevirisi
    this.ownerDocument.l10n
      ?.formatMessages([{ id: "search-add-engine-2" }])
      .then(([msg]) => {
        this.addLabel = msg?.attributes?.find(a => a.name == "label")?.value ?? "";
      })
      .catch(() => {});
  }

  /** Özel motor ekleme penceresi (Firefox'un kendi iletişim kutusu). Eklenen
   * motor listeye kendiliğinden düşer: ayar, motor değişikliklerini izliyor. */
  #openAddDialog() {
    const URL = "chrome://browser/content/search/addEngine.xhtml";
    let win = this.ownerGlobal ?? window;
    try {
      win.gSubDialog.open(
        URL,
        { features: "resizable=no, modal=yes" },
        { mode: "NEW" }
      );
    } catch (e) {
      console.error("Marmara: arama motoru ekleme penceresi açılamadı", e);
      // Yedek: ayrı bir pencere olarak aç
      win.openDialog(URL, "", "chrome,modal,centerscreen,dialog", { mode: "NEW" });
    }
  }

  get #canAdd() {
    try {
      return Services.policies.isAllowed("installSearchEngine");
    } catch (e) {
      return true;
    }
  }

  get options() {
    return [...this.children].filter(c => c.localName == "marmara-engine-option");
  }

  #syncOptions() {
    for (let option of this.options) {
      option.checked = option.value === this.value;
      option.disabled = this.disabled;
    }
  }

  updated() {
    this.#syncOptions();
  }

  render() {
    return html`
      <link rel="stylesheet" href=${STYLES} />
      <div
        class="tray"
        role="radiogroup"
        aria-label=${this.getAttribute("aria-label") ?? ""}
      >
        <slot @slotchange=${() => this.#syncOptions()}></slot>
        ${this.#canAdd
          ? html`<button
              type="button"
              class="option add"
              title=${this.addLabel}
              aria-label=${this.addLabel}
              ?disabled=${this.disabled}
              @click=${() => this.#openAddDialog()}
            >
              <span class="plus" aria-hidden="true">+</span>
              <span class="name">${this.addLabel}</span>
            </button>`
          : ""}
      </div>
    `;
  }
}
customElements.define("marmara-engine-picker", MarmaraEnginePicker);
