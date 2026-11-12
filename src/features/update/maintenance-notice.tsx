import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

const M = strings.maintenance;

export type MaintenanceNoticeProps = {
  /** 관리자가 적은 안내(그냥 글자). 없거나 비었으면 기본 문구를 쓴다 */
  message: string | null;
  /** 설정을 다시 받는다. 점검이 끝났으면 이 화면은 사라진다 */
  onRetry: () => Promise<void>;
};

/** "점검 중이에요"(결정 030). "다시 확인" 하나뿐이고 뒤로 가기 · 닫기가 없다. 세션이 필요 없다. */
export function MaintenanceNotice({ message, onRetry }: MaintenanceNoticeProps) {
  const [checking, setChecking] = useState(false);
  /** 다시 확인했는데도 이 화면이 남아 있다(아직 점검 중이거나 확인하지 못했다) */
  const [still, setStill] = useState(false);

  async function retry() {
    if (checking) return;
    setChecking(true);
    await onRetry();
    setChecking(false);
    setStill(true);
  }

  return (
    <Screen>
      <View style={styles.root}>
        <Txt variant="heading">{M.title}</Txt>
        <Txt variant="body">{message?.trim() ? message : M.body}</Txt>
        <View style={styles.bottom}>
          {still && !checking ? (
            <Txt variant="table" color="gray">
              {M.still}
            </Txt>
          ) : null}
          <Button label={checking ? M.checking : M.retry} disabled={checking} onPress={() => void retry()} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, gap: Spacing.md, paddingTop: Spacing.xl },
  bottom: { marginTop: 'auto', gap: Spacing.sm },
});
