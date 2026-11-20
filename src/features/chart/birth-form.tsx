import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { getSession } from '@/features/auth/use-session';
import { BirthFields, useBirthFields } from '@/features/chart/birth-fields';
import { sameBirth } from '@/features/chart/birth-input';
import type { StoredBirth } from '@/features/chart/use-birth-profile';
import { api } from '@/lib/api';

const S = strings.home;

export type BirthFormProps = {
  /** 기기에 보관된 값. 있으면 입력 칸을 이 값으로 채운다 */
  stored: StoredBirth | null;
  save: (value: StoredBirth) => Promise<void>;
};

/**
 * 출생 정보 입력. 세 칸은 [BirthFields] 가 그린다.
 * 맨 아래 버튼을 누르면 차트를 받아 보관하고 풀이 글(/reading)로 간다. 차트는 풀이 글 화면에서 연다.
 */
export function BirthForm({ stored, save }: BirthFormProps) {
  const fields = useBirthFields(stored?.profile);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (submitting) return;
    const v = fields.validate();
    if (!v) return;
    setRequestError(null);
    // 같은 입력의 차트를 이미 갖고 있으면 다시 요청하지 않는다.
    if (stored && sameBirth(stored.profile, v.profile)) {
      router.push('/reading');
      return;
    }
    setSubmitting(true);
    const r = await api.createChart(v.input);
    // 로그인 상태면 서버에도 출생 정보를 저장한다(웹은 토큰 없이 쿠키 세션이다). 요약 해석은 서버가 저장된 값으로 쓴다.
    // 저장하지 못하면 기기에도 두지 않는다(기기와 서버의 출생 정보가 달라지지 않게).
    const saved = r.ok && getSession().status === 'signedIn' ? await api.saveProfile(v.input) : null;
    setSubmitting(false);
    const failed = !r.ok ? r : saved && !saved.ok ? saved : null;
    if (!r.ok || failed) {
      const kind = failed?.error;
      // 만 14세 미만 날짜는 서버가 거절한다(판정은 서버, 서버 결정 021).
      if (failed?.code === 'UNDER_AGE') setRequestError(S.requestErrors.UNDER_AGE);
      else setRequestError(kind === 'NETWORK' || kind === 'LIMIT' ? S.requestErrors[kind] : S.requestErrors.OTHER);
      return;
    }
    await save({ profile: v.profile, chart: r.data });
    router.push('/reading');
  }

  return (
    <View style={styles.form}>
      <BirthFields control={fields} />
      <View style={styles.bottom}>
        {requestError ? (
          <Txt variant="table" color="danger">
            {requestError}
          </Txt>
        ) : null}
        <Button label={submitting ? S.submitting : S.submit} disabled={submitting} onPress={onSubmit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { flexGrow: 1, gap: Spacing.lg },
  bottom: { marginTop: 'auto', gap: Spacing.sm },
});
