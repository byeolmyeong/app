import { router } from 'expo-router';

import { Button } from '@/components/button';
import { StatusView } from '@/components/status-view';
import { strings } from '@/content/strings';

/** 보관된 차트가 없을 때(주소로 바로 들어온 경우). 쉬는 중 별이와 함께 입력 화면으로 보낸다(결정 035). */
export function ChartEmpty() {
  return (
    <StatusView state="empty" title={strings.chart.empty}>
      <Button label={strings.chart.goHome} onPress={() => router.replace('/')} />
    </StatusView>
  );
}

/** 뒤로 갈 곳이 없으면(웹에서 주소로 바로 연 경우) 홈으로 간다. */
export function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
