import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useAppFonts } from '@/components/use-app-fonts.web';
import { FontFamily } from '@/constants/theme';

/** 웹: 스플래시는 루트 HTML 이 미리 받는 핵심 묶음 셋이 다 받아질 때까지 기다린다(글자가 바뀌어 보이지 않게) */
function Probe() {
  const [loaded, error] = useAppFonts();
  return <Text testID="fonts">{`${loaded}/${error ? 'error' : 'none'}`}</Text>;
}

const g = globalThis as unknown as { document?: { fonts?: { load: jest.Mock<Promise<unknown[]>, [string, string]> } } };
afterEach(() => {
  delete g.document;
});

describe('useAppFonts(웹)', () => {
  it('굵기 셋(400 · 500 · 600)의 핵심 묶음을 그 이름으로 받아 다 받아지면 loaded', async () => {
    const load = jest.fn<Promise<unknown[]>, [string, string]>(async () => [{}]);
    g.document = { fonts: { load } };
    await render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('fonts').props.children).toBe('true/none'));
    expect(load.mock.calls.map((c) => c[0])).toEqual([`400 16px "${FontFamily}"`, `500 16px "${FontFamily}"`, `600 16px "${FontFamily}"`]);
  });

  it('글꼴 규칙이 없으면(받은 것 0) 오류 — 스플래시는 기다림을 멈춘다', async () => {
    g.document = { fonts: { load: jest.fn<Promise<unknown[]>, [string, string]>(async () => []) } };
    await render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('fonts').props.children).toBe('false/error'));
  });

  it('받지 못하면 오류, document.fonts 가 없으면 기다리지 않는다', async () => {
    g.document = { fonts: { load: jest.fn<Promise<unknown[]>, [string, string]>(async () => Promise.reject(new Error('net'))) } };
    const view = await render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('fonts').props.children).toBe('false/error'));
    await view.unmount();
    g.document = {};
    await render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('fonts').props.children).toBe('true/none'));
  });
});
