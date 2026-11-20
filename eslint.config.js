// https://docs.expo.dev/guides/using-eslint/
const fs = require('node:fs');
const path = require('node:path');
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// 의존 규칙: docs/architecture.md "의존 규칙", 결정 017.
// 다른 기능이 가져다 써도 되는 파일(features/ 기준 경로).
const SHARED_FEATURE_FILES = ['./chart/ChartWheel.tsx', './auth/use-session.ts', './audio/use-soundtrack.ts', './reason/reason-sentence.ts', './reason/reason-line.tsx', './push/push.ts', './push/push-data.ts'];

// 폴더 목록은 설정을 읽을 때 만든다. 에디터의 ESLint 는 새 폴더를 만든 뒤 재시작해야 반영된다.
const subdirs = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

const srcDir = path.join(__dirname, 'src');
const features = subdirs(path.join(srcDir, 'features'));
// app·features·__tests__ 말고는 모두 공용으로 본다(components·constants·content·lib, 새로 생기는 최상위 폴더도).
const shared = subdirs(srcDir).filter((name) => !['app', 'features', '__tests__'].includes(name));

const boundaryZones = [
  {
    target: shared.map((name) => `./src/${name}`),
    from: ['./src/app', './src/features'],
    message: '공용(app·features 밖의 src/ 폴더)은 app·features 를 import 하지 않는다.',
  },
  {
    target: './src/features',
    from: './src/app',
    message: 'features 는 app 을 import 하지 않는다. 화면은 위, 기능은 아래.',
  },
  ...features.map((name) => ({
    target: `./src/features/${name}`,
    from: './src/features',
    except: [`./${name}`, ...SHARED_FEATURE_FILES],
    message: '기능은 다른 기능을 import 하지 않는다(예외: eslint.config.js 의 SHARED_FEATURE_FILES).',
  })),
  {
    target: './src/features/*.*',
    from: './src/features',
    message: 'features/ 바로 아래에는 파일을 두지 않는다. 기능 폴더 안에 둔다.',
  },
];

const fetchMessage = '서버 호출은 src/lib/ 에서만 한다(lib/api.ts).';

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'import/no-restricted-paths': ['error', { zones: boundaryZones }],
    },
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    ignores: ['src/lib/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: fetchMessage },
        { name: 'XMLHttpRequest', message: fetchMessage },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'globalThis', property: 'fetch', message: fetchMessage },
        { object: 'global', property: 'fetch', message: fetchMessage },
        { object: 'window', property: 'fetch', message: fetchMessage },
        { object: 'self', property: 'fetch', message: fetchMessage },
      ],
      'no-restricted-imports': ['error', { paths: [{ name: 'expo/fetch', message: fetchMessage }] }],
    },
  },
]);
