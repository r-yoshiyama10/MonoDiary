package main

import (
	"errors"
	"log"
	"net/http"

	"github.com/joho/godotenv"

	httpadapter "monodiary/internal/adapter/http"
	"monodiary/internal/config"
	"monodiary/internal/infrastructure/postgres"
	"monodiary/internal/pkg/session"
)

func main() {
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	if cfg.EnableDevRoutes {
		if err := cfg.ValidateForDevPreview(); err != nil {
			log.Fatalf("dev routes enabled but config invalid: %v", err)
		}
	}
	if err := cfg.ValidateForDB(); err != nil {
		log.Fatalf("config: %v", err)
	}
	if err := cfg.ValidateForAuth(); err != nil {
		log.Fatalf("config: %v", err)
	}

	if err := postgres.RunMigrations(cfg.DatabaseURL); err != nil {
		log.Fatalf("db migrate: %v", err)
	}
	db, err := postgres.Open(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db open: %v", err)
	}
	repo := postgres.NewEntryRepository(db)

	sessionStore := session.NewStore(cfg.SessionSecret, !cfg.EnableDevRoutes)
	gen := httpadapter.NewDiaryGenerator(cfg)
	e := httpadapter.NewServer(cfg, sessionStore, gen, repo)

	addr := ":" + cfg.Port
	log.Printf("listening on %s (dev routes: %v)", addr, cfg.EnableDevRoutes)
	if err := e.Start(addr); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("server: %v", err)
	}
}
