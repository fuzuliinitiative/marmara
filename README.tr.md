# Marmara

**GNOME İnsan Arayüzü Yönergeleri'ne göre tasarlanmış, gizli ve sade bir web tarayıcısı.**

🇬🇧 [English](README.md)

Marmara, [LibreWolf](https://librewolf.net) (dolayısıyla Firefox) üzerine kuruludur.
LibreWolf'un gizlilik odaklı tarayıcısına GNOME İnsan Arayüzü Yönergeleri'ni izleyen temiz
bir tasarım, sade ayarlar, birkaç ek özellik ve kendi adını verir. Sıfırdan yazılmış bir tarayıcı değildir ve Firefox'u derlemez.
LibreWolf'un hazır dosyalarını yeniden paketler. Bu yüzden her yeni LibreWolf sürümü
kendiliğinden yeni bir Marmara sürümüne dönüşebilir.

![Adwaita görünümlü sekmeler ve adres çubuğu](flatpak/screenshot-1.png)

## Neden Marmara?

- **Varsayılan olarak gizli.** Telemetri yok, izleme yok, açmanız gereken bir şey yok.
- **Sakin ve tutarlı tasarım.** Marmara, GNOME İnsan Arayüzü Yönergeleri'ni izler: net,
  sade, tanıdık; açık ve koyu modla birlikte.
- **Sade.** Yüzlerce seçenek yerine akıllı varsayılanlar ve küçük bir ayarlar penceresi.
- **Seçim sizin.** Dil, tema ve arama motorunu ilk açılışta siz seçersiniz.
- **Açık.** Kodu herkese açık ve özgür yazılımdır.

## Özellikler

- **Adwaita tarzı tasarım:** adres çubuğu başlık çubuğunda, sekmeler altında, libadwaita
  renkleri ve köşeleri, açık/koyu mod, sistem vurgu rengi.
- **Varsayılan olarak gizli:** LibreWolf'un ayarları. Telemetri yok, sıkı izleme koruması,
  yalnızca HTTPS.
- **Yararlı eklentiler hazır:** uBlock Origin, Privacy Badger, ClearURLs ve ToS;DR ilk
  açılışta kurulur, gizli pencerelerde de çalışır.
- **Kullanım koşulları bir bakışta:** Adres çubuğu, ziyaret ettiğiniz sitenin
  [ToS;DR](https://tosdr.org) puanını gösterir.
- **Sade ayarlar:** Uzun bir seçenek sayfası yerine arama özellikli, küçük, Adwaita
  görünümlü tek bir pencere.
- **İlk açılış karşılaması:** Dilinizi, temanızı ve arama motorunuzu kendiniz seçersiniz.
  Sizin yerinize hiçbir şey seçilmez.
- **Kendi kimliği:** Kendi adı, logosu, profil klasörü (`~/.marmara`) ve pencere sınıfı
  vardır. LibreWolf ile yan yana çalışabilir.

| | |
|---|---|
| ![Adres çubuğunda ToS;DR puanı](flatpak/screenshot-2.png) | ![Açık ve koyu başlangıç sayfası](flatpak/screenshot-3.png) |
| ![Sade uygulama menüsü](flatpak/screenshot-4.png) | |

## Kurulum

### Flatpak (Linux)

```sh
flatpak remote-add --user marmara https://fuzuliinitiative.github.io/marmara/marmara.flatpakrepo
flatpak install --user marmara io.github.fuzuliinitiative.Marmara
flatpak run io.github.fuzuliinitiative.Marmara
```

Güncellemek için:

```sh
flatpak update io.github.fuzuliinitiative.Marmara
```

Yeni sürüm çıktığında Marmara bunu **Ayarlar → Genel → Güncellemeler** bölümünde söyler.
Depo imzalıdır. Anahtar `marmara.flatpakrepo` dosyasında bulunur.

> Marmara henüz Flathub'da değil, bu yüzden Bazaar gibi yazılım merkezleri onu
> listelemez. GNOME Yazılım ve yukarıdaki komutlar çalışır.

### Windows

Yakında.

### Sürüm arşivinden (Linux)

[En son sürümden](https://github.com/fuzuliinitiative/marmara/releases/latest)
`marmara-<sürüm>-linux-x86_64.tar.xz` dosyasını indirin, açın ve `./marmara/marmara`
çalıştırın.

## Sorun bildirme

Bir [issue](https://github.com/fuzuliinitiative/marmara/issues/new) açın. Marmara'nın
**Hakkında → Sorun bildir** düğmesi de aynı yere gider.

## Kendiniz derlemek

[CONTRIBUTING.md](CONTRIBUTING.md) dosyasına bakın.

## Lisans

Marmara'nın kendi dosyaları ve LibreWolf/Firefox'tan değiştirilen dosyalar
[Mozilla Public License 2.0](LICENSE) kapsamındadır.

**"Marmara" adı ve logosu bu lisansın kapsamında değildir.** Kodu serbestçe
fork'layabilirsiniz, ama değiştirilmiş bir sürüm Marmara adını ya da logosunu
kullanamaz. Ayrıntı: [TRADEMARK.md](TRADEMARK.md).

Marmara, Mozilla ya da LibreWolf projesi tarafından geliştirilmez ve onaylanmamıştır.
"Firefox" ve "LibreWolf" sahiplerinin markalarıdır, yalnızca Marmara'nın nereden
türediğini anlatmak için anılır. Hazır eklentiler kendi geliştiricilerinindir ve
addons.mozilla.org'dan değiştirilmeden indirilir.
