import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Field, FieldInput } from '@/components/field';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { SectionHead } from '@/components/section-head';
import { TextLink } from '@/components/text-link';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { BirthFields, useBirthFields } from '@/features/chart/birth-fields';
import { birthInputOf } from '@/features/chart/birth-input';
import { ChartEmpty, goBackOrHome } from '@/features/chart/chart-empty';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { RelationChips } from '@/features/synastry/relation-chips';
import { SynastryRow } from '@/features/synastry/synastry-row';
import { useDirectSynastry } from '@/features/synastry/use-direct-synastry';
import { useSynastryList } from '@/features/synastry/use-synastry-lists';
import { useGenerationBusy } from '@/features/update/update-gate';
import type { Relation } from '@/lib/api';

const S = strings.synastry;
const E = S.entry;
/** 서버가 받는 부를 이름의 최대 길이 */
const NAME_MAX = 20;

/**
 * 궁합 시작(직접 입력). 한 화면에서 관계 유형 · 상대를 부를 이름 · 상대의 출생 정보를 넣고 계산을 요청한다.
 * 계산은 수십 초가 걸릴 수 있어 그동안 기다리는 화면을 보여 준다. 실패하면 넣은 값 그대로 돌아온다.
 * 상대의 출생 정보는 이 화면의 메모리에만 있고 기기에 보관하지 않는다. 점수는 서버가 계산한다.
 * 입력 아래에는 지금까지 본 궁합(서버가 준 순서, 새것부터)과 랭킹으로 가는 링크가 있다.
 */
export default function SynastryEntryScreen() {
  const { ready } = useSession();
  const { loaded, profile } = useBirthProfile();
  // 세션 확인과 기기 저장소 읽기가 끝난 뒤에 지난 궁합을 받는다.
  const past = useSynastryList(ready && profile !== null);
  const fields = useBirthFields();
  const [relation, setRelation] = useState<Relation | null>(null);
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<{ relation?: string; name?: string }>({});
  const { state, calculate } = useDirectSynastry();
  // 계산하는 중과, 계산을 마쳐(idle 로 돌아온다) 결과 화면을 연 뒤에는 강제 업데이트를 미룬다(결정 027).
  // 이 화면은 결과 화면 아래에 남아 있으므로, 결과가 뜨기 전의 틈에도 바쁨이 이어진다.
  useGenerationBusy(state.status === 'calculating', state.status === 'idle');
  const nav = <NavBar title={S.title} onBack={goBackOrHome} chevron />;

  async function onSubmit() {
    const birth = fields.validate();
    const trimmed = name.trim();
    setErrors({
      relation: relation ? undefined : E.errors.relationRequired,
      name: trimmed ? undefined : E.errors.nameRequired,
    });
    if (!birth || !relation || !trimmed || !profile) return;
    const made = await calculate({ name: trimmed, relation, ...birth.input }, birthInputOf(profile));
    if (made) router.push(`/synastry/${made.id}`);
  }

  if (!loaded) return <Screen nav={nav}>{null}</Screen>;
  if (!profile)
    return (
      <Screen nav={nav}>
        <ChartEmpty />
      </Screen>
    );

  if (state.status === 'calculating')
    return (
      <Screen nav={nav}>
        <View style={styles.status}>
          <Txt variant="heading">{E.calculating}</Txt>
          <Txt variant="table" color="gray">
            {E.calculatingNote}
          </Txt>
        </View>
      </Screen>
    );

  return (
    <Screen nav={nav}>
      <View style={styles.form}>
        <Txt variant="table" color="gray">
          {E.intro}
        </Txt>
        <Field label={E.relationLabel} error={errors.relation}>
          <RelationChips
            value={relation}
            invalid={Boolean(errors.relation)}
            onChange={(next) => {
              setRelation(next);
              setErrors((e) => ({ ...e, relation: undefined }));
            }}
          />
        </Field>
        <Field label={E.nameLabel} error={errors.name}>
          <FieldInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              setErrors((e) => ({ ...e, name: undefined }));
            }}
            placeholder={E.namePlaceholder}
            maxLength={NAME_MAX}
            invalid={Boolean(errors.name)}
            accessibilityLabel={E.nameLabel}
          />
        </Field>
        <BirthFields control={fields} />
        <View style={styles.bottom}>
          {state.status === 'failed' ? (
            <Txt variant="table" color="danger">
              {state.error === 'NETWORK' || state.error === 'LIMIT' ? E.failed[state.error] : E.failed.OTHER}
            </Txt>
          ) : null}
          <Button label={E.submit} onPress={() => void onSubmit()} />
        </View>
      </View>
      {past.length > 0 ? (
        <View style={styles.past}>
          <SectionHead title={S.past.heading} />
          <View>
            {past.map((item) => (
              <SynastryRow
                key={item.id}
                name={item.name}
                sub={S.relations[item.relation]}
                score={item.score}
                scoreLabel={item.scoreLabel}
                onPress={() => router.push(`/synastry/${item.id}`)}
              />
            ))}
          </View>
          <TextLink label={S.past.seeRanking} onPress={() => router.push('/synastry/ranking')} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { flexGrow: 1, gap: Spacing.lg, paddingTop: Spacing.xs },
  status: { gap: Spacing.md, paddingTop: Spacing.lg },
  bottom: { marginTop: 'auto', gap: Spacing.sm },
  past: { gap: Spacing.sm, paddingTop: Spacing.xl },
});
