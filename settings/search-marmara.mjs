
// ---------------------------------------------------------------------------
// Marmara: arama motoru seçici
// (scripts/patch_omni.py bu bloğu search.mjs dosyasının sonuna ekler.)
//
// Varsayılan arama motoru, açılır liste yerine logoların yan yana durduğu
// yuvarlak köşeli bir kutuda seçilir; seçilen motor hemen etkinleşir
// (bkz. widgets/marmara-engine-picker.mjs). Aynı seçici hem Arama sayfasında hem
// Temel ayarlar sayfasında ("marmaraEngine" grubu) kullanılır.
// ---------------------------------------------------------------------------
{
  let group = SettingGroupManager.get("defaultEngine");
  let engine = group.items.find(item => item.id == "defaultEngineNormal");
  if (engine) {
    engine.control = "marmara-engine-picker";
  }

  SettingGroupManager.registerGroup("marmaraEngine", {
    l10nId: "search-engine-group",
    headingLevel: 2,
    items: [
      {
        id: "defaultEngineNormal",
        l10nId: "search-default-engine",
        control: "marmara-engine-picker",
      },
    ],
  });
}
