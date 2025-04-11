import React from 'react'

const CustomButton = ({type,disabled,text}) => {
  return (
    <button
    type={type}
    disabled={disabled}
    
    className="w-full py-2 text-white transition duration-150 ease-in-out rounded-lg bg-primary hover:bg-primary-600"
  >
    {text}
  </button>  )
}

export default CustomButton