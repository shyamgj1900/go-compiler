// ***************************************************
// Solution Homework 6: Based on solution by NG CHI SERN
// ***************************************************

// ***************************************************
// Virtual machine with tagged pointers for Source §3-
// set up for mark-and-sweep garbage collection
// ***************************************************/

// how to run: Copy this program to your favorite
// JavaScript development environment. Use
// ECMAScript 2016 or higher in Node.js.
// Import the NPM package sicp from
// https://www.npmjs.com/package/sicp

// for syntax and semantics of Source §4,
// see https://docs.sourceacademy.org/source_4.pdf

// simplifications:
//
// (1) every statement produces a value
//
// In this evaluator, all statements produce
// a value, and declarations produce undefined,
// whereas JavaScript distinguishes value-producing
// statements. This makes a difference at the top
// level, outside of function bodies. For example,
// in JavaScript, the execution of
// 1; const x = 2;
// results in 1, whereas the evaluator gives undefined.
// For details on this see:
// https://sourceacademy.org/sicpjs/4.1.2#ex-4.8
//
// (2) no loops and arrays

// **********************
// using arrays as stacks
// **********************/

// add values destructively to the end of
// given array; return the array
const push = (array, ...items) => {
  // fixed by Liew Zhao Wei, see Discussion 5
  for (let item of items) {
    array.push(item);
  }
  return array;
};

// return the last element of given array
// without changing the array
const peek = (array, address) => array.slice(-1 - address)[0];

// *************
// parse to JSON
// *************/

const list_to_array = (xs) =>
  is_null(xs) ? [] : [head(xs)].concat(list_to_array(tail(xs)));

// simplify parameter format
const parameters = (xs) => map((x) => head(tail(x)), xs);

// turn tagged list syntax from parse into JSON object
const ast_to_json = (t) => {
  switch (head(t)) {
    case "literal":
      return { tag: "lit", val: head(tail(t)) };
    case "name":
      return { tag: "nam", sym: head(tail(t)) };
    case "application":
      return {
        tag: "app",
        fun: ast_to_json(head(tail(t))),
        args: list_to_array(map(ast_to_json, head(tail(tail(t))))),
      };
    case "logical_composition":
      return {
        tag: "log",
        sym: head(tail(t)),
        frst: ast_to_json(head(tail(tail(t)))),
        scnd: ast_to_json(head(tail(tail(tail(t))))),
      };
    case "binary_operator_combination":
      return {
        tag: "binop",
        sym: head(tail(t)),
        frst: ast_to_json(head(tail(tail(t)))),
        scnd: ast_to_json(head(tail(tail(tail(t))))),
      };
    case "unary_operator_combination":
      return {
        tag: "unop",
        sym: head(tail(t)),
        frst: ast_to_json(head(tail(tail(t)))),
      };
    case "lambda_expression":
      return {
        tag: "lam",
        prms: list_to_array(parameters(head(tail(t)))),
        body: ast_to_json(head(tail(tail(t)))),
      };
    case "sequence":
      return {
        tag: "seq",
        stmts: list_to_array(map(ast_to_json, head(tail(t)))),
      };
    case "block":
      return {
        tag: "blk",
        body: ast_to_json(head(tail(t))),
      };
    case "variable_declaration":
      return {
        tag: "let",
        sym: head(tail(head(tail(t)))),
        expr: ast_to_json(head(tail(tail(t)))),
      };
    case "constant_declaration":
      return {
        tag: "const",
        sym: head(tail(head(tail(t)))),
        expr: ast_to_json(head(tail(tail(t)))),
      };
    case "assignment":
      return {
        tag: "assmt",
        sym: head(tail(head(tail(t)))),
        expr: ast_to_json(head(tail(tail(t)))),
      };
    case "conditional_statement":
      return {
        tag: "cond", // dont distinguish stmt and expr
        pred: ast_to_json(head(tail(t))),
        cons: ast_to_json(head(tail(tail(t)))),
        alt: ast_to_json(head(tail(tail(tail(t))))),
      };
    case "conditional_expression":
      return {
        tag: "cond", // dont distinguish stmt and expr
        pred: ast_to_json(head(tail(t))),
        cons: ast_to_json(head(tail(tail(t)))),
        alt: ast_to_json(head(tail(tail(tail(t))))),
      };
    case "function_declaration":
      return {
        tag: "fun",
        sym: head(tail(head(tail(t)))),
        prms: list_to_array(parameters(head(tail(tail(t))))),
        body: ast_to_json(head(tail(tail(tail(t))))),
      };
    case "return_statement":
      return {
        tag: "ret",
        expr: ast_to_json(head(tail(t))),
      };
    case "while_loop":
      return {
        tag: "while",
        pred: ast_to_json(head(tail(t))),
        body: ast_to_json(head(tail(tail(t)))),
      };
    default:
      error(t, "unknown syntax:");
  }
};

