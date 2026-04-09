package usecase

import (
	"context"

	"monodiary/internal/domain"
)

// DiaryGenerator は詳細設計 8 章のポート。Gemini 失敗時はフォールバック文を返し err は nil。
type DiaryGenerator interface {
	GenerateDiaryText(ctx context.Context, source string) (diaryText string, err error)
}

// EntryRepository は詳細設計 8 章のポート。
type EntryRepository interface {
	Create(ctx context.Context, entry *domain.DiaryEntry) error
	FindByID(ctx context.Context, userID, id string) (*domain.DiaryEntry, error)
	List(ctx context.Context, userID string, limit int, cursor string) (items []*domain.DiaryEntry, nextCursor string, err error)
	ExistsByLineMessageID(ctx context.Context, messageID string) (bool, error)
}
