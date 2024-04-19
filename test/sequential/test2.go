// Blocks

package main

func main() {
    var x int = 32
    {
        var x int = 5
        println(x)
    }
    println(x)
}

/*
Output:
5
32
*/