// https://docs.expo.dev/guides/using-eslint/
const fs = require('node:fs');
const path = require('node:path');
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// 의존 규칙: docs/architecture.md "의존 규칙", 결정 017.
// 다른 기능이 가져다 써도 되는 파일(features/ 기준 경로).
const SHARED_FEATURE_FILES = ['./chart/ChartWheel.tsx', './auth/use-session.ts'];

const featuresDir = path.join(__dirname, 'src', 'features');
const features = fs
  .readdirSync(featuresDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const boundaryZones = [
  {
    target: ['./src/components', './src/constants', './src/content', './src/lib'],
    from: ['./src/app', './src/features'],
    message: '공용(components·constants·content·lib)은 app·features 를 import 하지 않는다.',
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
    message: '기능은 다른 기능을 import 하지 않는다(예외: chart 의 ChartWheel, auth 의 세션 훅).',
  })),
];

const fetchMessage = '서버 호출은 src/lib/api.ts 로만 한다.';

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
      'no-restricted-globals': ['error', { name: 'fetch', message: fetchMessage }],
      'no-restricted-properties': [
        'error',
        { object: 'globalThis', property: 'fetch', message: fetchMessage },
        { object: 'global', property: 'fetch', message: fetchMessage },
        { object: 'window', property: 'fetch', message: fetchMessage },
      ],
    },
  },
]);
