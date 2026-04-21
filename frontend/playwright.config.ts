import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright設定ファイル
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e/tests',
  
  /* 失敗したテストを再実行 */
  fullyParallel: false,
  
  /* CI上ではフォールトを許可しない */
  forbidOnly: !!process.env.CI,
  
  /* 再試行回数 */
  retries: process.env.CI ? 2 : 0,
  
  /* 並列実行数 - レートリミット回避のため1に設定 */
  workers: 1,
  
  /* レポート設定 */
  reporter: 'html',
  
  /* グローバルなタイムアウト（ミリ秒） */
  timeout: 30 * 1000,
  
  /* 各テストのタイムアウト */
  expect: {
    timeout: 5000
  },

  use: {
    /* グローバルなタイムアウト（ミリ秒） */
    actionTimeout: 0,
    
    /* ベースURL */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    /* テスト失敗時にトレースを収集 */
    trace: 'on-first-retry',
    
    /* スクリーンショット */
    screenshot: 'only-on-failure',
    
    /* ビデオ */
    video: 'on-first-retry',
  },

  /* ブラウザ設定 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* テストサーバー設定 */
  webServer: {
    command: 'bun dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
