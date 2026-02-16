# PLAN: statusline.sh → statusline.js Geçişi

Bash script'i Node.js'e taşıyarak cross-platform (macOS, Linux, Windows) destek sağlama planı.

---

## Neden?

`statusline.sh` macOS'a bağımlı: BSD `date -jf`, BSD `stat -f`, `security` (Keychain), `jq`, `curl`, `bc`.
Node.js ile bunların hepsi native karşılıklarıyla değişir, tek platform farkı credential erişimi kalır.

## Kalkacak Bağımlılıklar

| Harici Araç | Node.js Karşılığı |
|-------------|-------------------|
| `jq` | `JSON.parse()` |
| `curl` | `fetch()` (Node 18+) |
| `bc` | Native matematik |
| BSD `date -jf` | `new Date()` |
| BSD `stat -f "%m"` | `fs.statSync().mtimeMs` |
| `/tmp/` hardcoded | `os.tmpdir()` |

Tek kalan platform farkı: **OAuth token erişimi** (Keychain / secret-tool / PowerShell).

---

## Adım 1: `scripts/statusline.js` Oluştur

Yeni dosya: `scripts/statusline.js` — bash script'in 1:1 Node.js karşılığı.

### 1a. Stdin Okuma

```javascript
// Claude Code stdin'den JSON gönderir
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const input = JSON.parse(Buffer.concat(chunks).toString());
```

### 1b. Input Parse (jq yerine)

```javascript
const model = input.model?.display_name ?? "?";
const cost = input.cost?.total_cost_usd ?? 0;
const usedPct = Math.floor(input.context_window?.used_percentage ?? 0);
const dir = input.workspace?.current_dir ?? "";
const sessionId = input.session_id ?? "default";
const folder = dir ? dir.split("/").pop() || dir.split("\\").pop() : "";
```

### 1c. ANSI Renk Yardımcıları

```javascript
const COLORS = { green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m", cyan: "\x1b[36m", dim: "\x1b[2m", reset: "\x1b[0m" };

function colorForPct(pct) {
  if (pct >= 90) return COLORS.red;
  if (pct >= 70) return COLORS.yellow;
  return COLORS.green;
}
```

### 1d. Progress Bar (seq + bc yerine)

```javascript
function progressBar(pct, width = 20, color = "") {
  pct = Math.max(0, Math.min(100, Math.floor(pct)));
  const filled = Math.round(pct * width / 100);
  const empty = width - filled;
  const bar = "▓".repeat(filled) + "░".repeat(empty);
  return color ? `${color}${bar}${COLORS.reset}` : bar;
}
```

### 1e. Time Remaining (BSD date yerine)

```javascript
function timeRemaining(resetIso) {
  if (!resetIso || resetIso === "null") return "?";
  const diff = Math.floor((new Date(resetIso).getTime() - Date.now()) / 1000);
  if (diff <= 0) return "0m";
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  if (days > 0) return `${days}d${hours}h`;
  if (hours > 0) return `${hours}h${mins}m`;
  return `${mins}m`;
}
```

### 1f. OAuth Token Erişimi (platform-adaptive)

```javascript
import { execSync } from "child_process";

function getOAuthToken() {
  try {
    let credsJson;
    switch (process.platform) {
      case "darwin":
        credsJson = execSync('security find-generic-password -s "Claude Code-credentials" -w', { stdio: ["pipe", "pipe", "pipe"] }).toString();
        break;
      case "linux":
        credsJson = execSync('secret-tool lookup service "Claude Code-credentials"', { stdio: ["pipe", "pipe", "pipe"] }).toString();
        break;
      case "win32":
        // Windows: credential dosyadan oku (Claude Code'un kendi credential path'i)
        // Alternatif: PowerShell ile Windows Credential Manager
        credsJson = execSync('powershell -Command "(Get-StoredCredential -Target \'Claude Code-credentials\').Password"', { stdio: ["pipe", "pipe", "pipe"] }).toString();
        break;
      default:
        return null;
    }
    const creds = JSON.parse(credsJson);
    return creds.claudeAiOauth?.accessToken ?? creds.accessToken ?? null;
  } catch {
    return null;
  }
}
```

