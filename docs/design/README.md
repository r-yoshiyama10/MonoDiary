# Handoff: MonoDiary UI Redesign

## Overview

MonoDiary は LINE で送ったメッセージを日記として保存・閲覧できるWebアプリ。このハンドオフは **一覧ページ（EntriesPage）** と **詳細ページ（EntryDetailPage）** のリデザインを対象とする。既存のReact + TypeScript + Tailwind CSS構成のフロントエンドに、このデザインを実装する。

## About the Design Files

`MonoDiary Final.html` はHTML上で動作する**デザインリファレンス（プロトタイプ）**であり、プロダクションコードとして直接使うものではない。このファイルを参照しながら、既存のReact + TypeScript + Tailwind CSS環境でコンポーネントを再実装すること。既存の `Layout.tsx`・`EntriesPage.tsx`・`EntryDetailPage.tsx` を修正する形で進める。

## Fidelity

**High-fidelity（ハイファイ）**: 色・タイポグラフィ・スペーシング・インタラクションまで最終仕様。デザインファイルをピクセルレベルで再現すること。

---

## Design Tokens

### Colors

| Token | Value | 用途 |
|---|---|---|
| `bg` | `#f4ede0` | ページ背景 |
| `card` | `#fffef9` | カード背景 |
| `border` | `#e4dace` | ボーダー全般 |
| `ink` | `#1a160e` | メインテキスト |
| `mid` | `#6b6254` | サブテキスト |
| `light` | `#a89a8c` | ラベル・メタ情報 |
| `accent` | `#c49a50` | アクセント（月名・ボーダーライン） |
| `header-bg` | `#3d2e1e` | ヘッダー背景 |
| `header-text` | `#f0e4cc` | ヘッダーテキスト |
| `header-sub` | `#7a6040` | ヘッダーサブテキスト（ログアウト） |
| `ai-comment-text` | `#5c4e3a` | AIコメント本文 |
| `delete-text` | `#b07070` | 削除ボタン |

### Typography

| 用途 | Font | Size | Weight | 備考 |
|---|---|---|---|---|
| ロゴ "MonoDiary" | Cormorant Garamond | 22px | 600 | letter-spacing: 0.05em |
| ページタイトル「日記一覧」 | Noto Sans JP | 19px | 700 | letter-spacing: -0.01em |
| カード月名「4月」 | Noto Serif JP | 11px | 600 | color: accent, letter-spacing: 0.04em |
| カード日付数字 | Cormorant Garamond | 40px | 400 | letter-spacing: -0.02em |
| カード曜日「(水)」 | Noto Sans JP | 10px | 400 | color: light |
| カード本文 | Noto Serif JP | 13px | 400 | line-height: 1.88 |
| AIコメントラベル | Cormorant Garamond | 9px | italic | uppercase, letter-spacing: 0.18em |
| 詳細ページ年「2026年」 | Noto Sans JP | 10px | 400 | color: light, letter-spacing: 0.1em |
| 詳細ページ月「4月」 | Noto Serif JP | 15px | 600 | color: accent |
| 詳細ページ日付数字 | Cormorant Garamond | 58px | 300 | letter-spacing: -0.02em |
| 詳細ページ「日」 | Noto Serif JP | 20px | 300 | |
| 詳細ページ曜日「（水）」 | Noto Sans JP | 13px | 400 | color: mid, margin-left: 6px |
| 詳細ページ本文 | Noto Serif JP | 15px | 400 | line-height: 2.15, letter-spacing: 0.03em |
| AIコメント本文 | Noto Serif JP | 13.5px | 400 italic | line-height: 2.05 |

Google Fonts から読み込む:
```html
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&family=Noto+Serif+JP:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap" rel="stylesheet" />
```

### Spacing & Radius

- ページ padding: `px-4 py-8` (既存のまま)
- カード border-radius: `12px`
- カード box-shadow: `0 1px 4px rgba(80,60,20,0.08), 0 4px 14px rgba(80,60,20,0.05)`
- カード gap（リスト）: `9px`
- 詳細ページ本文カード padding: `20px 18px`
- AIコメント padding-left: `16px`（左ボーダーライン分）

