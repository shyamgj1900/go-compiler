package main

var x int = 2

func f() {
    var i int = 0
	for i < 20 {
		x = 0
		println(x)
        i = i + 1
	}
}

func g() {
	var i int = 0
    for i < 20 {
		x = 1
		println(x)
        i = i + 1
	}
}

func main() {
    var y int = 0
	go g()
	go f()

	for y < 100 {
        y = y + 1
    }
	println(25)
}
