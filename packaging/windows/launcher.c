/* Marmara başlatıcı (Windows).
 *
 * LibreWolf'un librewolf.exe'si marmara-bin.exe adıyla yanında durur. Bu küçük
 * program onu "-app browser\application.ini" ile başlatır: profil klasörü,
 * pencere kimliği ve uzaktan kumanda adı Marmara'nın olur, LibreWolf ile
 * çakışmaz. Linux'taki "marmara" betiğinin karşılığıdır.
 *
 * Konsol penceresi açmaz (-mwindows). Verilen bağımsız değişkenler olduğu gibi
 * iletilir.
 */
#define UNICODE
#define _UNICODE
#include <windows.h>
#include <wchar.h>
#include <stdlib.h>

/* Komut satırından program adını (ilk parça) atlar */
static const wchar_t *skip_program(const wchar_t *cmd) {
  if (*cmd == L'"') {
    cmd++;
    while (*cmd && *cmd != L'"') cmd++;
    if (*cmd == L'"') cmd++;
  } else {
    while (*cmd && *cmd != L' ' && *cmd != L'\t') cmd++;
  }
  while (*cmd == L' ' || *cmd == L'\t') cmd++;
  return cmd;
}

int WINAPI wWinMain(HINSTANCE inst, HINSTANCE prev, PWSTR args, int show) {
  wchar_t self[MAX_PATH];
  DWORD n = GetModuleFileNameW(NULL, self, MAX_PATH);
  if (n == 0 || n >= MAX_PATH) return 1;
  wchar_t *slash = wcsrchr(self, L'\\');
  if (!slash) return 1;
  *slash = 0; /* self artık klasör */

  const wchar_t *rest = skip_program(GetCommandLineW());
  size_t len = wcslen(self) * 2 + wcslen(rest) + 128;
  wchar_t *cmd = (wchar_t *)malloc(len * sizeof(wchar_t));
  if (!cmd) return 1;
  _snwprintf(cmd, len - 1, L"\"%ls\\marmara-bin.exe\" -app \"%ls\\browser\\application.ini\" %ls", self, self, rest);

  cmd[len - 1] = 0;

  STARTUPINFOW si = {0};
  si.cb = sizeof(si);
  PROCESS_INFORMATION pi = {0};
  BOOL ok = CreateProcessW(NULL, cmd, NULL, NULL, FALSE, 0, NULL, self, &si, &pi);
  free(cmd);
  if (!ok) {
    MessageBoxW(NULL, L"Marmara başlatılamadı (marmara-bin.exe bulunamadı).", L"Marmara", MB_ICONERROR);
    return 1;
  }
  CloseHandle(pi.hThread);
  CloseHandle(pi.hProcess);
  return 0;
}
