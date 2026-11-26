import type * as Amplitude from '@amplitude/analytics-react-native';

import { sanitize, type EventName, type EventProps } from './events';
import { loadSdk } from './sdk';

/**
 * 제품 분석(결정 040 · 081). 화면 코드는 SDK 를 직접 부르지 않고 여기만 부른다.
 * 키(`EXPO_PUBLIC_AMPLITUDE_API_KEY`)가 없으면 아무것도 보내지 않고 개발 중 콘솔에만 찍는다.
 * SDK 는 키가 있을 때만 나중에 불러온다(동적 import) — 웹의 첫 화면 묶음에 넣지 않고, 키가 없는 테스트앱 · 스테이징 · 로컬은 아예 불러오지 않는다.
 * 불러오기 전의 호출은 잠깐 모았다가 불러온 뒤 차례로 보낸다. SDK 의 오류는 앱으로 새지 않는다.
 */
type Sdk = typeof Amplitude;

/** 키가 있어 초기화를 시작했다(SDK 를 불러오는 중이어도 true) */
let enabled = false;
let sdk: Sdk | null = null;
/** 불러오기 전에 들어온 호출. 끝없이 쌓이지 않게 상한을 둔다 — 넘치면 버린다(분석은 앱을 막지 않는다) */
let pending: ((s: Sdk) => void)[] = [];
const PENDING_MAX = 100;

/** 서버 `GET /auth/analytics-id` 의 분석용 id 모양(접두어를 붙인 계정 id 의 SHA-256 앞 32자) */
const ANALYTICS_ID = /^[0-9a-f]{32}$/;

function devWarn(message: string) {
  if (__DEV__) console.warn(`[analytics] ${message}`);
}

function guard(work: () => void) {
  try {
    work();
  } catch {
    devWarn('SDK 오류를 삼켰다');
  }
}

/** SDK 를 불러왔으면 바로, 불러오는 중이면 모아 둔다. 꺼져 있으면 아무것도 하지 않는다 */
function run(call: (s: Sdk) => void) {
  if (!enabled) return;
  if (sdk) return guard(() => call(sdk as Sdk));
  if (pending.length < PENDING_MAX) pending.push(call);
}

/** 앱이 켜질 때 한 번. 두 번 불러도 한 번만 초기화한다 */
export function initAnalytics(): void {
  const apiKey = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY?.trim();
  if (enabled || !apiKey) return;
  enabled = true;
  loadSdk()
    .then((amplitude) => {
      guard(() =>
        amplitude.init(apiKey, undefined, {
          logLevel: amplitude.Types.LogLevel.Warn,
          // 광고 식별자·IP 를 저장하지 않는다(추적 허용 창을 띄우지 않는다)
          trackingOptions: { ipAddress: false, adid: false, appSetId: false, idfv: false, carrier: false },
          // 세션만 자동으로 센다. 화면은 경로 패턴으로 직접 보낸다(`screen_viewed`)
          autocapture: {
            sessions: true,
            appLifecycles: false,
            screenViews: false,
            elementInteractions: false,
            frustrationInteractions: false,
            networkTracking: false,
          },
          // 웹의 유입 정보(레퍼러·주소)는 보내지 않는다
          attribution: { disabled: true },
        }),
      );
      sdk = amplitude;
      const calls = pending;
      pending = [];
      for (const call of calls) guard(() => call(amplitude));
    })
    .catch(() => {
      // 불러오지 못하면(끊긴 웹 등) 이번 실행은 끈다
      enabled = false;
      pending = [];
      devWarn('SDK 를 불러오지 못했다');
    });
}

/** 분석이 켜져 있는가(키가 있어 초기화했다). 운영에서만 true — 테스트앱 · 스테이징 · 로컬은 false(결정 081) */
export const isAnalyticsEnabled = (): boolean => enabled;

export function track<E extends EventName>(event: E, props: EventProps<E>): void {
  const clean = sanitize(event, props as Record<string, unknown>);
  if (!clean) return devWarn(`표에 없는 이벤트라 보내지 않는다: ${event}`);
  if (clean.dropped.length > 0) devWarn(`${event}: 값 목록 밖이라 버린 속성 ${clean.dropped.join(', ')}`);
  if (!enabled) {
    if (__DEV__ && process.env.NODE_ENV !== 'test') console.log('[analytics]', clean.event, clean.props);
    return;
  }
  run((s) => s.track(clean.event, clean.props));
}

/** 로그인 뒤 서버가 준 분석용 id 로 이어 붙인다. 모양이 다르면(이메일·계정 id 등) 보내지 않는다 */
export function identify(analyticsId: string): void {
  if (!ANALYTICS_ID.test(analyticsId)) return devWarn('분석용 id 모양이 아니라 보내지 않는다');
  run((s) => s.setUserId(analyticsId));
}

/** 로그아웃·계정 삭제 뒤. 사용자 id 를 지우고 기기 id 를 새로 만든다 */
export function resetAnalytics(): void {
  run((s) => s.reset());
}
