// Go routine spawning another go routine and accessing a shared variable

package main

import "sync"

var y = 0

func f(m *sync.Mutex) {
    var x int = 0
    for x < 4 {
        m.Lock()
        y = 5
        println(y)
        m.Unlock()
        x = x + 1
    }
}

func k(m *sync.Mutex) {
    m.Lock()
    y = 15
    println(y)
    m.Unlock()
}

func g(m *sync.Mutex) {
    var x int = 0
    for x < 4 {
        go k(&m)
        m.Lock()
        y = 10
        println(y)
        m.Unlock()
        x = x + 1
    }
}

func main() {
    var mut sync.Mutex
    go f(&mut)
    go g(&mut)
    sleep(50)
}

/*
Expected Output:
5
15
10
5
15
10
5
10
5
15
15
10
*/