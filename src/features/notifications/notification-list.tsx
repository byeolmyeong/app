import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Skeleton, SkeletonGroup, SkeletonText } from '@/components/skeleton';
import { Txt } from '@/components/txt';
import { Colors, FontWeight, LineWidth, NotificationLayout as L } from '@/constants/theme';
import { strings } from '@/content/strings';
import { groupNotifications, notificationText, timeLabel } from '@/features/notifications/notification-rows';
import type { NotificationItem } from '@/lib/api';

const N = strings.notifications;

/** 줄의 아이콘(보드 11-3): 문의 답변은 말풍선, 시기 풀이는 달, 별명 · 나 탭 풀이는 네 갈래 별. 안 읽은 줄은 옅은 주색, 읽은 줄은 회색 */
function KindIcon({ kind, read }: { kind: string; read: boolean }) {
  const stroke = read ? Colors.gray : Colors.accentText;
  const props = { fill: 'none', stroke, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <View aria-hidden importantForAccessibility="no-hide-descendants" style={styles.icon}>
      <Svg width={L.glyph} height={L.glyph} viewBox="0 0 24 24">
        {kind === 'INQUIRY_ANSWERED' ? (
          <>
            <Path d="M4 5h16v11H9l-5 4z" {...props} />
            <Path d="M8 9h8M8 12h5" {...props} />
          </>
        ) : kind === 'TIMING_REPORT_DONE' ? (
          <Path d="M15.5 4.2A8.5 8.5 0 1 0 19.8 15.5A7 7 0 0 1 15.5 4.2Z" {...props} />
        ) : (
          <Path d="M12 3.5Q13.4 10.6 20.5 12Q13.4 13.4 12 20.5Q10.6 13.4 3.5 12Q10.6 10.6 12 3.5Z" {...props} />
        )}
      </Svg>
    </View>
  );
}

function Row({ item, nickname, now, onOpen }: { item: NotificationItem; nickname: string | null; now: number; onOpen: (item: NotificationItem) => void }) {
  const text = notificationText(item, nickname);
  if (!text) return null;
  const time = timeLabel(item.createdAt, now);
  const unread = !item.read;
  return (
    <Pressable
      testID="notification-row"
      accessibilityRole="button"
      accessibilityLabel={[unread ? N.unread : null, text.title, text.body, time].filter(Boolean).join(', ')}
      onPress={() => onOpen(item)}
      style={[styles.row, unread && styles.unreadRow]}>
      <KindIcon kind={item.kind} read={item.read} />
      <View style={[styles.text, unread && styles.unreadText]}>
        <Txt variant="item" keepAll style={styles.title}>
          {text.title}
        </Txt>
        <Txt variant="notice" color="gray" keepAll>
          {text.body}
        </Txt>
        <Txt variant="meta" color="hint" style={styles.time}>
          {time}
        </Txt>
      </View>
      {unread ? <View testID="notification-unread" style={styles.dot} /> : null}
    </Pressable>
  );
}

/**
 * 알림함의 줄(보드 11-3): 받은 날로 묶은 이름(오늘 · 최근 7일 · 최근 30일)과 줄 — 아이콘 · 제목 · 본문 · 때, 안 읽은 줄은 떠 있는 면과 점.
 * 보이는 줄만 받는다(visibleNotifications). 누르면 onOpen(읽음 + 이동은 화면이 한다).
 */
export function NotificationGroups({
  items,
  nickname,
  now,
  onOpen,
}: {
  items: NotificationItem[];
  nickname: string | null;
  now: number;
  onOpen: (item: NotificationItem) => void;
}) {
  return (
    <View>
      {groupNotifications(items, now).map(({ group, items: rows }) => (
        <View key={group}>
          <Txt testID="notification-group" variant="captionStrong" color="hint" accessibilityRole="header" style={styles.group}>
            {N.groups[group]}
          </Txt>
          {rows.map((item) => (
            <Row key={item.id} item={item} nickname={nickname} now={now} onOpen={onOpen} />
          ))}
        </View>
      ))}
    </View>
  );
}

/** 비었을 때(결정 065 의 3, 보드 11-3-1): 둥근 그림 칸(종) · 제목 · 두 줄 설명을 머리 아래 640 칸의 가운데에 */
export function NotificationsEmpty() {
  return (
    <View testID="notifications-empty" style={styles.empty}>
      <View aria-hidden importantForAccessibility="no-hide-descendants" style={styles.emptyIcon}>
        <Svg width={L.empty.glyph} height={L.empty.glyph} viewBox="0 0 24 24" fill="none" stroke={Colors.accentText} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
          <Path d="M10 20a2 2 0 0 0 4 0" />
        </Svg>
      </View>
      <Txt variant="heading" accessibilityRole="header" style={styles.emptyTitle}>
        {N.empty.title}
      </Txt>
      <Txt color="gray" keepAll style={styles.emptyBody}>
        {N.empty.body}
      </Txt>
    </View>
  );
}

/**
 * 처음 불러올 때 뼈대(결정 065 의 2 · 071 — 다 그려진 알림함의 배치를 본뜬다): 묶음 이름 하나와 안 읽은 줄 셋(떠 있는 면 · 아이콘 칸 · 제목 · 본문 · 때).
 */
export function NotificationsSkeleton() {
  return (
    <SkeletonGroup testID="notifications-skeleton">
      <SkeletonText variant="captionStrong" widths={[36]} style={styles.group} />
      {Array.from({ length: L.skeleton.rows }, (_, i) => (
        <View key={i} testID="notification-skeleton-row" style={[styles.row, styles.unreadRow]}>
          <Skeleton width={L.icon} height={L.icon} pill />
          <View style={[styles.text, styles.unreadText]}>
            <SkeletonText variant="item" widths={[i === 1 ? '50%' : '58%']} />
            <SkeletonText variant="notice" widths={[i === 2 ? '72%' : '90%']} />
            <SkeletonText variant="meta" widths={[44]} style={styles.time} />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: L.groupTop, marginBottom: L.groupBottom },
  row: {
    flexDirection: 'row',
    gap: L.row.gap,
    paddingVertical: L.row.padV,
    paddingHorizontal: L.row.padX,
    marginHorizontal: -L.row.padX,
    marginBottom: L.row.bottom,
    borderRadius: L.row.radius,
  },
  unreadRow: { backgroundColor: Colors.raised },
  icon: { width: L.icon, height: L.icon, borderRadius: L.icon / 2, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: L.row.textGap },
  unreadText: { paddingRight: L.row.unreadRight },
  title: { fontWeight: FontWeight.semibold },
  time: { marginTop: L.row.timeTop },
  dot: {
    position: 'absolute',
    top: L.dot.top,
    right: L.dot.right,
    width: L.dot.size,
    height: L.dot.size,
    borderRadius: L.dot.size / 2,
    backgroundColor: Colors.primary,
  },
  empty: { height: L.empty.height, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: {
    width: L.empty.icon,
    height: L.empty.icon,
    borderRadius: L.empty.icon / 2,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { marginTop: L.empty.titleTop, textAlign: 'center' },
  emptyBody: { marginTop: L.empty.bodyTop, textAlign: 'center' },
});
