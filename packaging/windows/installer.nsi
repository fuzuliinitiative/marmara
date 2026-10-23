; Marmara kurulum sihirbazı (Windows).
;
; Yönetici izni istemez; kullanıcının kendi klasörüne kurar:
;   %LOCALAPPDATA%\Programs\Marmara
; Başlat menüsü ve masaüstü kısayolları oluşturur, "Uygulamalar" listesine kaldırma
; kaydı ekler. Kaldırınca yalnızca program dosyalarını siler; profil (yer imleri,
; geçmiş vb.) silinmez.
;
; Kısayollar başlatıcıyı (marmara.exe) atlayıp doğrudan marmara-bin.exe'yi
; "-app browser\application.ini" ile açar; görev çubuğunda tek düğme olsun diye.
;
; Derleme (Linux'ta): makensis -DVERSION=1.0.9 -DAPPDIR=/yol/marmara -DICON=/yol/marmara.ico \
;                              -DOUTFILE=/yol/Marmara-Setup.exe installer.nsi

Unicode true
SetCompressor /SOLID lzma
SetCompressorDictSize 64

!ifndef VERSION
  !error "VERSION verilmedi"
!endif

!include "MUI2.nsh"
!include "LogicLib.nsh"

Name "Marmara"
OutFile "${OUTFILE}"
InstallDir "$LOCALAPPDATA\Programs\Marmara"
InstallDirRegKey HKCU "Software\Marmara" "InstallDir"
RequestExecutionLevel user
BrandingText "Marmara ${VERSION}"

!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Marmara"

!define MUI_ICON "${ICON}"
!define MUI_UNICON "${ICON}"
!define MUI_ABORTWARNING

!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\marmara.exe"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; İlk dil varsayılan; sistem dili Türkçeyse NSIS onu seçer
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Turkish"

Section "Marmara" SecMain
  SetOutPath "$INSTDIR"
  ; Eski sürümü temizle (profil başka yerde olduğu için güvenli)
  IfFileExists "$INSTDIR\marmara-bin.exe" 0 +2
    RMDir /r "$INSTDIR"
  SetOutPath "$INSTDIR"
  File /r "${APPDIR}/*"

  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; Kısayollar: doğrudan marmara-bin.exe + -app
  CreateShortcut "$SMPROGRAMS\Marmara.lnk" "$INSTDIR\marmara-bin.exe" '-app "$INSTDIR\browser\application.ini"' "$INSTDIR\marmara-bin.exe" 0
  CreateShortcut "$DESKTOP\Marmara.lnk" "$INSTDIR\marmara-bin.exe" '-app "$INSTDIR\browser\application.ini"' "$INSTDIR\marmara-bin.exe" 0

  WriteRegStr HKCU "Software\Marmara" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayName" "Marmara"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "Publisher" "Fuzuliinitiative"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\marmara-bin.exe"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr HKCU "${UNINSTALL_KEY}" "URLInfoAbout" "https://github.com/fuzuliinitiative/marmara"
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  ; Yanlışlıkla başka bir klasörü silmemek için: Marmara'nın kendi dosyası yoksa durur
  IfFileExists "$INSTDIR\marmara-bin.exe" +2 0
    Abort
  Delete "$SMPROGRAMS\Marmara.lnk"
  Delete "$DESKTOP\Marmara.lnk"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${UNINSTALL_KEY}"
  DeleteRegKey HKCU "Software\Marmara"
SectionEnd
