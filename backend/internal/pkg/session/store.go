package session

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/sessions"
)

const (
	CookieName  = "monodiary_session"
	keyUserID   = "line_user_id"
	keyIssuedAt = "issued_at"
	ttl         = 14 * 24 * time.Hour
)

type Store struct {
	inner *sessions.CookieStore
}

func NewStore(secret string) *Store {
	s := sessions.NewCookieStore([]byte(secret))
	s.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   int(ttl.Seconds()),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	}
	return &Store{inner: s}
}

func (s *Store) Create(w http.ResponseWriter, r *http.Request, lineUserID string) error {
	sess, _ := s.inner.New(r, CookieName)
	sess.Values[keyUserID] = lineUserID
	sess.Values[keyIssuedAt] = time.Now().Unix()
	return s.inner.Save(r, w, sess)
}

// GetLineUserID はセッションCookieからLINEユーザーIDを取り出す。
// セッションが存在しない・無効な場合は空文字列を返す。
func (s *Store) GetLineUserID(r *http.Request) (string, error) {
	sess, err := s.inner.Get(r, CookieName)
	if err != nil {
		// Cookieが改ざんされた場合など。新規扱いにして未認証とする。
		return "", fmt.Errorf("session decode: %w", err)
	}
	if sess.IsNew {
		return "", nil
	}
	userID, ok := sess.Values[keyUserID].(string)
	if !ok || userID == "" {
		return "", nil
	}
	return userID, nil
}

func (s *Store) Destroy(w http.ResponseWriter, r *http.Request) error {
	sess, err := s.inner.Get(r, CookieName)
	if err != nil {
		return err
	}
	sess.Options.MaxAge = -1
	return s.inner.Save(r, w, sess)
}
