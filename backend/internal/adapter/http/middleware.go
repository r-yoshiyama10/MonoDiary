package httpadapter

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"monodiary/internal/pkg/httperr"
	"monodiary/internal/pkg/session"
)

// ctxKeyUserID はEchoコンテキストにLINEユーザーIDを格納するキー。
const ctxKeyUserID = "line_user_id"

// requireAuth はセッションCookieを検証し、LINEユーザーIDをコンテキストにセットするミドルウェア。
func requireAuth(store *session.Store) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			userID, err := store.GetLineUserID(c.Request())
			if err != nil || userID == "" {
				return httperr.Respond(c, http.StatusUnauthorized, "UNAUTHORIZED", "ログインが必要です", nil)
			}
			c.Set(ctxKeyUserID, userID)
			return next(c)
		}
	}
}