// parse, turn into json (using ast_to_json),
// and wrap in a block
const parse_to_json = (program_text) => ({
  tag: "blk",
  body: ast_to_json(parse(program_text)),
});

// *************************
// HEAP
// *************************/

// HEAP is an array of bytes (JS ArrayBuffer)

const word_size = 8;

// heap_make allocates a heap of given size
// (in bytes) and returns a DataView of that,
// see https://www.javascripture.com/DataView
const heap_make = (words) => {
  const data = new ArrayBuffer(words * word_size);
  const view = new DataView(data);
  return view;
};

// for convenience, HEAP is global variable
// initialized in initialize_machine()
let HEAP;
let heap_size;

// free is the next free index in the free list
let free;

// for debugging: display all bits of the heap
const heap_display = (s) => {
  display("", "heap: " + s);
  for (let i = 0; i < heap_size; i++) {
    display(
      word_to_string(heap_get(i)),
      stringify(i) + " " + stringify(heap_get(i)) + " "
    );
  }
};

// heap_allocate allocates a given number of words
// on the heap and marks the first word with a 1-byte tag.
// the last two bytes of the first word indicate the number
// of children (addresses) that follow the tag word:
// [1 byte tag, 4 bytes payload (depending on node type),
//  2 bytes #children, 1 byte unused]
// Note: payload depends on the type of node
const size_offset = 5;

const node_size = 10;

const heap_allocate = (tag, size) => {
  if (size > node_size) {
    error("limitation: nodes cannot be larger than 10 words");
  }
  // a value of -1 in free indicates the
  // end of the free list
  if (free === -1) {
    mark_sweep();
  }

  // allocate
  const address = free;
  free = heap_get(free);
  HEAP.setInt8(address * word_size, tag);
  HEAP.setUint16(address * word_size + size_offset, size);
  return address;
};

// modified
const mark_bit = 7;

const UNMARKED = 0;
const MARKED = 1;

let HEAP_BOTTOM;
let ALLOCATING;

const mark_sweep = () => {
  // mark r for r in roots
  const roots = [...OS, E, ...RTS, ...ALLOCATING];
  for (let i = 0; i < roots.length; i++) {
    mark(roots[i]);
  }

  sweep();

  if (free === -1) {
    error("heap memory exhausted");
    // or error("out of memory")
  }
};

const mark = (node) => {
  if (node >= heap_size) {
    return;
  }

  if (is_unmarked(node)) {
    heap_set_byte_at_offset(node, mark_bit, MARKED);

    const num_of_children = heap_get_number_of_children(node);

    for (let i = 0; i < num_of_children; i++) {
      mark(heap_get_child(node, i));
    }
  }
};

const sweep = () => {
  let v = HEAP_BOTTOM;

  while (v < heap_size) {
    if (is_unmarked(v)) {
      free_node(v);
    } else {
      heap_set_byte_at_offset(v, mark_bit, UNMARKED);
    }

    v = v + node_size;
  }
};

const is_unmarked = (node) =>
  heap_get_byte_at_offset(node, mark_bit) === UNMARKED;

const free_node = (node) => {
  // heap set is used for retrieving the next free node
  heap_set(node, free);
  free = node;
};

const heap_already_copied = (node) =>
  heap_get_forwarding_address(node) >= to_space &&
  heap_get_forwarding_address(node) <= free;

const heap_set_forwarding_address = (node, address) =>
  HEAP.setInt32(node * word_size, address);

const heap_get_forwarding_address = (node) => HEAP.getInt32(node * word_size);

// get and set a word in heap at given address
const heap_get = (address) => HEAP.getFloat64(address * word_size);

const heap_set = (address, x) => HEAP.setFloat64(address * word_size, x);

// child index starts at 0
const heap_get_child = (address, child_index) =>
  heap_get(address + 1 + child_index);

const heap_set_child = (address, child_index, value) =>
  heap_set(address + 1 + child_index, value);

const heap_get_tag = (address) => HEAP.getInt8(address * word_size);

const heap_get_size = (address) =>
  HEAP.getUint16(address * word_size + size_offset);

// the number of children is one less than the size
// except for number nodes:
//                 they have size 2 but no children
const heap_get_number_of_children = (address) =>
  heap_get_tag(address) === Number_tag ? 0 : heap_get_size(address) - 1;

// access byte in heap, using address and offset
const heap_set_byte_at_offset = (address, offset, value) =>
  HEAP.setUint8(address * word_size + offset, value);

const heap_get_byte_at_offset = (address, offset) =>
  HEAP.getUint8(address * word_size + offset);

