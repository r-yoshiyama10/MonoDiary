package usecase

import (
	"context"
	"errors"
	"time"

	"monodiary/internal/domain"
)

// ErrInvalidCursor はページネーションカーソルが不正な形式だったことを示す sentinel error。
var ErrInvalidCursor = errors.New("invalid cursor")

// ErrGenerationFailed は AI による日記生成がリトライ後も失敗したことを示す sentinel error。
// この場合はフォールバックテキストを DB に保存せず、呼び出し側でエラーとして扱う。
var ErrGenerationFailed = errors.New("diary generation failed")

// DiaryGenerator は詳細設計 8 章のポート。
// AI 生成が失敗した場合は ErrGenerationFailed を返す（フォールバック文は保存しない）。
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
