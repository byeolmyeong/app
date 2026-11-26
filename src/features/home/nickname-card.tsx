import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Avatar, isAvatarId } from '@/components/avatar';
import { Skeleton, SkeletonText } from '@/components/skeleton';
import { PlaceholderCircle, PlaceholderLine } from '@/components/placeholder';
import { Txt } from '@/components/txt';
import { Colors, LineWidth, NicknameCardLayout as L } from '@/constants/theme';
import { strings } from '@/content/strings';

const C = strings.home.card;
const K = L.skeleton;
const M = strings.main;

export type NicknameCardProps = {
  /** `GET /account` 의 닉네임 · 프로필 그림. 받지 못했거나 옛 계정이면 null — "내 별명" · 그림 없이 그린다 */
  nickname: string | null;
  avatar: number | null;
  /** 계정을 아직 모른다(처음 — 기기에도 없고 받기 전): 그림 · 이름 자리에 같은 크기의 흐린 자리표(값이 와도 튀지 않게) */
  accountPending?: boolean;
  /** 받아 둔 요약 해석의 한 줄 별명. 아직 없으면 null */
  headline: string | null;
  onOpen: () => void;
};

/**
 * 홈 맨 아래 별명 한 줄 카드(결정 092 — 047 의 1-2 · 080 의 3 대체): 프로필 그림 · "○○ 님의 별명" · 한 줄 별명(한 줄) · 꺾쇠(카드 세로 가운데).
 * 카드 전체를 누르면 내 별명(풀이 글)으로 간다. 나 탭 별명 카드(결정 078)와 같은 모양이다. 받아 둔 풀이가 없으면 "아직 별명을 짓지 않았어요".
 * 화면 읽기 이름은 보이는 글 차례대로 + "풀이 읽기"(없으면 "내 별명 읽기", 결정 078 의 1).
 */
export function NicknameCard({ nickname, avatar, accountPending = false, headline, onOpen }: NicknameCardProps) {
  const name = nickname ? `${nickname}${C.labelSuffix}` : C.fallback;
  const label = [name, headline ?? M.readingEmpty, headline ? C.read : M.readingCta].join(C.labelSeparator);
  return (
    <Pressable testID="nickname-card" accessibilityRole="button" accessibilityLabel={label} onPress={onOpen} style={styles.card}>
      {accountPending ? <PlaceholderCircle testID="avatar-placeholder" size={L.avatar} /> : isAvatarId(avatar) ? <Avatar id={avatar} size={L.avatar} /> : null}
      <View style={styles.text}>
        {accountPending ? (
          <PlaceholderLine testID="nickname-placeholder" variant="label" width={L.namePlaceholder} />
        ) : (
          <Txt variant="label" color="accentText">
            {name}
          </Txt>
        )}
        {headline ? (
          <Txt variant="bodyStrong" numberOfLines={1}>
            {headline}
          </Txt>
        ) : (
          <Txt variant="body" color="gray" numberOfLines={1}>
            {M.readingEmpty}
          </Txt>
        )}
      </View>
      <Svg testID="nickname-card-chevron" width={L.chevron} height={L.chevron} viewBox="0 0 24 24" fill="none">
        <Path testID="nickname-card-chevron-path" d="M9 6l6 6-6 6" stroke={Colors.hint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

/**
 * 홈 별명 한 줄 카드의 뼈대(결정 071): 같은 카드에 프로필 동그라미 · "○○ 님의 별명" · 한 줄.
 * 홈 뼈대가 보이는 때는 기기가 비어 서버에서 되살릴 때라 받아 둔 풀이가 없다 — "아직 별명을 짓지 않았어요" 한 줄 자리.
 */
export function NicknameCardSkeleton() {
  return (
    <View testID="nickname-card-skeleton" style={styles.card}>
      <Skeleton width={L.avatar} height={L.avatar} pill />
      <View style={styles.text}>
        <SkeletonText variant="label" widths={[K.name]} />
        <SkeletonText variant="body" widths={[K.empty]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: L.gap,
    paddingVertical: L.padV,
    paddingHorizontal: L.padH,
    borderRadius: L.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  text: { flex: 1, minWidth: 0, gap: L.textGap },
});
