Program
  = _ declaration:Declaration* _ { return declaration; }

Declaration
  = VariableDeclaration
  / FunctionDeclaration
  / Goroutine
  / ForLoop
  / WhileLoop
  / WaitGroup
  / Assignment
  / BinaryOperatorCombination
  / LogicalComposition
  / UnaryOperatorCombination
  / LambdaExpression
  / Sequence
  / Block
  / Conditional
  / ReturnStatement
  / "\n" { return ""; }

Literal
  = value:Integer / StringLiteral {
    return { tag: "lit", val: value };
  }

Name
  = identifier:Identifier {
    return { tag: "nam", sym: identifier };
  }

Application
  = name:Identifier _ "(" _ args:ExpressionList _ ")" {
    return { tag: "app", fun: name, args: args };
  }

LogicalComposition
  = left:Term _ operator:("&&" / "||") _ right:Term {
    return { tag: "log", operator: operator,frst: left, scnd: right };
  }

BinaryOperatorCombination
  = left:Term _ operator:("+" / "-" / "*" / "/") _ right:Term {
    return {
      tag: "binop",
      operator: operator,
      frst: left,
      scnd: right
    };
  }

UnaryOperatorCombination
  = operator:("-" / "!") _ expression:Expression {
    return { tag: "unop", sym: operator, frst: expression };
  }

LambdaExpression
  = "func" _ "(" _ parameters:IdentifierList _ ")" _ "{" _ body:Declaration* _ "}" {
    return { tag: "lam", prms: parameters, body: body };
  }

Sequence
  = "{" _ statements:Declaration* _ "}" {
    return { tag: "seq", stmts: statements };
  }

Block
  = "{" _ body:Declaration* _ "}" {
    return { tag: "blk", body: body };
  }

VariableDeclaration
  = "var" _ name:Identifier _ "int" _ "=" _ expr:Expression _ ";" {
    return { tag: "var", type: "int", sym: name, expr: expr };
  }

ConstantDeclaration
  = "const" _ name:Identifier _ "=" _ expr:Expression _ ";" {
    return { tag: "const", sym: name, expr: expr };
  }

Assignment
  = name:Identifier _ "=" _ expr:Expression _ ";" {
    return { tag: "assmt", sym: name, expr: expr };
  }

Conditional
  = "if"  _ condition:Expression _ consequent:Block _ "else" _ alternative:Block {
    return { tag: "cond", pred: condition, cons: consequent, alt: alternative };
  }

FunctionDeclaration
  = "func" _ name:Identifier _ "(" _ parameters:IdentifierList _ ")" _  "int" _ body:Block {
    return { tag: "fun", sym: name, prms: parameters, body: body };
  }

ReturnStatement
  = "return" _ expression:Expression _ ";" {
    return { tag: "ret", expr: expression };
  }

ForLoop
  = "for" _ condition:Expression _ "{" _ body:Declaration* _ "}" {
    return {
      tag: "ForLoop",
      pred: condition,
      body: body
    };
  }

WhileLoop
  = "while" _ condition:Expression _ "{" _ body:Declaration* _ "}" {
    return { tag: "while", pred: condition, body: body };
  }

Goroutine
  = "go" _ Application {
    return { type: "Goroutine", call: text() };
  }

WaitGroup
  = WaitGroupDeclaration
  / WaitGroupOperation

WaitGroupDeclaration
  = "var" _ "wg" _ "sync.WaitGroup" _ ";" {
    return { type: "WaitGroupDecl" };
  }

WaitGroupOperation
  = "wg." Identifier "(" _ (Integer / Identifier) _ ")" _ ";" {
    return { type: "WaitGroupOp", operation: text() };
  }

Term
  = Integer
  / Identifier
  / "(" _ Expression _ ")"

Expression
  = BinaryOperatorCombination
  / LogicalComposition
  / Term

Identifier
  = [a-zA-Z_][a-zA-Z_0-9]* { return text(); }

IdentifierList
  = head:Identifier tail:(_ "," _ Identifier)* {
    return [head].concat(tail.map(function(element) { return element[3]; }));
  }

ExpressionList
  = head:Expression tail:(_ "," _ Expression)* {
    return [head].concat(tail.map(function(element) { return element[3]; }));
  }

Integer
  = [0-9]+ { return parseInt(text(), 10); }

StringLiteral
  = "\"" chars:[^"]* "\"" { return chars.join(""); }

_ "whitespace"
  = [ \t\n\r]*
