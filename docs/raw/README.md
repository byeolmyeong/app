# raw — 원본을 던지는 곳 (고치지 않는다)

> 상태: 활성 · 기준 2026-11-10 · 정리 절차는 second-brain 스킬 3-1절

- **여기 던진다**: 회의록 export, Slack 결정 스레드, 옛 PR 리뷰 코멘트, Notion/Confluence 페이지, 세션에서 배운 것. 전부 마크다운으로(사람도 agent 도 읽고 git·grep 에 들어가는 가장 마찰 적은 공용 포맷).
- **파일명**: `2026-11-10-<출처>-<slug>.md` — 예: `2026-10-13-slack-free-tier-policy.md`, `2026-10-13-session-db-reset.md`
- **원본은 고치지 않는다.** 정리본(ADR · `docs/meetings/` · `docs/<주제>.md` · `docs/synthesis/`)이 이 파일을 `출처: docs/raw/<파일>` 로 가리키면 처리된 것이다. 아무도 가리키지 않으면 미처리(`agent-codebase/scripts/audit.sh` 가 센다).
- **정리는 사람이 아니라 agent 가**: `/second-brain` 에 "raw 정리". 분류 · frontmatter · 경로 링크(양방향) · 같은 주제 병합 · 결정은 ADR 로.
- **민감한 것(PII · 인사 · 보안 사고)은 여기가 아니라 `.local/raw/`**(gitignore). 이 폴더는 커밋된다.
- 처음엔 이번 주 결정 1~2건만. 전부 한 번에 옮기지 않는다.
