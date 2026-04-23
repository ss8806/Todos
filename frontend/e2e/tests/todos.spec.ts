import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { TodoPage } from '../pages/todo.page';
import { createTestUser } from '../fixtures/user-fixture';

test.describe('Todo CRUD Operations', () => {
  let loginPage: LoginPage;
  let todoPage: TodoPage;
  let testUsername: string;

  test.beforeEach(async ({ page }) => {
    // 共通のテストユーザーを使用（レートリミット回避）
    testUsername = 'e2e_test_user';
    await createTestUser(testUsername, 'testpassword123');
    
    loginPage = new LoginPage(page);
    todoPage = new TodoPage(page);
    
    // ログイン
    await loginPage.goto();
    await loginPage.login(testUsername, 'testpassword123');
    await page.waitForTimeout(1500); // レートリミット回避
    await page.waitForURL('http://localhost:3000/', { timeout: 10000 });
    
    // テスト前に既存のTodoをクリーンアップ
    await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      const API_BASE_URL = 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/todos/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const todos = await response.json();
      
      // 既存のTodoを削除
      for (const todo of todos) {
        await fetch(`${API_BASE_URL}/todos/${todo.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    });
    
    await page.reload();
    await page.waitForTimeout(500);
  });

  test.afterEach(async () => {
    // テスト間に待機時間を追加（レートリミット回避）
    await new Promise(resolve => setTimeout(resolve, 4000));
  });

  test.slow(); // テストタイムアウトを3倍に

  test('should display empty state when no todos', async () => {
    await todoPage.goto();
    
    // 空の状態が表示されていることを確認
    await expect(todoPage.emptyState).toBeVisible({ timeout: 10000 });
  });

  test('should add a new todo', async () => {
    await todoPage.goto();
    
    // Todoを追加
    await todoPage.addTodo('テストTodo 1');
    
    // Todoがリストに表示されることを確認
    const todoItem = todoPage.getTodoItem('テストTodo 1');
    await expect(todoItem).toBeVisible({ timeout: 10000 });
  });

  test('should toggle todo completion', async () => {
    await todoPage.goto();
    
    // Todoを追加
    await todoPage.addTodo('完了テスト');
    await expect(todoPage.getTodoItem('完了テスト')).toBeVisible({ timeout: 10000 });
    
    // チェックボックスをクリックして完了にする
    await todoPage.toggleTodo('完了テスト');
    
    // 取り消し線が表示されることを確認
    await expect(todoPage.getTodoItem('完了テスト').locator('span.line-through')).toBeVisible({ timeout: 5000 });
  });

  test('should delete a todo', async () => {
    await todoPage.goto();
    
    // Todoを追加
    await todoPage.addTodo('削除テスト');
    await expect(todoPage.getTodoItem('削除テスト')).toBeVisible({ timeout: 10000 });
    
    // Todoを削除
    await todoPage.deleteTodo('削除テスト');
    
    // Todoが削除されることを確認
    await expect(todoPage.getTodoItem('削除テスト')).not.toBeVisible({ timeout: 10000 });
  });

  test('should search todos', async ({ page }) => {
    await todoPage.goto();
    
    // 複数のTodoを追加
    await todoPage.addTodo('買い物');
    await page.waitForTimeout(500); // Todo追加後の待機
    await todoPage.addTodo('勉強');
    await expect(todoPage.getTodoItem('買い物')).toBeVisible({ timeout: 10000 });
    await expect(todoPage.getTodoItem('勉強')).toBeVisible({ timeout: 10000 });
    
    // 検索を実行
    await todoPage.search('買い物');
    
    // 検索結果が表示され、一致しないTodoが表示されないことを確認
    await expect(todoPage.getTodoItem('買い物')).toBeVisible({ timeout: 5000 });
    // 検索結果から「勉強」が消えることを期待
    await expect(todoPage.getTodoItem('勉強')).not.toBeVisible({ timeout: 5000 });
  });

  test('should add multiple todos', async ({ page }) => {
    await todoPage.goto();
    
    // 複数のTodoを追加
    await todoPage.addTodo('Todo 1');
    await page.waitForTimeout(500);
    await todoPage.addTodo('Todo 2');
    await page.waitForTimeout(500);
    await todoPage.addTodo('Todo 3');
    
    // すべてのTodoが表示されることを確認
    await expect(todoPage.getTodoItem('Todo 1')).toBeVisible({ timeout: 10000 });
    await expect(todoPage.getTodoItem('Todo 2')).toBeVisible({ timeout: 10000 });
    await expect(todoPage.getTodoItem('Todo 3')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Todo Page Navigation', () => {
  let loginPage: LoginPage;
  let todoPage: TodoPage;

  test.slow(); // テストタイムアウトを3倍に

  test.beforeEach(async ({ page }) => {
    const testUsername = 'e2e_test_user';
    await createTestUser(testUsername, 'testpassword123');
    
    loginPage = new LoginPage(page);
    todoPage = new TodoPage(page);
    
    await loginPage.goto();
    await loginPage.login(testUsername, 'testpassword123');
    await page.waitForTimeout(1500); // レートリミット回避
    await page.waitForURL('http://localhost:3000/', { timeout: 10000 });
    
    // テスト前に既存のTodoをクリーンアップ
    await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      const API_BASE_URL = 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/todos/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const todos = await response.json();
      
      // 既存のTodoを削除
      for (const todo of todos) {
        await fetch(`${API_BASE_URL}/todos/${todo.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    });
    
    await page.reload();
    await page.waitForTimeout(500);
  });

  test.afterEach(async () => {
    // テスト間に待機時間を追加（レートリミット回避）
    await new Promise(resolve => setTimeout(resolve, 4000));
  });

  test('should logout and redirect to login', async ({ page }) => {
    await todoPage.goto();
    
    // ログアウト
    await todoPage.logout();
    
    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL('http://localhost:3000/login', { timeout: 10000 });
  });

  test('should redirect to login without authentication', async ({ page }) => {
    // トークンなしでTodoページにアクセス
    await page.context().clearCookies();
    await todoPage.goto();
    
    // ログインページにリダイレクトされることを確認（callbackUrlパラメータを含む可能性がある）
    await expect(page).toHaveURL(/http:\/\/localhost:3000\/login/, { timeout: 10000 });
  });
});
