package domain

import "time"

// DiaryEntry は詳細設計 7.1 の論理エンティティ（永続化は後続タスク）。
type DiaryEntry struct {
	ID             string
	LineUserID     string
	LineMessageID  *string
	SourceText     string
	DiaryText      string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}
