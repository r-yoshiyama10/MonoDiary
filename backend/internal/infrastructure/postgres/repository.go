package postgres

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"monodiary/internal/domain"
	"monodiary/internal/usecase"
)

var _ usecase.EntryRepository = (*EntryRepository)(nil)

type EntryRepository struct {
	db *gorm.DB
}

func NewEntryRepository(db *gorm.DB) *EntryRepository {
	return &EntryRepository{db: db}
}

// entryModel は diary_entries テーブルの GORM マッピング。
// フィールド名を CreatedAt/UpdatedAt にしないことで GORM の自動タイムスタンプ管理を回避する。
type entryModel struct {
	ID             string    `gorm:"column:id;primaryKey"`
	LineUserID     string    `gorm:"column:line_user_id"`
	LineMessageID  *string   `gorm:"column:line_message_id"`
	SourceText     string    `gorm:"column:source_text"`
	DiaryText      string    `gorm:"column:diary_text"`
	EntryCreatedAt time.Time `gorm:"column:created_at"`
	EntryUpdatedAt time.Time `gorm:"column:updated_at"`
}

func (entryModel) TableName() string { return "diary_entries" }

func toModel(e *domain.DiaryEntry) entryModel {
	return entryModel{
		ID:             e.ID,
		LineUserID:     e.LineUserID,
		LineMessageID:  e.LineMessageID,
		SourceText:     e.SourceText,
		DiaryText:      e.DiaryText,
		EntryCreatedAt: e.CreatedAt,
		EntryUpdatedAt: e.UpdatedAt,
	}
}

func toDomain(m entryModel) *domain.DiaryEntry {
	return &domain.DiaryEntry{
		ID:            m.ID,
		LineUserID:    m.LineUserID,
		LineMessageID: m.LineMessageID,
		SourceText:    m.SourceText,
		DiaryText:     m.DiaryText,
		CreatedAt:     m.EntryCreatedAt,
		UpdatedAt:     m.EntryUpdatedAt,
	}
}

func (r *EntryRepository) Create(ctx context.Context, entry *domain.DiaryEntry) error {
	if entry.ID == "" {
		entry.ID = uuid.New().String()
	}
	now := time.Now().UTC()
	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = now
	}
	if entry.UpdatedAt.IsZero() {
		entry.UpdatedAt = now
	}
	m := toModel(entry)
	return r.db.WithContext(ctx).Create(&m).Error
}

func (r *EntryRepository) FindByID(ctx context.Context, userID, id string) (*domain.DiaryEntry, error) {
	var m entryModel
	err := r.db.WithContext(ctx).
		Where("id = ? AND line_user_id = ?", id, userID).
		First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return toDomain(m), nil
}

func (r *EntryRepository) ExistsByLineMessageID(ctx context.Context, messageID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&entryModel{}).
		Where("line_message_id = ?", messageID).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// cursorPayload はページネーションカーソルの中身（詳細設計 4.1）。
type cursorPayload struct {
	CreatedAt time.Time `json:"created_at"`
	ID        string    `json:"id"`
}

func encodeCursor(createdAt time.Time, id string) string {
	b, _ := json.Marshal(cursorPayload{CreatedAt: createdAt, ID: id})
	return base64.RawURLEncoding.EncodeToString(b)
}

func decodeCursor(cursor string) (cursorPayload, error) {
	b, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil {
		return cursorPayload{}, fmt.Errorf("invalid cursor: %w", err)
	}
	var p cursorPayload
	if err := json.Unmarshal(b, &p); err != nil {
		return cursorPayload{}, fmt.Errorf("invalid cursor: %w", err)
	}
	return p, nil
}

func (r *EntryRepository) List(ctx context.Context, userID string, limit int, cursor string, filter usecase.ListFilter) ([]*domain.DiaryEntry, string, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	asc := filter.SortOrder == "asc"

	q := r.db.WithContext(ctx).
		Where("line_user_id = ?", userID)

	if filter.Query != "" {
		// % と _ はILIKEのワイルドカードなのでエスケープする（! をエスケープ文字として使用）
		escaped := strings.NewReplacer("!", "!!", "%", "!%", "_", "!_").Replace(filter.Query)
		like := "%" + escaped + "%"
		q = q.Where("(source_text ILIKE ? ESCAPE '!' OR diary_text ILIKE ? ESCAPE '!')", like, like)
	}
	if filter.DateFrom != nil {
		q = q.Where("created_at >= ?", filter.DateFrom)
	}
	if filter.DateTo != nil {
		q = q.Where("created_at < ?", filter.DateTo)
	}

	if asc {
		q = q.Order("created_at ASC, id ASC")
	} else {
		q = q.Order("created_at DESC, id DESC")
	}
	q = q.Limit(limit + 1)

	if cursor != "" {
		p, err := decodeCursor(cursor)
		if err != nil {
			return nil, "", fmt.Errorf("%w: %w", usecase.ErrInvalidCursor, err)
		}
		if asc {
			q = q.Where("created_at > ? OR (created_at = ? AND id > ?)", p.CreatedAt, p.CreatedAt, p.ID)
		} else {
			// (created_at, id) の複合降順ソートに対応するカーソル条件（詳細設計 4.1）
			q = q.Where("created_at < ? OR (created_at = ? AND id < ?)", p.CreatedAt, p.CreatedAt, p.ID)
		}
	}

	var models []entryModel
	if err := q.Find(&models).Error; err != nil {
		return nil, "", err
	}

	var nextCursor string
	if len(models) > limit {
		models = models[:limit]
		last := models[len(models)-1]
		nextCursor = encodeCursor(last.EntryCreatedAt, last.ID)
	}

	items := make([]*domain.DiaryEntry, len(models))
	for i, m := range models {
		items[i] = toDomain(m)
	}
	return items, nextCursor, nil
}
