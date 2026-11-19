package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
)

// TelemetryEvent represents a live event broadcast to connected React 19 studios.
type TelemetryEvent struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// SSEHub manages real-time event broadcasting to studio frontends.
type SSEHub struct {
	clients map[chan []byte]bool
	mu      sync.RWMutex
}

// NewSSEHub creates a new event hub.
func NewSSEHub() *SSEHub {
	return &SSEHub{
		clients: make(map[chan []byte]bool),
	}
}

// Broadcast sends an event to all active SSE subscribers.
func (h *SSEHub) Broadcast(eventType string, payload interface{}) {
	event := TelemetryEvent{
		Type:    eventType,
		Payload: payload,
	}
	data, err := json.Marshal(event)
	if err != nil {
		return
	}

	msg := []byte(fmt.Sprintf("event: %s\ndata: %s\n\n", eventType, data))

	h.mu.RLock()
	defer h.mu.RUnlock()

	for ch := range h.clients {
		select {
		case ch <- msg:
		default:
			// Non-blocking drop if client is saturated
		}
	}
}

// ServeHTTP handles incoming SSE connections from the React 19 studio.
func (h *SSEHub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	clientChan := make(chan []byte, 32)

	h.mu.Lock()
	h.clients[clientChan] = true
	h.mu.Unlock()

	defer func() {
		h.mu.Lock()
		delete(h.clients, clientChan)
		close(clientChan)
		h.mu.Unlock()
	}()

	// Send initial connection ping
	fmt.Fprintf(w, "event: connected\ndata: {\"status\":\"ok\"}\n\n")
	flusher.Flush()

	notify := r.Context().Done()
	for {
		select {
		case <-notify:
			return
		case msg, ok := <-clientChan:
			if !ok {
				return
			}
			if _, err := w.Write(msg); err != nil {
				return
			}
			flusher.Flush()
		}
	}
}
