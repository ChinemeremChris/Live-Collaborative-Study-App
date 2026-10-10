import { Search } from "lucide-react"
import { useState } from "react"
import { GameDeckCard } from "./GameDeckCard"
import { useQuery } from "@tanstack/react-query"

export const RoomSearchModal = ({ HandleDoubleClick }) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [submittedTerm, setSubmittedTerm] = useState('')
    const [page, setPage] = useState(1)

    const HandleSearch = (e) => {
        e.preventDefault()
        setPage(1)
        setSubmittedTerm(searchTerm)
    }

    const SearchDeck = async () => {
        const params = new URLSearchParams({
            'search_term': submittedTerm,
            'page': page,
            "limit": 3
        })
        
        const response = await fetch(`${import.meta.env.VITE_API_URL}/decks/search?${params.toString()}`, {
            method: "GET",
            credentials: "include"
        })
        if (!response.ok){
            const error = await response.json()
            console.log(error)
            throw new Error(error.detail || "Failed search for decks")
        }
        return response.json()
    }

    const {
        data: search_result,
        isFetching: decks_loading,
        refetch: decks_refetch
    } = useQuery({
        queryKey: ["deck_search", submittedTerm, page, 5],
        queryFn: SearchDeck,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 5,
        enabled: submittedTerm !== ''
    })

    return (
        <>
            <div className="block fixed z-12 bg-black/40 inset-0" />
            <div className="fixed md:w-3/5 max-h-[90vh] lg:h-[60vh] z-13 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-4 flex flex-col items-center gap-3">
                <form onSubmit={(e) => HandleSearch(e)} className="md:w-full flex justify-center gap-0.5">
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className=" md:w-full rounded-l-lg bg-slate-100 focus:bg-white p-2 outline-none focus:border focus:border-emerald-500 focus:ring focus:ring-emerald-400" />
                    <button onClick={decks_refetch} className="shrink-0 bg-emerald-500 px-2 rounded-r-lg flex justify-center items-center">
                        <Search className="text-white" />
                    </button>
                </form>
                <div className="w-full flex flex-col items-center py-3 gap-3 hide-scrollbar overflow-y-auto">
                    {
                        !decks_loading ?
                            search_result?.decks?.map((deck) => (
                                <GameDeckCard key={deck.deck_id} deck={deck} HandleDoubleClick={HandleDoubleClick} />
                            ))
                        :
                            [1, 2, 3].map((item) => (
                                <div key={item} className="animate-pulse" />
                            ))
                    }
                </div>
                {
                    search_result?.num_pages > 1 &&
                        <div className="lg:absolute lg:bottom-0 lg:pb-2 lg:px-2 flex w-full justify-between items-center">
                            <button onClick={() => setPage((prev) => prev - 1)} disabled={page <= 1} className={`flex shrink-0 text-emerald-600 font-semibold p-2 rounded-3xl ${page <= 1 && 'text-slate-500'} ${page <= 1 ? 'hover:cursor-not-allowed' : 'hover:cursor-pointer'} ${page > 1 && 'hover:text-white'} ${page > 1 && 'hover:bg-emerald-400'}`}>← Previous</button>
                            <div className="font-semibold">{`Page ${page}/${search_result?.num_pages ? search_result?.num_pages : 1}`}</div>
                            <button onClick={() => setPage((prev) => prev + 1)} disabled={page >= search_result?.num_pages} className={`flex shrink-0 text-emerald-600 font-semibold p-2 rounded-3xl ${page >= search_result?.num_pages &&  'text-slate-500'} ${page >= search_result?.num_pages ? 'hover:cursor-not-allowed' : 'hover:cursor-pointer'} ${page < search_result?.num_pages && 'hover:text-white'} ${page < search_result?.num_pages && 'hover:bg-emerald-400'}`}>Next →</button>
                        </div>
                }
            </div>
        </>
    )
}