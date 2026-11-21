"""
웹 글꼴 만들기(성능 계획 docs/plans/2026-11-21-app-perf.md 의 1): Pretendard 공식 배포의 woff2 를 그대로 골라 public/ 에 둔다.

- 핵심 묶음: 공식 정적 부분 글꼴 `woff2-subset/Pretendard-{굵기}.subset.woff2`(영문 · 숫자 · 기호 + 한글 2,780자 —
  KS X 1001 2,350자와 자주 쓰는 글자). 처음에 미리 받고 스플래시가 이것만 기다린다.
- 나머지: 공식 동적 부분 글꼴 `woff2-dynamic-subset/*.woff2` 중 핵심 묶음에 없는 글자가 든 조각만, 그 글자만 unicode-range 로.
  닉네임 · 문의 · 풀이 글에 드문 글자가 나오면 브라우저가 그 조각 하나만 받아 같은 글꼴로 그린다.
- 글꼴 파일은 고치지 않는다(OFL 의 Reserved Font Name "Pretendard" — 고친 글꼴은 그 이름을 쓸 수 없어 저작자가 낸 부분 글꼴만 쓴다).
- 굵기는 앱이 쓰는 셋(400 · 500 · 600, theme.ts FontWeight)만.

사용(개발 도구, 저장소 밖에서): pip install fonttools brotli
  npm pack pretendard@1.3.9 && tar -xzf pretendard-1.3.9.tgz
  python3 scripts/pretendard-web.py package/dist/web/static public/fonts/pretendard/1.3.9
"""

import os
import re
import shutil
import sys

from fontTools.ttLib import TTFont

WEIGHTS = {400: "Regular", 500: "Medium", 600: "SemiBold"}
FAMILY = "Pretendard"  # theme.ts FontFamily 와 같아야 한다


def parse_range(text):
    points = set()
    for part in text.split(","):
        part = part.strip().upper().replace("U+", "")
        if not part:
            continue
        if "-" in part:
            a, z = part.split("-")
            points.update(range(int(a, 16), int(z, 16) + 1))
        else:
            points.add(int(part, 16))
    return points


def to_range(points):
    """정렬한 코드 포인트를 U+a-b 묶음으로"""
    out, run = [], None
    for p in sorted(points):
        if run and p == run[1] + 1:
            run[1] = p
        else:
            if run:
                out.append(run)
            run = [p, p]
    if run:
        out.append(run)
    return ", ".join(f"U+{a:x}" if a == b else f"U+{a:x}-{b:x}" for a, b in out)


def main(src, out):
    os.makedirs(os.path.join(out, "dynamic"), exist_ok=True)
    css = open(os.path.join(src, "pretendard-dynamic-subset.css"), encoding="utf-8").read()
    blocks = re.findall(r"@font-face\s*\{([^}]*)\}", css)
    rules = []
    for weight, name in WEIGHTS.items():
        core_file = f"Pretendard-{name}.subset.woff2"
        shutil.copyfile(os.path.join(src, "woff2-subset", core_file), os.path.join(out, core_file))
        core = set(TTFont(os.path.join(out, core_file)).getBestCmap())
        # 핵심 묶음의 @font-face 는 웹 루트 HTML(src/components/web-fonts.ts → +html.tsx)이 unicode-range 없이 먼저 적는다.
        # 같은 이름 · 굵기의 규칙은 뒤에 적은 것부터 보므로 여기 조각(핵심에 없는 글자만)이 그 글자를 맡고, 나머지는 핵심 묶음이 맡는다
        for block in blocks:
            if f"font-weight: {weight};" not in block:
                continue
            chunk = re.search(r"url\(\./woff2-dynamic-subset/([^)]+\.woff2)\)", block).group(1)
            rest = parse_range(re.search(r"unicode-range:\s*([^;]+);", block).group(1)) - core
            if not rest:
                continue
            shutil.copyfile(os.path.join(src, "woff2-dynamic-subset", chunk), os.path.join(out, "dynamic", chunk))
            rules.append(
                f"@font-face {{\n\tfont-family: '{FAMILY}';\n\tfont-weight: {weight};\n\tfont-display: swap;\n"
                f"\tsrc: url(./dynamic/{chunk}) format('woff2');\n\tunicode-range: {to_range(rest)};\n}}"
            )
    header = (
        "/*\n Pretendard 1.3.9 — Copyright (c) 2021 Kil Hyung-jin, with Reserved Font Name Pretendard.\n"
        " https://github.com/orioncactus/pretendard · SIL Open Font License 1.1(LICENSE.txt)\n"
        " 핵심 묶음(정적 부분 글꼴)에 없는 글자만 맡는 공식 동적 부분 글꼴 조각. 고치지 않고 골라 둔 것(scripts/pretendard-web.py 가 만든다 — 손으로 고치지 않는다).\n*/\n"
    )
    open(os.path.join(out, "dynamic.css"), "w", encoding="utf-8").write(header + "\n".join(rules) + "\n")
    print(f"core 3 files + chunks {len(rules)}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
