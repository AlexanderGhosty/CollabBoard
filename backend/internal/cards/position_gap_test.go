// internal/cards/position_gap_test.go
package cards_test

import (
	"slices"
	"testing"

	"github.com/stretchr/testify/assert"
)

func isContiguous(pos []int32) bool {
	cp := append([]int32(nil), pos...)
	slices.Sort(cp)
	for i, p := range cp {
		if p != int32(i+1) {
			return false
		}
	}
	return true
}

func insert(pos []int32, at int32) []int32 {
	for i := range pos {
		if pos[i] >= at {
			pos[i]++
		}
	}
	return append(pos, at)
}

func remove(pos []int32, at int32) []int32 {
	out := pos[:0]
	for _, p := range pos {
		if p == at {
			continue
		}
		if p > at {
			p--
		}
		out = append(out, p)
	}
	return out
}

func move(pos []int32, from, to int32) []int32 {
	pos = remove(pos, from)
	return insert(pos, to)
}

func TestCardPositions_NoGaps(t *testing.T) {
	tests := []struct {
		name      string
		operation func([]int32) []int32
		wantLen   int
	}{
		{"CreateInMiddle", func(p []int32) []int32 { return insert(p, 2) }, 4},
		{"DeleteMiddle", func(p []int32) []int32 { return remove(p, 2) }, 2},
		{"MoveFirstToLast", func(p []int32) []int32 { return move(p, 1, 3) }, 3},
	}

	for _, tc := range tests {
		got := tc.operation([]int32{1, 2, 3})
		assert.Equal(t, tc.wantLen, len(got), tc.name)
		assert.True(t, isContiguous(got), tc.name+" should be contiguous")
	}
}
