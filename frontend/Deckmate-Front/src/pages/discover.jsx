import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { SearchFilters } from "../components/SearchFilters"
import { SlidersHorizontal } from "lucide-react"
import { DeckResultCard } from "../components/DeckResultCard"
import { PageSpinner } from "../components/PageSpinner"
import { SearchResults } from "../components/SearchResults"
import { BrowseDiscover } from "../components/BrowseDiscover"

export const Discover = () => {
    const [searchParams] = useSearchParams()
    const search_term = searchParams.get("search_term")
    const filter_tags = searchParams.getAll("filter_tags")

    return (
        <div>
            {
                search_term || filter_tags?.length > 0 ? <SearchResults /> : <BrowseDiscover />
            }
        </div>
    )
}