# MonoDiary 詳細設計書

| 項目 | 内容 |
|------|------|
| 文書名 | MonoDiary 詳細設計書 |
| ファイル | `docs/detailed-design.md` |
| プロジェクト名 | MonoDiary |
| 版 | 0.3 |
| 最終更新日 | 2026-04-04 |
| 参照 | [`docs/requirements.md`](requirements.md)（要件定義書 v0.4）、[`docs/basic-design.md`](basic-design.md)（基本設計書 v0.4） |

---

## 1. 本書の目的と位置づけ

本書は基本設計書で確定した**構成・フロー・論理モデル**を、実装に直結する粒度まで落とし込む。対象は次のとおり。

- REST API の**リクエスト／レスポンス形式**とエラー規約
- **LINE Webhook / LINE Login** の検証手順とパラメータ
- **セッション方式**の確定
- **Gemini** のモデル・プロンプト・失敗時挙動
- **PostgreSQL** の物理スキーマとマイグレーション方針
- **フロントエンド**のルーティングと API 連携の前提
- **環境変数**一覧（実装時のチェックリスト）

OpenAPI 3 YAML の自動生成は実装時に行い、本書の JSON 例が**正**とする。

---

## 2. 共通規約

### 2.1 ベース URL とオリジン

| 環境 | 例 |
|------|-----|
| API | `https://<api-host>`（末尾スラッシュなし） |
| フロント | `https://<web-host>`（Vercel 等） |

API と Web が**別オリジン**の場合、バックエンドは CORS で `Access-Control-Allow-Origin: <フロントの正確なオリジン>`（ワイルドカード不可）、`Access-Control-Allow-Credentials: true`、および `GET/POST` と必要ヘッダ（`Content-Type`）を許可する。プリフライトは Echo のミドルウェアで対応する。

### 2.2 日時表現

- API の JSON では **`created_at` / `updated_at` を RFC 3339（ISO 8601）** の UTC またはオフセット付きで返す（例: `2026-04-04T12:34:56+09:00`）。
- DB は `TIMESTAMPTZ` で保存する。

### 2.3 識別子

- **エントリ ID**: UUID v4 文字列（例: `550e8400-e29b-41d4-a716-446655440000`）。
- **LINE `userId` / `message.id`**: LINE が返す文字列をそのまま `VARCHAR` で保持する（長さ上限は実装で 255 程度に制限してもよい）。

### 2.4 エラーレスポンス（JSON）

すべての 4xx / 5xx（Webhook の LINE 仕様上 200 を返すケースを除く）で、次の**共通ボディ**を返す。

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "人が読める短い説明",
    "details": null
  }
}
```

| フィールド | 型 | 説明 |
|------------|-----|------|
| `error.code` | string | 機械可読コード（英字スネークまたは SCREAMING_SNAKE） |
| `error.message` | string | ユーザー／開発者向け短文 |
| `error.details` | object \| null | バリデーション項目など任意 |

**HTTP ステータスと `code` の対応（例）**

| HTTP | `code` 例 | 用途 |
|------|-----------|------|
| 400 | `BAD_REQUEST` | クエリ不正 |
| 401 | `UNAUTHORIZED` | セッションなし・無効 |
| 403 | `FORBIDDEN` | セッションはあるが許可 userId と不一致 |
| 404 | `NOT_FOUND` | エントリ不存在 |
| 500 | `INTERNAL_ERROR` | 想定外・外部 API 失敗のうち返却するもの |

Webhook は「不正署名」の場合 **401** を返してよい（LINE の再送仕様に留意）。それ以外のビジネス上のスキップは **200** で応答し、ボディは空または LINE 仕様に従う。

---

## 3. 認証・セッション（要件定義 10 節の未決定 5 の確定）

### 3.1 採用方式

**サーバー側にセッションストアを置かず、暗号署名付き Cookie にセッション ID 相当のペイロードを載せる方式**を採用する（Echo + `gorilla/sessions` または同等で、Cookie ストアを `securecookie` ベースにする）。

| 項目 | 値 |
|------|-----|
| Cookie 名 | `monodiary_session`（実装で定数化） |
| 属性 | `HttpOnly`, `Secure`（本番）, `SameSite=Lax`（同一サイト配下で OAuth リダイレクトが通る範囲で調整。クロスサイト POST が必要なら設計見直し） |
| ペイロード | 最低限 `line_user_id`（文字列）、`issued_at`（Unix 秒） |
| 有効期限 | **14 日**（スライディング更新は任意。初版は固定 TTL でよい） |
| 秘密鍵 | 環境変数 `SESSION_SECRET`（32 バイト以上のランダム値を推奨） |

**理由**: 単一利用者・個人運用で DB セッションの運用コストを抑えつつ、HttpOnly で XSS 窃取を緩和できる。マルチユーザー拡張時は Redis / DB セッションへ移行可能。

### 3.2 LINE Login（認可コードフロー）詳細

**エンドポイント（バックエンド）**

| メソッド | パス | 説明 |
|----------|------|------|
| `GET` | `/auth/line` | 認可 URL へ 302。`state` をセッション Cookie または署名付き一時 Cookie に保存 |
| `GET` | `/auth/line/callback` | `code`, `state` を検証後トークン交換・プロフィール取得 |
| `POST` | `/auth/logout` | セッション Cookie を無効化（Max-Age=0） |

**認可リクエスト（LINE に対してリダイレクトする際のクエリ例）**

| パラメータ | 必須 | 説明 |
|------------|------|------|
| `response_type` | ○ | `code` |
| `client_id` | ○ | `LINE_LOGIN_CHANNEL_ID` |
| `redirect_uri` | ○ | `LINE_LOGIN_CALLBACK_URL`（LINE Developers コンソールと完全一致） |
| `state` | ○ | ランダム文字列（CSRF）。コールバックで一致確認 |
| `scope` | ○ | `profile openid`（プロフィールの `userId` と OIDC の検証に使用） |

**コールバック処理手順**

1. `state` が保存値と一致しない場合は **400**（または 403）で終了。
2. `POST https://api.line.me/oauth2/v2.1/token` で `code` を `access_token` / `id_token` に交換。
3. `id_token` を LINE の JWKS で検証（`iss`, `aud`, `exp`）。検証ライブラリまたは手順に従う。
4. `GET https://api.line.me/v2/profile`（または OIDC の claims）で `userId` を取得。
5. `userId === MONODIARY_ALLOWED_LINE_USER_ID` でなければ **403**、フロントのログインエラー用 URL へリダイレクト（クエリで `error=forbidden` 等。詳細は実装で統一）。
6. 成功時は 3.1 節のセッション Cookie を発行し、`FRONTEND_ORIGIN` 環境変数で指定した**フロントのトップ**（例: `/entries`）へ **302**。

