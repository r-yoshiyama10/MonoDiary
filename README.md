# MonoDiary

<p align="center">
  <img src="images/aicon.png" alt="MonoDiary Icon" width="120" />
</p>

<p align="center">LINE で送った言葉が、日記になる。</p>

## MonoDiary とは

LINE に送ったテキストメッセージをそのまま記録し、AI が一言コメントを添えて保存するアプリです。

「今日こんなことがあった」と LINE に送るだけで、書いた言葉がそのまま日記として残り、Gemini が温かみのある一言コメントを付けてくれます。Web アプリ側では一覧・検索・詳細表示で過去の記録を振り返ることができます。

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | React / TypeScript / Vite / Tailwind CSS |
| バックエンド | Go / Echo  |
| データベース | PostgreSQL  |
| AI | Google Gemini API（gemini-2.5-flash） |
| 外部連携 | LINE Messaging API / LINE Login |
| インフラ | Docker / Vercel / Render / Supabase |

## 機能紹介

### はじめかた / ログイン

QR コードから MonoDiary を LINE 友だち追加し、LINE でログインするだけで使い始められます。

<p align="center">
  <img src="images/image_login.png" alt="ログイン画面" width="700" />
</p>

---

### LINE で日記を記録する

LINE のトークに今日の出来事を送ると、Gemini が日記文を生成してすぐに返信します。返信には「Web アプリで見る」ボタンが付いており、詳細画面へそのまま遷移できます。

<p align="center">
  <img src="images/image_line.jpg" alt="LINE での日記送信と返信" width="360" />
</p>

---

### 日記一覧

ログイン後の Web アプリでは、日付ごとに日記が一覧表示されます。各エントリには AI コメントの有無も表示されます。

<p align="center">
  <img src="images/image_front2.png" alt="日記一覧画面" width="700" />
</p>

---

### 検索・絞り込み

キーワード・期間・並び順で日記を絞り込めます。過去のエピソードを素早く見つけ直すことができます。

<p align="center">
  <img src="images/image_front3.png" alt="検索・絞り込み画面" width="700" />
</p>

---

### 日記詳細

日記の詳細画面では、Gemini が生成した本文と AI コメントをあわせて確認できます。

<p align="center">
  <img src="images/image_front1.png" alt="日記詳細画面" width="700" />
</p>

---

### 日記の削除

不要な日記は詳細画面から削除できます。誤操作防止のため、削除前に確認ダイアログが表示されます。

<p align="center">
  <img src="images/image_front4.png" alt="削除確認ダイアログ" width="700" />
</p>

---

## デプロイ構成

個人利用を目的としており、作者本人以外はアクセスできません。

すべて無料枠で永続運用できることを前提に、以下の構成を選定しました。

| レイヤー | サービス | 選定理由 |
|---|---|---|
| フロントエンド | Vercel | React / TypeScript をそのままデプロイできる。GitHub 連携による自動デプロイ。無料枠で永続運用可能。 |
| バックエンド | Render | 既存の Go / Echo をそのまま使える。一定時間リクエストないとスリープするのが欠点。無料枠で永続運用可能。 |
| データベース | Supabase | PostgreSQL をそのまま利用できる。無料枠で永続運用可能。 |
