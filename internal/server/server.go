package server

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/alexandrmotologa/prefixguard/internal/config"
	"github.com/alexandrmotologa/prefixguard/internal/finops"
	"github.com/alexandrmotologa/prefixguard/internal/proxy"
	"github.com/alexandrmotologa/prefixguard/internal/warmer"
	"github.com/alexandrmotologa/prefixguard/web"
)

// Server wraps the complete prefixguard daemon: reverse proxy, API, cache warmer, and embedded studio.
type Server struct {
	cfg        config.Config
	httpServer *http.Server
	store      *finops.Store
	ledger     *finops.Ledger
	hub        *SSEHub
	proxy      *proxy.ReverseProxy
	api        *APIHandler
	warmer     *warmer.CacheWarmer
}

// NewServer initializes all subsystems.
func NewServer(cfg config.Config) (*Server, error) {
	store, err := finops.NewStore(cfg.DBPath)
	if err != nil {
		return nil, fmt.Errorf("init finops store: %w", err)
	}

	ledger := finops.NewLedger(store)
	hub := NewSSEHub()
	cacheWarmer := warmer.NewCacheWarmer(cfg)

	revProxy, err := proxy.NewReverseProxy(cfg, ledger, hub)
	if err != nil {
		return nil, fmt.Errorf("init reverse proxy: %w", err)
	}

	api := NewAPIHandler(cfg, ledger, hub, cacheWarmer)

	apiMux := http.NewServeMux()
	api.RegisterRoutes(apiMux)

	spaHandler := web.SPAHandler()

	rootHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// 1. API and telemetry endpoints
		if strings.HasPrefix(path, "/api/") || path == "/healthz" || path == "/metrics" {
			apiMux.ServeHTTP(w, r)
			return
		}

		// 2. Inference requests to LLM upstream
		if strings.HasPrefix(path, "/v1/") {
			revProxy.ServeHTTP(w, r)
			return
		}

		// 3. Fallback to embedded React 19 studio
		spaHandler.ServeHTTP(w, r)
	})

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      rootHandler,
		ReadTimeout:  120 * time.Second,
		WriteTimeout: 0,
		IdleTimeout:  120 * time.Second,
	}

	if cfg.EnableWarmer {
		cacheWarmer.Start()
	}

	return &Server{
		cfg:        cfg,
		httpServer: srv,
		store:      store,
		ledger:     ledger,
		hub:        hub,
		proxy:      revProxy,
		api:        api,
		warmer:     cacheWarmer,
	}, nil
}

// Start begins listening on the configured port.
func (s *Server) Start() error {
	return s.httpServer.ListenAndServe()
}

// Shutdown gracefully stops the server and closes database connections.
func (s *Server) Shutdown(ctx context.Context) error {
	s.warmer.Stop()
	_ = s.store.Close()
	return s.httpServer.Shutdown(ctx)
}
