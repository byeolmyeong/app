/**
 * 궁합 탭의 별 지도 카드 — 0명일 때(시안 "궁합 (결정 104)" 1-2): 가운데 나(내 프로필 그림) · 둘레 원 셋 · 점선 별 넷 ·
 * 왼쪽 위 "내 궁합" · 아래 "아직 내 하늘이 비어 있어요". 별 지도는 브랜드 자리라 가운데에 옅은 빛을 깐다(결정 035).
 * 별의 자리는 카드 가로 가운데(50%)를 기준으로 둬 넓은 화면에서도 나를 둘러싼다. 사람이 생긴 별 지도 · 순위는 A④ 가 더한다.
 */
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Avatar, type AvatarId } from '@/components/avatar';
import { GlowBackdrop } from '@/components/glow';
import { Txt } from '@/components/txt';
import { Colors, LineWidth, SynastrySkyLayout as L } from '@/constants/theme';
import { strings } from '@/content/strings';

const S = strings.synastryTab;
const CENTER_Y = L.height * L.centerY;

/** avatar: 내 프로필 그림. 계정을 아직 모르거나 옛 계정(그림 없음)이면 첫 그림(별이) */
export function SynastryEmptySky({ avatar }: { avatar: AvatarId | null }) {
  return (
    <View testID="synastry-empty-sky" style={styles.card}>
      <GlowBackdrop color={L.glow.color} extent={L.glow.extent} centerX={L.glow.x} centerY={L.glow.y} />
      <View aria-hidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height={L.height}>
          {L.rings.map((r, i) => (
            <Circle
              key={r}
              cx="50%"
              cy={CENTER_Y}
              r={r}
              fill="none"
              stroke={Colors.hair}
              strokeWidth={LineWidth}
              strokeDasharray={i === 0 ? undefined : L.ringDash}
            />
          ))}
        </Svg>
        {L.emptyStars.map((star) => (
          <View
            key={`${star.dx},${star.dy}`}
            testID="synastry-empty-star"
            style={[
              styles.emptyStar,
              { marginLeft: star.dx - star.size / 2, top: CENTER_Y + star.dy - star.size / 2, width: star.size, height: star.size, borderRadius: star.size / 2 },
            ]}
          />
        ))}
        <View style={styles.me}>
          <Avatar id={avatar ?? 1} size={L.me.size} />
        </View>
      </View>
      <Txt variant="badge" style={styles.meLabel}>
        {S.me}
      </Txt>
      <Txt variant="captionStrong" color="accentText" style={styles.label}>
        {S.myLabel}
      </Txt>
      <Txt variant="small" color="gray" style={styles.empty}>
        {S.empty}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: L.height,
    overflow: 'hidden',
    borderRadius: L.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  emptyStar: { position: 'absolute', left: '50%', borderWidth: L.emptyStarBorder, borderStyle: 'dashed', borderColor: L.emptyStarColor },
  me: { position: 'absolute', left: '50%', marginLeft: -L.me.size / 2, top: CENTER_Y - L.me.size / 2, borderRadius: L.me.size / 2, boxShadow: L.me.glow },
  meLabel: { position: 'absolute', left: '50%', marginLeft: -L.me.labelWidth / 2, top: CENTER_Y + L.me.labelTop, width: L.me.labelWidth, textAlign: 'center' },
  label: { position: 'absolute', left: L.label.left, top: L.label.top },
  empty: { position: 'absolute', left: 0, right: 0, bottom: L.emptyBottom, textAlign: 'center' },
});
