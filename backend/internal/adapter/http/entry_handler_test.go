package httpadapter

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"

	"monodiary/internal/domain"
	"monodiary/internal/usecase"
)

// --- モック ---

type mockRepo struct {
	createFn                func(ctx context.Context, entry *domain.DiaryEntry) error
	findByIDFn              func(ctx context.Context, userID, id string) (*domain.DiaryEntry, error)
	deleteFn                func(ctx context.Context, userID, id string) (bool, error)
	listFn                  func(ctx context.Context, userID string, limit int, cursor string, filter usecase.ListFilter) ([]*domain.DiaryEntry, string, error)
	existsByLineMessageIDFn func(ctx context.Context, messageID string) (bool, error)
}

func (m *mockRepo) Create(ctx context.Context, entry *domain.DiaryEntry) error {
	return m.createFn(ctx, entry)
}
func (m *mockRepo) FindByID(ctx context.Context, userID, id string) (*domain.DiaryEntry, error) {
	return m.findByIDFn(ctx, userID, id)
}
func (m *mockRepo) Delete(ctx context.Context, userID, id string) (bool, error) {
	return m.deleteFn(ctx, userID, id)
}
func (m *mockRepo) List(ctx context.Context, userID string, limit int, cursor string, filter usecase.ListFilter) ([]*domain.DiaryEntry, string, error) {
	return m.listFn(ctx, userID, limit, cursor, filter)
}
func (m *mockRepo) ExistsByLineMessageID(ctx context.Context, messageID string) (bool, error) {
	return m.existsByLineMessageIDFn(ctx, messageID)
}

type mockGen struct {
	generateFn func(ctx context.Context, source string) (string, error)
}

func (m *mockGen) GenerateComment(ctx context.Context, source string) (string, error) {
	return m.generateFn(ctx, source)
}

// --- ヘルパー ---

func newEchoContext(method, target, body string) (echo.Context, *httptest.ResponseRecorder) {
	e := echo.New()
	var req *http.Request
	if body != "" {
		req = httptest.NewRequest(method, target, strings.NewReader(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	} else {
		req = httptest.NewRequest(method, target, nil)
	}
	w := httptest.NewRecorder()
	return e.NewContext(req, w), w
}

// --- create ---

func TestCreate_EmptySourceText(t *testing.T) {
	h := &entryHandler{repo: &mockRepo{}, gen: &mockGen{}}
	c, w := newEchoContext(http.MethodPost, "/api/entries", `{"source_text":""}`)
	_ = h.create(c)
	if w.Code != http.StatusBadRequest {
		t.Errorf("want 400, got %d", w.Code)
	}
}

func TestCreate_InvalidJSON(t *testing.T) {
	h := &entryHandler{repo: &mockRepo{}, gen: &mockGen{}}
	c, w := newEchoContext(http.MethodPost, "/api/entries", `not-json`)
	_ = h.create(c)
	if w.Code != http.StatusBadRequest {
		t.Errorf("want 400, got %d", w.Code)
	}
}

func TestCreate_GeneratorFailure(t *testing.T) {
	h := &entryHandler{
		repo: &mockRepo{},
		gen: &mockGen{
			generateFn: func(_ context.Context, _ string) (string, error) {
				return "", usecase.ErrGenerationFailed
			},
		},
	}
	c, w := newEchoContext(http.MethodPost, "/api/entries", `{"source_text":"テスト"}`)
	_ = h.create(c)
	if w.Code != http.StatusInternalServerError {
		t.Errorf("want 500, got %d", w.Code)
	}
}

func TestCreate_Success(t *testing.T) {
	h := &entryHandler{
		repo: &mockRepo{
			createFn: func(_ context.Context, _ *domain.DiaryEntry) error { return nil },
		},
		gen: &mockGen{
			generateFn: func(_ context.Context, _ string) (string, error) { return "AIコメント", nil },
		},
	}
	c, w := newEchoContext(http.MethodPost, "/api/entries", `{"source_text":"テスト"}`)
	_ = h.create(c)
	if w.Code != http.StatusCreated {
		t.Errorf("want 201, got %d", w.Code)
	}
}

// --- list ---

func TestList_NoUserID(t *testing.T) {
	h := &entryHandler{repo: &mockRepo{}, gen: &mockGen{}}
	c, w := newEchoContext(http.MethodGet, "/api/entries", "")
	_ = h.list(c)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("want 401, got %d", w.Code)
	}
}

func TestList_InvalidLimit(t *testing.T) {
	h := &entryHandler{repo: &mockRepo{}, gen: &mockGen{}}
	c, w := newEchoContext(http.MethodGet, "/api/entries?limit=abc", "")
	c.Set(ctxKeyUserID, "user1")
	_ = h.list(c)
	if w.Code != http.StatusBadRequest {
		t.Errorf("want 400, got %d", w.Code)
	}
}

func TestList_InvalidDateFrom(t *testing.T) {
	h := &entryHandler{repo: &mockRepo{}, gen: &mockGen{}}
	c, w := newEchoContext(http.MethodGet, "/api/entries?date_from=invalid", "")
	c.Set(ctxKeyUserID, "user1")
	_ = h.list(c)
	if w.Code != http.StatusBadRequest {
		t.Errorf("want 400, got %d", w.Code)
	}
}

func TestList_InvalidCursor(t *testing.T) {
	h := &entryHandler{
		repo: &mockRepo{
			listFn: func(_ context.Context, _ string, _ int, _ string, _ usecase.ListFilter) ([]*domain.DiaryEntry, string, error) {
				return nil, "", usecase.ErrInvalidCursor
			},
		},
		gen: &mockGen{},
	}
	c, w := newEchoContext(http.MethodGet, "/api/entries?cursor=bad", "")
	c.Set(ctxKeyUserID, "user1")
	_ = h.list(c)
	if w.Code != http.StatusBadRequest {
		t.Errorf("want 400, got %d", w.Code)
	}
}

func TestList_Success(t *testing.T) {
	h := &entryHandler{
		repo: &mockRepo{
			listFn: func(_ context.Context, _ string, _ int, _ string, _ usecase.ListFilter) ([]*domain.DiaryEntry, string, error) {
				return []*domain.DiaryEntry{}, "", nil
			},
		},
		gen: &mockGen{},
	}
	c, w := newEchoContext(http.MethodGet, "/api/entries", "")
	c.Set(ctxKeyUserID, "user1")
	_ = h.list(c)
	if w.Code != http.StatusOK {
		t.Errorf("want 200, got %d", w.Code)
	}
}

// --- findByID ---

func TestFindByID_NoUserID(t *testing.T) {
	h := &entryHandler{repo: &mockRepo{}, gen: &mockGen{}}
	c, w := newEchoContext(http.MethodGet, "/api/entries/abc", "")
	c.SetParamNames("id")
	c.SetParamValues("abc")
	_ = h.findByID(c)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("want 401, got %d", w.Code)
	}
}

