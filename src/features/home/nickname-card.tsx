import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Avatar, isAvatarId } from '@/components/avatar';
import { CardConstellation, type CardConstellationArt } from '@/components/card-constellation';
import { GlowBackdrop } from '@/components/glow';
import { Skeleton, SkeletonText } from '@/components/skeleton';
import { PlaceholderCircle, PlaceholderLine } from '@/components/placeholder';
import { Txt } from '@/components/txt';
import { BrandColors, Colors, LineWidth, NicknameCardLayout as L, Spacing } from '@/constants/theme';
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
 * 홈의 별명 카드(결정 047 의 1-2, 보드 11 · 11-1): 프로필 그림 · "○○ 님" · "해 별자리 · 별명을 받은 지 N일" · 한 줄 별명 · 풀이 읽기.
 * 카드 전체를 누르면 내 별명(풀이 글)으로 간다. 브랜드 자리라 오른쪽 위에 옅은 빛과 별자리 장식이 있다(결정 035).
 */
export function NicknameCard({ nickname, avatar, accountPending = false, sunSign, art, days, headline, onOpen }: NicknameCardProps) {
  const meta = [sunSign, days !== null ? `${C.daysPrefix}${days}${C.daysSuffix}` : null].filter(Boolean).join(C.separator);
  return (
    <Pressable testID="nickname-card" accessibilityRole="button" onPress={onOpen} style={styles.card}>
      <GlowBackdrop color={BrandColors.cardGlow} extent={L.glow.extent} centerX={L.glow.x} centerY={L.glow.y} />
      <CardConstellation art={art} />
      <View style={styles.row}>
        {accountPending ? <PlaceholderCircle testID="avatar-placeholder" size={L.avatar} /> : isAvatarId(avatar) ? <Avatar id={avatar} size={L.avatar} /> : null}
        <View style={styles.names}>
          {accountPending ? <PlaceholderLine testID="nickname-placeholder" variant="heading" width={L.namePlaceholder} /> : null}
          {nickname ? (
            <Txt variant="heading">
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
      </View>
      {headline ? (
        <Txt variant="cardTitle" keepAll style={styles.headline}>
          {headline}
        </Txt>
      ) : (
        <Txt variant="body" color="gray" style={styles.headline}>
          {M.readingEmpty}
        </Txt>
      )}
      <View style={styles.more}>
        <Txt variant="captionStrong" color="gray">
          {headline ? C.read : M.readingCta}
        </Txt>
        <Svg width={L.chevron} height={L.chevron} viewBox="0 0 24 24" fill="none">
          <Path d="M9 6l6 6-6 6" stroke={Colors.gray} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
    </Pressable>
  );
}

/**
 * 홈 별명 카드의 뼈대(결정 071, 보드 24 의 첫 카드): 같은 카드에 프로필 동그라미 · 이름 · 해 별자리 · 한 줄 · 풀이 읽기.
 * 홈 뼈대가 보이는 때는 기기가 비어 서버에서 되살릴 때라 받아 둔 풀이가 없다 — 한 줄 별명 두 줄 대신 "아직 별명을 짓지 않았어요" 한 줄 자리,
 * 날 수 없이 해 별자리만(다 그려질 카드 그대로). 브랜드 장식(빛 · 별자리)은 그리지 않는다.
 */
export function NicknameCardSkeleton() {
  return (
    <View testID="nickname-card-skeleton" style={styles.card}>
      <View style={styles.row}>
        <Skeleton width={L.avatar} height={L.avatar} pill />
        <View style={styles.names}>
          <SkeletonText variant="heading" widths={[K.name]} />
          <SkeletonText variant="caption" widths={[K.meta]} />
        </View>
      </View>
      <SkeletonText variant="body" widths={[K.empty]} style={styles.headline} />
      <View style={styles.more}>
        <SkeletonText variant="captionStrong" widths={[K.more]} />
      </View>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: L.rowGap },
  names: { flexShrink: 1 },
  headline: { marginTop: L.headlineTop },
  more: { flexDirection: 'row', alignItems: 'center', gap: Spacing.hairline, marginTop: L.moreTop },
});
