package main

func plus(a int, b int) int {
    a = b + 1
    b = b + 2
    return a + b
}

func main() {

    var a = 2
    var res = plus(1, 2)

}
