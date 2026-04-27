import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { createTestUser } from '../fixtures/user-fixture';

test.describe('Authentication Flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should display login form', async () => {
    // ログインフォームが表示されていることを確認
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.registerLink).toBeVisible();
  });

  test('should show error with invalid credentials', async () => {
    // 無効な認証情報でログインを試行
    await loginPage.login('invaliduser', 'wrongpassword');
    
    // エラーメッセージが表示されることを確認
    // ページ上のエラーテキストまたはtoastのテキストを検出
    await loginPage.page.waitForTimeout(2000); // APIレスポンスを待つ
    
    // 複数のエラー表示方法を試す
    const pageError = loginPage.page.locator('p.text-red-500').filter({ hasText: /ログイン|認証|失敗/ });
    const toastError = loginPage.page.locator('[data-sonner-toast]').filter({ hasText: /ログイン|認証|失敗/ });
    
    // どちらかが表示されればOK
    const isVisible = await pageError.isVisible().catch(() => false) || 
                      await toastError.isVisible().catch(() => false);
    expect(isVisible).toBe(true);
  });

  test('should navigate to register page', async () => {
    // 登録リンクをクリック
    await loginPage.goToRegister();
    
    // 登録ページにリダイレクトされることを確認
    await expect(loginPage.page).toHaveURL('/register', { timeout: 10000 });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // テストユーザーを作成
    const testUsername = `testuser_${Date.now()}`;
    const testPassword = 'testpassword123';
    
    await createTestUser(testUsername, testPassword);
    
    // ログイン
    await loginPage.login(testUsername, testPassword);
    
    // ホームページにリダイレクトされることを確認
    await page.waitForURL('http://localhost:3000/', { timeout: 10000 });
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 10000 });
    
    // Todoページが表示されていることを確認
    await expect(page.getByRole('heading', { name: /タスク/ })).toBeVisible();
  });
});

test.describe('Login Form Validation', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should show validation error for empty username', async () => {
    await loginPage.login('', 'somepassword');
    
    // バリデーションエラーが表示されることを確認
    await expect(loginPage.page.locator('text=ユーザー名は3文字以上で入力してください')).toBeVisible({ timeout: 5000 });
  });

  test('should show validation error for empty password', async () => {
    await loginPage.login('testuser', '');
    
    // バリデーションエラーが表示されることを確認
    await expect(loginPage.page.locator('text=パスワードは6文字以上で入力してください')).toBeVisible({ timeout: 5000 });
  });
});
