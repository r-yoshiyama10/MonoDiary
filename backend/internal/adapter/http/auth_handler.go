package httpadapter

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"monodiary/internal/config"
	"monodiary/internal/pkg/httperr"
	"monodiary/internal/pkg/session"
)

const (
	lineAuthorizeURL = "https://access.line.me/oauth2/v2.1/authorize"
	lineTokenURL     = "https://api.line.me/oauth2/v2.1/token"
	lineProfileURL   = "https://api.line.me/v2/profile"
	stateCookieName  = "monodiary_oauth_state"
	stateCookieTTL   = 10 * time.Minute
)

// lineHTTPClient は LINE API 呼び出し専用クライアント。DefaultClient はタイムアウトが無いため使わない。
var lineHTTPClient = &http.Client{Timeout: 10 * time.Second}

type authHandler struct {
	cfg          config.Config
	sessionStore *session.Store
}

// login はLINEの認可画面へリダイレクトする。
func (h *authHandler) login(c echo.Context) error {
	state, err := generateState()
	if err != nil {
		return httperr.Internal(c, "stateの生成に失敗しました")
	}

	// CSRF対策のstateを短命Cookieに保存
	c.SetCookie(&http.Cookie{
		Name:     stateCookieName,
		Value:    state,
		Path:     "/",
		MaxAge:   int(stateCookieTTL.Seconds()),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	params := url.Values{
		"response_type": {"code"},
		"client_id":     {h.cfg.LineLoginChannelID},
		"redirect_uri":  {h.cfg.LineLoginCallbackURL},
		"state":         {state},
		"scope":         {"profile openid"},
	}
	return c.Redirect(http.StatusFound, lineAuthorizeURL+"?"+params.Encode())
}

// callback はLINEから受け取ったcodeを検証し、セッションCookieを発行する。
func (h *authHandler) callback(c echo.Context) error {
	frontendOrigin := h.cfg.FrontendOrigin
	if frontendOrigin == "" {
		frontendOrigin = "http://localhost:5173"
	}
	redirectError := func(code string) error {
		return c.Redirect(http.StatusFound, frontendOrigin+"/login?error="+code)
	}

	// state検証（CSRF対策）
	stateCookie, err := c.Cookie(stateCookieName)
	if err != nil || stateCookie.Value != c.QueryParam("state") {
		return redirectError("state_invalid")
	}
	c.SetCookie(&http.Cookie{Name: stateCookieName, Value: "", MaxAge: -1, Path: "/"})

	code := c.QueryParam("code")
	if code == "" {
		return redirectError("code_missing")
	}

	accessToken, err := exchangeToken(c.Request().Context(), h.cfg, code)
	if err != nil {
		return redirectError("token_exchange_failed")
	}

	lineUserID, err := fetchLineUserID(c.Request().Context(), accessToken)
	if err != nil {
		return redirectError("profile_fetch_failed")
	}

	if err := h.sessionStore.Create(c.Response(), c.Request(), lineUserID); err != nil {
		return redirectError("session_create_failed")
	}

	return c.Redirect(http.StatusFound, frontendOrigin+"/entries")
}

// logout はセッションCookieを削除する。
func (h *authHandler) logout(c echo.Context) error {
	if err := h.sessionStore.Destroy(c.Response(), c.Request()); err != nil {
		return httperr.Internal(c, "ログアウトに失敗しました")
	}
	return c.NoContent(http.StatusNoContent)
}

// --- LINE API helpers ---

type lineTokenResponse struct {
	AccessToken string `json:"access_token"`
}

type lineProfileResponse struct {
	UserID string `json:"userId"`
}

func exchangeToken(ctx context.Context, cfg config.Config, code string) (string, error) {
	form := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {cfg.LineLoginCallbackURL},
		"client_id":     {cfg.LineLoginChannelID},
		"client_secret": {cfg.LineLoginChannelSecret},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, lineTokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := lineHTTPClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("LINE token API returned %d: %s", resp.StatusCode, body)
	}
	var t lineTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&t); err != nil {
		return "", err
	}
	return t.AccessToken, nil
}

func fetchLineUserID(ctx context.Context, accessToken string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, lineProfileURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := lineHTTPClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("LINE profile API returned %d: %s", resp.StatusCode, body)
	}
	var p lineProfileResponse
	if err := json.NewDecoder(resp.Body).Decode(&p); err != nil {
		return "", err
	}
	return p.UserID, nil
}

func generateState() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
