import { useState } from 'react'
import { executeCode } from "../api";

const Output = ({ editorRef, language }) => {
  const [output, setOutput] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const runCode = async () => {
    const sourceCode = editorRef.current.getValue();
    if (!sourceCode) return;
    try {
      setIsLoading(true);
      const result = await executeCode(language, sourceCode);
      console.log(result);
      setOutput(result.data);
      result.stderr ? setIsError(true) : setIsError(false);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <>
      <div className="bg-cyan-500">
        <button
          className="bg-blue-500 hover:bg-cyan-600 p-2"
          onClick={runCode}
        >
          Run Code
        </button>
      </div>
      <div className="bg-black pt-2">
        {output
          ? <ul className='ml-2'> {output.map((line, i) => <li className="text-white" key={i}>{line}</li>)} </ul>
          : 'Click "Run Code" to see the output here'}
      </div>
    </>
  )
}

export default Output