// access byte in heap, using address and offset
const heap_set_2_bytes_at_offset = (address, offset, value) =>
  HEAP.setUint16(address * word_size + offset, value);

const heap_get_2_bytes_at_offset = (address, offset) =>
  HEAP.getUint16(address * word_size + offset);

// for debugging: return a string that shows the bits
// of a given word
const word_to_string = (word) => {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setFloat64(0, word);
  let binStr = "";
  for (let i = 0; i < 8; i++) {
    binStr += ("00000000" + view.getUint8(i).toString(2)).slice(-8) + " ";
  }
  return binStr;
};

// values

// All values are allocated on the heap as nodes. The first
// word of the node is a header, and the first byte of the
// header is a tag that identifies the type of node

// a little trick: tags are all negative so that we can use
// the first 4 bytes of the header as forwarding address
// in garbage collection: If the (signed) Int32 is
// non-negative, the node has been forwarded already.

const False_tag = 0;
const True_tag = 1;
const Number_tag = 2;
const Null_tag = 3;
const Unassigned_tag = 4;
const Undefined_tag = 5;
const Blockframe_tag = 6;
const Callframe_tag = 7;
const Closure_tag = 8;
const Frame_tag = 9; // 0000 1001
const Environment_tag = 10; // 0000 1010
const Pair_tag = 11;
const Builtin_tag = 12;

// all values (including literals) are allocated on the heap.

// We allocate canonical values for
// true, false, undefined, null, and unassigned
// and make sure no such values are created at runtime

// boolean values carry their value (0 for false, 1 for true)
// in the byte following the tag

let False;
const is_False = (address) => heap_get_tag(address) === False_tag;
let True;
const is_True = (address) => heap_get_tag(address) === True_tag;

const is_Boolean = (address) => is_True(address) || is_False(address);

let Null;
const is_Null = (address) => heap_get_tag(address) === Null_tag;

let Unassigned;
const is_Unassigned = (address) => heap_get_tag(address) === Unassigned_tag;

let Undefined;
const is_Undefined = (address) => heap_get_tag(address) === Undefined_tag;

const allocate_literal_values = () => {
  False = heap_allocate(False_tag, 1);
  True = heap_allocate(True_tag, 1);
  Null = heap_allocate(Null_tag, 1);
  Unassigned = heap_allocate(Unassigned_tag, 1);
  Undefined = heap_allocate(Undefined_tag, 1);
};

// builtins: builtin id is encoded in second byte
// [1 byte tag, 1 byte id, 3 bytes unused,
//  2 bytes #children, 1 byte unused]
// Note: #children is 0

const is_Builtin = (address) => heap_get_tag(address) === Builtin_tag;

const heap_allocate_Builtin = (id) => {
  const address = heap_allocate(Builtin_tag, 1);
  heap_set_byte_at_offset(address, 1, id);
  return address;
};

const heap_get_Builtin_id = (address) => heap_get_byte_at_offset(address, 1);

// closure
// [1 byte tag, 1 byte arity, 2 bytes pc, 1 byte unused,
//  2 bytes #children, 1 byte unused]
// followed by the address of env
// note: currently bytes at offset 4 and 7 are not used;
//   they could be used to increase pc and #children range

const heap_allocate_Closure = (arity, pc, env) => {
  ALLOCATING = [env];
  const address = heap_allocate(Closure_tag, 2);
  ALLOCATING = [];
  heap_set_byte_at_offset(address, 1, arity);
  heap_set_2_bytes_at_offset(address, 2, pc);
  heap_set(address + 1, env);
  return address;
};

const heap_get_Closure_arity = (address) => heap_get_byte_at_offset(address, 1);

const heap_get_Closure_pc = (address) => heap_get_2_bytes_at_offset(address, 2);

const heap_get_Closure_environment = (address) => heap_get_child(address, 0);

const is_Closure = (address) => heap_get_tag(address) === Closure_tag;

// block frame
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]

const heap_allocate_Blockframe = (env) => {
  ALLOCATING = [env];
  const address = heap_allocate(Blockframe_tag, 2);
  heap_set(address + 1, env);
  ALLOCATING = [];
  return address;
};

const heap_get_Blockframe_environment = (address) => heap_get_child(address, 0);

const is_Blockframe = (address) => heap_get_tag(address) === Blockframe_tag;

// call frame
// [1 byte tag, 1 byte unused, 2 bytes pc,
//  1 byte unused, 2 bytes #children, 1 byte unused]
// followed by the address of env

const heap_allocate_Callframe = (env, pc) => {
  ALLOCATING = [env];
  const address = heap_allocate(Callframe_tag, 2);
  ALLOCATING = [];
  heap_set_2_bytes_at_offset(address, 2, pc);
  heap_set(address + 1, env);
  return address;
};

