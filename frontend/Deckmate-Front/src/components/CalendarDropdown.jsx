import { CalendarDays, ChevronDown } from "lucide-react"
import { useState, useEffect, useRef } from "react"

export const CalendarDropdown = ({ currentOption, setCurrentOption }) => {
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
        <div ref={selectRef} className="relative w-50 flex flex-col gap-1 hover:cursor-pointer">
            <div onClick={() => setOptionsOpen((prev) => !prev)} className="w-full flex justify-between gap-2 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sky-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                <div className="flex gap-2">
                    <CalendarDays />
                    <span>{currentOption === null ? 'All time' : (currentOption === 7 ? 'Last 7 days' : (currentOption === 30 ? 'Last 30 days' : 'Past year'))}</span>
                </div>
                <div>
                    <ChevronDown />
                </div>
            </div>
            {
                optionsOpen && 
                    <div className="absolute top-12 md:top-13 w-full px-2 py-2 flex flex-col bg-slate-100 rounded-lg">
                        <button type="button" onClick={() => HandleSelectOption(7)} className="hover:bg-sky-500 hover:cursor-pointer rounded-lg flex gap-1 px-2 py-3">
                            <span>Last 7 days</span>
                        </button>
                        <button type="button" onClick={() => HandleSelectOption(30)} className="hover:bg-sky-500 hover:cursor-pointer rounded-lg flex gap-1 px-2 py-3">
                            <span>Last 30 days</span>
                        </button>
                        <button type="button" onClick={() => HandleSelectOption(365)} className="hover:bg-sky-500 hover:cursor-pointer rounded-lg flex gap-1 px-2 py-3">
                            <span>Past year</span>
                        </button>
                        <button type="button" onClick={() => HandleSelectOption(null)} className="hover:bg-sky-500 hover:cursor-pointer rounded-lg flex gap-1 px-2 py-3">
                            <span>All time</span>
                        </button>
                    </div>
            }
        </div>
    )
}