---

## Screens

### 1. Layout（ヘッダー共通）

**変更点:**
- `<header>` の背景色を `#3d2e1e` に変更（現在の `#faf8f5` から）
- `border-bottom: 1px solid #4e3c28`
- ロゴ「MonoDiary」を **Cormorant Garamond 22px weight-600** に変更、色 `#f0e4cc`
- 「ログアウト」テキスト色: `#7a6040`、font-size: `11px`
- 背景色 `bg-[#f7f4ef]` → `bg-[#f4ede0]` に変更

```tsx
// Layout.tsx の header 部分
<header style={{ background: '#3d2e1e', borderBottom: '1px solid #4e3c28' }}>
  <div className="mx-auto flex max-w-2xl items-center justify-between px-4" style={{ height: 56 }}>
    <span
      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: '#f0e4cc', letterSpacing: '0.05em', cursor: 'pointer' }}
      onClick={() => navigate('/entries')}
    >
      MonoDiary
    </span>
    <button onClick={handleLogout} style={{ fontSize: 11, color: '#7a6040' }}>
      ログアウト
    </button>
  </div>
</header>
```

---

### 2. EntriesPage（日記一覧）

**レイアウト変更点:**

#### タイトル行
- 「2026年4月」の年月ラベルを h2 の上に追加（font-size: 10px, color: light, letter-spacing: 0.12em）
- h2「日記一覧」: font-size: 19px, font-weight: 700

#### 区切り線
タイトルとカードリストの間に区切り線を追加:
```tsx
<div className="flex items-center gap-2.5 mb-4">
  <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #c49a50, transparent)' }} />
  <span style={{ fontSize: 10, color: '#a89a8c', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
    {entries.length} entries
  </span>
  <div style={{ flex: 1, height: 1, background: 'linear-gradient(270deg, #c49a50, transparent)' }} />
</div>
```

#### 日記カード（EntryCard）

カードの構造を完全に変更。現在の「日付カラム＋本文カラム」の2カラム構成は維持しつつ、デザインを刷新:

```tsx
<Link to={`/entries/${entry.id}`} ...>
  <div style={{
    background: '#fffef9',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(80,60,20,0.08), 0 4px 14px rgba(80,60,20,0.05)',
    border: '1px solid #e4dace',
    display: 'flex',
  }}>
    {/* 日付カラム */}
    <div style={{
      width: 75,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px 0',
      borderRight: '1px solid #e4dace',
      gap: 3,
    }}>
      {/* 月名: 4月 */}
      <span style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 11, fontWeight: 600, color: '#c49a50', letterSpacing: '0.04em' }}>
        {monthStr}  {/* 例: "4月" */}
      </span>
      {/* 日付数字: 22 */}
      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 400, color: '#1a160e', lineHeight: 1, letterSpacing: '-0.02em' }}>
        {day}
      </span>
      {/* 曜日: (水) */}
      <span style={{ fontSize: 10, color: '#a89a8c' }}>
        ({weekday})
      </span>
    </div>

    {/* 本文カラム */}
    <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
      <p style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 13, lineHeight: 1.88, color: '#352a18' }}>
        {excerpt(entry.source_text, 65)}
      </p>
      {entry.ai_comment && (
        <p style={{ fontSize: 10, color: '#a89a8c', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
          — AIコメントあり
        </p>
      )}
    </div>
  </div>
</Link>
```

**日付フォーマット関数:**
```ts
function formatDateParts(iso: string) {
  const d = new Date(iso)
  return {
    year: d.getFullYear(),
    monthStr: `${d.getMonth() + 1}月`,
    day: d.getDate(),
    weekday: d.toLocaleDateString('ja-JP', { weekday: 'short' }), // "水"
  }
}
```

---

### 3. EntryDetailPage（日記詳細）

