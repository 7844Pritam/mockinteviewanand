import React from 'react'

const CustomButton = ({type,disabled,text}) => {
  return (
    <button
    type={type}
    disabled={disabled}
    
    className="w-full py-2 text-black bg-amber-500 transition duration-150 ease-in-out rounded-lg bg-primary hover:bg-primary-600"
  >
    {text}
  </button>  )
}

export default CustomButton