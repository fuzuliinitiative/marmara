/* Marmara — about:addons > Temalar
 *
 * Firefox'un kendi "Cihaz / Aydınlık / Karanlık" seçimi sayfanın üstünde zaten
 * var; Marmara bir ikincisini eklemez. Burada yalnızca:
 *  1. Tema listesinin üstüne, temaların tarayıcının görünümünü bozabileceğine
 *     dair uyarıyı koyar.
 *  2. Aydınlık/karanlık seçimi değişince, web sitelerinin tarayıcının temasını
 *     izlemesini sağlar (Ayarlar > Temel ayarlar'daki seçimle aynı davranış).
 *
 * Firefox'un yerleşik tema kartları (sistem, aydınlık, karanlık, Alpenglow)
 * marmara-themes.css ile gizlenir; seçim yukarıdaki kontrolle yapılır.
 *
 * chrome://mozapps/content/extensions/marmara-themes.mjs olarak paketlenir.
 */

const PREF_DARK = "ui.systemUsesDarkTheme";
const PREF_CONTENT = "layout.css.prefers-color-scheme.content-override";

function buildHeader() {
  let header = document.createElement("div");
  header.className = "marmara-themes-header";

  let warning = document.createElement("moz-message-bar");
  warning.setAttribute("type", "warning");
  warning.setAttribute("data-l10n-id", "marmara-themes-warning");

  header.append(warning);
  return header;
}

function decorate() {
  let list = document.querySelector('addon-list[type="theme"]');
  if (!list || list.previousElementSibling?.classList.contains("marmara-themes-header")) {
    return;
  }
  list.before(buildHeader());
}

// Web siteleri her zaman tarayıcının temasını izlesin
let observer = () => Services.prefs.clearUserPref(PREF_CONTENT);
Services.prefs.addObserver(PREF_DARK, observer);
window.addEventListener("unload", () =>
  Services.prefs.removeObserver(PREF_DARK, observer)
);

new MutationObserver(decorate).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
decorate();
