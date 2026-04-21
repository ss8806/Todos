import { Page, Locator } from '@playwright/test';

/**
 * ログインページのPage Object
 */
export class LoginPage {
  readonly page: Page;
  
  // ロケーター
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly registerLink: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('ユーザー名');
    this.passwordInput = page.getByLabel('パスワード');
    this.submitButton = page.getByRole('button', { name: /ログイン/ });
    this.registerLink = page.getByRole('link', { name: /アカウントを作成/ });
    this.errorMessage = page.getByText(/ログインに失敗しました/).or(page.locator('text=Error'));
  }

  /**
   * ログインページに移動
   */
  async goto() {
    await this.page.goto('/login');
  }

  /**
   * ログインフォームに入力して送信
   */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * 登録ページに移動
   */
  async goToRegister() {
    await this.registerLink.click();
  }
}
