package domain

import "time"

// DiaryEntry は詳細設計 7.1 の論理エンティティ。
type DiaryEntry struct {
	ID            string
	LineUserID    string
	LineMessageID *string
	SourceText    string
	AIComment     string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}
