import type { ComponentRef, Ref } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { Txt } from '@/components/txt';
import { BrandColors, CardRadius, Colors, LineWidth, ShareCardLayout as L, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { SignArt } from '@/features/chart/ChartWheel';
import { AreaArt } from '@/features/me/area-art';
import { SkyArt } from '@/features/share/share-art';
import type { ShareCard } from '@/lib/api';

const S = strings.share;
const C = S.card;
const V = S.cards;

/** 공유 v2 카드(결정 053): 시안의 그림 · 로고 · 한 줄 소개. 옛 네 종류(READING · SCORE · RANKING · NEXT_TURN)는 옛 링크를 위해 "별이와 함께"(결정 036) 그대로 */
type StoryCard = Extract<ShareCard, { kind: 'NICKNAME' | 'ME_AREA' | 'DAY_SKY' | 'NEXT_BIG' }>;
type ByeoliCard = Exclude<ShareCard, StoryCard>;
const isStoryCard = (card: ShareCard): card is StoryCard =>
  card.kind === 'NICKNAME' || card.kind === 'ME_AREA' || card.kind === 'DAY_SKY' || card.kind === 'NEXT_BIG';

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
const FACE: Record<ByeoliCard['kind'], keyof typeof ART.byeoli> = {
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
 * 공유 카드(9:16). 공유 시트의 미리보기, 저장하는 이미지, 공유 페이지가 이 부품 하나를 쓴다. 서버가 준 `card` 의 값만 그리고
 * 앱은 글을 줄이거나 순서를 바꾸지 않는다. 출생 정보 · 근거 · 본문 · 하우스는 없다(결정 025 · 053 의 4).
 * 공유 v2 넷은 시안의 카드(결정 053 의 2), 옛 넷은 "별이와 함께"(결정 036 — 옛 링크가 계속 열린다).
 */
export function ShareCardView({ card, width = Sizes.shareCardWidth, ref }: ShareCardViewProps) {
  const height = Math.round((width * SHARE_IMAGE.height) / SHARE_IMAGE.width);
  return (
    <View testID="share-card-frame" style={[styles.frame, { width, height }]}>
      <View ref={ref} collapsable={false} testID="share-card" style={styles.card}>
        {isStoryCard(card) ? <StoryFace card={card} width={width} /> : <ByeoliFace card={card} width={width} />}
      </View>
      {/* 테두리는 카드 위에 덧그린다(이미지에는 들어가지 않고 카드 면의 비율도 바꾸지 않는다) */}
      <View pointerEvents="none" style={styles.border} />
    </View>
  );
}

/** 한국 날짜(UTC+9)의 오늘, YYYY-MM-DD — 그날의 하늘 카드가 오늘인지 가른다 */
const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;
const koreanToday = () => new Date(Date.now() + KOREA_OFFSET_MS).toISOString().slice(0, 10);
/** 서버가 준 YYYY-MM-DD 를 "11월 19일" 로 옮겨 적는다 */
const dateText = (date: string) => `${Number(date.slice(5, 7))}${V.date.month}${Number(date.slice(8, 10))}${V.date.day}`;

/** 카드 종류마다의 칩 · 이름표 뒷말 · 한 줄 소개(결정 053 의 2). 글자와 숫자는 card 의 값 그대로다 */
function storyText(card: StoryCard): { chip: string; subject: string; tagline: string } {
  switch (card.kind) {
    case 'NICKNAME':
      return { chip: `${strings.signs[card.sunSign]}${strings.chart.signSuffix}`, subject: V.nickname, tagline: V.taglines.me };
    case 'ME_AREA':
      return { chip: strings.me.areas[card.area], subject: strings.me.areas[card.area], tagline: V.taglines.me };
    case 'DAY_SKY': {
      const today = card.date === koreanToday();
      const date = dateText(card.date);
      return {
        chip: `${date}${V.separator}${today ? V.daySky.today : V.daySky.day}`,
        subject: today ? V.today : date,
        tagline: today ? V.taglines.today : V.taglines.day,
      };
    }
    case 'NEXT_BIG':
      return {
        chip: `${card.year}${V.when.year}${V.separator}${V.when.agePrefix}${card.age}${V.when.ageSuffix}`,
        subject: V.nextBig,
        tagline: V.taglines.timing,
      };
  }
}

/** 시안의 360 카드 값을 이 카드 너비로 */
const scaled = (k: number, text: { fontSize: number; lineHeight: number; letterSpacing: number }) => ({
  fontSize: text.fontSize * k,
  lineHeight: text.lineHeight * k,
  letterSpacing: text.letterSpacing * k,
});

/**
 * 공유 v2 카드(보드 12-7 · 12-14 · 11-7 · 14-6): 위 그림(해 별자리 · 영역 · 달 · 계단 위 별 — card 의 값으로 고른다) · 칩 ·
 * "새벽별 님의 …"(닉네임이 없으면 "나의 …") · 서버가 준 제목 · 아래 줄의 로고와 한 줄 소개. 시안의 360 카드 값을 너비에 맞춰 줄인다.
 */
function StoryFace({ card, width }: { card: StoryCard; width: number }) {
  const k = width / L.base;
  const { chip, subject, tagline } = storyText(card);
  const label = card.nickname ? `${card.nickname}${V.of}${subject}` : `${V.mine}${subject}`;
  const title = card.kind === 'NICKNAME' ? card.headline : card.title;
  const art = Math.round(L.art * k);
  return (
    <View style={[styles.story, { paddingTop: L.padTop * k, paddingHorizontal: L.padX * k, paddingBottom: L.padBottom * k }]}>
      {L.dots.map((dot, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: dot.top * k,
            ...('left' in dot ? { left: dot.left * k } : { right: dot.right * k }),
            width: dot.size * k,
            height: dot.size * k,
            borderRadius: dot.size * k,
            backgroundColor: BrandColors.core,
            opacity: dot.opacity,
          }}
        />
      ))}
      {card.kind === 'NICKNAME' ? (
        <SignArt sign={card.sunSign} width={Math.round(L.sign.width * k)} height={Math.round(L.sign.height * k)} />
      ) : (
        <View style={{ marginTop: L.artTop * k }}>
          {card.kind === 'ME_AREA' ? (
            <View testID={`share-art-area-${card.area}`} aria-hidden>
              <AreaArt area={card.area} size={art} variant="hero" />
            </View>
          ) : (
            <SkyArt kind={card.kind === 'DAY_SKY' ? 'moon' : 'steps'} size={art} />
          )}
        </View>
      )}
      <View
        style={[
          styles.chip,
          { marginTop: L.chip.top * k, paddingVertical: L.chip.padV * k, paddingHorizontal: L.chip.padH * k },
        ]}>
        <Txt variant="captionStrong" color="accentText" style={scaled(k, L.chip.text)}>
          {chip}
        </Txt>
      </View>
      <Txt variant="table" color="gray" style={[styles.center, { marginTop: L.label.top * k }, scaled(k, L.label.text)]}>
        {label}
      </Txt>
      <Txt variant="title" keepAll style={[styles.center, styles.title, { marginTop: L.title.top * k }, scaled(k, L.title.text)]}>
        {title}
      </Txt>
      <View style={styles.grow} />
      <View style={[styles.storyFoot, { paddingTop: L.foot.padTop * k }]}>
        <BrandMark height={Math.round(L.foot.mark * k)} />
        <Txt variant="label" color="hint" style={scaled(k, L.foot.text)}>
          {tagline}
        </Txt>
      </View>
    </View>
  );
}

/** 옛 카드 "별이와 함께"(결정 025 · 036): 위에 별이, 가운데 card 의 값, 아래에 로고와 한 줄 소개 */
function ByeoliFace({ card, width }: { card: ByeoliCard; width: number }) {
  const face = FACE[card.kind];
  const byeoli = Math.round(width * 0.34);
  const markHeight = Math.round(width * 0.075);
  return (
    <View style={styles.byeoli}>
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
  );
}

function CardBody({ card }: { card: ByeoliCard }) {
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
  card: { flex: 1, backgroundColor: Colors.paper },
  byeoli: { flex: 1, alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  story: { flex: 1, alignItems: 'center', overflow: 'hidden' },
  chip: { borderWidth: LineWidth, borderColor: Colors.hair, borderRadius: 999 },
  title: { alignSelf: 'stretch' },
  grow: { flex: 1 },
  storyFoot: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: LineWidth,
    borderTopColor: Colors.hair,
  },
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
