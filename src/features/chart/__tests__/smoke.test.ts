describe('테스트 환경', () => {
  it('Jest 가 TypeScript 테스트를 실행한다', () => {
    const degrees: number = 360;
    expect(degrees / 12).toBe(30);
  });
});
