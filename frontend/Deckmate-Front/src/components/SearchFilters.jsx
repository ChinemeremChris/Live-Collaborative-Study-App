import { useQuery } from "@tanstack/react-query"
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from "lucide-react"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useNavigate, useSearchParams } from "react-router-dom"

export const SearchFilters = ({ isVisible, setFilterOpen }) => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const search_term = searchParams.get("search_term")
    const search_tags = searchParams.getAll("filter_tags")
    const search_min_rating = searchParams.get("min_rating")
    const search_max_rating = searchParams.get("max_rating")
    const search_min_cards = searchParams.get("min_cards")
    const search_max_cards = searchParams.get("max_cards")

    const [categories, setCategories] = useState({
        num_terms: false,
        tags: false,
        stars: false
    })
    const [tagSet, setTagSet] = useState(new Set(search_tags))
    const [termRange, setTermRange] = useState({
        min: search_min_cards ? Number(search_min_cards) : null, 
        max: search_max_cards ? Number(search_max_cards) : null
    })
    const [starRange, setStarRange] = useState({
        min: search_min_rating ? Number(search_min_rating) : null,
        max: search_max_rating ? Number(search_max_rating) : null
    })

    const handleTagChange = (tag_id) => {
        const current = new Set(tagSet)
        if (current.has(tag_id)){
            current.delete(tag_id)
        }else{
            current.add(tag_id)
        }
        setTagSet(current)
    }

    const handleTermChange = (value) => {
        if(value==="all"){
            setTermRange((prev) => {
                return {
                    min: null,
                    max: null
                }
            })
        }else if(value==="1-10"){
            setTermRange((prev) => {
                return {
                    min: 1,
                    max: 10
                }
            })
        }else if(value==="11-20"){
            setTermRange((prev) => {
                return {
                    min: 11,
                    max: 20
                }
            })
        }else if(value==="21-30"){
            setTermRange((prev) => {
                return {
                    min: 21,
                    max: 30
                }
            })
        }else if(value === ">30"){
            setTermRange((prev) => {
                return {
                    min: 31,
                    max: null
                }
            })
        }
    }

    const handleStarChange = (field, value) => {
        setStarRange((prev) => (
            {...prev, [field]: value}
        ))
    }

    const handleStarBlur = (field) => {
        setStarRange((prev) => {
            let value = Number(prev[field])
            if (!Number.isFinite(value)){
                value = field === "min" ? 1 : 5
            }
            value = Math.max(1, Math.min(5, value))
            return {...prev, [field]: value}
        })
    }

    const handleApplyFilter = () => {
        const params = new URLSearchParams()
        params.delete("filter_tags")
        params.delete("min_rating")
        params.delete("max_rating")
        params.delete("min_cards")
        params.delete("max_cards")
        params.delete("page")
        params.append("search_term", search_term)
        tagSet.forEach((tag) => (
            params.append("filter_tags", tag)
        ))
        if (starRange.min !== null){
            params.append("min_rating", starRange.min)
        }
        if (starRange.max !== null){
            params.append("max_rating", starRange.max)
        }
        if (termRange.min !== null){
            params.append("min_cards", termRange.min)
        }
        if (termRange.max !== null){
            params.append("max_cards", termRange.max)
        }
        navigate(`/discover?${params.toString()}`)
        setFilterOpen(false)
    }

    const handleClearFilter = () => {
        searchParams.delete("filter_tags")
        searchParams.delete("min_rating")
        searchParams.delete("max_rating")
        searchParams.delete("min_cards")
        searchParams.delete("max_cards")
        setTagSet(new Set())
        setTermRange({
            min: null,
            max: null
        })
        setStarRange({
            min: null,
            max: null
        })
        setFilterOpen(false)
        navigate(search_term ? `/discover?search_term=${search_term}` : '/discover')
    }

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

    const {
        data: tags,
        isLoading: tag_loading,
        isError: is_tag_error,
        error: tag_error
    } = useQuery({
        queryKey: ["tags"],
        queryFn: GetTags,
        staleTime: Infinity
    })

    useEffect(() => {
        if (is_tag_error){
            toast.error(tag_error)
        }
    }, [tag_error])

    useEffect(() => {
        setTagSet(new Set(search_tags))
        setStarRange({
            min: search_min_rating,
            max: search_max_rating
        })
        setTermRange({
            min: search_min_cards,
            max: search_max_cards
        })
    }, [searchParams])

    return (
        <>
            {
                isVisible && (
                    <div 
                        className="hidden md:block fixed z-40 bg-black/40 inset-0" 
                        onClick={() => setFilterOpen(false)}
                    />
                )
            }

            <div className={`${isVisible ? 'translate-y-0' : 'translate-y-full'} transition-transform duration-300 z-50 fixed top-0 left-0 bg-slate-100 flex flex-col px-7 w-screen h-full md:w-2/3 md:h-[60vh] ${isVisible ? 'md: opacity-100 pointer-events-auto' : 'md:opacity-0 pointer-events-none'} md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl`}>
                {/* top */}
                <div className="top-0 bg-slate-100 flex shrink-0 justify-between items-center py-5">
                    <div className="flex items-center gap-3 font-bold text-3xl">
                        <SlidersHorizontal className="w-7 h-7 lg:w-9 lg:h-9"/>
                        <div className="lg:text-4xl">Filters</div>
                    </div>
                    <button onClick={() => setFilterOpen(false)}> <X className="w-7 h-7 lg:w-10 lg:h-10"/> </button>
                </div>
                <div className="flex flex-col flex-1 gap-8 overflow-y-scroll h-4/5">
                    {/* collapsible */}
                    {/* tags */}
                    <div className="bg-slate-200 flex flex-col px-6 py-4 gap-2">
                        {/* title */}
                        <div className="flex justify-between items-center hover:cursor-pointer" onClick={() => setCategories((prev) => ({...prev, tags: !prev["tags"]}))}>
                            <div className="font-semibold text-xl lg:text-2xl">Tags</div>
                            {categories["tags"] ? <ChevronUp className="lg:w-9 lg:h-9"/> : <ChevronDown className="lg:w-9 lg:h-9"/>}
                        </div>
                        {/* content */}
                        <div className={`${categories["tags"] ? 'flex' : 'hidden'} flex-col py-2 gap-2 border-t-2 border-slate-300`}>
                            {
                                (!tag_loading && tags) && 
                                    tags.map((tag) => (
                                        <div key={tag.tag_id} className="flex gap-2 text-lg lg:text-xl">
                                            <input type="checkbox" id={tag.tag_id} name={tag.tag_name} value={tag.tag_id} checked={tagSet.has(tag.tag_id)} onChange={() => handleTagChange(tag.tag_id)} className="w-10 lg:w-11" />
                                            <label htmlFor={tag.tag_id}>{tag.tag_name}</label>
                                        </div>
                                    ))
                            }
                        </div>
                    </div>
                    {/* collapsible */}
                    {/* number of terms */}
                    <div className="bg-slate-200 flex flex-col px-6 py-4 gap-2">
                        {/* title */}
                        <div className="flex justify-between items-center hover:cursor-pointer" onClick={() => setCategories((prev) => ({...prev, num_terms: !prev["num_terms"]}))}>
                            <div className="font-semibold text-xl lg:text-2xl">Card Count</div>
                            {categories["num_terms"] ? <ChevronUp className="lg:w-9 lg:h-9"/> : <ChevronDown className="lg:w-9 lg:h-9"/>}
                        </div>
                        {/* content */}
                        <div className={`${categories["num_terms"] ? 'flex' : 'hidden'} flex-col py-2 gap-2 border-t-2 border-slate-300`}>
                            <div className="flex gap-2 text-lg lg:text-xl">
                                <input type="radio" id="all" name="terms" value="all" checked={termRange.min == null && termRange.max == null} onChange={(e) => handleTermChange(e.target.value)} className="w-5 accent-black" />
                                <label htmlFor="all">All</label>
                            </div>
                            <div className="flex gap-2 text-lg lg:text-xl">
                                <input type="radio" id="1-10" name="terms" value="1-10" checked={termRange.min >= 1 && termRange.max && termRange.max <= 10} onChange={(e) => handleTermChange(e.target.value)} className="w-5 accent-black" />
                                <label htmlFor="1-10">1-10</label>
                            </div>
                            <div className="flex gap-2 text-lg lg:text-xl">
                                <input type="radio" id="11-20" name="terms" value="11-20" checked={termRange.min >= 11 && termRange.max && termRange.max <= 20} onChange={(e) => handleTermChange(e.target.value)} className="w-5 accent-black" />
                                <label htmlFor="11-20">11-20</label>
                            </div>
                            <div className="flex gap-2 text-lg lg:text-xl">
                                <input type="radio" id="21-30" name="terms" value="21-30" checked={termRange.min >= 21  && termRange.max && termRange.max <= 30} onChange={(e) => handleTermChange(e.target.value)} className="w-5 accent-black" />
                                <label htmlFor="21-30">21-30</label>
                            </div>
                            <div className="flex gap-2 text-lg lg:text-xl">
                                <input type="radio" id=">30" name="terms" value=">30" checked={termRange.min >= 31} onChange={(e) => handleTermChange(e.target.value)} className="w-5 accent-black" />
                                <label htmlFor=">30">{`>30`}</label>
                            </div>
                        </div>
                    </div>
                    {/* collapsible */}
                    {/* stars */}
                    <div className="bg-slate-200 flex flex-col px-6 py-4 gap-2">
                        {/* title */}
                        <div className="flex justify-between items-center hover:cursor-pointer" onClick={() => setCategories((prev) => ({...prev, stars: !prev["stars"]}))}>
                            <div className="font-semibold text-xl lg:text-2xl">Stars</div>
                            {categories["stars"] ? <ChevronUp className="lg:w-9 lg:h-9"/> : <ChevronDown className="lg:w-9 lg:h-9"/>}
                        </div>
                        {/* content */}
                        <div className={`${categories["stars"] ? 'flex' : 'hidden'} items-center py-2 gap-2 border-t-2 border-slate-300 lg:text-xl`}>
                            <input type="number" className="border border-slate-400 w-28 h-10 p-2 focus:outline-2 focus:outline-blue-700" value={starRange.min ?? 0} onChange={(e) => handleStarChange("min", e.target.value)} onBlur={() => handleStarBlur("min")} step={0.1} min={0.1} max={5.0} />
                            <div>to</div>
                            <input type="number" className="border border-slate-400 w-28 h-10 p-2 focus:outline-2 focus:outline-blue-700" value={starRange.max ?? 5} onChange={(e) => handleStarChange("max", e.target.value)} onBlur={() => handleStarBlur("max")} step={0.1} min={0.1} max={5.0} />
                        </div>
                    </div>
                </div>
                <div className="flex justify-between md:justify-center md:gap-5 shrink-0 bg-slate-100 py-5 lg:text-xl">
                    <button onClick={handleClearFilter} className="flex justify-center items-center bg-slate-200 py-3 px-5 rounded-lg text-md font-semibold border-b-2 hover:cursor-pointer">Clear All</button>
                    <button onClick={handleApplyFilter} className="flex justify-center items-center bg-sky-700 py-3 px-4 rounded-lg text-md font-semibold text-white border-b-2 hover:cursor-pointer">Apply filter(s)</button>
                </div>
            </div>
        </>
    )
}