#### ナビゲーション行
- 「一覧に戻る」: font-size 12px, color `#6b6254`
- 「削除」: font-size 12px, color `#b07070`（現在の hover:text-red-500 から変更）

#### 日付ヘッダー

現在の中央揃えの日付表示から、左揃えの縦積みに変更:

```tsx
<div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #e4dace', position: 'relative' }}>
  {/* 年 */}
  <p style={{ fontSize: 10, color: '#a89a8c', letterSpacing: '0.1em', marginBottom: 8 }}>
    {year}年
  </p>
  {/* 4月22日（水） — インラインspan で1行 */}
  <p style={{ lineHeight: 1.1, marginBottom: 4 }}>
    <span style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 15, fontWeight: 600, color: '#c49a50', verticalAlign: 'baseline' }}>
      {monthStr}
    </span>
    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 58, fontWeight: 300, color: '#1a160e', letterSpacing: '-0.02em', verticalAlign: 'baseline' }}>
      {day}
    </span>
    <span style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 20, fontWeight: 300, color: '#1a160e', verticalAlign: 'baseline' }}>
      日
    </span>
    <span style={{ fontFamily: "'Noto Sans JP', sans-serif", fontSize: 13, color: '#6b6254', marginLeft: 6, verticalAlign: 'baseline' }}>
      （{weekday}）
    </span>
  </p>
  {/* ゴールドのアンダーライン装飾 */}
  <div style={{ position: 'absolute', bottom: 0, left: 0, width: 48, height: 2, background: 'linear-gradient(90deg, #c49a50, transparent)' }} />
</div>
```

#### 本文カード

```tsx
<section style={{
  background: '#fffef9',
  borderRadius: 12,
  padding: '20px 18px',
  marginBottom: 14,
  border: '1px solid #e4dace',
  boxShadow: '0 2px 10px rgba(80,60,20,0.07)',
}}>
  <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c0a870', marginBottom: 16, fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
    diary
  </p>
  <p style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 15, lineHeight: 2.15, color: '#1a160e', letterSpacing: '0.03em', whiteSpace: 'pre-wrap' }}>
    {entry.source_text}
  </p>
</section>
```

#### AIコメント

現在の `bg-[#eef0f8]` + インジゴスタイルから変更:

```tsx
{entry.ai_comment && (
  <section style={{ borderLeft: '3px solid #c49a50', paddingLeft: 16, paddingTop: 4, paddingBottom: 4 }}>
    <p style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c49a50', marginBottom: 12, fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
      AI comment
    </p>
    <p style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 13.5, lineHeight: 2.05, color: '#5c4e3a', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
      {entry.ai_comment}
    </p>
  </section>
)}
```

---

## 実装ノート

1. **Tailwind と inline style の混在**: 既存コードは Tailwind ベースだが、このデザインはフォント指定などで `style` prop が必要な箇所がある。Tailwind の `font-[]` arbitrary values を活用するか、`style` prop を併用する。

2. **Google Fonts の読み込み**: `index.html` の `<head>` に Cormorant Garamond と Noto Serif JP を追加する。

3. **ページ背景色の変更**: `Layout.tsx` の `min-h-screen bg-[#f7f4ef]` を `bg-[#f4ede0]` に変更する。

4. **既存の検索フォーム・ローディングスピナー・エラー表示**: このデザインでは変更なし。既存の実装をそのまま流用してよい。

---

## Files

| ファイル | 説明 |
|---|---|
| `MonoDiary Final.html` | 完成デザインのHTMLプロトタイプ（一覧・詳細ページ） |

---

## 参考: 既存コードとの対応

| 既存ファイル | 変更箇所 |
|---|---|
| `src/components/Layout.tsx` | ヘッダー背景色・ロゴフォント・ページ背景色 |
| `src/pages/EntriesPage.tsx` | カードレイアウト全面変更・区切り線追加 |
| `src/pages/EntryDetailPage.tsx` | 日付ヘッダー・本文カード・AIコメントスタイル |
| `index.html` | Google Fonts（Cormorant Garamond, Noto Serif JP）追加 |
