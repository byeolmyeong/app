import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import TermsStep from '@/app/signup/terms';
import { LEGAL_VERSIONS } from '@/content/legal-versions';
import { strings } from '@/content/strings';
import { clearDraft, getDraft, setDraft } from '@/features/auth/signup-draft';
import { useAuth } from '@/features/auth/use-session';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('@/features/auth/use-session', () => ({ useAuth: jest.fn() }));

const T = strings.terms;
const cancelSignup = jest.fn(async () => {});

beforeEach(() => {
  jest.clearAllMocks();
  clearDraft();
  (useAuth as jest.Mock).mockReturnValue({ status: 'signingUp', cancelSignup });
});

const check = (name: string) => screen.getByRole('checkbox', { name });
const isChecked = (name: string) => check(name).props.accessibilityState?.checked === true;
const nextDisabled = () => screen.getByRole('button', { name: T.next }).props.accessibilityState?.disabled === true;
const ITEMS = [
  `${T.required} ${T.items.terms}`,
  `${T.required} ${T.items.privacy}`,
  `${T.optional} ${T.items.push}`,
  `${T.optional} ${T.items.marketing}`,
];

// 가입 1단계: 약관 동의(결정 041, 보드 6 · 6-1)
describe('약관 단계', () => {
  it('처음에는 모두 꺼져 있고(선택도 기본 꺼짐) 다음을 누를 수 없다', async () => {
    await render(<TermsStep />);
    expect(screen.getByText(T.title)).toBeTruthy();
    for (const name of [T.all, ...ITEMS]) expect(isChecked(name)).toBe(false);
    expect(nextDisabled()).toBe(true);
  });

  it('필수 둘이 켜져야 다음을 누를 수 있고, 필수 하나라도 꺼지면 다시 꺼진다', async () => {
    await render(<TermsStep />);
    await fireEvent.press(check(ITEMS[0]));
    expect(nextDisabled()).toBe(true);
    await fireEvent.press(check(ITEMS[1]));
    expect(nextDisabled()).toBe(false);
    expect(isChecked(ITEMS[2])).toBe(false);
    expect(isChecked(ITEMS[3])).toBe(false);
    await fireEvent.press(check(ITEMS[0]));
    expect(nextDisabled()).toBe(true);
  });

  it('모두 동의는 넷을 한 번에 켜고, 넷이 다 켜져 있으면 한 번에 끈다', async () => {
    await render(<TermsStep />);
    await fireEvent.press(check(T.all));
    for (const name of ITEMS) expect(isChecked(name)).toBe(true);
    expect(isChecked(T.all)).toBe(true);
    await fireEvent.press(check(ITEMS[3]));
    expect(isChecked(T.all)).toBe(false);
    await fireEvent.press(check(ITEMS[3]));
    expect(isChecked(T.all)).toBe(true);
    await fireEvent.press(check(T.all));
    for (const name of ITEMS) expect(isChecked(name)).toBe(false);
  });

  it('다음을 누르면 약관 · 처리방침 버전과 동의를 초안에 두고 닉네임 단계로', async () => {
    await render(<TermsStep />);
    await fireEvent.press(check(ITEMS[0]));
    await fireEvent.press(check(ITEMS[1]));
    await fireEvent.press(check(ITEMS[3]));
    await fireEvent.press(screen.getByRole('button', { name: T.next }));
    expect(getDraft()).toEqual({
      termsVersion: LEGAL_VERSIONS.terms,
      privacyVersion: LEGAL_VERSIONS.privacy,
      pushConsent: false,
      marketingConsent: true,
    });
    expect(router.push).toHaveBeenCalledWith('/signup/nickname');
  });

  it('닉네임 단계에서 돌아오면 초안의 동의가 그대로 켜져 있다', async () => {
    setDraft({ termsVersion: LEGAL_VERSIONS.terms, privacyVersion: LEGAL_VERSIONS.privacy, pushConsent: true, marketingConsent: false });
    await render(<TermsStep />);
    expect(isChecked(ITEMS[0])).toBe(true);
    expect(isChecked(ITEMS[2])).toBe(true);
    expect(isChecked(ITEMS[3])).toBe(false);
    expect(nextDisabled()).toBe(false);
  });

  it('보기는 약관 · 처리방침 화면으로(마케팅은 처리방침)', async () => {
    await render(<TermsStep />);
    const views = screen.getAllByRole('link', { name: T.view });
    expect(views).toHaveLength(3);
    await fireEvent.press(views[0]);
    await fireEvent.press(views[1]);
    await fireEvent.press(views[2]);
    expect((router.push as jest.Mock).mock.calls).toEqual([['/settings/terms'], ['/settings/privacy'], ['/settings/privacy']]);
  });

  it('뒤로 가면 가입을 그만두고(가입권 · 초안을 버린다) 로그인 화면은 가드가 보낸다', async () => {
    setDraft({ termsVersion: LEGAL_VERSIONS.terms, privacyVersion: LEGAL_VERSIONS.privacy, pushConsent: false, marketingConsent: false });
    await render(<TermsStep />);
    await fireEvent.press(screen.getByRole('button', { name: strings.common.backLabel }));
    expect(cancelSignup).toHaveBeenCalledTimes(1);
    expect(getDraft()).toBeNull();
  });
});

// 리뷰 초점 1: 가입 중 앱을 껐다 켜면 초안이 남지 않는다(메모리만)
describe('가입 초안', () => {
  it('앱을 다시 켜면(모듈을 새로 불러오면) 비어 있다', () => {
    setDraft({ termsVersion: '2026-11-19', privacyVersion: '2026-11-19', pushConsent: false, marketingConsent: false });
    jest.isolateModules(() => {
      const fresh = jest.requireActual<typeof import('@/features/auth/signup-draft')>('@/features/auth/signup-draft');
      expect(fresh.getDraft()).toBeNull();
    });
  });

  it('약관 단계를 거치기 전(버전이 없으면)에는 초안이 없는 것으로 본다', () => {
    setDraft({ nickname: '새벽별' });
    expect(getDraft()).toBeNull();
    setDraft({ termsVersion: '2026-11-19', privacyVersion: '2026-11-19', pushConsent: false, marketingConsent: false });
    expect(getDraft()).toMatchObject({ nickname: '새벽별' });
    clearDraft();
    expect(getDraft()).toBeNull();
  });
});
