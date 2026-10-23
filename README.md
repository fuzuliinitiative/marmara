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

### Otomatik (GitLab CI)

`.gitlab-ci.yml` LibreWolf'un yeni sürümünü zamanlanmış olarak kontrol eder. Yeni
sürüm varsa Marmara'yı onunla derler; başarılıysa Marmara'nın son basamağını
artırır (`VERSION`), Linux arşivini paket deposuna yükler ve `vX.Y.Z` etiketli bir
release açar. Yamalar yeni Firefox yapısıyla uyuşmazsa bir issue açar.

Kurulum (bir kez):

1. **Settings → Access tokens:** rol *Maintainer*, kapsamlar `api` ve
   `write_repository` olan bir proje belirteci oluşturun.
2. **Settings → CI/CD → Variables:** `GITLAB_TOKEN` adıyla ekleyin
   (*Masked* ve *Protected* işaretli).
3. **Build → Pipeline schedules → New schedule:** aralık `17 */6 * * *`,
   dal `main`.
4. `modules/MarmaraSettings.sys.mjs` içindeki `GITLAB_PROJECT` değerine
   proje yolunu (`kullanici/marmara`) yazın; Ayarlar'daki "Güncellemeler"
   grubu böylece açılır.

Sürüm numarasını elle değiştirmek için `scripts/bump-version.sh 1.1`
(VERSION, Hakkında kutusu, distribution.ini ve .desktop dosyasını birlikte günceller).

## Lisans ve marka

Marmara'nın kendi dosyaları ve LibreWolf/Firefox'tan değiştirilen dosyalar
[Mozilla Public License 2.0](LICENSE) kapsamındadır. Bu repoyu açık tutmak MPL'in
kaynak paylaşma şartını karşılar.

"Firefox" ve "LibreWolf" adları ile logoları Marmara'da marka olarak
kullanılmaz. Yalnızca nereden türediğini anlatırken anılır. Önceden kurulu
eklentiler kendi geliştiricilerinindir ve addons.mozilla.org'dan değiştirilmeden
indirilir.