const heap_get_Callframe_environment = (address) => heap_get_child(address, 0);

const heap_get_Callframe_pc = (address) =>
  heap_get_2_bytes_at_offset(address, 2);

const is_Callframe = (address) => heap_get_tag(address) === Callframe_tag;

// environment frame
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]
// followed by the addresses of its values

const heap_allocate_Frame = (number_of_values) =>
  heap_allocate(Frame_tag, number_of_values + 1);

const heap_Frame_display = (address) => {
  display("", "Frame:");
  const size = heap_get_number_of_children(address);
  display(size, "frame size:");
  for (let i = 0; i < size; i++) {
    display(i, "value address:");
    const value = heap_get_child(address, i);
    display(value, "value:");
    display(word_to_string(value), "value word:");
  }
};

// environment
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]
// followed by the addresses of its frames

const heap_allocate_Environment = (number_of_frames) =>
  heap_allocate(Environment_tag, number_of_frames + 1);

// access environment given by address
// using a "position", i.e. a pair of
// frame index and value index
const heap_get_Environment_value = (env_address, position) => {
  const [frame_index, value_index] = position;
  const frame_address = heap_get_child(env_address, frame_index);
  return heap_get_child(frame_address, value_index);
};

const heap_set_Environment_value = (env_address, position, value) => {
  const [frame_index, value_index] = position;
  const frame_address = heap_get_child(env_address, frame_index);
  heap_set_child(frame_address, value_index, value);
};

// extend a given environment by a new frame:
// create a new environment that is bigger by 1
// frame slot than the given environment.
// copy the frame Addresses of the given
// environment to the new environment.
// enter the address of the new frame to end
// of the new environment
const heap_Environment_extend = (frame_address, env_address) => {
  const old_size = heap_get_size(env_address);
  // modified: should not free frame address and env address here
  ALLOCATING = [frame_address, env_address];
  const new_env_address = heap_allocate_Environment(old_size);
  ALLOCATING = [];
  let i;
  for (i = 0; i < old_size - 1; i++) {
    heap_set_child(new_env_address, i, heap_get_child(env_address, i));
  }
  heap_set_child(new_env_address, i, frame_address);
  return new_env_address;
};

// for debuggging: display environment
const heap_Environment_display = (env_address) => {
  const size = heap_get_number_of_children(env_address);
  display("", "Environment:");
  display(size, "environment size:");
  for (let i = 0; i < size; i++) {
    display(i, "frame index:");
    const frame = heap_get_child(env_address, i);
    heap_Frame_display(frame);
  }
};

// pair
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]
// followed by head and tail addresses, one word each
const heap_allocate_Pair = (hd, tl) => {
  const pair_address = heap_allocate(Pair_tag, 3);
  heap_set_child(pair_address, 0, hd);
  heap_set_child(pair_address, 1, tl);
  return pair_address;
};

const is_Pair = (address) => heap_get_tag(address) === Pair_tag;

// number
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]
// followed by the number, one word
// note: #children is 0

const heap_allocate_Number = (n) => {
  const number_address = heap_allocate(Number_tag, 2);
  heap_set(number_address + 1, n);
  return number_address;
};

const is_Number = (address) => heap_get_tag(address) === Number_tag;

//
// conversions between addresses and JS_value
//

const address_to_JS_value = (x) =>
  is_Boolean(x)
    ? is_True(x)
      ? true
      : false
    : is_Number(x)
    ? heap_get(x + 1)
    : is_Undefined(x)
    ? undefined
    : is_Unassigned(x)
    ? "<unassigned>"
    : is_Null(x)
    ? null
    : is_Pair(x)
    ? [
        address_to_JS_value(heap_get_child(x, 0)),
        address_to_JS_value(heap_get_child(x, 1)),
      ]
    : is_Closure(x)
    ? "<closure>"
    : is_Builtin(x)
    ? "<builtin>"
    : "unknown word tag: " + word_to_string(x);

const JS_value_to_address = (x) =>
  is_boolean(x)
    ? x
      ? True
      : False
    : is_number(x)
    ? heap_allocate_Number(x)
    : is_undefined(x)
    ? Undefined
    : is_null(x)
    ? Null
    : is_pair(x)
    ? heap_allocate_Pair(
        JS_value_to_address(head(x)),
        JS_value_to_address(tail(x))
      )
    : "unknown word tag: " + word_to_string(x);

// ************************
// compile-time environment
// ************************/

// a compile-time environment is an array of
// compile-time frames, and a compile-time frame
// is an array of symbols

// find the position [frame-index, value-index]
// of a given symbol x
const compile_time_environment_position = (env, x) => {
  let frame_index = env.length;
  while (value_index(env[--frame_index], x) === -1) {}
  return [frame_index, value_index(env[frame_index], x)];
};

