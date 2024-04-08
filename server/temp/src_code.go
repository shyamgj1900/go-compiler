package main

var y = 0
var m sync.Mutex

func f() {
    var x int = 0
    sleep(30)
    for x < 10 {
        m.Lock()
        y = 5
        println(y)
        m.Unlock()
        x = x + 1
    }
    go h()
}

func g() {
    var x int = 0
    for x < 10 {
        m.Lock()
        y = 10
        println(y)
        m.Unlock()
        x = x + 1
    }
    // println(100)
}

func l(a int, b bool) {
    a = a + 3
    var c bool = b && true
    return a < 3 == c
} 

func h() {
    println(400)
    println(5 * 6)
}


func main() {
    go f()
    go g()
    sleep(100)
    // var res = l(5, true)
    // println(res)
    println(300)
}