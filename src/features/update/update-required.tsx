import * as Linking from 'expo-linking';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

const U = strings.update;

export type UpdateRequiredProps = {
  /** 관리자가 적은 안내(그냥 글자). 없거나 비었으면 기본 문구를 쓴다 */
  message: string | null;
  /** 스토어 주소. 없으면 버튼 대신 안내 한 줄을 보여 준다 */
  storeUrl: string | null;
};

/** "업데이트가 필요해요"(결정 027). 스토어를 여는 버튼 하나뿐이고 뒤로 가기 · 닫기가 없다. */
export function UpdateRequired({ message, storeUrl }: UpdateRequiredProps) {
  const [openFailed, setOpenFailed] = useState(false);

  async function openStore(url: string) {
    try {
      await Linking.openURL(url);
      setOpenFailed(false);
    } catch {
      setOpenFailed(true);
    }
  }

  return (
    <Screen>
      <View style={styles.root}>
        <Txt variant="heading">{U.title}</Txt>
        <Txt variant="body">{message?.trim() ? message : U.body}</Txt>
        {storeUrl ? (
          <View style={styles.bottom}>
            {openFailed ? (
              <Txt variant="table" color="danger">
                {U.openFailed}
              </Txt>
            ) : null}
            <Button label={U.open} onPress={() => void openStore(storeUrl)} />
          </View>
        ) : (
          <Txt variant="table" color="gray">
            {U.noStore}
          </Txt>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, gap: Spacing.md, paddingTop: Spacing.xl },
  bottom: { marginTop: 'auto', gap: Spacing.sm },
});
