package main

func f(ch chan int) {
    var x int = 0
    for x < 2 {
        ch <- 4
        x = x + 1
    }
}

func g(ch chan int) {
    var x int = 0
    for x < 2 {
        ch <- 11
        x = x + 1
    }
}

func h(a int, b bool) {
    var x = a + 3
    return x > 5 && b
}

func l() {
    println(400)
    println(true && false)
}

var ch = make(chan int)

func main() {
    var ch2 = make(chan int)
    var x int = 0
    for x < 4 {
        go f(ch)
        go g(ch2)
        x = x + 1
    }
    var y int = 0
    for y < 12 {
        var res = <- ch
        var res2 = <- ch2
        println(res)
        println(res2)
        y = y + 1
    }
    var m = h(5, true)
    println(m)
    l()
    println(750)
}