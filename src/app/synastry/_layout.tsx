import { Redirect } from 'expo-router';

/**
 * 1.0.0 에는 궁합으로 가는 길이 없다(결정 055 의 1). 궁합 화면 코드는 1.1.0 에서 새로 만들 때까지 남겨 두되,
 * 딥 링크 · 옛 링크로 `/synastry/**` 를 열어도 그 화면들을 그리지 않고 홈으로 보낸다.
 */
export default function SynastryLayout() {
  return <Redirect href="/" />;
}
