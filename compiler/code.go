package main

func plus(a int, b int) int {
	var z = 3
	var x = 2
	a = a * z
	x = x + b
	return a - x
}

func anotherFunction(a int) int {
	var x = 2
	x = (x + a) * 4
	return x * 3
}

func plus_no_arg() int {
	var x = 1
	var y = 2
	return x + y
}

// func brac() int {
// 	var x = 1
// 	var y = 2
// 	var z = (x + y) - x
// 	return z
// }

func log() bool {
	var x = true
	var y = false
	println(x)
	println(y)

	return x || y
}

func cond() bool {
	// var x = 1 == 1
	if 1 != 1 {
		println(1)
	} else {
		println(0)
	}
	return true

}

func loop() int {
	var i int = 1
	for i < 3 {
		i = i + 1
	}

	return i
}

func main() {

	var a = 2
	println(a)
	var res = plus(1, a)
	println(res)
	var res2 = anotherFunction(2)
	println(res2)
	var res3 = plus_no_arg()
	println(res3)
	// var res4 = brac()
	// println(res4)
	var res5 = log()
	println(res5)

	var res6 = cond()
	println(res6)

	var res7 = loop()
	println(res7)

}