const value_index = (frame, x) => {
  for (let i = 0; i < frame.length; i++) {
    if (frame[i] === x) return i;
  }
  return -1;
};

// in this machine, the builtins take their
// arguments directly from the operand stack,
// to save the creation of an intermediate
// argument array
const builtin_implementation = {
  display: () => {
    const address = OS.pop();
    display(address_to_JS_value(address));
    return address;
  },
  error: () => error(address_to_JS_value(OS.pop())),
  pair: () => {
    const tl = OS.pop();
    const hd = OS.pop();
    return heap_allocate_Pair(hd, tl);
  },
  is_pair: () => (is_Pair(OS.pop()) ? True : False),
  head: () => heap_get_child(OS.pop(), 0),
  tail: () => heap_get_child(OS.pop(), 1),
  is_null: () => (is_Null(OS.pop()) ? True : False),
  set_head: () => {
    const val = OS.pop();
    const p = OS.pop();
    heap_set_child(p, 0, val);
  },
  set_tail: () => {
    const val = OS.pop();
    const p = OS.pop();
    heap_set_child(p, 1, val);
  },
};

const builtins = {};
const builtin_array = [];
{
  let i = 0;
  for (const key in builtin_implementation) {
    builtins[key] = {
      tag: "BUILTIN",
      id: i,
      arity: arity(builtin_implementation[key]),
    };
    builtin_array[i++] = builtin_implementation[key];
  }
}

const constants = {
  undefined: Undefined,
  math_E: math_E,
  math_LN10: math_LN10,
  math_LN2: math_LN2,
  math_LOG10E: math_LOG10E,
  math_LOG2E: math_LOG2E,
  math_PI: math_PI,
  math_SQRT1_2: math_SQRT1_2,
  math_SQRT2: math_SQRT2,
};

const compile_time_environment_extend = (vs, e) => {
  //  make shallow copy of e
  return push([...e], vs);
};

// compile-time frames only need synbols (keys), no values
const builtin_compile_frame = Object.keys(builtins);
const constant_compile_frame = Object.keys(constants);
const global_compile_environment = [
  builtin_compile_frame,
  constant_compile_frame,
];

// ********
// compiler
// ********

// scanning out the declarations from (possibly nested)
// sequences of statements, ignoring blocks
const scan_for_locals = (comp) =>
  comp.tag === "seq"
    ? comp.stmts.reduce((acc, x) => acc.concat(scan_for_locals(x)), [])
    : ["let", "const", "fun"].includes(comp.tag)
    ? [comp.sym]
    : [];

const compile_sequence = (seq, ce) => {
  if (seq.length === 0) return (instrs[wc++] = { tag: "LDC", val: undefined });
  let first = true;
  for (let comp of seq) {
    first ? (first = false) : (instrs[wc++] = { tag: "POP" });
    compile(comp, ce);
  }
};

// wc: write counter
let wc;
// instrs: instruction array
let instrs;

