import React from 'react'

const LanguageSelector = ({selected,onSelect}) => {

  return (
    <div className="bg-cyan-500" >
        <select
          className="bg-blue-500  hover:bg-cyan-600 p-2"
          value={selected}
          onChange={(e) => {
            onSelect(e.target.value);
          }}
        >
          <option value="js">JavaScript</option>
          <option value="python">Python</option>
          <option value="go">Golang</option>
        </select>

    </div>
  )
}

export default LanguageSelector