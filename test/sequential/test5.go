// Function declaration and application

package main

func f(x int) int {
    var y int = 4
    x = x + y
    return x
}

func main() {
    var x int = 1
    var res = f(x)
    println(res)
}

/*
Output:
5
*/