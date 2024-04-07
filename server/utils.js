function is_number(v) {
  return typeof v === "number";
}
exports.is_number = is_number;
function is_undefined(xs) {
  return typeof xs === "undefined";
}
exports.is_undefined = is_undefined;
function is_string(xs) {
  return typeof xs === "string";
}
exports.is_string = is_string;
function is_boolean(xs) {
  return typeof xs === "boolean";
}
exports.is_boolean = is_boolean;
function is_object(xs) {
  return typeof xs === "object" || is_function(xs);
}
exports.is_object = is_object;
function is_function(xs) {
  return typeof xs === "function";
}
exports.is_function = is_function;
function is_NaN(x) {
  return is_number(x) && isNaN(x);
}
exports.is_NaN = is_NaN;
function has_own_property(obj, p) {
  return obj.hasOwnProperty(p);
}
exports.has_own_property = has_own_property;
function is_array(a) {
  return a instanceof Array;
}
exports.is_array = is_array;
function array_length(xs) {
  return xs.length;
}
exports.array_length = array_length;