**ログアウト**

- `POST /auth/logout` は **セッション Cookie 必須**。検証後 Cookie 削除。レスポンスは **204 No Content** とする（フロントは成功後 `/login` へ遷移）。

---

## 4. REST API 詳細

### 4.1 `GET /api/entries`

| 項目 | 内容 |
|------|------|
| 認証 | セッション Cookie 必須 |
| 目的 | 日記エントリ一覧（新しい順） |

**クエリパラメータ**

| 名前 | 型 | 必須 | デフォルト | 説明 |
|------|-----|------|------------|------|
| `limit` | integer | 否 | `20` | 1〜100 |
| `cursor` | string | 否 | なし | 次ページ取得用 opaque トークン（4.1 節のカーソル方式） |

**レスポンス 200**

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "source_text": "朝 コーヒー。午後は仕事。",
      "diary_text": "今日は朝からコーヒーを飲んで、午後は仕事に集中した一日だった。",
      "created_at": "2026-04-04T09:00:00+09:00",
      "updated_at": "2026-04-04T09:00:05+09:00"
    }
  ],
  "next_cursor": "eyJjcmVhdGVkX2F0IjoiLi4uIiwiaWQiOiIuLi4ifQ"
}
```

- `next_cursor` が `null` または省略で最終ページ。
- 一覧では `source_text` が長い場合でも**全文返却**でよい（初版）。肥大化時は `summary` フィールド追加を別タスクとする。

**カーソル方式（推奨実装）**

- ソートキー: `(created_at DESC, id DESC)` の複合。
- `cursor` は Base64URL エンコードした JSON 等で、**最後に返した行の `created_at` と `id`** を含める。
- リポジトリは `WHERE (created_at, id) < ($cursor_created_at, $cursor_id)` 相当で `limit+1` 件取得し、余剰があれば `next_cursor` を生成。

### 4.2 `GET /api/entries/:id`

| 項目 | 内容 |
|------|------|
| 認証 | セッション Cookie 必須 |
| `:id` | UUID 文字列 |

**レスポンス 200**（フィールドは一覧アイテムと同一形）

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "source_text": "…",
  "diary_text": "…",
  "created_at": "2026-04-04T09:00:00+09:00",
  "updated_at": "2026-04-04T09:00:05+09:00"
}
```

**404**: 存在しない、または**別ユーザーのデータ**（単一利用者でも `line_user_id` でフィルタし、見つからなければ 404 でよい）。

### 4.3 認可

- すべての `/api/*` でセッションから `line_user_id` を取得し、`MONODIARY_ALLOWED_LINE_USER_ID` と一致を再確認する（Cookie 改ざん対策の二重チェック）。
- ストア取得時も `WHERE line_user_id = ?` を必須とする。

