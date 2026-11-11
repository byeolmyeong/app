#!/usr/bin/env bash
# PreToolUse 훅 — Bash 명령을 실행 *전에* 검사해 되돌릴 수 없는 명령을 차단한다.
# exit 2 = 차단(stderr가 agent에게 전달됨) · exit 0 = 통과. 판단하지 않고 패턴만 본다.
# 차단 목록을 바꾸면 docs/golden-rules.md의 같은 규칙도 함께 고친다. 말(규칙)과 시스템(훅)은 쌍이다.
#
# 차단하는 것
#   1. rm -rf 가 프로젝트 디렉터리 밖·루트·홈·현재 디렉터리·와일드카드를 향할 때
#   2. git push --force / -f / +refspec  (--force-with-lease 는 허용)
#   3. 보호 브랜치(main master develop)로의 push — 명시 refspec 또는 현재 브랜치 기준
#   4. 미커밋 작업을 날리는 git reset --hard · git clean -f · git checkout . · git restore .
# 보호 브랜치 목록은 GUARD_PROTECTED_BRANCHES 로 덮어쓴다(공백 구분).
set -u

PROTECTED_BRANCHES="${GUARD_PROTECTED_BRANCHES:-main master develop}"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
INPUT="$(cat)"

# JSON 파서는 있는 것 하나를 쓴다. 셋 다 없으면 검사 없이 통과시키되 stderr에 남긴다.
extract_command() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null; return
  fi
  if command -v node >/dev/null 2>&1; then
    printf '%s' "$INPUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write((JSON.parse(s).tool_input||{}).command||"")}catch(e){}})'; return
  fi
  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$INPUT" | python3 -c 'import sys,json
try: sys.stdout.write(json.load(sys.stdin).get("tool_input",{}).get("command","") or "")
except Exception: pass'; return
  fi
  echo "guard.sh: jq·node·python3 중 하나가 없어 명령을 검사하지 못했다" >&2
}

CMD="$(extract_command)"
[ -z "$CMD" ] && exit 0

block() {
  printf 'BLOCKED (.claude/hooks/guard.sh): %s\n명령: %s\n필요하면 사용자가 터미널에서 직접 실행한다.\n' "$1" "$CMD" >&2
  exit 2
}

