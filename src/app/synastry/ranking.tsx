import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Tabs } from '@/components/tabs';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { goBackOrHome } from '@/features/chart/chart-empty';
import { ShareEntry } from '@/features/share/share-entry';
import { SynastryRow } from '@/features/synastry/synastry-row';
import { useRanking } from '@/features/synastry/use-synastry-lists';
import { RELATIONS, type Relation } from '@/lib/api';

const S = strings.synastry;
const R = S.ranking;

/**
 * 궁합 랭킹: 관계 유형별로 내가 본 궁합을 서버가 준 순서(점수가 높은 순) 그대로 보여 준다.
 * 순위는 받은 차례다. 앱은 점수를 비교하거나 다시 줄 세우지 않는다. 줄을 누르면 그 궁합의 결과로 간다.
 */
export default function SynastryRankingScreen() {
  const { ready } = useSession();
  const [relation, setRelation] = useState<Relation>(RELATIONS[0]);
  const { state, retry } = useRanking(ready ? relation : null);

  return (
    <Screen nav={<NavBar title={R.title} onBack={goBackOrHome} chevron />}>
      <Tabs tabs={RELATIONS.map((r) => ({ key: r, label: S.relations[r] }))} value={relation} onChange={setRelation} />
      {state.status === 'loading' ? (
        <View style={styles.status}>
          <Txt variant="table" color="gray">
            {R.loading}
          </Txt>
        </View>
      ) : state.status === 'failed' ? (
        <View style={styles.status}>
          <Txt variant="body">
            {state.error === 'NETWORK' || state.error === 'LIMIT' ? R.failed[state.error] : R.failed.OTHER}
          </Txt>
          <Button label={S.result.retry} onPress={retry} />
        </View>
      ) : state.entries.length === 0 ? (
        <View style={styles.status}>
          <Txt variant="body">{R.empty}</Txt>
          <Button label={S.result.goEntry} onPress={() => router.push('/synastry')} />
        </View>
      ) : (
        <View style={styles.list}>
          <View>
            {state.entries.map((entry, i) => (
              <SynastryRow
                key={entry.id}
                rank={i + 1}
                name={entry.name}
                sub={entry.keywords.join(R.keywordSeparator)}
                score={entry.score}
                scoreLabel={entry.scoreLabel}
                onPress={() => router.push(`/synastry/${entry.id}`)}
              />
            ))}
          </View>
          {/* 지금 고른 관계의 TOP 3 카드. 이름은 기본이 이니셜이다(결정 025) */}
          <ShareEntry key={relation} target={{ kind: 'RANKING', relation }} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: { gap: Spacing.md, paddingTop: Spacing.lg },
  list: { gap: Spacing.lg },
});
