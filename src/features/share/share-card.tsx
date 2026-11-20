import type { ComponentRef, Ref } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { CardRadius, Colors, LineWidth, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import type { ShareCard } from '@/lib/api';

const S = strings.share;
const C = S.card;

/** 공유 이미지의 크기(인스타 스토리, 9:16). 카드의 비율도 여기서 나온다 */
export const SHARE_IMAGE = { width: 1080, height: 1920 } as const;

/**
 * 카드 속 그림(결정 036). 웹 이미지 저장(html2canvas)이 SVG 의 흐림을 못 그려 미리 만든 PNG 를 쓴다.
 * 원본은 assets/brand/share-*.svg, 다시 만들기는 scripts/render-brand.mjs.
 */
const ART = {
  glow: require('@/assets/images/share/glow.png'),
  mark: require('@/assets/images/share/mark.png'),
  byeoli: {
    default: require('@/assets/images/share/byeoli-default.png'),
    happy: require('@/assets/images/share/byeoli-happy.png'),
    think: require('@/assets/images/share/byeoli-think.png'),
  },
};
/** 로고 그림의 가로 : 세로 */
const MARK_RATIO = 424 / 224;

/** 별이의 표정은 카드 종류로만 정한다. 점수에 따라 바꾸지 않는다(앱이 점수를 판단하지 않게) */
const FACE: Partial<Record<ShareCard['kind'], keyof typeof ART.byeoli>> = {
  READING: 'default',
  SCORE: 'happy',
  RANKING: 'default',
  NEXT_TURN: 'think',
};

export type ShareCardViewProps = {
  card: ShareCard;
  width?: number;
  /** 이미지로 만들 뷰(테두리와 둥근 모서리를 뺀 카드 면) */
  ref?: Ref<ComponentRef<typeof View>>;
};

/**
 * 공유 카드 "별이와 함께"(결정 025 · 036). 위에 별이, 가운데 서버가 준 `card` 의 값, 아래에 로고와 한 줄 소개.
 * 차트 · 출생 정보 · 근거 · 본문은 없다. 공유 시트의 미리보기, 저장하는 이미지, 공유 페이지가 이 부품 하나를 쓴다.
 * 앱은 이름을 줄이거나 순서를 바꾸지 않는다.
 */
export function ShareCardView({ card, width = Sizes.shareCardWidth, ref }: ShareCardViewProps) {
  const height = Math.round((width * SHARE_IMAGE.height) / SHARE_IMAGE.width);
  const face = FACE[card.kind] ?? 'default';
  const byeoli = Math.round(width * 0.34);
  const markHeight = Math.round(width * 0.075);
  return (
    <View testID="share-card-frame" style={[styles.frame, { width, height }]}>
      <View ref={ref} collapsable={false} testID="share-card" style={styles.card}>
        {/* 바탕 빛: 카드 면을 꽉 채우는 상자 안에 둔다(웹에서 그림이 제 크기로 놓이지 않게) */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image source={ART.glow} resizeMode="cover" style={styles.fill} accessible={false} />
        </View>
        <Image
          testID={`share-byeoli-${face}`}
          source={ART.byeoli[face]}
          accessible={false}
          aria-hidden
          style={{ width: byeoli, height: byeoli }}
        />
        <View style={styles.body}>
          <CardBody card={card} />
        </View>
        <View style={styles.foot}>
          <Image
            source={ART.mark}
            accessible
            accessibilityRole="image"
            accessibilityLabel={strings.appName}
            style={{ width: Math.round(markHeight * MARK_RATIO), height: markHeight }}
          />
          <Txt variant="label" color="hint" style={styles.center}>
            {S.tagline}
          </Txt>
        </View>
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
          <Txt variant="label" color="gray" style={styles.center}>
            {C.readingLabel}
          </Txt>
          <Txt variant="heading" style={styles.center}>
            {card.headline}
          </Txt>
          <View style={styles.list}>
            {card.keywords.map((keyword, i) => (
              <Txt key={i} variant="table" color="gray" style={styles.center}>
                {keyword}
              </Txt>
            ))}
          </View>
        </>
      );
    case 'SCORE':
      return (
        <>
          <Txt variant="label" color="gray" style={styles.center}>
            {C.scoreLabel}
          </Txt>
          <Txt variant="heading" style={styles.center}>
            {card.names.join(C.namesSeparator)}
          </Txt>
          <View style={styles.score}>
            <Txt variant="display">{`${card.score}${C.scoreUnit}`}</Txt>
            {card.scoreLabel ? (
              <Txt variant="label" color="gray">
                {card.scoreLabel}
              </Txt>
            ) : null}
          </View>
          <Txt variant="table" color="gray" style={styles.center}>
            {card.headline}
          </Txt>
        </>
      );
    case 'RANKING':
      return (
        <>
          <Txt variant="heading" style={styles.center}>
            {`${C.rankingPrefix}${strings.synastry.relations[card.relation]}${C.rankingSuffix}`}
          </Txt>
          <View style={[styles.list, styles.ranks]}>
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
          <Txt variant="label" color="gray" style={styles.center}>
            {C.nextTurnLead}
          </Txt>
          <Txt variant="display" style={styles.center}>
            {`${card.year}${C.yearSuffix}${C.seasons[card.season]}`}
          </Txt>
          <Txt variant="table" color="gray" style={styles.center}>
            {card.theme}
          </Txt>
        </>
      );
  }
}

const styles = StyleSheet.create({
  frame: { borderRadius: CardRadius, overflow: 'hidden' },
  card: { flex: 1, alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, backgroundColor: Colors.paper },
  fill: { width: '100%', height: '100%' },
  border: { ...StyleSheet.absoluteFill, borderWidth: LineWidth, borderColor: Colors.hair, borderRadius: CardRadius },
  body: { alignSelf: 'stretch', alignItems: 'center', gap: Spacing.sm },
  center: { textAlign: 'center' },
  list: { gap: Spacing.xs },
  score: { alignItems: 'center' },
  ranks: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  name: { flex: 1 },
  foot: { alignItems: 'center', gap: Spacing.xs },
});
