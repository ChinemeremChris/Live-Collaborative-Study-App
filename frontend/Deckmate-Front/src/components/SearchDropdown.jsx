import { useQuery } from "@tanstack/react-query"
import { useDebounce } from 'react-use'
import { forwardRef, useEffect, useState } from "react"
import { Layers, Search } from "lucide-react"
import toast from "react-hot-toast"
import { useNavigate } from "react-router-dom"

export const SearchDropdown = ({ searchTerm, isVisible, tagSet, setTagSet, handleNav }) => {
    const navigate = useNavigate()
    const [debouncedTerm, setDebouncedTerm] = useState('')
    useDebounce(() => setDebouncedTerm(searchTerm), 500, [searchTerm])

    useEffect(() => {
        if (isVisible) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isVisible])

    const GetTags = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/tags`, {
            method: "GET",
            credentials: "include"
        })
        if (!response.ok){
            throw new Error("Error fetching tags")
        }
        return response.json()
    }

    const SearchDeck = async () => {
        const tagList = [...tagSet]
        const filter_tags = tagList.join(", ")
        const params = new URLSearchParams()
        params.append("search_term", debouncedTerm)
        tagList.forEach(tag => 
            params.append("filter_tags", tag)
        )
        const response = await fetch(`${import.meta.env.VITE_API_URL}/decks/suggestions?${params}`, {
            method: "GET",
            credentials: "include",
        })
        if (!response.ok){
            const error = await response.json()
            throw new Error(error)
        }
        return response.json()
    }

    const HandleSearchResultClick = (deck_id) => {
        handleNav()
        navigate(`/decks/${deck_id}`)
    }

    const HandleTagClick = (tag_id) => {
        let newSet = new Set(tagSet)
        if (newSet.has(tag_id)){
            newSet.delete(tag_id)
        }else{
            newSet.add(tag_id)
        }
        setTagSet(newSet)
    }

    const HandleViewResults = () => {
        const params = new URLSearchParams()
        if (debouncedTerm){
            params.append("search_term", debouncedTerm)
        }
        for (const tag of tagSet){
            params.append("filter_tags", tag)
        }
        handleNav()
        navigate(`/discover?${params.toString()}`)
    }


    const { data: tags, isLoading } = useQuery({
        queryKey: ["tags"],
        queryFn: GetTags,
        staleTime: Infinity
    })

    const {
        data: suggestions,
        isFetched
    } = useQuery({
        queryKey: ["suggestions", debouncedTerm, ...tagSet],
        queryFn: SearchDeck,
        enabled: debouncedTerm.length >= 2,
        staleTime: 1000 * 30
    })

    return (
        <div className={`${isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} fixed bg-white transition-opacity duration-150 z-50 h-full w-full -ml-2 mr-0 py-2 lg:absolute lg:top-full lg:w-[calc(100%-2.5rem)] lg:left-4 lg:mt-1 lg:max-h-120 lg:h-fit lg:shadow-md lg:rounded-xl`}>
            {/*Tag*/}
            <div className="hidden lg:block px-4 pb-4 border-b-2 border-gray-100">
                <div className="text-slate-400 font-bold">BROWSE BY TAG</div>
                <div className="flex flex-wrap gap-2">
                    {!isLoading &&
                        tags?.map((tag_data) => (
                            <div key={tag_data.tag_id} tabIndex={0} className={`rounded-xl ${tagSet.has(tag_data.tag_id) ? 'bg-sky-300' : 'bg-white'} border-sky-300 border-2 w-fit py-1 px-2 hover:cursor-pointer`} onClick={() => HandleTagClick(tag_data.tag_id)}>{tag_data.tag_name}</div>
                        ))
                    }
                </div>
            </div>
            {/*Suggestions*/}
            <div className="pt-4">
                <div className="text-slate-400 font-bold px-4">SUGGESTIONS</div>
                <div className="flex flex-col">
                    {
                        suggestions?.map((suggestion) => (
                            <div key={suggestion.deck_id} tabIndex={0} className="flex justify-between p-3 text-sm hover:bg-slate-100 hover:cursor-pointer" onClick={() => HandleSearchResultClick(suggestion.deck_id)}>
                                <div className="flex gap-3">
                                    <Layers />
                                    <div>{suggestion.deck_name}</div>
                                </div>
                                <div>by {suggestion.creator_name}</div>
                            </div>
                        ))
                    }
                    <div onClick={HandleViewResults} tabIndex={0} className={`${isFetched? 'flex' : 'hidden'} hover:cursor-pointer p-3 gap-3 text-blue-400 hover:text-blue-700 font-semibold`}>
                        <Search />
                        <div>View full results</div>
                    </div>
                </div>
            </div>
        </div>
    )
}