package usecase

import (
	"context"
	"time"

	"monodiary/internal/domain"
)

// DiaryGenerator は詳細設計 8 章のポート。Gemini 失敗時はフォールバック文を返し err は nil。
type DiaryGenerator interface {
	GenerateDiaryText(ctx context.Context, source string) (diaryText string, err error)
}

// ListFilter はエントリ一覧取得時の絞り込み・ソート条件。
type ListFilter struct {
	Query     string     // フリーワード（空文字は無視）
	DateFrom  *time.Time // 開始日時（nil は無視）
	DateTo    *time.Time // 終了日時・排他的上限（nil は無視）
	SortOrder string     // "asc" or "desc"（省略時は "desc"）
}

// EntryRepository は詳細設計 8 章のポート。
type EntryRepository interface {
	Create(ctx context.Context, entry *domain.DiaryEntry) error
	FindByID(ctx context.Context, userID, id string) (*domain.DiaryEntry, error)
	List(ctx context.Context, userID string, limit int, cursor string, filter ListFilter) (items []*domain.DiaryEntry, nextCursor string, err error)
	ExistsByLineMessageID(ctx context.Context, messageID string) (bool, error)
}
