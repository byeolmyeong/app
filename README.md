# 앱 저장소 (byeolmyeong-app)

점성술 몰라도 읽히는 한국어 서양 점성술 앱(웹·iOS·Android). 출생 차트를 서버가 계산하고 AI 가 용어 없이 풀어 준다. 앱 이름은 바꿀 예정이다(가칭 "별명").

- 무엇을 만드는가: [docs/product.md](docs/product.md)
- 1.0.0 기능 명세: [docs/release-1.0.0.md](docs/release-1.0.0.md) · 기획안: [docs/design/product-brief-1.0.0.md](docs/design/product-brief-1.0.0.md)
- 지금 할 일: [docs/plans/2026-11-10-app-1.0.0.md](docs/plans/2026-11-10-app-1.0.0.md)
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
