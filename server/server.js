const express = require("express");
var cors = require("cors");
const util = require("node:util");
const fs = require("node:fs/promises");
const { Console } = require("node:console");
const execFile = util.promisify(require("node:child_process").execFile);

const compile_and_run = require("./go_vm");

const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Success");
});

app.post("/api/v1/execute", async (req, res) => {
  const srcContent = req.body.content;
  try {
    await fs.writeFile("./temp/src_code.go", srcContent);
    await execFile("bin/asty", [
      "go2json",
      "-input",
      "./temp/src_code.go",
      "-output",
      "./temp/src_code.json",
    ]);
    let data = await fs.readFile("./temp/src_code.json", {
      encoding: "utf-8",
    });
    result = compile_and_run(JSON.parse(data));
    let output = {
      status: "Sucsess",
      data: result,
    };
    res.json(output);
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

app.listen(3000, () => {
  console.log("http://localhost:3000/");
});
