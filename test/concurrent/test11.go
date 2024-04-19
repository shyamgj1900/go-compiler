// Go routines reading and writing to each other

package main

var ch = make(chan int)

func f(ch chan int) {
    var x int = 0
    for x < 100 {
        ch <- x
        x = x + 1
    }
}

func g(ch chan int) {
    var x int = 0
    for x < 100 {
        var res = <- ch
        println(res)
        x = x + 1
    }
}

func main() {
    var ch2 = make(chan int)
    go f(ch2)
    go g(ch2)
    sleep(1000)
}

/*
Expected Output:
0
1
2
...
99
*/