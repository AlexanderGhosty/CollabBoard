// internal/websocket/hub_test.go
package websocket

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
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

	// Use map[string]interface{} so JSON unmarshal yields the same type
	msg := EventMessage{Event: "test", Data: map[string]interface{}{"hello": "world"}}
	h.Broadcast(boardID, msg)

	expect := EventMessage{}
	select {
	case raw := <-c1.send:
		_ = json.Unmarshal(raw, &expect)
	case <-time.After(time.Second):
		t.Fatal("timeout waiting for message on client1")
	}
	assert.Equal(t, msg.Event, expect.Event)
	assert.Equal(t, msg.Data, expect.Data)

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