const compile_comp = {
  lit: (comp, ce) => {
    instrs[wc++] = { tag: "LDC", val: comp.val };
  },
  nam:
    // store precomputed position information in LD instruction
    (comp, ce) => {
      instrs[wc++] = {
        tag: "LD",
        sym: comp.sym,
        pos: compile_time_environment_position(ce, comp.sym),
      };
    },
  unop: (comp, ce) => {
    compile(comp.frst, ce);
    instrs[wc++] = { tag: "UNOP", sym: comp.sym };
  },
  binop: (comp, ce) => {
    compile(comp.frst, ce);
    compile(comp.scnd, ce);
    instrs[wc++] = { tag: "BINOP", sym: comp.sym };
  },
  log: (comp, ce) => {
    compile(
      comp.sym == "&&"
        ? {
            tag: "cond_expr",
            pred: comp.frst,
            cons: { tag: "lit", val: true },
            alt: comp.scnd,
          }
        : {
            tag: "cond_expr",
            pred: cmd.frst,
            cons: cmd.scnd,
            alt: { tag: "lit", val: false },
          },
      ce
    );
  },
  cond: (comp, ce) => {
    compile(comp.pred, ce);
    const jump_on_false_instruction = { tag: "JOF" };
    instrs[wc++] = jump_on_false_instruction;
    compile(comp.cons, ce);
    const goto_instruction = { tag: "GOTO" };
    instrs[wc++] = goto_instruction;
    const alternative_address = wc;
    jump_on_false_instruction.addr = alternative_address;
    compile(comp.alt, ce);
    goto_instruction.addr = wc;
  },
  while: (comp, ce) => {
    const loop_start = wc;
    compile(comp.pred, ce);
    const jump_on_false_instruction = { tag: "JOF" };
    instrs[wc++] = jump_on_false_instruction;
    compile(comp.body, ce);
    instrs[wc++] = { tag: "POP" };
    instrs[wc++] = { tag: "GOTO", addr: loop_start };
    jump_on_false_instruction.addr = wc;
    instrs[wc++] = { tag: "LDC", val: undefined };
  },
  app: (comp, ce) => {
    compile(comp.fun, ce);
    for (let arg of comp.args) {
      compile(arg, ce);
    }
    instrs[wc++] = { tag: "CALL", arity: comp.args.length };
  },
  assmt:
    // store precomputed position info in ASSIGN instruction
    (comp, ce) => {
      compile(comp.expr, ce);
      instrs[wc++] = {
        tag: "ASSIGN",
        pos: compile_time_environment_position(ce, comp.sym),
      };
    },
  lam: (comp, ce) => {
    instrs[wc++] = { tag: "LDF", arity: comp.arity, addr: wc + 1 };
    // jump over the body of the lambda expression
    const goto_instruction = { tag: "GOTO" };
    instrs[wc++] = goto_instruction;
    // extend compile-time environment
    compile(comp.body, compile_time_environment_extend(comp.prms, ce));
    instrs[wc++] = { tag: "LDC", val: undefined };
    instrs[wc++] = { tag: "RESET" };
    goto_instruction.addr = wc;
  },
  seq: (comp, ce) => compile_sequence(comp.stmts, ce),
  blk: (comp, ce) => {
    const locals = scan_for_locals(comp.body);
    instrs[wc++] = { tag: "ENTER_SCOPE", num: locals.length };
    compile(
      comp.body,
      // extend compile-time environment
      compile_time_environment_extend(locals, ce)
    );
    instrs[wc++] = { tag: "EXIT_SCOPE" };
  },
  let: (comp, ce) => {
    compile(comp.expr, ce);
    instrs[wc++] = {
      tag: "ASSIGN",
      pos: compile_time_environment_position(ce, comp.sym),
    };
  },
  const: (comp, ce) => {
    compile(comp.expr, ce);
    instrs[wc++] = {
      tag: "ASSIGN",
      pos: compile_time_environment_position(ce, comp.sym),
    };
  },
  ret: (comp, ce) => {
    compile(comp.expr, ce);
    if (comp.expr.tag === "app") {
      // tail call: turn CALL into TAILCALL
      instrs[wc - 1].tag = "TAIL_CALL";
    } else {
      instrs[wc++] = { tag: "RESET" };
    }
  },
  fun: (comp, ce) => {
    compile(
      {
        tag: "const",
        sym: comp.sym,
        expr: { tag: "lam", prms: comp.prms, body: comp.body },
      },
      ce
    );
  },
};

// compile component into instruction array instrs,
// starting at wc (write counter)
const compile = (comp, ce) => {
  compile_comp[comp.tag](comp, ce);
};

// compile program into instruction array instrs,
// after initializing wc and instrs
const compile_program = (program) => {
  wc = 0;
  instrs = [];
  compile(program, global_compile_environment);
  instrs[wc] = { tag: "DONE" };
};

// **********************
// operators and builtins
// **********************/

const binop_microcode = {
  "+": (x, y) =>
    (is_number(x) && is_number(y)) || (is_string(x) && is_string(y))
      ? x + y
      : error([x, y], "+ expects two numbers" + " or two strings, got:"),
  // todo: add error handling to JS for the following, too
  "*": (x, y) => x * y,
  "-": (x, y) => x - y,
  "/": (x, y) => x / y,
  "%": (x, y) => x % y,
  "<": (x, y) => x < y,
  "<=": (x, y) => x <= y,
  ">=": (x, y) => x >= y,
  ">": (x, y) => x > y,
  "===": (x, y) => x === y,
  "!==": (x, y) => x !== y,
};

// v2 is popped before v1
const apply_binop = (op, v2, v1) =>
  JS_value_to_address(
    binop_microcode[op](address_to_JS_value(v1), address_to_JS_value(v2))
  );

const unop_microcode = {
  "-unary": (x) => -x,
  "!": (x) => !x,
};

const apply_unop = (op, v) =>
  JS_value_to_address(unop_microcode[op](address_to_JS_value(v)));

const apply_builtin = (builtin_id) => {
  display(builtin_id, "apply_builtin: builtin_id:");
  const result = builtin_array[builtin_id]();
  OS.pop(); // pop fun
  push(OS, result);
};

const allocate_builtin_frame = () => {
  const builtin_values = Object.values(builtins);
  const frame_address = heap_allocate_Frame(builtin_values.length);
  for (let i = 0; i < builtin_values.length; i++) {
    const builtin = builtin_values[i];
    heap_set_child(frame_address, i, heap_allocate_Builtin(builtin.id));
  }
  return frame_address;
};

