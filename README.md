# Marmara

GNOME için gizlilik odaklı bir web tarayıcısı. LibreWolf'un (ve dolayısıyla
Firefox'un) üzerine kurulur, ama derleme gerektirmez. LibreWolf'un hazır
dosyaları alınır, değiştirilir ve yeniden paketlenir.

- **Adwaita görünümü:** GNOME Web düzeni (adres çubuğu başlık çubuğunda, sekmeler
  altında), libadwaita renkleri ve köşeleri, açık/koyu mod, GNOME vurgu rengi.
- **Hazır eklentiler:** uBlock Origin, Privacy Badger, ClearURLs ve ToS;DR ilk
  açılışta kendiliğinden kurulur. Gizli pencerelerde de çalışır.
- **LibreWolf'un gizlilik ayarları:** Telemetri yok, sıkı izleme koruması,
  yalnızca HTTPS.
- **Ayrı kimlik:** Kendi adı, logosu, profil klasörü (`~/.marmara`) ve pencere
  sınıfı var. LibreWolf'la yan yana çalışabilir.

## Hızlı başlangıç

```sh
sudo pacman -S --needed librewolf python unzip zip
./build.sh                      # /usr/lib/librewolf'tan Marmara üretir → dist/marmara/
./dist/marmara/marmara          # dene
./scripts/install-local.sh      # uygulama menüsüne ekle (root gerekmez)
```

LibreWolf'un resmi Linux arşivinden de üretebilirsiniz:

```sh
./build.sh librewolf-158.0.1-1-linux-x86_64-package.tar.xz --tarball
```

## Klasörler

| Yol | İçerik |
|---|---|
| `build.sh` | Tek komutluk repack betiği |
| `theme/global/tokens.css` | Genel Adwaita paleti (menüler, paneller, about: sayfaları) |
| `theme/browser/*.css` | Tarayıcı penceresi: renkler, ölçüler, başlık çubuğu, sekmeler, içerik |
| `branding/` | Logo (`marmara.svg`), simgeler, marka metinleri |
| `config/policies.json` | Kurumsal politikalar (LibreWolf'unkilere dayanır) |
| `config/extensions.json` | Önceden kurulu eklentiler |
| `config/marmara-prefs.js` | LibreWolf ayarlarının üstüne eklenen Marmara ayarları |
| `scripts/patch_omni.py` | `omni.ja` içindeki yamalar |
| `scripts/check_theme.py` | Temanın yeni sürümle uyumunu kontrol eder |
| `packaging/linux/` | Başlatıcı ve `.desktop` dosyası |

## Tema nasıl çalışıyor, neden kolay bozulmuyor

Firefox kendi renk ve ölçü değerlerini "token" denen CSS değişkenlerinde
tutuyor ve bunları `@layer` katmanlarına koyuyor. Marmara'nın kuralları katmansız
olduğu için her zaman onları geçiyor. Temanın büyük kısmı seçicilere değil
bu token adlarına dayanıyor. Firefox arayüzü yeniden düzenlese bile adlar
genelde aynı kalıyor.

Seçici kullanan az sayıdaki kural (`headerbar.css`, `tabs.css`, `content.css`)
ayrı dosyalarda. Biri bozulursa yalnızca o parça etkilenir.

Her derlemede `check_theme.py`, temanın kullandığı her token'ın, kimliğin ve
sınıfın yeni sürümde hâlâ var olup olmadığını kontrol eder:

```
==> Tema bu sürüme karşı kontrol ediliyor
  token'lar:   111/111 kullanımda
  kimlikler:   10/10 bulundu
  ...
```

Bir şey bulunamazsa hangi dosyada geçtiği yazılır.

Bir modülü devre dışı bırakmak için `theme/browser/marmara.css` içindeki ilgili
`@import` satırını silip yeniden derlemek yeterli.

## Yeni LibreWolf sürümüne geçmek

```sh
sudo pacman -Syu librewolf
./build.sh
```

Çıktıda "HATA" ya da tema kontrolünde ✗ yoksa sürüm sorunsuzdur.
`LIBREWOLF_VERSION` dosyasını yeni sürüm numarasıyla güncelleyin.

### Otomatik (GitHub Actions)

Kod GitLab'da durur; derleme ve release için aynı depo GitHub'a da gönderilir
(`git push` ikisine birden gider). `.github/workflows/librewolf-update.yml`
LibreWolf'un yeni sürümünü her 6 saatte bir kontrol eder. Yeni sürüm varsa Marmara'yı
onunla derler ve bir sonraki sürüm numarasıyla (1.0 → 1.0.1) GitHub release'i açar;
Linux arşivi release'e eklenir. Yamalar yeni Firefox yapısıyla uyuşmazsa bir issue açar.
Depoya geri yazmaz.

Tarayıcıdaki Ayarlar > Genel > Güncellemeler en son GitHub release'ine bakar.
`modules/MarmaraSettings.sys.mjs` içindeki `GITHUB_PROJECT` değerine GitHub
yolunu (`kullanici/marmara`) yazın; grup böylece açılır.

Sürüm numarasını elle değiştirmek için `scripts/bump-version.sh 1.1`
(VERSION, Hakkında kutusu, distribution.ini ve .desktop dosyasını birlikte günceller).

## Flatpak

`flatpak/` klasörü Marmara'nın Flatpak paketini içerir (uygulama kimliği
`io.github.fuzuliinitiative.Marmara`). Paket, GitHub release'indeki hazır Linux
arşivini kullanır; derleme yapmaz.