---

## 5. LINE Messaging Webhook

### 5.1 `POST /webhooks/line`

| 項目 | 内容 |
|------|------|
| 本文 | LINE 公式の Webhook JSON（そのままパース） |
| 検証 | リクエストボディの生バイト列に対し `X-Line-Signature` を HMAC-SHA256（`LINE_CHANNEL_SECRET`）で検証 |

**処理対象**

- `events[].type === "message"` かつ `message.type === "text"` のみ。
- それ以外は **200 OK**、処理なし（ログ任意）。

**本人判定**

- `events[].source.userId` が `MONODIARY_ALLOWED_LINE_USER_ID` と一致する場合のみユースケース実行。不一致は **200**、処理なし。

### 5.2 冪等性（重複配送）

- `message.id` を `line_message_id` に保存する。
- DB で `line_message_id` に **UNIQUE 制約**（NULL 可）。挿入時ユニーク違反なら成功として握りつぶす（既処理）。

### 5.3 ユースケース内処理順

1. 冪等チェック（既存なら終了）。
2. Gemini で `diary_text` 生成（第 6 章）。
3. ストアへ `DiaryEntry` 保存（`source_text`, `diary_text`, `line_user_id`, `line_message_id`, `created_at`）。
4. トランザクション境界は **1 トランザクション**にまとめる。

**タイムアウト**: Webhook ハンドラ全体で **25 秒**を上限目安とし、Gemini は第 6 章の個別タイムアウトより短く設定する。

---

## 6. Gemini（日記生成）

### 6.1 API

- **Google AI Studio / Gemini API**（`generativelanguage.googleapis.com`）を使用。SDK または REST は実装で選択。
- 環境変数: `GEMINI_API_KEY`。

### 6.2 モデル（初版）

| 項目 | 値 |
|------|-----|
| モデル ID | `gemini-2.5-flash`（利用不可の場合は `gemini-2.0-flash` や `gemini-1.5-flash` にフォールバックする実装でも可。デプロイ時に確定） |
| 生成設定 | `temperature`: 0.7 前後（調整可能） |
| 最大出力トークン | 2048（要件に応じて変更） |

### 6.3 システム指示・ユーザコンテンツ（プロンプト骨子）

**システム（固定文の例・実装時に定数化）**

```
あなたは日本語の日記執筆アシスタントです。
ユーザーが LINE で送った断片的なメモや箇条書きを、一人称の日記として自然に読める1つの文章に整えてください。
内容は捏造せず、与えられた事実のみを扱ってください。
文体は「です・ます」調で統一してください。
日付や見出しは付けず、本文のみを出力してください。
```

**ユーザー**

- 入力: `{{source_text}}`（LINE の `message.text`）

**出力**

- プレーンテキストのみ（マークダウン禁止。違反時は後処理でタグ除去してもよい）。

### 6.4 失敗時・タイムアウト

| 状況 | 挙動 |
|------|------|
| タイムアウト（例: 20 秒） | リトライ **1 回**（指数バックオフ 1 秒）。それでも失敗なら `diary_text` に **原文をコピー**し、先頭に `[自動整形に失敗したため原文を表示しています]\n` を付与（要件 F-04 の保存を満たす）。 |
| 429 / 5xx | 上記と同様にリトライ後、同じフォールバック。 |
| レスポンス空 | フォールバック同上。 |

ログには `line_message_id` とエラー要約を残す。

---

## 7. データストア

### 7.1 ドメインエンティティ（フィールド確定）

`DiaryEntry`（論理名）

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `id` | UUID | ○ | 新規作成時にサーバー生成 |
| `line_user_id` | string | ○ | 送信者 |
| `line_message_id` | string \| null | △ | 取得できれば必ず設定。UNIQUE 用 |
| `source_text` | string | ○ | 原文 |
| `diary_text` | string | ○ | LLM 出力またはフォールバック本文 |
| `created_at` | time | ○ | Webhook 受信時刻（サーバー時刻でよい） |
| `updated_at` | time | ○ | 更新がなければ `created_at` と同値 |

### 7.2 PostgreSQL

**マイグレーション**: **`golang-migrate/migrate`**（SQL ファイル）を採用する。GORM はアプリからの ORM として利用し、**スキーマの真実は SQL マイグレーション**とする（AutoMigrate は本番では使わない）。

**初期 DDL（例）**

```sql
CREATE TABLE diary_entries (
    id              UUID PRIMARY KEY,
    line_user_id    VARCHAR(255) NOT NULL,
    line_message_id VARCHAR(255),
    source_text     TEXT NOT NULL,
    diary_text      TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_diary_entries_line_message_id UNIQUE (line_message_id)
);

CREATE INDEX idx_diary_entries_user_created
    ON diary_entries (line_user_id, created_at DESC, id DESC);
```

