#!/bin/bash
input=$(cat)

# --- ANSI color codes ---
GREEN='\033[32m'; YELLOW='\033[33m'; RED='\033[31m'
CYAN='\033[36m'; DIM='\033[2m'; RESET='\033[0m'

# --- Color for percentage ---
color_for_pct() {
  local pct=$1
  if [ "$pct" -ge 90 ] 2>/dev/null; then
    echo "$RED"
  elif [ "$pct" -ge 70 ] 2>/dev/null; then
    echo "$YELLOW"
  else
    echo "$GREEN"
  fi
}

# --- Cache isolation by session_id ---
SESSION_ID=$(echo "$input" | jq -r '.session_id // "default"')
USAGE_CACHE="/tmp/claude_usage_cache_${SESSION_ID}.json"
CACHE_MAX_AGE=60
umask 077

# --- Parse input with null handling ---
MODEL=$(echo "$input" | jq -r '.model.display_name // empty')
[ -z "$MODEL" ] && MODEL="?"
COST=$(echo "$input" | jq -r '.cost.total_cost_usd // empty')
[ -z "$COST" ] && COST=0
USED_PCT=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
USED_PCT=${USED_PCT%%.*}  # strip decimals
[ -z "$USED_PCT" ] && USED_PCT=0
# Force integer
USED_PCT=$((USED_PCT + 0)) 2>/dev/null || USED_PCT=0

# --- Workspace directory ---
DIR=$(echo "$input" | jq -r '.workspace.current_dir // empty')
FOLDER=""
[ -n "$DIR" ] && FOLDER=" 📁 ${DIR##*/}"

# --- Progress bar helper (with color) ---
progress_bar() {
  local pct=$1 width=${2:-20} color=${3:-}
  # Force integer
  pct=$((pct + 0)) 2>/dev/null || pct=0
  local filled=$(echo "scale=0; $pct * $width / 100" | bc 2>/dev/null || echo 0)
  [ "$filled" -gt "$width" ] 2>/dev/null && filled=$width
  [ "$filled" -lt 0 ] 2>/dev/null && filled=0
  local empty=$((width - filled))
  local bar=""
  bar+=$(printf '%0.s▓' $(seq 1 $filled 2>/dev/null) 2>/dev/null)
  bar+=$(printf '%0.s░' $(seq 1 $empty 2>/dev/null) 2>/dev/null)
  if [ -n "$color" ]; then
    echo -e "${color}${bar}${RESET}"
  else
    echo "$bar"
  fi
}

# --- Time remaining helper (ISO-8601 UTC → "Xh Ym" or "Xd Yh") ---
time_remaining() {
  local reset_iso="$1"
  [ -z "$reset_iso" ] || [ "$reset_iso" = "null" ] && echo "?" && return
  local reset_epoch now_epoch diff_s
  # API returns UTC (+00:00) — parse in UTC so timezone offset doesn't get lost
  reset_epoch=$(TZ=UTC date -jf "%Y-%m-%dT%H:%M:%S" "${reset_iso%%.*}" "+%s" 2>/dev/null) || \
  { echo "?"; return; }
  now_epoch=$(date "+%s")
  diff_s=$((reset_epoch - now_epoch))
  [ "$diff_s" -le 0 ] && echo "0m" && return
  local days=$((diff_s / 86400))
  local hours=$(( (diff_s % 86400) / 3600 ))
  local mins=$(( (diff_s % 3600) / 60 ))
  if [ "$days" -gt 0 ]; then
    echo "${days}d${hours}h"
  elif [ "$hours" -gt 0 ]; then
    echo "${hours}h${mins}m"
  else
    echo "${mins}m"
  fi
}

# --- Fetch usage data (with caching) ---
fetch_usage() {
  local need_fetch=1
  if [ -f "$USAGE_CACHE" ]; then
    local cache_age
    cache_age=$(( $(date "+%s") - $(stat -f "%m" "$USAGE_CACHE" 2>/dev/null || echo 0) ))
    [ "$cache_age" -lt "$CACHE_MAX_AGE" ] && need_fetch=0
  fi

  if [ "$need_fetch" -eq 1 ]; then
    local creds_json token
    creds_json=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null) || return 1
    token=$(echo "$creds_json" | jq -r '.claudeAiOauth.accessToken // .accessToken // empty' 2>/dev/null)
    [ -z "$token" ] && return 1

    local resp
    resp=$(curl -s --max-time 5 \
      -H "Authorization: Bearer $token" \
      -H "anthropic-beta: oauth-2025-04-20" \
      -H "Content-Type: application/json" \
      "https://api.anthropic.com/api/oauth/usage" 2>/dev/null)
    [ -z "$resp" ] && return 1
    echo "$resp" | jq -e '.five_hour' >/dev/null 2>&1 || return 1
    echo "$resp" > "$USAGE_CACHE"
  fi
  return 0
}

# --- Session cost ---
SESSION_COST=$(printf "%.4f" "$COST")

# --- Line 1: [Model] 📁 folder | $0.36 ---
LINE1="${CYAN}[${MODEL}]${RESET}${FOLDER} | ${YELLOW}\$${SESSION_COST}${RESET}"

# --- Context bar (colored) ---
CTX_COLOR=$(color_for_pct "$USED_PCT")
CTX_BAR=$(progress_bar "$USED_PCT" 20 "$CTX_COLOR")

# --- Line 2: ctx bar + usage bars ---
LINE2_PARTS="${CTX_BAR} ctx ${USED_PCT}%"

if fetch_usage && [ -f "$USAGE_CACHE" ]; then
  SESS_UTIL=$(jq -r '.five_hour.utilization // 0' "$USAGE_CACHE")
  SESS_RESET=$(jq -r '.five_hour.resets_at // empty' "$USAGE_CACHE")
  WEEK_UTIL=$(jq -r '.seven_day.utilization // 0' "$USAGE_CACHE")
  WEEK_RESET=$(jq -r '.seven_day.resets_at // empty' "$USAGE_CACHE")

  # Force integers
  SESS_UTIL=${SESS_UTIL%%.*}
  [ -z "$SESS_UTIL" ] && SESS_UTIL=0
  WEEK_UTIL=${WEEK_UTIL%%.*}
  [ -z "$WEEK_UTIL" ] && WEEK_UTIL=0

  SESS_COLOR=$(color_for_pct "$SESS_UTIL")
  WEEK_COLOR=$(color_for_pct "$WEEK_UTIL")

  SESS_BAR=$(progress_bar "$SESS_UTIL" 10 "$SESS_COLOR")
  WEEK_BAR=$(progress_bar "$WEEK_UTIL" 20 "$WEEK_COLOR")
  SESS_TIME=$(time_remaining "$SESS_RESET")
  WEEK_TIME=$(time_remaining "$WEEK_RESET")

  LINE2_PARTS="${LINE2_PARTS} | sess: ${SESS_BAR} ${SESS_UTIL}% ${DIM}${SESS_TIME}${RESET} | week: ${WEEK_BAR} ${WEEK_UTIL}% ${DIM}${WEEK_TIME}${RESET}"
fi

# --- Output ---
echo -e "${LINE1}\n${LINE2_PARTS}"
