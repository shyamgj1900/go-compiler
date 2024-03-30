import { useRef, useState } from "react";
import Editor from "@monaco-editor/react"
import Output from "./Output";
import { FILES } from "../constants";


const CodeEditor = () => {

  const codeEditorRef = useRef(null);
  const [language] = useState("go");
  const file = FILES[language];

  const onMountEditor = (editor) => {
    codeEditorRef.current = editor;
  };

  return (
    <div className="grid gap-2 grid-cols-2">
      <div>
        <div className="bg-cyan-500">

          <button className="bg-blue-500 p-2">Golang</button>

        </div>

        <Editor
          height="92vh"
          widht="100%"
          theme="vs-dark"
          onMount={onMountEditor}
          path={file.name}
          defaultLanguage={file.language}
          defaultValue={file.default}
        />
      </div>
      <div className="bg-black">
        <Output editorRef={codeEditorRef} language={language} />
      </div>
    </div>
  )
}

export default CodeEditor