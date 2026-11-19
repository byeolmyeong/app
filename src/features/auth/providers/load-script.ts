/** 웹: 공급자의 공식 스크립트를 한 번만 싣는다(구글 · 애플). 같은 주소를 여러 번 불러도 한 번이다 */
const loading = new Map<string, Promise<void>>();

export function loadScript(src: string): Promise<void> {
  let promise = loading.get(src);
  if (!promise) {
    promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loading.delete(src);
        reject(new Error('script'));
      };
      document.head.appendChild(script);
    });
    loading.set(src, promise);
  }
  return promise;
}
