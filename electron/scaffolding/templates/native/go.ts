import { Files, GITIGNORE, NativeContext, readme, shell } from './context'

type GoFramework = 'gin' | 'echo' | 'fiber' | 'chi' | 'nethttp'

const MODULES: Record<GoFramework, { label: string; require: string }> = {
  gin: { label: 'Gin', require: 'github.com/gin-gonic/gin v1.10.0' },
  echo: { label: 'Echo', require: 'github.com/labstack/echo/v4 v4.12.0' },
  fiber: { label: 'Fiber', require: 'github.com/gofiber/fiber/v2 v2.52.5' },
  chi: { label: 'Chi', require: 'github.com/go-chi/chi/v5 v5.1.0' },
  nethttp: { label: 'net/http', require: '' }
}

function goService(c: NativeContext, framework: GoFramework): Files {
  const mod = c.name.replace(/[^a-zA-Z0-9._/-]/g, '-')
  const { label, require } = MODULES[framework]
  const handlerImport = `"${mod}/internal/handlers"`

  const main: Record<GoFramework, string> = {
    gin: `package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"${mod}/internal/config"
	${handlerImport}
)

func main() {
	router := gin.Default()
	handlers.Register(router)
	addr := ":" + config.Port()
	log.Printf("[LazyStack] ${c.name} (Gin) listening on %s", addr)
	log.Fatal(router.Run(addr))
}
`,
    echo: `package main

import (
	"log"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"${mod}/internal/config"
	${handlerImport}
)

func main() {
	e := echo.New()
	e.Use(middleware.Logger(), middleware.Recover())
	handlers.Register(e)
	addr := ":" + config.Port()
	log.Printf("[LazyStack] ${c.name} (Echo) listening on %s", addr)
	log.Fatal(e.Start(addr))
}
`,
    fiber: `package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"${mod}/internal/config"
	${handlerImport}
)

func main() {
	app := fiber.New()
	app.Use(logger.New())
	handlers.Register(app)
	addr := ":" + config.Port()
	log.Printf("[LazyStack] ${c.name} (Fiber) listening on %s", addr)
	log.Fatal(app.Listen(addr))
}
`,
    chi: `package main

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"${mod}/internal/config"
	${handlerImport}
)

func main() {
	router := chi.NewRouter()
	router.Use(middleware.Logger, middleware.Recoverer)
	handlers.Register(router)
	addr := ":" + config.Port()
	log.Printf("[LazyStack] ${c.name} (Chi) listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, router))
}
`,
    nethttp: `package main

import (
	"log"
	"net/http"

	"${mod}/internal/config"
	${handlerImport}
)

func main() {
	mux := http.NewServeMux()
	handlers.Register(mux)
	addr := ":" + config.Port()
	log.Printf("[LazyStack] ${c.name} (net/http) listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
`
  }

  const handlers: Record<GoFramework, string> = {
    gin: `package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func Register(router *gin.Engine) {
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"service": "${c.name}", "framework": "Gin", "status": "online"})
	})
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	})
}
`,
    echo: `package handlers

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func Register(e *echo.Echo) {
	e.GET("/", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"service": "${c.name}", "framework": "Echo", "status": "online"})
	})
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "healthy"})
	})
}
`,
    fiber: `package handlers

import "github.com/gofiber/fiber/v2"

func Register(app *fiber.App) {
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"service": "${c.name}", "framework": "Fiber", "status": "online"})
	})
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "healthy"})
	})
}
`,
    chi: `package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func writeJSON(w http.ResponseWriter, body any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(body)
}

func Register(router chi.Router) {
	router.Get("/", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, map[string]string{"service": "${c.name}", "framework": "Chi", "status": "online"})
	})
	router.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, map[string]string{"status": "healthy"})
	})
}
`,
    nethttp: `package handlers

import (
	"encoding/json"
	"net/http"
)

func writeJSON(w http.ResponseWriter, body any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(body)
}

func Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, map[string]string{"service": "${c.name}", "runtime": "Go net/http", "status": "online"})
	})
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, map[string]string{"status": "healthy"})
	})
}
`
  }

  const testSetup: Record<GoFramework, { imports: string; serve: string }> = {
    gin: { imports: '\n\t"github.com/gin-gonic/gin"', serve: 'gin.SetMode(gin.TestMode)\n\trouter := gin.New()\n\tRegister(router)\n\trecorder := httptest.NewRecorder()\n\trouter.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/health", nil))\n\tstatus := recorder.Code' },
    echo: { imports: '\n\t"github.com/labstack/echo/v4"', serve: 'e := echo.New()\n\tRegister(e)\n\trecorder := httptest.NewRecorder()\n\te.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/health", nil))\n\tstatus := recorder.Code' },
    fiber: { imports: '\n\t"github.com/gofiber/fiber/v2"', serve: 'app := fiber.New()\n\tRegister(app)\n\tresponse, err := app.Test(httptest.NewRequest(http.MethodGet, "/health", nil))\n\tif err != nil {\n\t\tt.Fatal(err)\n\t}\n\tstatus := response.StatusCode' },
    chi: { imports: '\n\t"github.com/go-chi/chi/v5"', serve: 'router := chi.NewRouter()\n\tRegister(router)\n\trecorder := httptest.NewRecorder()\n\trouter.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/health", nil))\n\tstatus := recorder.Code' },
    nethttp: { imports: '', serve: 'mux := http.NewServeMux()\n\tRegister(mux)\n\trecorder := httptest.NewRecorder()\n\tmux.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/health", nil))\n\tstatus := recorder.Code' }
  }

  return {
    'go.mod': `module ${mod}\n\ngo 1.23\n${require ? `\nrequire ${require}\n` : ''}`,
    'main.go': main[framework],
    'internal/config/config.go': `package config

import "os"

// Port returns the HTTP port from PORT (set by LazyStack's .env and Compose files).
func Port() string {
	if port := os.Getenv("PORT"); port != "" {
		return port
	}
	return "${c.port || 8080}"
}
`,
    'internal/handlers/handlers.go': handlers[framework],
    'internal/handlers/handlers_test.go': `package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"${testSetup[framework].imports}
)

func TestHealth(t *testing.T) {
	${testSetup[framework].serve}
	if status != http.StatusOK {
		t.Fatalf("GET /health returned %d, want 200", status)
	}
}
`,
    '.gitignore': GITIGNORE.go + '/server\n',
    'README.md': readme(`${c.name} (Go ${label})`, `Go ${label} service generated by LazyStack, following the standard Go project layout.`, [
      ['Layout', '- `main.go`: server bootstrap\n- `internal/handlers/`: HTTP handlers and tests\n- `internal/config/`: runtime configuration (`PORT`)'],
      ['Develop', shell('go mod tidy   # resolves dependencies and writes go.sum\ngo run .\ngo test ./...')],
      ['Build', shell('go build -o server .')]
    ])
  }
}

export const goStarters: Record<string, (c: NativeContext) => Files> = {
  'go-gin': c => goService(c, 'gin'),
  'go-echo': c => goService(c, 'echo'),
  'go-fiber': c => goService(c, 'fiber'),
  'go-chi': c => goService(c, 'chi'),
  'vanilla-go': c => goService(c, 'nethttp')
}

export const goExtras: Record<string, (c: NativeContext) => Files> = {
  'go-goravel': () => ({ '.gitignore': GITIGNORE.go })
}
