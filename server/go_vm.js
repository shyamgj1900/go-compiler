Object.entries(require("./utils")).forEach(
  ([name, exported]) => (global[name] = exported)
);

// ************************************************************
// Virtual machine with tagged pointers for a sublanguage of Go
// set up for mark-and-sweep garbage collection
// ************************************************************/

// Implement Sleep
// const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function blockingSleep(ms) {
  const startTime = new Date().getTime();
  let currentTime = null;
  do {
    currentTime = new Date().getTime();
  } while (currentTime - startTime < ms);
}

// Output of program
let OUTPUTS = [];

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
    console.log("GARBAGE COLLECTION");
    mark_sweep();
  }

  // allocate
  const address = free;
  free = heap_get(free);
  HEAP.setInt8(address * word_size, tag);
  HEAP.setUint16(address * word_size + size_offset, size);
  return address;
};

const mark_bit = 7;

const UNMARKED = 0;
const MARKED = 1;

let HEAP_BOTTOM;
let ALLOCATING;

const get_roots = () => {
  let root_os = [...OS];
  let root_E = [E];
  let root_RTS = [...RTS];
  for (const context of context_Q) {
    root_os.push(...context.OS);
    root_E.push(context.E);
    root_RTS.push(...context.RTS);
  }

  return [...root_os, ...root_E, ...root_RTS, ...ALLOCATING];
};