- `line_message_id` が NULL の行は UNIQUE に複数存在可能（PostgreSQL の UNIQUE は NULL を非等価扱い）。

---

## 8. バックエンド実装メモ（クリーンアーキテクチャとの対応）

| ポート（interface） | 主なメソッド（例） |
|----------------------|-------------------|
| `EntryRepository` | `Create(ctx, *DiaryEntry) error`, `FindByID(ctx, userID, id) (*DiaryEntry, error)`, `List(ctx, userID, limit, cursor) (items, nextCursor, error)`, `ExistsByLineMessageID(ctx, messageID) (bool, error)` |
| `DiaryGenerator` | `GenerateDiaryText(ctx, source string) (string, error)` |
| `SessionStore` | `CreateSession(w, r, lineUserID) error`, `GetLineUserID(r) (string, error)`, `Destroy(w, r) error` |

`adapter/line` は Webhook 署名・イベントパースのみ。`usecase` は上記ポートのみに依存する。

---

## 9. フロントエンド詳細

### 9.1 ルート

| パス | 認証 | 内容 |
|------|------|------|
| `/login` | 不要 | 「LINE でログイン」ボタン → `GET <API>/auth/line`（`window.location`） |
| `/entries` | 必須 | 一覧。`GET /api/entries?limit=&cursor=` |
| `/entries/:id` | 必須 | 詳細。`GET /api/entries/:id` |

未認証で保護ルートに入った場合、`GET /api/entries` が 401 になったら `/login` へリダイレクトする。

### 9.2 API 呼び出し

- `fetch` で `credentials: 'include'` を指定し Cookie を送る。
- ベース URL は `VITE_API_BASE_URL` 等の環境変数。

### 9.3 UI 要件（最小）

- 一覧: `created_at` 降順、`diary_text` の先頭数行プレビュー（全文でも可）。
- 詳細: `source_text` と `diary_text` を並べて表示（ラベル「原文」「日記」）。

---

## 10. ローカル開発・デプロイ

### 10.1 Webhook / OAuth

- ローカル API には **ngrok** 等で HTTPS URL を割り当て、LINE Developers の Webhook URL / コールバック URL に登録する。

### 10.2 環境変数一覧

| 変数名 | 必須 | 用途 |
|--------|------|------|
| `MONODIARY_ALLOWED_LINE_USER_ID` | ○ | 本人の LINE userId |
| `LINE_CHANNEL_SECRET` | ○ | Webhook 署名 |
| `LINE_CHANNEL_ACCESS_TOKEN` | △ | 返信 API を使う場合 |
| `LINE_LOGIN_CHANNEL_ID` | ○ | LINE Login |
| `LINE_LOGIN_CHANNEL_SECRET` | ○ | トークン交換 |
| `LINE_LOGIN_CALLBACK_URL` | ○ | 例: `https://api.../auth/line/callback` |
| `FRONTEND_ORIGIN` | ○ | ログイン成功後リダイレクト先オリジン |
| `CORS_ALLOWED_ORIGIN` | ○ | フロントオリジン（単一） |
| `GEMINI_API_KEY` | ○ | Gemini |
| `SESSION_SECRET` | ○ | セッション署名 |
| `DATABASE_URL` | ○ | PostgreSQL |
| `PORT` | △ | 既定 8080 等 |

---

## 11. テスト方針（抜粋）

| 層 | 内容 |
|----|------|
| `usecase` | モックした `EntryRepository` / `DiaryGenerator` で冪等・フォールバックを検証 |
| `adapter/http` | Echo のテストハーネスで Cookie 付きリクエストの 401/200 |
| `adapter/line` | 署名付きボディの golden test |

E2E は任意（Playwright + モック API 等）。

---

## 12. 基本設計書とのトレーサビリティ

| 基本設計の節 | 本書での扱い |
|--------------|----------------|
| 3. 認証 | 第 3 章 |
| 4. フロー | 第 5 章、第 3 章（シーケンスは基本設計の Mermaid を維持） |
| 5. データ | 第 7 章 |
| 6. API | 第 2 章、第 4 章 |
| 7. モジュール | 第 8 章 |
| 8. フロント | 第 9 章 |
| 11. 環境変数 | 10.2 節 |

---

## 改訂履歴

| 版 | 日付 | 内容 |
|----|------|------|
| 0.3 | 2026-04-04 | 永続化を PostgreSQL のみに統一。Sheets・フェーズ A/B 記述を削除（要件・基本設計 v0.4 に整合） |
| 0.2 | 2026-04-04 | Gemini 既定モデルを `gemini-2.5-flash` に変更 |
| 0.1 | 2026-04-04 | 初版（基本設計 v0.3 に基づき API・セッション・Gemini・DB/Sheets・フロントを確定） |
