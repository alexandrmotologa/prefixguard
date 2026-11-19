package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"sync"
	"time"
)

func main() {
	targetURL := flag.String("url", "http://localhost:8585/v1/messages", "Target prefixguard reverse proxy URL")
	concurrency := flag.Int("concurrency", 10, "Concurrent clients")
	requests := flag.Int("requests", 100, "Total requests to send")
	flag.Parse()

	fmt.Printf("Generating %d requests across %d concurrent workers to %s...\n", *requests, *concurrency, *targetURL)

	start := time.Now()
	var wg sync.WaitGroup
	reqChan := make(chan int, *requests)
	client := &http.Client{Timeout: 30 * time.Second}

	var successCount int64
	var errorCount int64
	var mu sync.Mutex

	for i := 0; i < *concurrency; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for reqNum := range reqChan {
				// Inject volatile timestamp and session ID at the top of the prompt
				payload := map[string]interface{}{
					"model": "claude-3-5-sonnet-20241022",
					"system": fmt.Sprintf("You are an investment banking analyst. Current timestamp: %s. Session ID: sess_%d_%d. Verify DCF valuation tables.",
						time.Now().Format(time.RFC3339Nano), workerID, reqNum),
					"messages": []map[string]interface{}{
						{"role": "user", "content": fmt.Sprintf("Calculate WACC discount rates for project #%d.", reqNum)},
					},
				}

				body, _ := json.Marshal(payload)
				req, err := http.NewRequest(http.MethodPost, *targetURL, bytes.NewReader(body))
				if err != nil {
					mu.Lock()
					errorCount++
					mu.Unlock()
					continue
				}
				req.Header.Set("Content-Type", "application/json")

				resp, err := client.Do(req)
				if err != nil {
					mu.Lock()
					errorCount++
					mu.Unlock()
					continue
				}

				_, _ = io.Copy(io.Discard, resp.Body)
				resp.Body.Close()

				mu.Lock()
				if resp.StatusCode == http.StatusOK {
					successCount++
				} else {
					errorCount++
				}
				mu.Unlock()
			}
		}(i)
	}

	for i := 0; i < *requests; i++ {
		reqChan <- i
	}
	close(reqChan)
	wg.Wait()

	elapsed := time.Since(start)
	fmt.Printf("\nCompleted in %v\n", elapsed)
	fmt.Printf("Successful Requests: %d\n", successCount)
	fmt.Printf("Errors / Non-200s:   %d\n", errorCount)
	fmt.Printf("Throughput:          %.1f requests/sec\n", float64(successCount)/elapsed.Seconds())
	if errorCount > 0 {
		os.Exit(1)
	}
}
