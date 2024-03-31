package main

import (
	"fmt"
	"time"
)

var x = ""

func f(from string) {
	for i := 0; i < 20; i++ {
		time.Sleep(200 * time.Millisecond)
		x = from
		fmt.Println(from, ":", x)
	}
}

func g(from string) {
	for i := 0; i < 20; i++ {
		x = from
		time.Sleep(100 * time.Millisecond)
		fmt.Println(from, ":", x)
	}
}

func main() {

	g("goroutine2")
	f("goroutine")

	time.Sleep(time.Second)
	fmt.Println("done")
}
