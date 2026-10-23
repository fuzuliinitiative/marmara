/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Marmara'nın gömülü eklentilerini kurar.
 *
 * Eklentiler omni.ja içinde (resource://builtin-addons/<klasör>/) durur ve
 * Firefox'un kendi yerleşik temalarını kurduğu yolla (maybeInstallBuiltinAddon)
 * kurulur: imza gerekmez, internet gerekmez, about:addons'ta görünür, kullanıcı
 * kapatabilir ama kaldıramaz. Sürüm değişince kendiliğinden güncellenir.
 *
 * components.manifest'teki "browser-before-ui-startup" kaydıyla her açılışta
 * çağrılır. BUILTINS listesini derleme betiği builtin/<klasör>/manifest.json
 * dosyalarından doldurur.
 */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AddonManager: "resource://gre/modules/AddonManager.sys.mjs",
});

const BUILTINS = /* @BUILTINS@ */ [];

// Önceki sürümlerde gömülü eklenti olarak gelen, artık tarayıcının kendi
// parçası olan özellikler. Kurulu kaldılarsa kaldırılır.
const OBSOLETE = [
  "terms-rating@marmara", // Hizmet Koşulları Notu → modules/MarmaraTosdr.sys.mjs
  "startpage@marmara", // Başlangıç sayfası → modules/MarmaraStartpage.sys.mjs (about:marmara)
];

export const MarmaraBuiltins = {
  init() {

    for (const { id, version, path } of BUILTINS) {
      Promise.resolve()
        .then(() => lazy.AddonManager.maybeInstallBuiltinAddon(id, version, path))
        .catch(e => console.error(`Marmara: ${id} kurulamadı`, e));
    }
    for (const id of OBSOLETE) {
      lazy.AddonManager.getAddonByID(id)
        .then(addon => addon?.uninstall())
        .catch(e => console.warn(`Marmara: ${id} kaldırılamadı`, e));
    }
  },
};
