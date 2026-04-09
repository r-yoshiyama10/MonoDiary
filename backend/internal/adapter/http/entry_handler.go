package httpadapter

import (
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"

	"monodiary/internal/domain"
	"monodiary/internal/pkg/httperr"
	"monodiary/internal/usecase"
)

type entryHandler struct {
	repo   usecase.EntryRepository
	gen    usecase.DiaryGenerator
	userID string
}

type entryItem struct {
	ID         string `json:"id"`
	SourceText string `json:"source_text"`
	DiaryText  string `json:"diary_text"`
	CreatedAt  string `json:"created_at"`
	UpdatedAt  string `json:"updated_at"`
}

func toEntryItem(e *domain.DiaryEntry) entryItem {
	return entryItem{
		ID:         e.ID,
		SourceText: e.SourceText,
		DiaryText:  e.DiaryText,
		CreatedAt:  e.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:  e.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

type CreateEntryRequest struct {
	SourceText string `json:"source_text"`
}

type CreateEntryResponse struct {
	ID         string `json:"id"`
	SourceText string `json:"source_text"`
	DiaryText  string `json:"diary_text"`
	CreatedAt  string `json:"created_at"`
}

func (h *entryHandler) create(c echo.Context) error {
	var req CreateEntryRequest
	if err := c.Bind(&req); err != nil {
		return httperr.BadRequest(c, "JSONの形式が不正です")
	}
	if req.SourceText == "" {
		return httperr.BadRequest(c, "source_text は必須です")
	}

	diaryText, err := h.gen.GenerateDiaryText(c.Request().Context(), req.SourceText)
	if err != nil {
		return httperr.Internal(c, "日記テキストの生成に失敗しました")
	}

	entry := &domain.DiaryEntry{
		LineUserID: h.userID,
		SourceText: req.SourceText,
		DiaryText:  diaryText,
	}
	if err := h.repo.Create(c.Request().Context(), entry); err != nil {
		return httperr.Internal(c, "エントリの保存に失敗しました")
	}

	return c.JSON(http.StatusCreated, CreateEntryResponse{
		ID:         entry.ID,
		SourceText: entry.SourceText,
		DiaryText:  entry.DiaryText,
		CreatedAt:  entry.CreatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

type listEntriesResponse struct {
	Items      []entryItem `json:"items"`
	NextCursor *string     `json:"next_cursor"`
}

func (h *entryHandler) list(c echo.Context) error {
	limit := 20
	if l := c.QueryParam("limit"); l != "" {
		v, err := strconv.Atoi(l)
		if err != nil || v < 1 || v > 100 {
			return httperr.BadRequest(c, "limit は 1〜100 の整数で指定してください")
		}
		limit = v
	}
	cursor := c.QueryParam("cursor")

	userID := c.Get(ctxKeyUserID).(string)
	items, nextCursor, err := h.repo.List(c.Request().Context(), userID, limit, cursor)
	if err != nil {
		return httperr.Internal(c, "エントリ一覧の取得に失敗しました")
	}

	resp := listEntriesResponse{
		Items: make([]entryItem, len(items)),
	}
	for i, e := range items {
		resp.Items[i] = toEntryItem(e)
	}
	if nextCursor != "" {
		resp.NextCursor = &nextCursor
	}

	return c.JSON(http.StatusOK, resp)
}

func (h *entryHandler) findByID(c echo.Context) error {
	id := c.Param("id")
	if id == "" {
		return httperr.BadRequest(c, "id は必須です")
	}

	userID := c.Get(ctxKeyUserID).(string)
	entry, err := h.repo.FindByID(c.Request().Context(), userID, id)
	if err != nil {
		return httperr.Internal(c, "エントリの取得に失敗しました")
	}
	if entry == nil {
		return httperr.NotFound(c, "エントリが見つかりません")
	}

	return c.JSON(http.StatusOK, toEntryItem(entry))
}