const mark_sweep = () => {
  // mark r for r in roots
  const roots = get_roots();
  for (const element of roots) {
    mark(element);
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

const heap_get_mark_bit = (address) =>
  HEAP.getInt8(address * word_size + mark_offset);

// To indicate a node as marked
const heap_set_mark_bit = (address, x) =>
  HEAP.setInt8(address * word_size + mark_offset, x);

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
  console.log("Frame: ");
  const size = heap_get_number_of_children(address);
  console.log("frame size: %d", size);
  for (let i = 0; i < size; i++) {
    console.log("value index: %d", i);
    const value = heap_get_child(address, i);
    console.log("value address: %d", value);
    console.log("value: %s", address_to_JS_value(value));
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

// for debuggging: console.log environment
const heap_Environment_display = (env_address) => {
  const size = heap_get_number_of_children(env_address);
  console.log("Environment:");
  console.log("environment size: %d", size);
  for (let i = 0; i < size; i++) {
    console.log("frame index: %d", i);
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

let is_context_switch = false;

// in this machine, the builtins take their
// arguments directly from the operand stack,
// to save the creation of an intermediate
// argument array
const builtin_implementation = {
  println: () => {
    const address = OS.pop();
    console.log(address_to_JS_value(address));
    OUTPUTS.push(String(address_to_JS_value(address)));
    return address;
  },
  sleep: () => {
    const time = OS.pop();
    if (curr_thread.getSleep() === 0) {
      // initial sleep condition
      OS.pop();
      curr_thread.setE(E);
      curr_thread.setOS(OS);
      curr_thread.setRTS(RTS);
      curr_thread.setSleep(address_to_JS_value(time));
      curr_thread.setPC(PC - 3);
      context_Q.push(curr_thread);

      curr_thread = context_Q.shift();
      OS = curr_thread.OS;
      PC = curr_thread.PC;
      RTS = curr_thread.RTS;
      E = curr_thread.E;
      OS.push(0);
      is_context_switch = true;
    } else if (curr_thread.getSleep() === 1) {
      // done sleeping
      curr_thread.setSleep(0);
    } else {
      // sleep for the given time
      curr_thread.setSleep(curr_thread.getSleep() - 1);
      OS.pop();
      curr_thread.setE(E);
      curr_thread.setOS(OS);
      curr_thread.setRTS(RTS);
      curr_thread.setPC(PC - 3);
      context_Q.push(curr_thread);

      curr_thread = context_Q.shift();
      OS = curr_thread.OS;
      PC = curr_thread.PC;
      RTS = curr_thread.RTS;
      E = curr_thread.E;
      OS.push(0);
      is_context_switch = true;
    }
  },
  error: () => error(address_to_JS_value(OS.pop())),
  is_null: () => (is_Null(OS.pop()) ? True : False),
  Lock: () => {
    const id = OS.pop();
    // const frame_index = OS.pop();
    // const value_index = OS.pop();
    // const state = OS.pop();
    if (mutex_table[id]) {
      curr_thread.setE(E);
      curr_thread.setOS(OS);
      curr_thread.setRTS(RTS);
      curr_thread.setPC(PC - 3);
      context_Q.push(curr_thread);

      curr_thread = context_Q.shift();
      OS = curr_thread.OS;
      PC = curr_thread.PC;
      RTS = curr_thread.RTS;
      E = curr_thread.E;
      OS.push(0);
      is_context_switch = true;
      console.log("Mutex already locked");
    } else {
      // heap_set_Environment_value(
      //   E,
      //   [frame_index, value_index],
      //   JS_value_to_address(true)
      // );
      mutex_table[id] = true;
      console.log("Locking Mutex");
    }
  },
  Unlock: () => {
    const id = OS.pop();
    // const frame_index = OS.pop();
    // const value_index = OS.pop();
    // const state = OS.pop();
    if (mutex_table[id]) {
      // heap_set_Environment_value(
      //   E,
      //   [frame_index, value_index],
      //   JS_value_to_address(false)
      // );
      mutex_table[id] = false;
      console.log("Unlocking Mutex");
    } else {
      console.log("Mutex already unlocked");
      error("Mutex already unlocked");
    }
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
      arity: 1,
    };
    builtin_array[i++] = builtin_implementation[key];
  }
}

const constants = {
  undefined: Undefined,
  math_E: Math.E,
  math_LN10: Math.LN10,
  math_LN2: Math.LN2,
  math_LOG10E: Math.LOG10E,
  math_LOG2E: Math.LOG2E,
  math_PI: Math.PI,
  math_SQRT1_2: Math.SQRT1_2,
  math_SQRT2: Math.SQRT2,
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
function scan_for_locals(statements) {
  //declare an empty array
  let locals = [];
  for (let statement of statements) {
    switch (statement.NodeType) {
      case "DeclStmt":
        locals.push(statement.Decl.Specs[0].Names[0].Name);
        break;
      case "GenDecl":
        locals.push(statement.Specs[0].Names[0].Name);
        break;
      case "FuncDecl":
        locals.push(statement.Name.Name);
        break;
    }
  }
  return locals;
}

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
  BasicLit: (comp, ce) => {
    if (comp.Kind === "INT") {
      instrs[wc++] = { tag: "LDC", val: Number(comp.Value) };
    } else {
      instrs[wc++] = { tag: "LDC", val: comp.Value };
    }
  },
  Ident: (comp, ce) => {
    if (comp.Name === "true" || comp.Name === "false") {
      instrs[wc++] = { tag: "LDC", val: comp.Name === "true" };
    } else {
      instrs[wc++] = {
        tag: "LD",
        sym: comp.Name,
        pos: compile_time_environment_position(ce, comp.Name),
      };
    }
  },
  UnaryExpr: (comp, ce) => {
    if (comp.Op === "<-") {
      //attempt to access channel - ensure in scope
      // compile({ NodeType: "Ident", Name: comp.X.Name }, ce);
      instrs[wc++] = {
        tag: "LD",
        pos: compile_time_environment_position(ce, comp.X.Name),
      };
      //POP OS @ RUNTIME to remove chan value
      // instrs[wc++] = { tag: "POP" };

      instrs[wc++] = {
        tag: "RECV",
        name: comp.X.Name,
      };
    } else if (comp.Op === "&") {
      compile(comp.X, ce);
    } else {
      compile(comp.X, ce);
      instrs[wc++] = { tag: "UNOP", sym: comp.Op };
    }
  },
  BinaryExpr: (comp, ce) => {
    compile(comp.X, ce);
    compile(comp.Y, ce);
    instrs[wc++] = { tag: "BINOP", sym: comp.Op };
  },
  IfStmt: (comp, ce) => {
    compile(comp.Cond, ce);
    const jump_on_false_instruction = { tag: "JOF" };
    instrs[wc++] = jump_on_false_instruction;
    compile(comp.Body, ce);
    const goto_instruction = { tag: "GOTO" };
    instrs[wc++] = goto_instruction;
    const alternative_address = wc;
    jump_on_false_instruction.addr = alternative_address;
    if (comp.Else !== null) {
      compile(comp.Else, ce);
    }
    goto_instruction.addr = wc;
  },
  ForStmt: (comp, ce) => {
    const loop_start = wc;
    compile(comp.Cond, ce);
    const jump_on_false_instruction = { tag: "JOF" };
    instrs[wc++] = jump_on_false_instruction;
    compile(comp.Body, ce);
    instrs[wc++] = { tag: "POP" };
    instrs[wc++] = { tag: "GOTO", addr: loop_start };
    jump_on_false_instruction.addr = wc;
    instrs[wc++] = { tag: "LDC", val: undefined };
  },
  CallExpr: (comp, ce) => {
    compile(comp.Fun, ce);
    if (comp.Args !== null) {
      for (let arg of comp.Args) {
        compile(arg, ce);
      }
      instrs[wc++] = { tag: "CALL", arity: comp.Args.length };
    } else {
      if (comp.Fun.NodeType === "SelectorExpr") {
        instrs[wc++] = { tag: "CALL", arity: 1 };
      } else {
        instrs[wc++] = { tag: "CALL", arity: 0 };
      }
    }
  },
  ExprStmt: (comp, ce) => {
    compile(comp.X, ce);
  },
  ParenExpr: (comp, ce) => {
    compile(comp.X, ce);
  },
  SelectorExpr: (comp, ce) => {
    compile(comp.Sel, ce);
    compile(comp.X, ce);
  },
  GoStmt: (comp, ce) => {
    comp.Call.NodeType = "GoCallExpr";
    compile(comp.Call, ce);
    instrs[wc++] = { tag: "ENDGO" };
  },
  GoCallExpr: (comp, ce) => {
    compile(comp.Fun, ce);
    if (comp.Args !== null) {
      for (let arg of comp.Args) {
        compile(arg, ce);
      }
      instrs[wc++] = { tag: "GOCALL", arity: comp.Args.length };
    } else {
      instrs[wc++] = { tag: "GOCALL", arity: 0 };
    }
  },
  FuncProc: (comp, ce) => {
    let prms = [];
    let arity = comp.Params.List !== null ? comp.Params.List.length : 0;
    // jump over the body of the lambda expression
    const goto_instruction = { tag: "GOTO" };
    instrs[wc++] = { tag: "LDF", arity: arity, addr: wc + 1 };
    instrs[wc++] = goto_instruction;
    if (arity > 0) {
      for (let prm of comp.Params.List) {
        prms.push(prm.Names[0].Name);
      }
    }
    // extend compile-time environment
    compile(comp.Body, compile_time_environment_extend(prms, ce));
    instrs[wc++] = { tag: "LDC", val: undefined };
    instrs[wc++] = { tag: "RESET" };
    goto_instruction.addr = wc;
  },
  List: (comp, ce) => compile_sequence(comp, ce),
  BlockStmt: (comp, ce) => {
    const locals = scan_for_locals(comp.List);
    instrs[wc++] = { tag: "ENTER_SCOPE", num: locals.length };
    compile(
      comp.List,
      // extend compile-time environment
      compile_time_environment_extend(locals, ce)
    );
    instrs[wc++] = { tag: "EXIT_SCOPE" };
  },
  DeclStmt: (comp, ce) => {
    compile(comp.Decl, ce);
  },
  SendStmt: (comp, ce) => {
    //attempt to access channel - ensures in scope
    instrs[wc++] = {
      tag: "LD",
      pos: compile_time_environment_position(ce, comp.Chan.Name),
    };
    // compile(comp.Value, ce);
    // instrs[wc++] = {
    //   tag: "ASSIGN",
    //   pos: compile_time_environment_position(ce, comp.Chan.Name),
    // };
    // POP OS @ RUNTIME to remove chan value
    // instrs[wc++] = { tag: "POP" };

    if (comp.Value.Name === "true" || comp.Value.Name === "false") {
      instrs[wc++] = {
        tag: "SEND",
        pos: compile_time_environment_position(ce, comp.Chan.Name),
        value: comp.Value.Name === "true",
      };
    } else {
      instrs[wc++] = {
        tag: "SEND",
        pos: compile_time_environment_position(ce, comp.Chan.Name),
        value: Number(comp.Value.Value),
      };
    }
  },
  GenDecl: (comp, ce) => {
    if (comp.Specs[0].Values !== null) {
      if (
        comp.Specs[0].Values[0].NodeType === "CallExpr" &&
        comp.Specs[0].Values[0].Fun.Name === "make" &&
        comp.Specs[0].Values[0].Args[0].NodeType === "ChanType"
      ) {
        instrs[wc++] = {
          tag: "CHANNEL",
          pos: compile_time_environment_position(
            ce,
            comp.Specs[0].Names[0].Name
          ),
        };
        // compile(
        //   {
        //     NodeType: "AssignStmt",
        //     Lhs: [comp.Specs[0].Names[0]],
        //     Tok: "=",
        //     Rhs: [
        //       {
        //         NodeType: "Ident",
        //         Name: "false", //some dummy value
        //       },
        //     ],
        //   },
        //   ce
        // );
      } else {
        compile(comp.Specs[0].Values[0], ce);
        instrs[wc++] = {
          tag: "ASSIGN",
          pos: compile_time_environment_position(
            ce,
            comp.Specs[0].Names[0].Name
          ),
        };
      }
    } else if (comp.Specs[0].Type.NodeType === "SelectorExpr") {
      if (comp.Specs[0].Type.Sel.Name === "Mutex") {
        instrs[wc++] = {
          tag: "MUTEX",
          pos: compile_time_environment_position(
            ce,
            comp.Specs[0].Names[0].Name
          ),
        };
        // compile(
        //   {
        //     NodeType: "AssignStmt",
        //     Lhs: [comp.Specs[0].Names[0]],
        //     Tok: "=",
        //     Rhs: [
        //       {
        //         NodeType: "Ident",
        //         Name: "false",
        //       },
        //     ],
        //   },
        //   ce
        // );
      }
    }
  },
  AssignStmt: (comp, ce) => {
    compile(comp.Rhs[0], ce);
    instrs[wc++] = {
      tag: "ASSIGN",
      pos: compile_time_environment_position(ce, comp.Lhs[0].Name),
    };
  },
  ReturnStmt: (comp, ce) => {
    compile(comp.Results[0], ce);
    instrs[wc++] = { tag: "RESET" };
  },
  FuncDecl: (comp, ce) => {
    compile(
      {
        NodeType: "AssignStmt",
        Lhs: [comp.Name],
        Rhs: [
          {
            NodeType: "FuncProc",
            Params: comp.Type.Params,
            Body: comp.Body,
            Name: comp.Name.Name,
          },
        ],
      },
      ce
    );
  },
};

// compile component into instruction array instrs,
// starting at wc (write counter)
const compile = (comp, ce) => {
  if (Array.isArray(comp)) {
    compile_comp["List"](comp, ce);
  } else {
    compile_comp[comp.NodeType](comp, ce);
  }
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
  "*": (x, y) => x * y,
  "-": (x, y) => x - y,
  "/": (x, y) => x / y,
  "%": (x, y) => x % y,
  "<": (x, y) => x < y,
  "<=": (x, y) => x <= y,
  ">=": (x, y) => x >= y,
  ">": (x, y) => x > y,
  "==": (x, y) => x === y,
  "!=": (x, y) => x !== y,
  "&&": (x, y) => x && y,
  "||": (x, y) => x || y,
};

// v2 is popped before v1
const apply_binop = (op, v2, v1) =>
  JS_value_to_address(
    binop_microcode[op](address_to_JS_value(v1), address_to_JS_value(v2))
  );

const unop_microcode = {
  "-": (x) => -x,
  "!": (x) => !x,
};

const apply_unop = (op, v) =>
  JS_value_to_address(unop_microcode[op](address_to_JS_value(v)));

const apply_builtin = (builtin_id) => {
  const result = builtin_array[builtin_id]();
  OS.pop(); // pop fun
  if (!is_context_switch) {
    push(OS, result);
  } else {
    is_context_switch = false;
  }
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

let mutex_table = {};
let channel_count = 0;
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
  LDADDR: (instr) => {
    const [frame_index, value_index] = instr.pos;
    push(OS, value_index);
    push(OS, frame_index);
  },
  LD: (instr) => {
    const val = heap_get_Environment_value(E, instr.pos);
    if (is_Unassigned(val)) error("access of unassigned variable");
    push(OS, val);
  },
  ASSIGN: (instr) => heap_set_Environment_value(E, instr.pos, peek(OS, 0)),
  CHANNEL: (instr) => {
    const id = channel_count; //Object.keys(channel_table).length;
    channel_count++;
    OS.push(0);
    // channel_table[id] = 0;
    heap_set_Environment_value(E, instr.pos, id);
  },
  MUTEX: (instr) => {
    const id = Object.keys(mutex_table).length;
    mutex_table[id] = false;
    heap_set_Environment_value(E, instr.pos, id);
  },
  LDF: (instr) => {
    const closure_address = heap_allocate_Closure(instr.arity, instr.addr, E);
    push(OS, closure_address);
  },
  ENDGO: (instr) => {
    if (context_Q.length != 0) {
      curr_thread = context_Q.shift();
      OS = curr_thread.OS;
      PC = curr_thread.PC;
      RTS = curr_thread.RTS;
      E = curr_thread.E;
    }
  },
  SEND: (instr) => {
    // save the value in the current thread's reg
    // block and context switch
    const id = OS.pop();

    curr_thread.setE(E);
    curr_thread.setOS(OS);
    curr_thread.setRTS(RTS);
    curr_thread.setPC(PC - 2);
    curr_thread.setChannels(id, instr.value);
    context_Q.push(curr_thread);

    // context switch
    curr_thread = context_Q.shift();
    OS = curr_thread.OS;
    PC = curr_thread.PC;
    RTS = curr_thread.RTS;
    E = curr_thread.E;
  },
  RECV: (instr) => {
    // 1. check context_q if there is exisitng sender alr there (iterate from start of context_q)
    // 2. if not, block itself i.e. just push itself to context q, ensure PC is at same instr s.t. check for corresponging send next time
    // 3. if yes, take value from sender, put in own OS
    // 4. unblock the sender by incrementing its PC
    // 5. unblock itself -> dont need to do anything
    const id = OS.pop();
    for (const thread of context_Q) {
      if (id in thread.channels) {
        push(OS, JS_value_to_address(thread.channels[id]));
        delete thread.channels[id];
        thread.PC += 2;
        return;
      }
    }
    // Dont have any read value in any channel so block itself
    curr_thread.setE(E);
    curr_thread.setOS(OS);
    curr_thread.setRTS(RTS);
    curr_thread.setPC(PC - 2);
    context_Q.push(curr_thread);

    // context switch
    curr_thread = context_Q.shift();
    OS = curr_thread.OS;
    PC = curr_thread.PC;
    RTS = curr_thread.RTS;
    E = curr_thread.E;
  },
  GOCALL: (instr) => {
    const arity = instr.arity;
    const fun = peek(OS, arity);
    const new_PC = heap_get_Closure_pc(fun);
    const new_frame = heap_allocate_Frame(arity);
    for (let i = arity - 1; i >= 0; i--) {
      heap_set_child(new_frame, i, OS.pop());
    }
    // OS.pop(); // pop fun

    const new_E = heap_Environment_extend(
      new_frame,
      heap_get_Closure_environment(fun)
    );
    push([], heap_allocate_Callframe(E, PC));
    const new_thread = new ThreadContext();
    new_thread.setE(new_E);
    new_thread.setPC(new_PC);
    context_Q.push(new_thread);
    PC += 1;
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
    OS.pop(); // pop fun
    E = heap_Environment_extend(new_frame, heap_get_Closure_environment(fun));
    push(RTS, heap_allocate_Callframe(E, PC));
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
    let top_frame = 0;
    if (RTS.length === 0) {
      // end of Go routine doesn't have any RTS
      curr_thread = context_Q.shift();
      OS = curr_thread.OS;
      PC = curr_thread.PC;
      RTS = curr_thread.RTS;
      E = curr_thread.E;
    } else {
      while (!is_Callframe(top_frame)) {
        top_frame = RTS.pop();
      }
      E = heap_get_Callframe_environment(top_frame);
      PC = heap_get_Callframe_pc(top_frame);
    }
  },
};

// initialise thread context Q class
class ThreadContext {
  constructor() {
    this.OS = [];
    this.PC = 0;
    this.RTS = [];
    this.E = 0;
    this.channels = {};
    this.sleep = 0;
  }

  setPC(PC) {
    this.PC = PC;
  }

  setE(E) {
    this.E = E;
  }

  setOS(OS) {
    this.OS = OS;
  }

  setRTS(RTS) {
    this.RTS = RTS;
  }

  setSleep(time) {
    this.sleep = time;
  }

  setChannels(id, value) {
    this.channels[id] = value;
  }

  getSleep() {
    return this.sleep;
  }

  getChannels() {
    return this.channels;
  }
}

// running the machine
let curr_thread;
let context_Q;
// set up registers, including free list
function initialize_machine(heapsize_words) {
  curr_thread = new ThreadContext();
  context_Q = [];
  channel_count = 0;
  mutex_table = {};
  OS = [];
  PC = 0;
  RTS = [];

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
  allocate_literal_values();
  const builtins_frame = allocate_builtin_frame();
  const constants_frame = allocate_constant_frame();
  E = heap_allocate_Environment(0);
  E = heap_Environment_extend(builtins_frame, E);
  E = heap_Environment_extend(constants_frame, E);

  curr_thread.setE(E);
  context_Q.push(curr_thread);

  HEAP_BOTTOM = free;
}

function run(heapsize_words) {
  initialize_machine(heapsize_words);

  let switch_freq = 10; //context switch every x instrs
  let i = 0;
  while (instrs[PC].tag !== "DONE") {
    if (i % switch_freq == 0) {
      curr_thread = context_Q.shift();
      OS = curr_thread.OS;
      PC = curr_thread.PC;
      RTS = curr_thread.RTS;
      E = curr_thread.E;
    }

    i += 1;

    const instr = instrs[PC++];
    microcode[instr.tag](instr);

    if (instr != "ENDGO" && i % switch_freq == 0) {
      curr_thread.setE(E);
      curr_thread.setPC(PC);
      curr_thread.setOS(OS);
      curr_thread.setRTS(RTS);
      context_Q.push(curr_thread);
    }
  }
}

const test = (program, expected, heapsize) => {
  console.log(
    `
****************
Test case: ` +
      program +
      "\n"
  );
  const result = parse_compile_run(program, heapsize);
  if (stringify(result) === stringify(expected)) {
    console.log("success with result: %s", result);
  } else {
    console.log("FAILURE! expected: %s", expected);
    error(result, "result:");
  }
};

function compile_and_run(obj) {
  let main_call = {
    NodeType: "CallExpr",
    Fun: { NodeType: "Ident", Name: "main" },
    Args: [],
  };
  obj.Decls.push(main_call);
  let json_code = { NodeType: "BlockStmt", List: obj.Decls };
  OUTPUTS = [];
  compile_program(json_code);
  run(15000);
  return OUTPUTS;
}

module.exports = compile_and_run;
