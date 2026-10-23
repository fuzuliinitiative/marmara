
// ---------------------------------------------------------------------------
// Marmara: Görünüm sayfası yalnızca tek bir tema seçimi gösterir.
// (scripts/patch_omni.py bu bloğu appearance.mjs dosyasının sonuna ekler.)
//
// Sistem / Aydınlık / Karanlık seçimi "ui.systemUsesDarkTheme" ayarına yazılır.
// about:addons > Temalar'daki seçim de aynı ayarı kullanır, ikisi hep uyumludur.
// Web siteleri tarayıcının temasını izler: karanlık temada, destekleyen siteler
// de karanlık görünür.
// ---------------------------------------------------------------------------
{
  const PREF_DARK = "ui.systemUsesDarkTheme";
  const PREF_CONTENT = "layout.css.prefers-color-scheme.content-override";
  const DARK_QUERY = matchMedia("(prefers-color-scheme: dark)");

  Preferences.addAll([{ id: PREF_DARK, type: "int" }]);

  Preferences.addSetting({
    id: "marmaraDarkPref",
    pref: PREF_DARK,
    setup: emitChange => {
      let observer = () => emitChange();
      Services.prefs.addObserver(PREF_DARK, observer);
      return () => Services.prefs.removeObserver(PREF_DARK, observer);
    },
  });

  // Firefox'un "web sitesi görünümü" seçicisini aynı kimlikle yeniden tanımlıyoruz.
  Preferences.addSetting({
    id: "web-appearance-chooser",
    deps: ["marmaraDarkPref"],
    setup(emitChange) {
      DARK_QUERY.addEventListener("change", emitChange);
      return () => DARK_QUERY.removeEventListener("change", emitChange);
    },
    get(_, { marmaraDarkPref }) {
      if (!marmaraDarkPref.pref.hasUserValue) {
        return "auto";
      }
      return marmaraDarkPref.value == 1 ? "dark" : "light";
    },
    set(val) {
      if (val == "auto") {
        Services.prefs.clearUserPref(PREF_DARK);
      } else {
        Services.prefs.setIntPref(PREF_DARK, val == "dark" ? 1 : 0);
      }
      // Web siteleri her zaman tarayıcının temasını izlesin.
      Services.prefs.clearUserPref(PREF_CONTENT);
    },
    getControlConfig(config) {
      // "Sistem" seçeneğinin resmi o anki görünüme uysun.
      let auto = config.options.find(o => o.value == "auto");
      let match = config.options.find(
        o => o.value == (DARK_QUERY.matches ? "dark" : "light")
      );
      if (auto && match) {
        auto.controlAttrs = {
          ...auto.controlAttrs,
          imagesrc: match.controlAttrs.imagesrc,
        };
      }
      return config;
    },
  });

  let group = SettingGroupManager.get("appearance");
  group.l10nId = "marmara-theme-group";
  group.items = group.items.filter(item => item.id != "librewolfRFPWarning");
  let chooser = group.items.find(item => item.id == "web-appearance-chooser");
  if (chooser) {
    let byValue = Object.fromEntries(chooser.options.map(o => [o.value, o]));
    chooser.options = ["auto", "light", "dark"]
      .filter(v => byValue[v])
      .map(v => ({ ...byValue[v], l10nId: `marmara-theme-${v}` }));
  }
}
