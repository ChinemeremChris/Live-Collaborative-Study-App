import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { SearchFilters } from "./SearchFilters"
import { SlidersHorizontal } from "lucide-react"
import { DeckResultCard } from "./DeckResultCard"
import { PageSpinner } from "./PageSpinner"

export const SearchResults = () => {
    const [searchParams] = useSearchParams()
    const search_term = searchParams.get("search_term")
    const tags = searchParams.getAll("filter_tags")
    const [filterOpen, setFilterOpen] = useState(false)
    const [page, setPage] = useState(1)

    const filter_tags = new Set(tags)
    const min_rating = searchParams.get("min_rating") 
    const max_rating = searchParams.get("max_rating")
    const min_cards = searchParams.get("min_cards")
    const max_cards = searchParams.get("max_cards")

    const GetDecks = async ({ filter_tags, min_cards, max_cards, min_rating, max_rating }) => {
        const params = new URLSearchParams()
        if (search_term){
            params.append("search_term", search_term)
        }

        filter_tags?.forEach((tag) => {
            params.append("filter_tags", tag)
        })
        if(min_cards !== null){
            params.append("min_cards", min_cards)
        }
        if(max_cards !== null){
            params.append("max_cards", max_cards)
        }
        if(min_rating !== null){
            params.append("min_rating", min_rating)
        }
        if(max_rating !== null){
            params.append("max_rating", max_rating)
        }
        params.append("page", page)
        params.append("limit", 20)
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

    useEffect(() => {
        setPage(1)
    }, [search_term, [...filter_tags].sort(), min_rating, max_rating, min_cards, max_cards])

    const {
        data: search_results,
        isLoading: search_loading
    } = useQuery({
        queryKey: ["deck_search", search_term, [...filter_tags].sort(), min_rating, max_rating, min_cards, max_cards, page],
        queryFn: () => GetDecks({ 
            filter_tags: filter_tags,
            min_rating: min_rating, 
            max_rating: max_rating, 
            min_cards: min_cards, 
            max_cards: max_cards
        }),
        staleTime: 1000 * 60 * 3,
        gcTime: 1000 * 60 * 3,
        refetchOnWindowFocus: false,
        placeholderData: keepPreviousData
    })

    return (
        <div className="flex flex-col gap-3 min-h-screen md:px-10">
            <div className="flex px-3 gap-3">
                <button onClick={() => setFilterOpen(true)} className="hover:cursor-pointer"><SlidersHorizontal /></button>
                <div className="text-blue-500 font-semibold">
                    {
                        search_results?.decks?.length > 0 &&
                        `Results for "${search_term ? search_term : ''}" (${search_results?.decks ? search_results?.decks.length : 0})`
                    }
                </div>
            </div>
            <SearchFilters isVisible={filterOpen} setFilterOpen={setFilterOpen} />
            <div>
                {
                    search_loading && <PageSpinner />
                }
                {
                    search_results?.decks?.length > 0 ?
                        <div className="flex flex-col gap-8 py-6 md:grid md:grid-cols-2 lg:grid-cols-3">
                            {
                                search_results?.decks?.map((deck) => (
                                    <div key={deck.deck_id} className="flex flex-col items-center">
                                        <DeckResultCard deck={deck} />
                                    </div>
                                ))
                            }
                        </div>
                    :
                        <div className="flex flex-col gap-3 justify-center items-center text-center">
                            <div className="text-5xl md:text-7xl lg:text-8xl">🔍</div>
                            <div className="font-semibold text-xl md:text-3xl lg:text-4xl">No decks found</div>
                            <div className="text-slate-500 md:text-lg lg:text-xl">Try different keywords or remove any filters</div>
                        </div>
                }
            </div>
            {/* footer */}
            {   
                search_results?.decks?.length > 0 &&
                    <div className="mt-auto flex justify-between px-4 py-3 items-center">
                        <button onClick={() => setPage((prev) => prev - 1)} disabled={page <= 1} className={`text-sky-700 font-semibold p-2 rounded-3xl ${page <= 1 && 'text-slate-500'} ${page <= 1 ? 'hover:cursor-not-allowed' : 'hover:cursor-pointer'} ${page > 1 && 'hover:text-white'} ${page > 1 && 'hover:bg-sky-400'}`}>← Previous</button>
                        <div className="font-semibold">{`Page ${page}/${search_results?.num_pages ? search_results?.num_pages : 1}`}</div>
                        <button onClick={() => setPage((prev) => prev + 1)} disabled={page >= search_results?.num_pages} className={`text-sky-700 font-semibold p-2 rounded-3xl ${page >= search_results?.num_pages &&  'text-slate-500'} ${page >= search_results?.num_pages ? 'hover:cursor-not-allowed' : 'hover:cursor-pointer'} ${page < search_results?.num_pages && 'hover:text-white'} ${page < search_results?.num_pages && 'hover:bg-sky-400'}`}>→ Next</button>
                    </div>
            }
        </div>
    )
}