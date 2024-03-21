const parser = require("./golang");

const input = `
{
var x int = 5;
var y int = 10;
var z int = (x + y) + 10;

func f(x, y) int {
    return x + y;
}

f(1, 2);

}
`;

const parsed = parser.parse(input);
console.log(JSON.stringify(parsed, null, 2));
