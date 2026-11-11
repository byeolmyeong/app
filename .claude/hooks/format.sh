#!/usr/bin/env bash
# PostToolUse 훅 — Edit/Write 직후 바뀐 파일 하나만, 프로젝트에 *이미 있는* 포매터로 정리한다.
# 포매터가 없으면 아무것도 하지 않는다. 설치하지 않는다. 차단용이 아니므로 항상 exit 0.
# "포매터 돌려" 잔소리를 없애는 게 목적이다. 마크다운은 표 정렬이 바뀌어 diff 가 커지므로 제외한다.
set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
INPUT="$(cat)"

extract_file_path() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null; return
  fi
  if command -v node >/dev/null 2>&1; then
    printf '%s' "$INPUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write((JSON.parse(s).tool_input||{}).file_path||"")}catch(e){}})'; return
  fi
  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$INPUT" | python3 -c 'import sys,json
try: sys.stdout.write(json.load(sys.stdin).get("tool_input",{}).get("file_path","") or "")
except Exception: pass'; return
  fi
}

FILE="$(extract_file_path)"
[ -n "$FILE" ] && [ -f "$FILE" ] || exit 0

PRETTIER="$PROJECT_DIR/node_modules/.bin/prettier"
case "$FILE" in
  *.js|*.mjs|*.cjs|*.ts|*.tsx|*.jsx|*.vue|*.json|*.css|*.scss|*.yml|*.yaml|*.html)
    [ -x "$PRETTIER" ] && "$PRETTIER" --write "$FILE" >/dev/null 2>&1 ;;
  *.py)
    if command -v ruff >/dev/null 2>&1; then ruff format -q "$FILE" >/dev/null 2>&1
    elif command -v black >/dev/null 2>&1; then black -q "$FILE" >/dev/null 2>&1; fi ;;
  *.go)  command -v gofmt   >/dev/null 2>&1 && gofmt -w "$FILE" ;;
  *.rs)  command -v rustfmt >/dev/null 2>&1 && rustfmt -q "$FILE" >/dev/null 2>&1 ;;
  *.kt|*.kts) command -v ktlint >/dev/null 2>&1 && ktlint -F "$FILE" >/dev/null 2>&1 ;;
esac
exit 0