Yerelde denemek için:

```sh
sha256sum marmara-1.0-linux-x86_64.tar.xz   # release'ten indirilen arşiv; çıktıyı manifestteki sha256'ya yazın
flatpak install flathub org.freedesktop.Platform//25.08 org.freedesktop.Sdk//25.08 org.mozilla.firefox.BaseApp//25.08
cd flatpak
flatpak-builder --user --install --force-clean build-dir io.github.fuzuliinitiative.Marmara.yml
flatpak run io.github.fuzuliinitiative.Marmara
```

Flathub'a yüklemek için: gerçek ekran görüntüleri çekip `flatpak/screenshot-*.png`
olarak ekleyin, metainfo'daki yorum satırını açın ve
[Flathub başvuru kılavuzunu](https://docs.flathub.org/docs/for-app-authors/submission)
izleyin. Kabul edilince yeni release'ler `x-checker-data` sayesinde otomatik güncelleme
isteği (PR) olarak gelir.

### Kendi Flatpak depomuz

Flathub yerine Marmara kendi Flatpak deposunu GitHub Pages'te yayımlar
(`.github/workflows/flatpak-repo.yml`). Her yeni release'te Flatpak yeniden paketlenir,
GPG ile imzalanır ve `https://fuzuliinitiative.github.io/marmara/` adresine konur.

Kullanıcı kurulumu:

```sh
flatpak install --user https://fuzuliinitiative.github.io/marmara/marmara.flatpakref
```

Sonraki güncellemeler yazılım merkezinden (GNOME Software, Bazaar) gelir.

Kurulum (bir kez):

1. İmza anahtarı üretin (parolasız):
   ```sh
   gpg --batch --passphrase '' --quick-generate-key "Marmara Flatpak" rsa4096 sign never
   gpg --armor --export-secret-keys "Marmara Flatpak"
   ```
2. GitHub deposunda **Settings → Secrets and variables → Actions → New repository secret**:
   adı `FLATPAK_GPG_PRIVATE_KEY`, değer yukarıdaki çıktının tamamı
   (`-----BEGIN PGP PRIVATE KEY BLOCK-----` satırından sona kadar).
3. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. **Actions → Flatpak deposu → Run workflow**.

Gizli anahtarı kimseyle paylaşmayın ve depoya eklemeyin.

## Lisans ve marka

Marmara'nın kendi dosyaları ve LibreWolf/Firefox'tan değiştirilen dosyalar
[Mozilla Public License 2.0](LICENSE) kapsamındadır. Bu repoyu açık tutmak MPL'in
kaynak paylaşma şartını karşılar.

**Marmara adı ve logosu MPL kapsamında değildir.** Kodu serbestçe fork'layabilirsiniz,
ama değiştirilmiş bir sürümü Marmara adıyla ya da Marmara logosuyla yayımlayamazsınız.
Ayrıntı: [TRADEMARK.md](TRADEMARK.md).

"Firefox" ve "LibreWolf" adları ile logoları Marmara'da marka olarak
kullanılmaz. Yalnızca nereden türediğini anlatırken anılır. Önceden kurulu
eklentiler kendi geliştiricilerinindir ve addons.mozilla.org'dan değiştirilmeden
indirilir.
