import { useState, useEffect, useRef } from "react"
import { Globe, HatGlasses } from "lucide-react"

export const DropdownOptions = ({ currentOption, setCurrentOption }) => {
    const [optionsOpen, setOptionsOpen] = useState(false)
    const selectRef = useRef()

    const HandleSelectOption = (option) => {
        setCurrentOption(option)
        setOptionsOpen(false)
    }

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (selectRef.current && !selectRef.current.contains(e.target)){
                setOptionsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
            
    }, [])
    return (
        <div ref={selectRef} className="relative w-30 flex flex-col md:text-lg lg:text-xl gap-1 hover:cursor-pointer">
            <div onClick={() => setOptionsOpen((prev) => !prev)} className="w-full flex gap-2 rounded-lg border border-slate-300 bg-white px-2 py-2 text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                <div>
                    {currentOption.icon}
                </div>
                <div>
                    {currentOption.value}
                </div>
            </div>
            {
                optionsOpen && 
                    <div className="absolute top-0 translate-y-1/2 w-full px-2 py-2 flex flex-col bg-white rounded-lg">
                        <button type="button" onClick={() => HandleSelectOption({value: 'Public', icon: <Globe />})} className="hover:bg-sky-500 hover:cursor-pointer rounded-t-lg flex gap-1 p-2">
                            <Globe />
                            <span>Public</span>
                        </button>
                        <div className="border-b border-slate-300" />
                        <button type="button" onClick={() => HandleSelectOption({value: 'Private', icon: <HatGlasses />})} className="hover:bg-sky-500 hover:cursor-pointer rounded-b-lg flex gap-1 p-2">
                            <HatGlasses />
                            <span>Private</span>
                        </button>
                    </div>
            }
        </div>
    )
}