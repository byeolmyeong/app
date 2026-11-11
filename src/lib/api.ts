/**
 * 서버 호출. 타입은 서버 저장소 docs/architecture.md "API 계약" 을 옮긴 것이다.
 * 계약에 없는 필드는 여기서 만들지 않는다. 어긋나면 서버 저장소의 계약 표를 먼저 고친다.
 * 출생 정보와 세션 토큰은 로그에 남기지 않는다(이 파일은 아무것도 기록하지 않는다).
 */
import { fixtures } from '@/lib/fixtures';

// ── 계약의 타입 ────────────────────────────────────────────────────────────

/** `GET /places` 의 한 줄. name 은 "시·도 시·군·구" 꼴이고 세종만 한 낱말이다 */
export type Place = { id: number; name: string; lat: number; lon: number };

/** `POST /charts`·`PUT /profile` 의 요청. date 는 YYYY-MM-DD, time 은 HH:mm 또는 null("모름") */
export type BirthInput = { date: string; time: string | null; placeId: number };

/** 별자리 안 위치와 황경(0 이상 360 미만). 상승점·중천의 값 */
export type SignPosition = {
  sign: string;
  degree: number;
  minute: number;
  longitude: number;
};

/** 천체의 위치. house 는 시각을 알 때만 온다 */
export type Position = SignPosition & {
  body: string;
  house?: number;
  retrograde: boolean;
};

/** 추가 지점(NORTH_NODE·LILITH·FORTUNE·VERTEX)의 위치. FORTUNE·VERTEX 는 시각을 알 때만 온다 */
export type Point = SignPosition & { point: string; house?: number };

/** 하우스 경계. house 는 1~12 */
export type House = SignPosition & { house: number };

export type Aspect = {
  a: string;
  b: string;
  type: string;
  orb: number;
  applying: boolean;
};

export type Chart = {
  timeKnown: boolean;
  /** 하우스 방식 이름. 지금은 "PLACIDUS" */
  houseSystem: string;
  /** 시각을 모르고 그날 안에 달 별자리가 바뀔 때만 true 로 온다 */
  moonSignMayChange?: boolean;
  positions: Position[];
  points: Point[];
  /** 1~12 하우스 경계. 시각 "모름" 이면 없다 */
  houses?: House[];
  /** 상승점·중천. 시각 "모름" 이면 없다 */
  angles?: { asc: SignPosition; mc: SignPosition };
  aspects: Aspect[];
};

export type Reading = {
  headline: string;
  sections: { title: string; body: string; basis: string[] }[];
  strengths: string[];
  cautions: string[];
  shareId: string;
};

export type ReportStatus = 'NONE' | 'WRITING' | 'DONE';

/** 계약에 `Report` 의 필드가 아직 없다. 태스크 6 전에 서버 계약에 추가되어야 한다. */
export type Report = Record<string, unknown>;

/** `GET /reports/me` */
export type ReportState = { status: ReportStatus; report?: Report };

export type Synastry = {
  id: string;
  names: [string, string];
  headline: string;
  keywords: [string, string, string];
  /** 계약에 모양이 아직 없다("나의 차트와 상대 점의 화면 좌표용 황경"). 태스크 7 전에 정해져야 한다. */
  overlay: unknown;
  shareId: string;
  reportStatus: ReportStatus;
};

// ── 결과 ───────────────────────────────────────────────────────────────────

/**
 * LOGIN_REQUIRED 401 · LIMIT 429(횟수 한도) · NETWORK 응답을 받지 못함 ·
 * SERVER 그 밖의 실패 상태 · INVALID 성공 상태지만 모양이 계약과 다름
 */
export type ApiErrorKind = 'LOGIN_REQUIRED' | 'LIMIT' | 'NETWORK' | 'SERVER' | 'INVALID';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiErrorKind; status?: number };

// ── 응답 검사 (외부 입력은 쓰기 전에 모양을 확인한다) ──────────────────────

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const isSignPosition = (v: unknown): v is SignPosition =>
  isObject(v) &&
  typeof v.sign === 'string' &&
  typeof v.degree === 'number' &&
  typeof v.minute === 'number' &&
  typeof v.longitude === 'number';

const isOptionalNumber = (v: unknown) => ['number', 'undefined'].includes(typeof v);

const isPosition = (v: unknown): v is Position =>
  isSignPosition(v) &&
  typeof (v as Record<string, unknown>).body === 'string' &&
  typeof (v as Record<string, unknown>).retrograde === 'boolean' &&
  isOptionalNumber((v as Record<string, unknown>).house);

