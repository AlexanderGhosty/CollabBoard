// internal/websocket/hub_test.go
package websocket

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHub_Broadcast(t *testing.T) {
	h := NewHub()
	go h.Run()
	defer func() {
		// allow hub goroutine to exit cleanly
		time.Sleep(10 * time.Millisecond)
	}()

	boardID := int32(1)
	c1 := &Client{hub: h, send: make(chan []byte, 1), boardID: boardID}
	c2 := &Client{hub: h, send: make(chan []byte, 1), boardID: boardID}
	c3 := &Client{hub: h, send: make(chan []byte, 1), boardID: 2}

	h.register <- c1
	h.register <- c2
	h.register <- c3

	type payload struct {
		Hello string `json:"hello"`
	}

	originalPayload := payload{Hello: "world"}
	msg := EventMessage{Event: "test", Data: originalPayload}
	h.Broadcast(boardID, msg)

	var expect struct {
		Event string  `json:"event"`
		Data  payload `json:"data"`
	}
	select {
	case raw := <-c1.send:
		_ = json.Unmarshal(raw, &expect)
	case <-time.After(time.Second):
		t.Fatal("timeout waiting for message on client1")
	}
	assert.Equal(t, msg.Event, expect.Event)
	assert.Equal(t, originalPayload, expect.Data)

	select {
	case <-c2.send:
		// ok
	case <-time.After(time.Second):
		t.Fatal("client2 did not receive broadcast")
	}

	select {
	case <-c3.send:
		t.Fatal("client3 should not receive message for different board")
	case <-time.After(50 * time.Millisecond):
	}
}

func TestHub_BroadcastSaturatedClient(t *testing.T) {
	h := NewHub()
	go h.Run()
	defer func() {
		time.Sleep(10 * time.Millisecond)
	}()

	boardID := int32(1)
	saturatedClient := &Client{hub: h, send: make(chan []byte, 1), boardID: boardID}

	h.register <- saturatedClient
	time.Sleep(10 * time.Millisecond)

	// Fill the buffer so the broadcast will hit the default case.
	saturatedClient.send <- []byte("existing")

	msg := EventMessage{Event: "test"}
	h.Broadcast(boardID, msg)

	time.Sleep(10 * time.Millisecond)

	select {
	case <-saturatedClient.send:
		// drained the buffered message
	case <-time.After(time.Second):
		t.Fatal("timeout waiting for buffered message")
	}

	select {
	case _, ok := <-saturatedClient.send:
		require.False(t, ok, "expected saturated client channel to be closed")
	case <-time.After(time.Second):
		t.Fatal("timeout waiting for saturated client channel to close")
	}

	h.mu.RLock()
	_, clientStillPresent := h.rooms[boardID][saturatedClient]
	h.mu.RUnlock()
	require.False(t, clientStillPresent, "saturated client should have been removed from the room")
}
