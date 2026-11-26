import { clearDeviceData } from '@/features/auth/delete-account';
import { signOut } from '@/features/auth/sign-out';
import { signOutSession } from '@/features/auth/use-session';
import { unregisterPushDevice } from '@/features/push/push';

jest.mock('@/features/auth/delete-account', () => ({ clearDeviceData: jest.fn(async () => {}) }));
jest.mock('@/features/auth/use-session', () => ({ signOutSession: jest.fn(async () => {}) }));
jest.mock('@/features/push/push', () => ({ unregisterPushDevice: jest.fn(async () => {}) }));

describe('로그아웃(결정 034 · 057)', () => {
  it('세션을 지우기 전에 이 기기의 푸시 등록을 지운다(세션이 있어야 지울 수 있다), 그다음 기기 정리 · 세션', async () => {
    await signOut();
    const order = [unregisterPushDevice, clearDeviceData, signOutSession].map((f) => (f as jest.Mock).mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});