const allocate_constant_frame = () => {
  const constant_values = Object.values(constants);
  const frame_address = heap_allocate_Frame(constant_values.length);
  for (let i = 0; i < constant_values.length; i++) {
    const constant_value = constant_values[i];
    if (typeof constant_value === "undefined") {
      heap_set_child(frame_address, i, Undefined);
    } else {
      heap_set_child(frame_address, i, heap_allocate_Number(constant_value));
    }
  }
  return frame_address;
};

// *******
// machine
// *******

// machine registers
let OS; // JS array (stack) of words (Addresses,
//        word-encoded literals, numbers)
let PC; // JS number
let E; // heap Address
let RTS; // JS array (stack) of Addresses
HEAP; // (declared above already)

const microcode = {
  LDC: (instr) => push(OS, JS_value_to_address(instr.val)),
  UNOP: (instr) => push(OS, apply_unop(instr.sym, OS.pop())),
  BINOP: (instr) => push(OS, apply_binop(instr.sym, OS.pop(), OS.pop())),
  POP: (instr) => OS.pop(),
  JOF: (instr) => (PC = is_True(OS.pop()) ? PC : instr.addr),
  GOTO: (instr) => (PC = instr.addr),
  ENTER_SCOPE: (instr) => {
    push(RTS, heap_allocate_Blockframe(E));
    const frame_address = heap_allocate_Frame(instr.num);
    E = heap_Environment_extend(frame_address, E);
    for (let i = 0; i < instr.num; i++) {
      heap_set_child(frame_address, i, Unassigned);
    }
  },
  EXIT_SCOPE: (instr) => (E = heap_get_Blockframe_environment(RTS.pop())),
  LD: (instr) => {
    const val = heap_get_Environment_value(E, instr.pos);
    if (is_Unassigned(val)) error("access of unassigned variable");
    push(OS, val);
  },
  ASSIGN: (instr) => heap_set_Environment_value(E, instr.pos, peek(OS, 0)),
  LDF: (instr) => {
    const closure_address = heap_allocate_Closure(instr.arity, instr.addr, E);
    push(OS, closure_address);
  },
  CALL: (instr) => {
    const arity = instr.arity;
    const fun = peek(OS, arity);
    if (is_Builtin(fun)) {
      return apply_builtin(heap_get_Builtin_id(fun));
    }
    const new_PC = heap_get_Closure_pc(fun);
    const new_frame = heap_allocate_Frame(arity);
    for (let i = arity - 1; i >= 0; i--) {
      heap_set_child(new_frame, i, OS.pop());
    }
    push(RTS, heap_allocate_Callframe(E, PC));
    OS.pop(); // pop fun
    E = heap_Environment_extend(new_frame, heap_get_Closure_environment(fun));
    PC = new_PC;
  },
  TAIL_CALL: (instr) => {
    const arity = instr.arity;
    const fun = peek(OS, arity);
    if (is_Builtin(fun)) {
      return apply_builtin(heap_get_Builtin_id(fun));
    }
    const new_PC = heap_get_Closure_pc(fun);
    const new_frame = heap_allocate_Frame(arity);
    for (let i = arity - 1; i >= 0; i--) {
      heap_set_child(new_frame, i, OS.pop());
    }
    OS.pop(); // pop fun
    // don't push on RTS here
    E = heap_Environment_extend(new_frame, heap_get_Closure_environment(fun));
    PC = new_PC;
  },
  RESET: (instr) => {
    // keep popping...
    const top_frame = RTS.pop();
    if (is_Callframe(top_frame)) {
      // ...until top frame is a call frame
      PC = heap_get_Callframe_pc(top_frame);
      E = heap_get_Callframe_environment(top_frame);
    } else {
      PC--;
    }
  },
};

// running the machine

// set up registers, including free list
function initialize_machine(heapsize_words) {
  OS = [];
  PC = 0;
  RTS = [];
  // modified
  ALLOCATING = [];
  HEAP_BOTTOM = undefined; // the initial bottom is unknown

  HEAP = heap_make(heapsize_words);
  heap_size = heapsize_words;
  // initialize free list:
  // every free node carries the address
  // of the next free node as its first word
  let i = 0;
  for (i = 0; i <= heapsize_words - node_size; i = i + node_size) {
    heap_set(i, i + node_size);
  }
  // the empty free list is represented by -1
  heap_set(i - node_size, -1);
  free = 0;
  PC = 0;
  allocate_literal_values();
  // display(free)
  const builtins_frame = allocate_builtin_frame();
  // display(free)
  const constants_frame = allocate_constant_frame();
  // display(free)
  E = heap_allocate_Environment(0);
  // display(free)
  E = heap_Environment_extend(builtins_frame, E);
  // display(free)
  E = heap_Environment_extend(constants_frame, E);
  // display(free)
  // modified
  HEAP_BOTTOM = free;
}

