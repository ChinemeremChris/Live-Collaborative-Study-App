import { useEffect, useRef, useState } from "react"
import { SearchIcon, Search } from "lucide-react"
import { SearchDropdown } from "./SearchDropdown"
import {  useNavigate, useSearchParams } from "react-router-dom"
import { useLocation } from "react-use"
export const Searchbar = ({ className }) => {
    //no need go have a subit button. just use debounce and search as it is being typed.
    //mybe use a odal and do usequery to get the tags and cache them (modal appears when typing)
    const [searchTerm, setSearchTerm] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const [tagSet, setTagSet] = useState(new Set())
    const searchRef = useRef(null)
    const inputRef = useRef(null)
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams] = useSearchParams()

    useEffect(() => {
        setIsFocused(false)
    }, [location.pathname, location.search])

    useEffect(() => {
        const term = searchParams.get("search_term")
        if (term){
            setSearchTerm(term)
        }
    }, [searchParams])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)){
                setIsFocused(false)
            }
        }
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleCancel = (e) => {
        e.preventDefault()
        inputRef.current?.blur()
        setIsFocused(false)
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const params = new URLSearchParams()
        params.append("search_term", searchTerm)
        const tagList = [...tagSet]
        tagList.forEach((tag) => {
            params.append("filter_tags", tag)
        })
        if (searchTerm.trim()){
            navigate(`/discover?${params.toString()}`)
            inputRef.current?.blur()
            setIsFocused(false)
        }
    }


    return (
        <div ref={searchRef} className={`relative ${className}`}>
            {/*search input area*/}
            <form onSubmit={handleSubmit} className={`relative flex flex-row items-center flex-1 py-1 px-5`}>
                <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2"/>
                <input ref={inputRef} className="flex py-2 pl-10 pr-4 bg-slate-50 focus:w-1/2 focus:outline-sky-800 focus:bg-white rounded-l-lg lg:focus:outline-none focus:shadow-sm focus:ring-sky-800 flex-1" type="text" value={searchTerm} placeholder="Search for deck" onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setIsFocused(true)} />
                <button type="button" className={`${!isFocused && 'hidden'} ml-3 lg:hidden`} onMouseDown={handleCancel}>Cancel</button>
                <button type="submit" className="hidden bg-sky-700 h-full p-2 rounded-r-lg lg:flex hover:cursor-pointer"><Search color="white"/></button>
            </form>
            {/*search result area*/}
            <SearchDropdown searchTerm={searchTerm} isVisible={isFocused} tagSet={tagSet} setTagSet={setTagSet} handleNav={() => setIsFocused(false)} />
        </div>
    )
}