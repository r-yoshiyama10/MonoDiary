package httpadapter

import (
	"net/http"
	"os"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	lineadapter "monodiary/internal/adapter/line"
	"monodiary/internal/config"
	"monodiary/internal/infrastructure/gemini"
	"monodiary/internal/pkg/session"
	"monodiary/internal/usecase"
)

func NewServer(cfg config.Config, sessionStore *session.Store, gen usecase.DiaryGenerator, repo usecase.EntryRepository) *echo.Echo {
	e := echo.New()
	e.HideBanner = true
	e.Logger.SetOutput(os.Stdout)
	e.Use(middleware.Recover())
	e.Use(middleware.LoggerWithConfig(middleware.LoggerConfig{
		Output: os.Stdout,
	}))

	// CORS（フロントエンドからのリクエストを許可）
	corsOrigin := cfg.CORSAllowedOrigin
	if corsOrigin == "" {
		corsOrigin = "http://localhost:5173"
	}
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     []string{corsOrigin},
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{"Content-Type"},
		AllowCredentials: true,
	}))

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	wh := lineadapter.NewWebhookHandler(cfg.LineChannelSecret, cfg.LineChannelAccessToken, cfg.FrontendOrigin, repo, gen)
	e.POST("/webhooks/line", wh.Handle)

	// 認証ルート（セッション不要）
	authH := &authHandler{cfg: cfg, sessionStore: sessionStore}
	e.GET("/auth/line", authH.login)
	e.GET("/auth/line/callback", authH.callback)
	e.POST("/auth/logout", authH.logout)

	// API ルート（セッション必須）
	h := &entryHandler{repo: repo, gen: gen}
	api := e.Group("/api")
	api.Use(requireAuth(sessionStore))
	api.GET("/entries", h.list)
	api.GET("/entries/:id", h.findByID)
	api.DELETE("/entries/:id", h.delete)

	if cfg.EnableDevRoutes {
		// dev専用ルート（認証不要）
		dev := e.Group("/api")
		dev.POST("/entries", h.create)
		RegisterDevRoutes(e, gen)
	}

	return e
}

func NewDiaryGenerator(cfg config.Config) usecase.DiaryGenerator {
	return gemini.NewGenerator(cfg.GeminiAPIKey, cfg.GeminiModel)
}
