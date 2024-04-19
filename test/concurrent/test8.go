// Multiple threads accessing shared resource causing race condition

package main

var y = 0

func f() {
    var x int = 0
    for x < 4 {
        y = 5
        println(y)
        x = x + 1
    }
}

func g() {
    var x int = 0
    for x < 4 {
        y = 10
        println(y)
        x = x + 1
    }
}

func main() {
    go f()
	sleep(2)
    go g()
    sleep(100)
}

/*
Expected Output:
5
10
5
5
10
5
10
5
*/

// Note: Race condition as more 5s are printed than what is expected