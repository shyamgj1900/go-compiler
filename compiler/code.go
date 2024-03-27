package main

func plus(a int, b int) int {
    var z = 3
    var x = 2
    a = a * z
    x = x + b
    return a - x
}

func anotherFunction(a int) int{
    var x = 2
    x = x + a
    return x * 3
}

func main() {

    var a = 2
    println(a)
    var res = plus(1, a)
    println(res)
    var res2 = anotherFunction(2)
    println(res2)

}
