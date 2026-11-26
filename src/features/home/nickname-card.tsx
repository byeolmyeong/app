import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Avatar, isAvatarId } from '@/components/avatar';
import { CardConstellation, type CardConstellationArt } from '@/components/card-constellation';
import { GlowBackdrop } from '@/components/glow';
import { Skeleton, SkeletonText } from '@/components/skeleton';
import { PlaceholderCircle, PlaceholderLine } from '@/components/placeholder';
import { Txt } from '@/components/txt';
import { BrandColors, Colors, LineWidth, NicknameCardLayout as L } from '@/constants/theme';
import { strings } from '@/content/strings';

const C = strings.home.card;
const K = L.skeleton;
const M = strings.main;

export type NicknameCardProps = {
  /** `GET /account` 의 닉네임 · 프로필 그림. 받지 못했거나 옛 계정이면 null — 그 칸을 빼고 그린다 */
  nickname: string | null;
  avatar: number | null;
  /** 계정을 아직 모른다(처음 — 기기에도 없고 받기 전): 그림 · 이름 자리에 같은 크기의 흐린 자리표(값이 와도 튀지 않게) */
  accountPending?: boolean;
  /** 해 별자리 이름("쌍둥이자리" — 서버 차트의 SUN). 없으면 null */
  sunSign: string | null;
  /** 오른쪽 위에 그릴 해 별자리 그림(서버 차트의 SUN 으로 화면이 고른다). 없으면 그리지 않는다 */
  art: CardConstellationArt | null;
  /** 별명을 받은 지 며칠(받은 날 1일). 요약 해석에 만든 때가 없으면 null */
  days: number | null;
  /** 받아 둔 요약 해석의 한 줄 별명. 아직 없으면 null */
  headline: string | null;
  onOpen: () => void;
};

/**
 * 홈의 별명 카드(결정 047 의 1-2, 보드 11 · 11-1): 프로필 그림 · "○○ 님" · "해 별자리 · 별명을 받은 지 N일" · 한 줄 별명 · 오른쪽 위 꺾쇠.
 * 카드 전체를 누르면 내 별명(풀이 글)으로 간다. 꺾쇠는 프로필 그림 · 닉네임 줄의 오른쪽 끝, 그 줄의 세로 가운데에 놓이고(소유자 빌드 14)
 * 크기 · 색은 다른 홈 카드의 꺾쇠와 같다. "풀이 읽기" 글자는 없고 화면 읽기 이름에만 남긴다(결정 080).
 * 브랜드 자리라 오른쪽 위에 옅은 빛과 별자리 장식이 있고, 별자리는 꺾쇠 둘레를 비운다 — 그 줄의 실제 자리를 재서 따라간다(결정 035 · 080).
 */
export function NicknameCard({ nickname, avatar, accountPending = false, sunSign, art, days, headline, onOpen }: NicknameCardProps) {
  const meta = [sunSign, days !== null ? `${C.daysPrefix}${days}${C.daysSuffix}` : null].filter(Boolean).join(C.separator);
  const label = [nickname ? `${nickname}${C.nicknameSuffix}` : null, meta, headline ?? M.readingEmpty, headline ? C.read : M.readingCta]
    .filter(Boolean)
    .join(C.labelSeparator);
  // 프로필 줄의 자리(카드 안, 테두리 포함 좌표). 재기 전에는 그림이 있는 줄로 본다
  const [row, setRow] = useState<{ y: number; height: number }>({ y: LineWidth + L.padding, height: L.avatar });
  const onRowLayout = (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setRow((was) => (was.y === y && was.height === height ? was : { y, height }));
  };
  // 꺾쇠 칸의 위 끝 — 별자리 그림과 같은 기준(테두리 안쪽)으로
  const chevronTop = row.y - LineWidth + (row.height - L.chevron) / 2;
  return (
    <Pressable testID="nickname-card" accessibilityRole="button" accessibilityLabel={label} onPress={onOpen} style={styles.card}>
      <GlowBackdrop color={BrandColors.cardGlow} extent={L.glow.extent} centerX={L.glow.x} centerY={L.glow.y} />
      <CardConstellation art={art} clear={{ top: chevronTop, right: L.padding, size: L.chevron }} />
      <View testID="nickname-card-row" style={styles.row} onLayout={onRowLayout}>
        {accountPending ? <PlaceholderCircle testID="avatar-placeholder" size={L.avatar} /> : isAvatarId(avatar) ? <Avatar id={avatar} size={L.avatar} /> : null}
        <View style={styles.names}>
          {accountPending ? <PlaceholderLine testID="nickname-placeholder" variant="subhead" width={L.namePlaceholder} /> : null}
          {nickname ? (
            <Txt variant="subhead">
              {nickname}
              {C.nicknameSuffix}
            </Txt>
          ) : null}
          {meta ? (
            <Txt variant="caption" color="gray">
              {meta}
            </Txt>
          ) : null}
        </View>
        <Svg testID="nickname-card-chevron" width={L.chevron} height={L.chevron} viewBox="0 0 24 24" fill="none">
          <Path testID="nickname-card-chevron-path" d="M9 6l6 6-6 6" stroke={Colors.hint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      {headline ? (
        <Txt variant="section" keepAll style={styles.headline}>
          {headline}
        </Txt>
      ) : (
        <Txt variant="body" color="gray" style={styles.headline}>
          {M.readingEmpty}
        </Txt>
      )}
    </Pressable>
  );
}

/**
 * 홈 별명 카드의 뼈대(결정 071, 보드 24 의 첫 카드): 같은 카드에 프로필 동그라미 · 이름 · 해 별자리 · 한 줄(꺾쇠 줄은 없다 — 결정 080).
 * 홈 뼈대가 보이는 때는 기기가 비어 서버에서 되살릴 때라 받아 둔 풀이가 없다 — 한 줄 별명 두 줄 대신 "아직 별명을 짓지 않았어요" 한 줄 자리,
 * 날 수 없이 해 별자리만(다 그려질 카드 그대로). 브랜드 장식(빛 · 별자리)은 그리지 않는다.
 */
export function NicknameCardSkeleton() {
  return (
    <View testID="nickname-card-skeleton" style={styles.card}>
      <View style={styles.row}>
        <Skeleton width={L.avatar} height={L.avatar} pill />
        <View style={styles.names}>
          <SkeletonText variant="subhead" widths={[K.name]} />
          <SkeletonText variant="caption" widths={[K.meta]} />
        </View>
      </View>
      <SkeletonText variant="body" widths={[K.empty]} style={styles.headline} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: L.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
    padding: L.padding,
  },
  /** 프로필 그림 · 이름 · 꺾쇠 — 세로 가운데 맞춤이라 꺾쇠가 그림 · 닉네임과 높이가 맞는다 */
  row: { flexDirection: 'row', alignItems: 'center', gap: L.rowGap },
  /** 이름 칸이 남은 폭을 써서 꺾쇠가 줄 끝에 붙는다 */
  names: { flex: 1 },
  headline: { marginTop: L.headlineTop },
});
