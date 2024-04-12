package main

import (
	"fmt"
	"sync"
	"time"
)

func f(m *sync.Mutex) {
	m.Lock()
	fmt.Println("Locked")
}

func g(m *sync.Mutex) {
	m.Unlock()
	fmt.Println("Unlocked")
}

func main() {
	var m sync.Mutex
	// go f(&m)
	go g(&m)
	time.Sleep(1 * time.Second)
}