function run(heapsize_words) {
  initialize_machine(heapsize_words);
  //print_code()
  while (!(instrs[PC].tag === "DONE")) {
    //heap_display()
    //display(PC, "PC: ")
    // display(instrs[PC].tag, "instr: ")
    //print_OS("\noperands:            ");
    //print_RTS("\nRTS:            ");
    const instr = instrs[PC++];
    //display(instrs[PC].tag, "next instruction: ")
    microcode[instr.tag](instr);
    // heap_display()
  }
  //display(OS, "\nfinal operands:           ")
  //print_OS()
  return address_to_JS_value(peek(OS, 0));
}

// parse_compile_run on top level
// * parse input to json syntax tree
// * compile syntax tree into code
// * run code

const parse_compile_run = (program, heapsize_words) => {
  compile_program(parse_to_json(program));
  return run(heapsize_words);
};

// debugging

const print_code = () => {
  for (let i = 0; i < instrs.length; i = i + 1) {
    const instr = instrs[i];
    display(
      "",
      stringify(i) +
        ": " +
        instr.tag +
        " " +
        (instr.tag === "GOTO" ? stringify(instr.addr) : "") +
        (instr.tag === "ENTER_SCOPE" ? stringify(instr.num) : "") +
        (instr.tag === "LDC" ? stringify(instr.val) : "") +
        (instr.tag === "ASSIGN" ? stringify(instr.pos) : "") +
        (instr.tag === "LD" ? stringify(instr.pos) : "") +
        (instr.tag === "BINOP" ? stringify(instr.sym) : "")
    );
  }
};

const print_RTS = (x) => {
  display("", x);
  for (let i = 0; i < RTS.length; i = i + 1) {
    const f = RTS[i];
    display("", stringify(i) + ": " + f.tag);
  }
};

const print_OS = (x) => {
  display("", x);
  for (let i = 0; i < OS.length; i = i + 1) {
    const val = OS[i];
    display("", stringify(i) + ": " + address_to_JS_value(val));
  }
};

//
// testing
//

const test = (program, expected, heapsize) => {
  display(
    "",
    `

****************
Test case: ` +
      program +
      "\n"
  );
  const result = parse_compile_run(program, heapsize);
  if (stringify(result) === stringify(expected)) {
    display(result, "success with result:");
  } else {
    display(expected, "FAILURE! expected:");
    error(result, "result:");
  }
};

// test cases

test("1;", 1, 310);

test("2 + 3;", 5, 330);

test("1; 2; 3;", 3, 330);

test("true;", true, 300);

test("false ? 2 : 3;", 3, 310);

test(
  `
8 + 34; true ? 1 + 2 : 17;
`,
  3,
  360
);

test("math_PI;", 3.141592653589793, 300);

test("error;", "<builtin>", 300);

test("display;", "<builtin>", 300);

test("display(1);", 1, 310);

test(
  `
const y = 4; 
{
    const x = y + 7; 
    x * 2;
}
    `,
  22,
  380
);

test(
  `
function f() {
    return 1;
}
f();
`,
  1,
  350
);

test(
  `
function f(x) {
    return x;
}
f(33);
`,
  33,
  350
);

test(
  `
function f(x, y) {
    return x - y;
}
f(33, 22);
`,
  11,
  370
);

test(
  `
function g(x, y) {
    return x - y;
}
function f(x, y) {
    return g(x, y);
}
f(33, 22);
`,
  11,
  400
);

test(
  `
function f(x, y) {
    return x === 1 ? x - y : f(1, x + y);
}
f(33, 22);
`,
  -54,
  440
);

test(
  `
function fact(n) {
    return n === 1 ? 1 : n * fact(n - 1);
}
fact(5);
`,
  120,
  650
);

test(
  `
function fact(n) {
    return fact_iter(n, 1, 1);
}
function fact_iter(n, i, acc) {
    if (i > n) {
        return acc;
    } else {
        return fact_iter(n, i + 1, acc * i);
    }
}
fact(5);
`,
  120,
  640
);

test(
  `
const a1 = 1;
const a2 = 2;
const a3 = 3;
const a4 = 4;
const a5 = 5;
const a6 = 6;
const a7 = 7;
const a8 = 8;
const a9 = 9;
//const a10 = 10; // will indicate limitation
a1 + a9;
`,
  10,
  400
);

// modified
test(
  `
1;
2;
3;
`,
  3,
  310
);