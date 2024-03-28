import { useRef, useState } from "react";
import Editor from "@monaco-editor/react"
import LanguageSelector from "./LanguageSelector";
import Output from "./Output";
import { FILES } from "../constants";


const CodeEditor = () => {
  
    const codeEditorRef = useRef(null);
    const [language, setLanguage] = useState("javascript");
    const file=FILES[language];

    const onMountEditor=(editor,monaco)=> {
      codeEditorRef.current=editor;
    };

    const onSelect= (language)=> {
      setLanguage(language);
    };
    const style ={
      section:{
        width: "40%",
        padding: "5px"

      }
    }

    return (
        <div className="grid gap-2 grid-cols-2"> 
          <div>
            <LanguageSelector selected={language} onSelect={onSelect} />
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