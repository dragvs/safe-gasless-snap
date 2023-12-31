import type { SnapConfig } from '@metamask/snaps-cli';
import { resolve } from 'path';

const config: SnapConfig = {
  bundler: 'webpack',
  input: resolve(__dirname, 'src/index.ts'),
  server: {
    port: 8080,
  },
  polyfills: {
    buffer: true,
    process: true,
  },
  environment: {
    TEST_NETWORK: '',
    ZKSYNC_WEB3_API_URL: '',
  },
};

export default config;