> **Not:** Linux ve Windows credential erişim yöntemleri Claude Code'un bu platformlardaki davranışına göre doğrulanmalı. Başlangıçta macOS kesin çalışır, diğerleri için fallback eklenebilir.

### 1g. Usage Fetch + Cache (curl yerine fetch)

```javascript
import { readFileSync, writeFileSync, statSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const CACHE_MAX_AGE = 60; // saniye

async function fetchUsage(sessionId) {
  const cachePath = join(tmpdir(), `claude_usage_cache_${sessionId}.json`);

  // Cache kontrolü
  if (existsSync(cachePath)) {
    const age = (Date.now() - statSync(cachePath).mtimeMs) / 1000;
    if (age < CACHE_MAX_AGE) {
      return JSON.parse(readFileSync(cachePath, "utf-8"));
    }
  }

  const token = getOAuthToken();
  if (!token) return null;

  try {
    const resp = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });
    const data = await resp.json();
    if (!data.five_hour) return null;
    writeFileSync(cachePath, JSON.stringify(data), { mode: 0o600 });
    return data;
  } catch {
    return null;
  }
}
```

### 1h. Ana Çıktı (echo -e yerine process.stdout)

```javascript
// Line 1
const sessionCost = cost.toFixed(4);
const folderStr = folder ? ` 📁 ${folder}` : "";
const line1 = `${COLORS.cyan}[${model}]${COLORS.reset}${folderStr} | ${COLORS.yellow}$${sessionCost}${COLORS.reset}`;

// Line 2
const ctxColor = colorForPct(usedPct);
const ctxBar = progressBar(usedPct, 20, ctxColor);
let line2 = `${ctxBar} ctx ${usedPct}%`;

const usage = await fetchUsage(sessionId);
if (usage) {
  const sessUtil = Math.floor(usage.five_hour?.utilization ?? 0);
  const weekUtil = Math.floor(usage.seven_day?.utilization ?? 0);
  const sessBar = progressBar(sessUtil, 10, colorForPct(sessUtil));
  const weekBar = progressBar(weekUtil, 20, colorForPct(weekUtil));
  const sessTime = timeRemaining(usage.five_hour?.resets_at);
  const weekTime = timeRemaining(usage.seven_day?.resets_at);
  line2 += ` | sess: ${sessBar} ${sessUtil}% ${COLORS.dim}${sessTime}${COLORS.reset}`;
  line2 += ` | week: ${weekBar} ${weekUtil}% ${COLORS.dim}${weekTime}${COLORS.reset}`;
}

process.stdout.write(`${line1}\n${line2}\n`);
```

---

## Adım 2: Installer Güncellemeleri

### 2a. `src/paths.js` — Yeni dosya adları

```javascript
// Değişenler:
export const SCRIPT_DEST = join(CLAUDE_DIR, "statusline.js");       // .sh → .js
export const SCRIPT_SOURCE = join(__dirname, "..", "scripts", "statusline.js");
export const STATUSLINE_COMMAND = "node ~/.claude/statusline.js";   // node ile çalıştır
```

> **Windows notu:** `~/.claude/` yerine platform-aware path gerekebilir. Claude Code'un Windows'ta `~` expand edip etmediği doğrulanmalı. Gerekirse:
> ```javascript
> const cmd = process.platform === "win32"
>   ? `node "${join(homedir(), ".claude", "statusline.js")}"`
>   : "node ~/.claude/statusline.js";
> ```

### 2b. `src/check-deps.js` — Sadeleştir

```javascript
// jq, curl, bc, security artık gerekli değil
// Sadece Node.js version kontrolü yeterli
export function checkDeps() {
  const [major] = process.versions.node.split(".").map(Number);
  if (major < 18) {
    return ["node>=18 (fetch API gerekli)"];
  }
  return [];
}
```

