const fs = require("fs");

// Assuming example.json is in the same directory as our script
fs.readFile("code.json", "utf8", (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  const obj = JSON.parse(data); // Convert string from file into JavaScript object
  console.log(obj.Decls);
});
