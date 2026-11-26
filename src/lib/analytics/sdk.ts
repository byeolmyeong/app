/**
 * 앰플리튜드 SDK 를 나중에 불러온다(결정 081 — 키가 있을 때만, 웹은 첫 화면 묶음과 따로).
 * 한 줄이지만 따로 둔다: jest 는 동적 import 를 돌리지 못해 시험이 이 파일을 가짜로 바꾼다.
 */
export const loadSdk = () => import('@amplitude/analytics-react-native');
