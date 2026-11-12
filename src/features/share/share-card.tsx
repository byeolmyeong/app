import type { ComponentRef, Ref } from 'react';
import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { CardRadius, Colors, LineWidth, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import type { ShareCard } from '@/lib/api';

const S = strings.share;
const C = S.card;

/** 공유 이미지의 크기(인스타 스토리, 9:16). 카드의 비율도 여기서 나온다 */
export const SHARE_IMAGE = { width: 1080, height: 1920 } as const;

export type ShareCardViewProps = {
  card: ShareCard;
  width?: number;
  /** 이미지로 만들 뷰(테두리와 둥근 모서리를 뺀 카드 면) */
  ref?: Ref<ComponentRef<typeof View>>;
};

/**
 * 공유 카드(결정 025). 서버가 준 `card` 의 값과 앱 이름 · 한 줄 소개만 그린다. 차트 · 출생 정보 · 근거 · 본문은 없다.
 * 공유 시트의 미리보기, 저장하는 이미지, 공유 페이지가 이 부품 하나를 쓴다. 앱은 이름을 줄이거나 순서를 바꾸지 않는다.
 */
export function ShareCardView({ card, width = Sizes.shareCardWidth, ref }: ShareCardViewProps) {
  const height = Math.round((width * SHARE_IMAGE.height) / SHARE_IMAGE.width);
  return (
    <View testID="share-card-frame" style={[styles.frame, { width, height }]}>
      <View ref={ref} collapsable={false} testID="share-card" style={styles.card}>
        <View style={styles.head}>
          <View style={styles.bar} />
          <Txt variant="label" color="gray">
            {strings.appName}
          </Txt>
        </View>
        <View style={styles.body}>
          <CardBody card={card} />
        </View>
        <Txt variant="label" color="hint">
          {S.tagline}
        </Txt>
      </View>
      {/* 테두리는 카드 위에 덧그린다(이미지에는 들어가지 않고 카드 면의 비율도 바꾸지 않는다) */}
      <View pointerEvents="none" style={styles.border} />
    </View>
  );
}

function CardBody({ card }: { card: ShareCard }) {
  switch (card.kind) {
    case 'READING':
      return (
        <>
          <Txt variant="label" color="gray">
            {C.readingLabel}
          </Txt>
          <Txt variant="title">{card.headline}</Txt>
          <View style={styles.list}>
            {card.keywords.map((keyword, i) => (
              <Txt key={i} variant="table" color="gray">
                {keyword}
              </Txt>
            ))}
          </View>
        </>
      );
    case 'SCORE':
      return (
        <>
          <Txt variant="label" color="gray">
            {C.scoreLabel}
          </Txt>
          <Txt variant="heading">{card.names.join(C.namesSeparator)}</Txt>
          <View>
            <Txt variant="display">{`${card.score}${C.scoreUnit}`}</Txt>
            {card.scoreLabel ? (
              <Txt variant="label" color="gray">
                {card.scoreLabel}
              </Txt>
            ) : null}
          </View>
          <Txt variant="table" color="gray">
            {card.headline}
          </Txt>
        </>
      );
    case 'RANKING':
      return (
        <>
          <Txt variant="heading">{`${C.rankingPrefix}${strings.synastry.relations[card.relation]}${C.rankingSuffix}`}</Txt>
          <View style={styles.list}>
            {card.entries.map((entry, i) => (
              <View key={i} style={styles.row}>
                <Txt variant="number" color="hint">
                  {String(i + 1)}
                </Txt>
                <Txt variant="button" numberOfLines={1} style={styles.name}>
                  {entry.name}
                </Txt>
                <Txt variant="table">{`${entry.score}${C.scoreUnit}`}</Txt>
              </View>
            ))}
          </View>
        </>
      );
    case 'NEXT_TURN':
      return (
        <>
          <Txt variant="label" color="gray">
            {C.nextTurnLead}
          </Txt>
          <Txt variant="display">{`${card.year}${C.yearSuffix}${C.seasons[card.season]}`}</Txt>
          <Txt variant="table" color="gray">
            {card.theme}
          </Txt>
        </>
      );
  }
}

const styles = StyleSheet.create({
  frame: { borderRadius: CardRadius, overflow: 'hidden' },
  card: { flex: 1, justifyContent: 'space-between', padding: Spacing.lg, backgroundColor: Colors.paper },
  border: { ...StyleSheet.absoluteFill, borderWidth: LineWidth, borderColor: Colors.hair, borderRadius: CardRadius },
  head: { gap: Spacing.sm },
  bar: {
    width: Sizes.shareCardBarWidth,
    height: Sizes.shareCardBarHeight,
    borderRadius: Sizes.shareCardBarHeight,
    backgroundColor: Colors.primary,
  },
  body: { gap: Spacing.sm },
  list: { gap: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  name: { flex: 1 },
});