const isPoint = (v: unknown): v is Point =>
  isSignPosition(v) &&
  typeof (v as Record<string, unknown>).point === 'string' &&
  isOptionalNumber((v as Record<string, unknown>).house);

const isHouse = (v: unknown): v is House =>
  isSignPosition(v) && typeof (v as Record<string, unknown>).house === 'number';

const isAspect = (v: unknown): v is Aspect =>
  isObject(v) &&
  typeof v.a === 'string' &&
  typeof v.b === 'string' &&
  typeof v.type === 'string' &&
  typeof v.orb === 'number' &&
  typeof v.applying === 'boolean';

export function isChart(v: unknown): v is Chart {
  if (!isObject(v) || typeof v.timeKnown !== 'boolean' || typeof v.houseSystem !== 'string') return false;
  if (!['boolean', 'undefined'].includes(typeof v.moonSignMayChange)) return false;
  if (!Array.isArray(v.positions) || !v.positions.every(isPosition)) return false;
  if (!Array.isArray(v.points) || !v.points.every(isPoint)) return false;
  if (!Array.isArray(v.aspects) || !v.aspects.every(isAspect)) return false;
  if (v.houses !== undefined && !(Array.isArray(v.houses) && v.houses.length === 12 && v.houses.every(isHouse)))
    return false;
  if (v.angles !== undefined && !(isObject(v.angles) && isSignPosition(v.angles.asc) && isSignPosition(v.angles.mc)))
    return false;
  return true;
}

export function isPlaceList(v: unknown): v is Place[] {
  return (
    Array.isArray(v) &&
    v.every(
      (p) =>
        isObject(p) &&
        typeof p.id === 'number' &&
        typeof p.name === 'string' &&
        typeof p.lat === 'number' &&
        typeof p.lon === 'number',
    )
  );
}

// ── 호출 ───────────────────────────────────────────────────────────────────

export type ApiConfig = {
  baseUrl: string;
  /** 세션 토큰을 돌려준다. 없으면 null. 보관은 features/auth 가 한다(태스크 4) */
  getToken: () => string | null;
  fetchFn?: typeof fetch;
  /** 개발용 가짜 서버. 켜면 서버를 부르지 않고 fixtures 로 답한다 */
  useFixtures?: boolean;
};

type RequestOptions<T> = { body?: unknown; validate: (v: unknown) => v is T };

export function createApi(config: ApiConfig) {
  /** 다시 시도하지 않는다. 다시 시도는 화면에서 사용자가 누를 때만 한다. */
  async function request<T>(method: 'GET' | 'POST', path: string, options: RequestOptions<T>): Promise<ApiResult<T>> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    const token = config.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let response: Response;
    try {
      response = await (config.fetchFn ?? fetch)(`${config.baseUrl}${path}`, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch {
      return { ok: false, error: 'NETWORK' };
    }

    const { status } = response;
    if (status === 401) return { ok: false, error: 'LOGIN_REQUIRED', status };
    if (status === 429) return { ok: false, error: 'LIMIT', status };
    if (!response.ok) return { ok: false, error: 'SERVER', status };

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { ok: false, error: 'INVALID', status };
    }
    return options.validate(data) ? { ok: true, data } : { ok: false, error: 'INVALID', status };
  }

  return {
    /** `GET /places` 국내 시·군·구 전체 목록. 화면이 시·도별로 묶어 고르게 한다 */
    async listPlaces(): Promise<ApiResult<Place[]>> {
      if (config.useFixtures) return { ok: true, data: fixtures.places };
      return request('GET', '/places', { validate: isPlaceList });
    },

    /** `POST /charts` 로그인 없이 차트를 받는다 */
    async createChart(input: BirthInput): Promise<ApiResult<Chart>> {
      if (config.useFixtures)
        return {
          ok: true,
          data: input.time === null ? fixtures.chartTimeUnknown : fixtures.chart,
        };
      return request('POST', '/charts', { body: input, validate: isChart });
    },
  };
}

export type Api = ReturnType<typeof createApi>;

let sessionToken: string | null = null;

/** 로그인·로그아웃 때 features/auth 가 부른다(태스크 4). */
export function setSessionToken(token: string | null) {
  sessionToken = token;
}

/** 앱이 쓰는 인스턴스. 서버 주소와 가짜 서버 스위치는 환경 변수에서 온다(.env.example). */
export const api = createApi({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
  getToken: () => sessionToken,
  useFixtures: process.env.EXPO_PUBLIC_USE_FIXTURES === '1',
});
