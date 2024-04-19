// Multiple threads write to the same channel

package main

var ch = make(chan int)

func f() {
    ch <- 4
}

func g() {
    ch <- 5
}

func main() {
    go f()
    go g()
    var res = <- ch
    var res2 = <- ch
    println(res)
    println(res2)
}

/*
Expected Output:
4
5
*/