### 2c. `src/install.js` — Platform kilidini kaldır

- `process.platform !== "darwin"` kontrolünü sil
- `chmodSync` çağrısını platform-conditional yap (Windows'ta chmod gereksiz)

```javascript
// Platform guard kaldırıldı — artık cross-platform

// chmod sadece Unix'te
if (process.platform !== "win32") {
  chmodSync(SCRIPT_DEST, 0o755);
}
```

### 2d. `src/uninstall.js` — Dosya adı değişikliği

Değişiklik yok, `SCRIPT_DEST` zaten `paths.js`'den geliyor. Otomatik olarak `.js` dosyasını silecek.

### 2e. `src/settings.js` — Değişiklik yok

`hasStatusLine()` zaten `includes('statusline')` ile soft match yapıyor, `.sh` veya `.js` fark etmez. Ama güvenlik için kontrolü güncellemek iyi olur:

```javascript
export function hasStatusLine() {
  const settings = readSettings();
  const cmd = settings?.statusLine?.command;
  return typeof cmd === "string" && cmd.includes("statusline.");
}
```

---

## Adım 3: Dosya Temizliği

| İşlem | Dosya |
|-------|-------|
| Sil | `scripts/statusline.sh` |
| Oluştur | `scripts/statusline.js` |
| Güncelle | `src/paths.js` |
| Güncelle | `src/check-deps.js` |
| Güncelle | `src/install.js` |
| Güncelle | `src/settings.js` (soft match) |
| Güncelle | `package.json` — files array'de `.sh` → `.js` (zaten `scripts/` klasörü dahil) |

---

## Adım 4: README & CLAUDE.md Güncelle

- "macOS only" → "macOS, Linux, Windows" olarak güncelle
- Requirements tablosundan `jq` satırını kaldır
- `brew install jq` referanslarını sil
- Troubleshooting'den `jq: command not found` satırını sil
- Linux/Windows credential erişim notları ekle
- Komut örneklerindeki `.sh` referanslarını `.js` olarak güncelle
- CLAUDE.md'deki mimari açıklamayı güncelle

---

## Adım 5: Geriye Uyumluluk

Mevcut kullanıcılar `~/.claude/statusline.sh` kullanıyor. Install güncellendiğinde:

1. Yeni `statusline.js` kopyalanır
2. `settings.json`'daki command `node ~/.claude/statusline.js` olarak güncellenir
3. Eski `statusline.sh` silinmez (kullanıcı manuel silebilir veya uninstall + install yapabilir)

> **Alternatif:** Install sırasında eski `.sh` dosyasını tespit edip otomatik silmek (cleanup). Bu daha temiz olur.

---

## Adım 6: Test

Manuel test (otomatik test altyapısı yok):

```bash
# Mock input ile statusline.js test
echo '{"model":{"display_name":"Opus 4"},"cost":{"total_cost_usd":0.5},"context_window":{"used_percentage":42},"workspace":{"current_dir":"/tmp/test"},"session_id":"dev"}' | node scripts/statusline.js

# Install test
node bin/cli.js install

# Status test
node bin/cli.js status

# Uninstall test
node bin/cli.js uninstall
```

---

## Özet: Değişiklik Matrisi

| Dosya | Durum | Açıklama |
|-------|-------|----------|
| `scripts/statusline.js` | **YENİ** | Bash → Node.js, tüm mantık |
| `scripts/statusline.sh` | **SİL** | Artık gereksiz |
| `src/paths.js` | Güncelle | `.sh` → `.js`, command prefix `node` |
| `src/check-deps.js` | Güncelle | jq/curl/bc/security → sadece Node 18+ |
| `src/install.js` | Güncelle | Platform kilidi kaldır, chmod conditional |
| `src/settings.js` | Güncelle | Soft match `.statusline.` |
| `README.md` | Güncelle | Cross-platform docs |
| `CLAUDE.md` | Güncelle | Mimari açıklama |

**Tahmini dosya sayısı:** 1 yeni, 1 silme, 6 güncelleme