func TestFindByID_NotFound(t *testing.T) {
	h := &entryHandler{
		repo: &mockRepo{
			findByIDFn: func(_ context.Context, _, _ string) (*domain.DiaryEntry, error) { return nil, nil },
		},
		gen: &mockGen{},
	}
	c, w := newEchoContext(http.MethodGet, "/api/entries/abc", "")
	c.SetParamNames("id")
	c.SetParamValues("abc")
	c.Set(ctxKeyUserID, "user1")
	_ = h.findByID(c)
	if w.Code != http.StatusNotFound {
		t.Errorf("want 404, got %d", w.Code)
	}
}

func TestFindByID_Success(t *testing.T) {
	entry := &domain.DiaryEntry{ID: "abc", SourceText: "テスト", AIComment: "コメント"}
	h := &entryHandler{
		repo: &mockRepo{
			findByIDFn: func(_ context.Context, _, _ string) (*domain.DiaryEntry, error) { return entry, nil },
		},
		gen: &mockGen{},
	}
	c, w := newEchoContext(http.MethodGet, "/api/entries/abc", "")
	c.SetParamNames("id")
	c.SetParamValues("abc")
	c.Set(ctxKeyUserID, "user1")
	_ = h.findByID(c)
	if w.Code != http.StatusOK {
		t.Errorf("want 200, got %d", w.Code)
	}
	var resp entryItem
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("レスポンスのデコードに失敗: %v", err)
	}
	if resp.ID != "abc" {
		t.Errorf("want ID abc, got %s", resp.ID)
	}
}

// --- delete ---

func TestDelete_NoUserID(t *testing.T) {
	h := &entryHandler{repo: &mockRepo{}, gen: &mockGen{}}
	c, w := newEchoContext(http.MethodDelete, "/api/entries/abc", "")
	c.SetParamNames("id")
	c.SetParamValues("abc")
	_ = h.delete(c)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("want 401, got %d", w.Code)
	}
}

func TestDelete_NotFound(t *testing.T) {
	h := &entryHandler{
		repo: &mockRepo{
			deleteFn: func(_ context.Context, _, _ string) (bool, error) { return false, nil },
		},
		gen: &mockGen{},
	}
	c, w := newEchoContext(http.MethodDelete, "/api/entries/abc", "")
	c.SetParamNames("id")
	c.SetParamValues("abc")
	c.Set(ctxKeyUserID, "user1")
	_ = h.delete(c)
	if w.Code != http.StatusNotFound {
		t.Errorf("want 404, got %d", w.Code)
	}
}

func TestDelete_Success(t *testing.T) {
	h := &entryHandler{
		repo: &mockRepo{
			deleteFn: func(_ context.Context, _, _ string) (bool, error) { return true, nil },
		},
		gen: &mockGen{},
	}
	c, w := newEchoContext(http.MethodDelete, "/api/entries/abc", "")
	c.SetParamNames("id")
	c.SetParamValues("abc")
	c.Set(ctxKeyUserID, "user1")
	_ = h.delete(c)
	if w.Code != http.StatusNoContent {
		t.Errorf("want 204, got %d", w.Code)
	}
}
