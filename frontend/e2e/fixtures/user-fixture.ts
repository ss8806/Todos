import { expect } from '@playwright/test';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/**
 * テストユーザーを作成する（リトライ付き）
 */
export async function createTestUser(username: string, password: string, maxRetries: number = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      // 409 Conflict（すでに存在する）はOKとする
      if (response.ok || response.status === 409) {
        return response.status === 201 || response.status === 409;
      }

      // 429 Rate Limitの場合はリトライ
      if (response.status === 429 && attempt < maxRetries) {
        console.log(`レートリミット検出。${attempt}秒後にリトライ...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        continue;
      }

      const errorText = await response.text();
      throw new Error(`テストユーザーの作成に失敗: ${response.status} ${response.statusText} - ${errorText}`);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.log(`リトライ ${attempt}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
  
  throw new Error('テストユーザーの作成に失敗しました');
}

/**
 * テストユーザーでログインし、トークンを取得する
 */
export async function loginAndGetToken(username: string, password: string) {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const response = await fetch(`${API_BASE_URL}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('ログインに失敗しました');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * テストユーザーを削除する（クリーンアップ用）
 */
export async function deleteTestUser(username: string, token: string) {
  const response = await fetch(`${API_BASE_URL}/users/${username}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    console.warn(`テストユーザーの削除に失敗: ${response.statusText}`);
  }
}
