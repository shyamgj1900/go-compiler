// Multiple Go routines spawned in loops and write to the same channel

package main

var ch = make(chan int)

func f(ch chan int) {
    ch <- 4
}

func g(ch chan int) {
    ch <- 11
}

func main() {
    var ch2 = make(chan int)
    var x int = 0
    for x < 10 {
        go f(ch)
        go g(ch2)
        x = x + 1
    }
    var y int = 0
    for y < 10 {
        var res = <- ch
        var res2 = <- ch2
        println(res)
        println(res2)
        y = y + 1
    }
}

/*
Expected Output:
4
11
4
11
4
11
4
11
4
11
4
11
4
11
4
11
4
11
4
11
*/