import { Tag, X } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"

export const TagModal = ({ tagSet, setTagSet, tagModalOpen, setTagModalOpen }) => {
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

    const HandleTagClick = (tag_id) => {
        setTagSet((prev) => {
            const returnSet = new Set(prev)
            prev.has(tag_id) ? returnSet.delete(tag_id) : returnSet.add(tag_id)
            return returnSet
        })
    }

    const {
        data: tags, 
        isLoading 
    } = useQuery({
        queryKey: ["tags"],
        queryFn: GetTags,
        staleTime: Infinity
    })

    return (
        <>
            {
                tagModalOpen && (
                    <div 
                        className="hidden md:block fixed z-12 bg-black/40 inset-0" 
                        onClick={() => setTagModalOpen(false)}
                    />
                )
            }

            <div className={`font-poppins ${tagModalOpen ? 'translate-y-0' : 'translate-y-full'} transition-transform duration-300 z-20 fixed top-0 left-0 bg-slate-100 flex flex-col px-7 py-5 w-screen h-full md:w-2/3 md:h-[60vh] ${tagModalOpen ? 'md:opacity-100 pointer-events-auto' : 'md:opacity-0 pointer-events-none'} md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl`}>
                <div className="flex justify-between items-center pb-3 border-b border-slate-400">
                    <div className="flex items-center gap-1">
                        <Tag className="w-5 h-5 lg:w-7 lg:h-7" />
                        <div className="font-bold text-xl">Tags</div>
                    </div>
                    <button type="button" onClick={() => setTagModalOpen(false)}>
                        <X className="w-7 h-7 lg:w-9 lg:h-9" />
                    </button>
                </div>
                <div className="flex flex-wrap mt-7 gap-2">
                    {!isLoading &&
                        tags?.map((tag_data) => (
                            <button key={tag_data.tag_id} type="button" className={`rounded-xl ${tagSet.has(tag_data.tag_id) ? 'bg-sky-300' : 'bg-white'} border-sky-300 border-2 w-fit py-1 px-2 text-sm md:text-base hover:cursor-pointer`} onClick={() => HandleTagClick(tag_data.tag_id)}>
                                {tag_data.tag_name}
                            </button>
                        ))
                    }
                </div>
            </div>
        </>
    )
}