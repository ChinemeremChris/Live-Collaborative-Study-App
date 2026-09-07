import { useQuery } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"
import { DeckResultCard } from "./DeckResultCard"
import { useAutoSlide } from "./AutoSlide"
import { useIsMobile } from './isMobile'
import { ChevronLeft, ChevronRight } from "lucide-react"

export const BrowseDiscover = () => {
    const GetDiscoverDecks = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/decks/discover`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        })
        if (!response.ok){
            const error = await response.json()
            throw new Error (error.detail || "Error fetching discover decks")
        }
        return response.json()
    }

    const {
        data: discover_decks,
        isLoading: decks_loading,
        isError: is_decks_error,
        error: decks_error
    } = useQuery({
        queryKey: ["discover_decks"],
        queryFn: GetDiscoverDecks,
        staleTime: 1000 * 60 * 3,
        gcTime: 1000 * 60 * 3
    })

    useEffect(() => {
        if (is_decks_error){
            toast.error(decks_error)
        }
    }, [is_decks_error, decks_error])

    const popularRef = useRef(null)
    const [popularInterval] = useState(() => 3000 + Math.random() * 1000)
    const topRef = useRef(null)
    const [topInterval] = useState(() => 3000 + Math.random() * 1000)
    const recentRef = useRef(null)
    const [recentInterval] = useState(() => 3000 + Math.random() * 1000)
    const isMobile = useIsMobile()
    const { scrollLeft: popularLeft, scrollRight: popularRight, UpdateScrollState: popularUpdateScroll, isAtStart: popularStart, isAtEnd: popularEnd } = useAutoSlide(popularRef, { enabled: isMobile, interval: popularInterval })
    const { scrollLeft: topLeft, scrollRight: topRight, UpdateScrollState: topUpdateScroll, isAtStart: topStart, isAtEnd: topEnd } = useAutoSlide(topRef, { enabled: isMobile, interval: topInterval })
    const { scrollLeft: recentLeft, scrollRight: recentRight, UpdateScrollState: recentUpdateScroll, isAtStart: recentStart, isAtEnd: recentEnd } = useAutoSlide(recentRef, { enabled: isMobile, interval: recentInterval })

    useEffect(() => {
        if (discover_decks) {
            popularUpdateScroll()
            topUpdateScroll()
            recentUpdateScroll()
        }
    }, [discover_decks])

    return (
        <div className="flex flex-col px-2 md:px-8 pb-5 gap-7">
            {/* popular this week */}
            <div>
                <div className="font-semibold text-lg">Popular this week</div>
                <div className="relative">
                    {
                        (!popularStart && discover_decks?.popular_decks?.length > 0) && 
                            <button onClick={popularLeft} className="absolute hover:cursor-pointer top-1/2 left-2 -translate-y-1/2 z-10 bg-indigo-400 rounded-2xl p-1">
                                <ChevronLeft color="white" />
                            </button>
                    }
                    <div ref={popularRef} onScroll={popularUpdateScroll} className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar">
                        {
                            discover_decks?.popular_decks?.map((deck) => (
                                <div key={deck.deck_id} className="flex py-3 w-full md:w-1/2 lg:w-1/3 justify-center snap-start shrink-0">
                                    <DeckResultCard deck={deck} />
                                </div>
                            ))
                        }
                    </div>
                    {
                        (!popularEnd && discover_decks?.popular_decks?.length > 0) &&
                            <button onClick={popularRight} className="absolute hover:cursor-pointer top-1/2 right-2 -translate-y-1/2 z-10 bg-indigo-400 rounded-2xl p-1">
                                <ChevronRight color="white" />
                            </button>
                    }
                </div>
            </div>
            {/* top rated */}
            <div>
                <div className="font-semibold text-lg">Top Rated</div>
                <div className="relative">
                    {
                        (!topStart && discover_decks?.top_decks?.length > 0) && 
                            <button onClick={topLeft} className="absolute hover:cursor-pointer top-1/2 left-2 -translate-y-1/2 z-10 bg-indigo-400 rounded-2xl p-1">
                                <ChevronLeft color="white" />
                            </button>
                    }
                    <div ref={topRef} onScroll={topUpdateScroll} className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar">
                        {
                            discover_decks?.top_decks?.map((deck) => (
                                <div key={deck.deck_id} className="flex py-3 w-full md:w-1/2 lg:w-1/3 justify-center snap-start shrink-0">
                                    <DeckResultCard deck={deck} />
                                </div>
                            ))
                        }
                    </div>
                    {
                        (!topEnd && discover_decks?.top_decks?.length > 0) &&
                            <button onClick={topRight} className="absolute hover:cursor-pointer top-1/2 right-2 -translate-y-1/2 z-10 bg-indigo-400 rounded-2xl p-1">
                                <ChevronRight color="white" />
                            </button>
                    }
                </div>
            </div>
            {/* recent */}
            <div>
                <div className="font-semibold text-lg">Most Recent</div>
                <div className="relative">
                    {
                        (!recentStart && discover_decks?.recent_decks?.length > 0) && 
                            <button onClick={recentLeft} className="absolute hover:cursor-pointer top-1/2 left-2 -translate-y-1/2 z-10 bg-indigo-400 rounded-2xl p-1">
                                <ChevronLeft color="white" />
                            </button>
                    }
                    <div ref={recentRef} onScroll={recentUpdateScroll} className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar">
                        {
                            discover_decks?.recent_decks?.map((deck) => (
                                <div key={deck.deck_id} className="flex py-3 w-full md:w-1/2 lg:w-1/3 justify-center snap-start shrink-0">
                                    <DeckResultCard deck={deck} />
                                </div>
                            ))
                        }
                    </div>
                    {
                        (!recentEnd && discover_decks?.recent_decks?.length > 0) &&
                            <button onClick={recentRight} className="absolute hover:cursor-pointer top-1/2 right-2 -translate-y-1/2 z-10 bg-indigo-400 rounded-2xl p-1">
                                <ChevronRight color="white" />
                            </button>
                    }
                </div>
            </div>
        </div>
    )
}