import { useState, useRef } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import CodeEditor from './components/CodeEditor';
import './App.css'


function App() {
  
  return (
   <div className="container mx-auto m-2">
      <CodeEditor />
   </div>
  )
}

export default App
