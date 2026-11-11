# 별명 (byeolmyeong-app)

별이 붙여 준 나의 별명. 출생 차트를 계산해 AI 가 용어 없이 풀어 주는 한국어 서양 점성술 앱(웹·iOS·Android).

- 무엇을 만드는가: [docs/product.md](docs/product.md)
- 지금 할 일: [docs/plans/2026-11-10-mvp.md](docs/plans/2026-11-10-mvp.md)
- 서버: [byeolmyeong-api](https://github.com/byeolmyeong/byeolmyeong-api)

## 실행

Node 22 가 필요하다(`.nvmrc`).

```bash
npm install
npx expo start --web
```

## 검증

```bash
npx tsc --noEmit && npx expo lint
npm test
npx expo export --platform web
```
