import { Page, Locator } from '@playwright/test';

/**
 * TodoページのPage Object
 */
export class TodoPage {
  readonly page: Page;
  
  // ロケーター
  readonly todoInput: Locator;
  readonly addButton: Locator;
  readonly searchInput: Locator;
  readonly filterButton: Locator;
  readonly logoutButton: Locator;
  readonly todoList: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.todoInput = page.getByPlaceholder('やることを入力...');
    this.addButton = page.getByRole('button', { name: /追加/ });
    this.searchInput = page.getByPlaceholder('検索...');
    this.filterButton = page.getByRole('button', { name: /filter/i });
    this.logoutButton = page.getByRole('button', { name: /ログアウト/ });
    this.todoList = page.locator('ul.divide-y');
    this.emptyState = page.locator('text=タスクがまだありません');
  }

  /**
   * Todoページに移動
   */
  async goto() {
    await this.page.goto('/');
  }

  /**
   * Todoを追加する
   */
  async addTodo(title: string) {
    await this.todoInput.fill(title);
    await this.addButton.click();
  }

  /**
   * 検索を行う
   */
  async search(query: string) {
    await this.searchInput.fill(query);
  }

  /**
   * フィルターパネルを表示する
   */
  async showFilters() {
    await this.filterButton.click();
  }

  /**
   * ログアウトする
   */
  async logout() {
    await this.logoutButton.click();
  }

  /**
   * 特定のTodo要素を取得
   */
  getTodoItem(title: string): Locator {
    return this.todoList.locator(`li:has-text("${title}")`);
  }

  /**
   * Todoのチェックボックスをクリック
   */
  async toggleTodo(title: string) {
    const todoItem = this.getTodoItem(title);
    await todoItem.scrollIntoViewIfNeeded();
    // shadcn/uiのCheckboxはspan要素をクリック
    const checkboxWrapper = todoItem.locator('span[role="checkbox"]').first();
    await checkboxWrapper.click();
  }

  /**
   * Todoを削除
   */
  async deleteTodo(title: string) {
    const todoItem = this.getTodoItem(title);
    await todoItem.scrollIntoViewIfNeeded();
    await todoItem.hover();
    // 削除ボタンはTrash2アイコンを含むbutton
    const deleteButton = todoItem.locator('button:has(svg)').last();
    await deleteButton.click();
  }

  /**
   * Todoの完了状態を確認
   */
  async isTodoCompleted(title: string): Promise<boolean> {
    const todoItem = this.getTodoItem(title);
    const textElement = todoItem.locator('span.line-through');
    return await textElement.isVisible().catch(() => false);
  }
}
