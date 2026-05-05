package usecase

import (
	"context"
	"errors"
	"time"

	"monodiary/internal/domain"
)

// ErrInvalidCursor はページネーションカーソルが不正な形式だったことを示す sentinel error。
var ErrInvalidCursor = errors.New("invalid cursor")

// ErrGenerationFailed は AI によるコメント生成がリトライ後も失敗したことを示す sentinel error。
// この場合は保存を行わず、呼び出し側でエラーとして扱う。
var ErrGenerationFailed = errors.New("comment generation failed")

// DiaryGenerator は詳細設計 8 章のポート。
// AI 生成が失敗した場合は ErrGenerationFailed を返す（保存しない）。
type DiaryGenerator interface {
	GenerateComment(ctx context.Context, source string) (comment string, err error)
}

// ListFilter はエントリ一覧取得時の絞り込み・ソート条件。
type ListFilter struct {
	Query     string     // フリーワード（空文字は無視）
	DateFrom  *time.Time // 開始日時（nil は無視）
	DateTo    *time.Time // 終了日時・排他的上限（nil は無視）
	SortOrder string     // "asc" or "desc"（省略時は "desc"）
}

// HeatmapDay は1日分のヒートマップデータ。
type HeatmapDay struct {
	Date       string `json:"date"`
	TotalChars int    `json:"total_chars"`
}

// EntryRepository は詳細設計 8 章のポート。
type EntryRepository interface {
	Create(ctx context.Context, entry *domain.DiaryEntry) error
	FindByID(ctx context.Context, userID, id string) (*domain.DiaryEntry, error)
	Delete(ctx context.Context, userID, id string) (found bool, err error)
	List(ctx context.Context, userID string, limit int, cursor string, filter ListFilter) (items []*domain.DiaryEntry, nextCursor string, err error)
	ExistsByLineMessageID(ctx context.Context, messageID string) (bool, error)
	HeatmapByMonth(ctx context.Context, userID string, year, month int) ([]HeatmapDay, error)
}
