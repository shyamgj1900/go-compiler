package main

var y = 0

func f(m *sync.Mutex) {
    var x int = 0
    for x < 10 {
        m.Lock()
        y = 5
        println(5)
        m.Unlock()
        x = x + 1
    }
}

func g(m *sync.Mutex) {
    var x int = 0
    for x < 10 {
        m.Lock()
        y = 10
        println(10)
        m.Unlock()
        x = x + 1
    }
}


func main() {
    var m sync.Mutex
    go f(&m)
    go g(&m)
    var x = 0
    sleep(100)
}


