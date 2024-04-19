// Globally declared mutexes

package main

var y = 0
var m sync.Mutex

func f() {
    var x int = 0
    for x < 4 {
        m.Lock()
        y = 5
        println(y)
        m.Unlock()
        x = x + 1
    }
}

func g() {
    var x int = 0
    for x < 4 {
        m.Lock()
        y = 10
        println(y)
        m.Unlock()
        x = x + 1
    }
}

func main() {
    go f()
    go g()
    sleep(100)
}

/*
Expected Output:
10
5
10
10
5
10
5
5
*/