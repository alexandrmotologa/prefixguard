.PHONY: all build test bench clean web

all: build

web:
	cd web && npm install && npm run build

build: web
	go build -ldflags="-s -w" -o prefixguard.exe ./cmd/prefixguard

test:
	go test -v -race ./...

bench:
	go run ./cmd/prefixguard bench --requests 100 --concurrency 10

clean:
	rm -f prefixguard.exe prefixguard.db bench_finops.db test_finops.db test_proxy.db
