package websocket

// HubRunner starts the hub event loop. Implementations can decide whether to run
// the loop in a goroutine or synchronously; callers should ensure the desired
// concurrency semantics.
type HubRunner func(*Hub)
