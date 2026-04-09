package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port               string
	GeminiAPIKey       string
	GeminiModel        string
	EnableDevRoutes    bool
	DatabaseURL        string
	LineChannelSecret      string
	LineChannelAccessToken string
	AllowedLineUserID      string
	// LINE Login
	LineLoginChannelID     string
	LineLoginChannelSecret string
	LineLoginCallbackURL   string
	// Session & CORS
	SessionSecret      string
	FrontendOrigin     string
	CORSAllowedOrigin  string
}

func Load() (Config, error) {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	key := os.Getenv("GEMINI_API_KEY")
	model := os.Getenv("GEMINI_MODEL")
	if model == "" {
		model = "gemini-2.5-flash"
	}
	dev := parseBool(os.Getenv("MONODIARY_ENABLE_DEV_ROUTES"))
	dbURL := os.Getenv("DATABASE_URL")
	return Config{
		Port:              port,
		GeminiAPIKey:      key,
		GeminiModel:       model,
		EnableDevRoutes:   dev,
		DatabaseURL:       dbURL,
		LineChannelSecret:      os.Getenv("LINE_CHANNEL_SECRET"),
		LineChannelAccessToken: os.Getenv("LINE_CHANNEL_ACCESS_TOKEN"),
		AllowedLineUserID:      os.Getenv("MONODIARY_ALLOWED_LINE_USER_ID"),
		LineLoginChannelID:     os.Getenv("LINE_LOGIN_CHANNEL_ID"),
		LineLoginChannelSecret: os.Getenv("LINE_LOGIN_CHANNEL_SECRET"),
		LineLoginCallbackURL:   os.Getenv("LINE_LOGIN_CALLBACK_URL"),
		SessionSecret:     os.Getenv("SESSION_SECRET"),
		FrontendOrigin:    os.Getenv("FRONTEND_ORIGIN"),
		CORSAllowedOrigin: os.Getenv("CORS_ALLOWED_ORIGIN"),
	}, nil
}

func (c Config) ValidateForDB() error {
	if c.DatabaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	return nil
}

func (c Config) ValidateForDevPreview() error {
	if c.GeminiAPIKey == "" {
		return fmt.Errorf("GEMINI_API_KEY is required")
	}
	return nil
}

func (c Config) ValidateForAuth() error {
	missing := []string{}
	if c.LineLoginChannelID == "" {
		missing = append(missing, "LINE_LOGIN_CHANNEL_ID")
	}
	if c.LineLoginChannelSecret == "" {
		missing = append(missing, "LINE_LOGIN_CHANNEL_SECRET")
	}
	if c.LineLoginCallbackURL == "" {
		missing = append(missing, "LINE_LOGIN_CALLBACK_URL")
	}
	if c.SessionSecret == "" {
		missing = append(missing, "SESSION_SECRET")
	}
	if len(missing) > 0 {
		return fmt.Errorf("missing required env vars: %v", missing)
	}
	return nil
}

func parseBool(s string) bool {
	if s == "" {
		return false
	}
	v, err := strconv.ParseBool(s)
	if err != nil {
		return s == "1" || s == "true" || s == "yes"
	}
	return v
}