# ---- 1. rm -rf 대상 검사 ----
# 프로젝트 안의 하위 경로(node_modules, dist …)만 허용한다. 그 외 전부 차단.
rm_target_is_unsafe() {
  local tok="$1" resolved
  case "$tok" in
    --no-preserve-root) return 0 ;;
    .|..|./|../|'*'|./\*|/|/\*) return 0 ;;
    '~'|'~/'|'~/'*|'$HOME'|'$HOME/'*|'"$HOME"'*|'${HOME}'*) return 0 ;;
    ../*) return 0 ;;
    /*) resolved="$tok" ;;
    *) return 1 ;;   # 상대 경로(프로젝트 안)
  esac
  case "$resolved" in
    "$PROJECT_DIR") return 0 ;;          # 프로젝트 루트 자체
    "$PROJECT_DIR"/*) return 1 ;;        # 프로젝트 안 절대 경로
    *) return 0 ;;                       # 프로젝트 밖 절대 경로
  esac
}

check_rm() {
  local tokens tok segment=() in_rm=0
  read -ra tokens <<<"$CMD"
  for tok in "${tokens[@]}" ';'; do
    case "$tok" in
      ';'|'&&'|'||'|'|')
        [ $in_rm -eq 1 ] && evaluate_rm_segment "${segment[@]}"
        segment=(); in_rm=0; continue ;;
      rm) in_rm=1; segment=(); continue ;;
    esac
    [ $in_rm -eq 1 ] && segment+=("$tok")
  done
}

evaluate_rm_segment() {
  local tok recursive=0 force=0 targets=()
  for tok in "$@"; do
    case "$tok" in
      --recursive) recursive=1 ;;
      --force) force=1 ;;
      --no-preserve-root) targets+=("$tok") ;;
      --*) ;;
      -*) case "$tok" in *r*|*R*) recursive=1 ;; esac
          case "$tok" in *f*) force=1 ;; esac ;;
      *) targets+=("$tok") ;;
    esac
  done
  [ $recursive -eq 1 ] && [ $force -eq 1 ] || return 0
  for tok in "${targets[@]+"${targets[@]}"}"; do
    tok="${tok%\"}"; tok="${tok#\"}"; tok="${tok%\'}"; tok="${tok#\'}"
    rm_target_is_unsafe "$tok" && block "rm -rf 대상이 프로젝트 밖·루트·홈·현재 디렉터리·와일드카드다: $tok"
  done
}

# ---- 2·3. git push ----
check_push() {
  printf '%s' "$CMD" | grep -qE '(^|[;&|[:space:]])git[[:space:]]+([^;&|]*[[:space:]])?push([[:space:]]|$)' || return 0
  if printf '%s' "$CMD" | grep -qE 'push[^;&|]*[[:space:]](--force|-f|-[a-zA-Z]*f[a-zA-Z]*)([[:space:]]|$)'; then
    block "git push --force 는 금지. 꼭 필요하면 --force-with-lease 를 쓴다"
  fi
  if printf '%s' "$CMD" | grep -qE 'push[^;&|]*[[:space:]]\+[^[:space:]]+'; then
    block "git push +refspec 은 강제 push 다"
  fi
  local b
  for b in $PROTECTED_BRANCHES; do
    if printf '%s' "$CMD" | grep -qE "push[^;&|]*[[:space:]](([^[:space:]:]+:)?(refs/heads/)?${b})([[:space:]]|$)"; then
      block "보호 브랜치 ${b} 로 직접 push 한다. 작업 브랜치에서 PR 로 간다"
    fi
  done
  # remote + 브랜치가 명시돼 있으면 위에서 이미 검사했다. 없을 때(또는 HEAD)만 현재 브랜치를 본다.
  push_has_explicit_refspec && return 0
  local current
  current="$(git -C "$PROJECT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  for b in $PROTECTED_BRANCHES; do
    [ "$current" = "$b" ] && block "현재 브랜치가 보호 브랜치 ${b} 다. 작업 브랜치를 만들어 push 한다"
  done
}

push_has_explicit_refspec() {
  local tokens tok seen_push=0 nonflags=0 refspec=""
  read -ra tokens <<<"$CMD"
  for tok in "${tokens[@]}"; do
    case "$tok" in ';'|'&&'|'||'|'|') [ $seen_push -eq 1 ] && break; continue ;; esac
    if [ $seen_push -eq 0 ]; then [ "$tok" = push ] && seen_push=1; continue; fi
    case "$tok" in -*) continue ;; esac
    nonflags=$((nonflags + 1))
    [ $nonflags -eq 2 ] && refspec="$tok"
  done
  [ $nonflags -ge 2 ] || return 1
  case "$refspec" in HEAD|HEAD:*) return 1 ;; esac
  return 0
}

# ---- 4. 미커밋 작업 파괴 ----
check_git_destructive() {
  if printf '%s' "$CMD" | grep -qE 'git[[:space:]]+([^;&|]*[[:space:]])?reset[^;&|]*[[:space:]]--hard([[:space:]]|$)'; then
    block "git reset --hard 는 미커밋 작업을 되돌릴 수 없게 지운다"
  fi
  if printf '%s' "$CMD" | grep -qE 'git[[:space:]]+([^;&|]*[[:space:]])?clean[^;&|]*[[:space:]]-[a-zA-Z]*f'; then
    block "git clean -f 는 추적되지 않는 파일을 되돌릴 수 없게 지운다"
  fi
  if printf '%s' "$CMD" | grep -qE 'git[[:space:]]+([^;&|]*[[:space:]])?(checkout|restore)[[:space:]]+(--[[:space:]]+)?\.([[:space:]]|$)'; then
    block "git checkout . / git restore . 는 작업 트리 전체 변경을 버린다"
  fi
}

check_rm
check_push
check_git_destructive
exit 0
