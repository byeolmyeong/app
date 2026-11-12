import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { BirthFields, useBirthFields } from '@/features/chart/birth-fields';
import type { BirthProfile } from '@/features/chart/birth-input';
import { goBackOrHome } from '@/features/chart/chart-empty';
import { DirectionView } from '@/features/direction/direction-view';
import { useSynastryDirection } from '@/features/direction/use-synastry-direction';
import { freshOf } from '@/features/synastry/fresh-synastry';
import type { BirthInput } from '@/lib/api';

const S = strings.direction.synastry;

/**
 * 방향성 제시(궁합): 서버가 쓴 "이 사이에서 해 볼 만한 것" 한 줄 제목과 3개(결정 026). 궁합 결과에서 눌러 들어올 때만 글을 요청한다.
 * 서버에 상대의 출생 정보가 없어 글을 처음 만들 때 다시 보낸다(서버 결정 011): 방금 계산한 궁합이면 메모리의 값을 함께 보내고,
 * 나중에 연 궁합이면 식별자만 먼저 보낸 뒤 서버가 달라고 하면 다시 입력받는다. 다시 넣은 값도 받은 글도 기기에 보관하지 않는다.
 */
export default function SynastryDirectionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { ready } = useSession();
  const synastryId = typeof id === 'string' ? id : null;
  /** 방금 계산한 궁합이면 입력 화면에서 넣은 값이 메모리에 있다 */
  const remembered = synastryId ? (freshOf(synastryId)?.birth ?? null) : null;
  const { state, submit, retry } = useSynastryDirection(ready ? synastryId : null, remembered);
  /** 이 화면에서 다시 넣은 상대의 출생 정보. 거절됐을 때 칸을 다시 채우는 데만 쓴다(메모리) */
  const [typed, setTyped] = useState<BirthProfile | null>(null);
  const nav = <NavBar title={S.title} onBack={goBackOrHome} />;

  const reenter = (
    <PartnerBirthForm
      initial={typed}
      onSubmit={(profile, input) => {
        setTyped(profile);
        submit(input);
      }}
    />
  );

  if (state.status === 'loading')
    return (
      <Screen nav={nav}>
        <View style={styles.status}>
          <Txt variant="heading">{S.generating}</Txt>
          <Txt variant="table" color="gray">
            {S.generatingNote}
          </Txt>
        </View>
      </Screen>
    );

  if (state.status === 'birthRequired') return <Screen nav={nav}>{reenter}</Screen>;

  if (state.status === 'failed') {
    const { error } = state;
    if (error === 'PROFILE_CHANGED')
      return (
        <Screen nav={nav}>
          <View style={styles.status}>
            <Txt variant="body">{S.profileChanged}</Txt>
            <Button label={S.recalculate} onPress={() => router.replace('/synastry')} />
          </View>
        </Screen>
      );
    if (error === 'NOT_FOUND')
      return (
        <Screen nav={nav}>
          <View style={styles.status}>
            <Txt variant="body">{strings.synastry.result.notFound}</Txt>
            <Button label={strings.synastry.result.goEntry} onPress={() => router.replace('/synastry')} />
          </View>
        </Screen>
      );
    // 보낸 출생 정보가 거절됐으면 다시 입력받는다. 그 밖의 실패는 방금 보낸 것을 그대로 다시 보낸다.
    if (error === 'BIRTH_MISMATCH' || error === 'BIRTH_INVALID')
      return (
        <Screen nav={nav}>
          <View style={styles.status}>
            <Txt variant="body">{error === 'BIRTH_MISMATCH' ? S.mismatch : S.invalidBirth}</Txt>
          </View>
          {reenter}
        </Screen>
      );
    return (
      <Screen nav={nav}>
        <View style={styles.status}>
          <Txt variant="body">{error === 'NETWORK' || error === 'LIMIT' ? S.failed[error] : S.failed.OTHER}</Txt>
          <Button label={S.retry} onPress={retry} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen nav={nav}>
      <DirectionView direction={state.direction} />
      <View style={styles.footer}>
        <Txt variant="label" color="gray">
          {strings.reading.disclaimer}
        </Txt>
      </View>
    </Screen>
  );
}

/** 상대의 출생 정보를 다시 넣는 칸과 "해 볼 만한 것 보기". 넣은 값은 부른 화면에 돌려줄 뿐 보관하지 않는다(궁합 리포트 화면과 같은 꼴). */
function PartnerBirthForm({
  initial,
  onSubmit,
}: {
  initial: BirthProfile | null;
  onSubmit: (profile: BirthProfile, input: BirthInput) => void;
}) {
  const fields = useBirthFields(initial);
  return (
    <View style={styles.reenter}>
      <Txt variant="table" color="gray">
        {S.reenter}
      </Txt>
      <BirthFields control={fields} />
      <Button
        label={S.submit}
        onPress={() => {
          const v = fields.validate();
          if (v) onSubmit(v.profile, v.input);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  status: { gap: Spacing.md, paddingTop: Spacing.lg },
  reenter: { gap: Spacing.lg, paddingTop: Spacing.lg },
  footer: { paddingTop: Spacing.lg },
});
