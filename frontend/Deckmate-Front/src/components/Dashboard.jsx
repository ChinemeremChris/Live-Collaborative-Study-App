import { useState } from "react"
import { useAuth } from "../contexts/UserContext"
import { ContStudCard } from "./ContStudCard"
import { DashRoom } from "./DashRoom"
import { DashSession } from "./DashSession"
import { Navbar } from "./Navbar"
import toast from "react-hot-toast"
import { useQuery } from "@tanstack/react-query"
import { Plus, Search } from "lucide-react"
import { useNavigate } from "react-router-dom"
export const Dashboard = () => {
    const navigate = useNavigate()
    const { user } = useAuth()

    const Greeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good Morning'
        else if (hour < 16) return 'Good Afternoon'
        else return 'Good Evening'
    }

    const GetStats = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/account/stats`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        })
        if (!response.ok){
            const error = await response.json()
            throw new Error (error.detail || "Failed to load dashboard stats")
        }
        return response.json()
    }

    const GetDueDecks = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/study/due?limit=5`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
        })
        if (!response.ok){
            const error = response.json()
            throw new Error (error.detail || "Failed to load due decks")
        }
        return response.json()
    }

    const GetStudySessions = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/study/me?limit=3`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        })
        if (!response.ok){
            const error = response.json()
            throw new Error(error.detail || "Failed to fetch study sessions")
        }
        return response.json()
    }

    const GetRooms = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/rooms/participants/me?limit=3`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        })
        if (!response.ok){
            const error = response.json()
            throw new Error(error.detail || "Failed to fetch rooms")
        }
        return response.json()
    }

    const {
        data: stats,
        isLoading: statsLoading
    } = useQuery({
        queryKey: ["stats"],
        queryFn: GetStats,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 5
    })

    const {
        data: studySessions,
        isLoading: studyLoading
    } = useQuery({
        queryKey: ["studySessions", { limit: 3 }],
        queryFn: GetStudySessions,
        staleTime: 1000 * 60 * 15,
        gcTime: 1000 * 60 * 15
    })

    const {
        data: rooms,
        isLoading: roomLoading
    } = useQuery({
        queryKey: ["rooms", { limit: 3 }],
        queryFn: GetRooms,
        staleTime: 1000 * 60 * 15,
        gcTime: 1000 * 60 * 15
    })

    const {
        data: due_decks,
        isLoading: due_decks_loading
    } = useQuery({
        queryKey: ["due_decks"],
        queryFn: GetDueDecks,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 5

    })
    
    const studied_days = [true, true, true, true, true, true, false]
    return (
        <div className="flex flex-col min-h-screen gap-4 sm:gap-7 p-5 md:px-10 lg:px-15 bg-slate-100">
            {/*Welcome, User*/}
            {statsLoading ? 
                <div className="flex flex-col lg:gap-2">
                    <div className="animate-pulse bg-slate-300 rounded-md h-6 md:h-9 lg:h-12 w-64 md:w-80 lg:w-96" />
                    <div className="animate-pulse bg-slate-300 rounded-md h-3.5 md:h-4.5 lg:h-5 w-48 md:w-64 mt-1" />
                </div>
            :
                <div className="flex flex-col lg:gap-2">
                    <div className="text-2xl md:text-4xl lg:text-5xl font-bold">{`${Greeting()}, ${user.fname}`}</div>
                    <div className="text-sm md:text-lg lg:text-xl text-gray-600">
                        {`${stats.num_cards_due} ${stats.num_cards_due !== 1 ? 'cards' : 'card'} due today across ${due_decks?.length} ${due_decks?.length !== 1 ? 'decks' : 'deck'}`}
                    </div>
                </div>
            }
                {/*User info*/}
            {statsLoading ? 
                <div className="grid grid-cols-[3fr_2fr] sm:grid-cols-[4fr_2fr_2fr_2fr] gap-4">
                    <div className="animate-pulse bg-slate-300 h-20 sm:h-30 md:h-40 p-3 sm:py-4 sm:px-6 rounded-xl" />
                    <div className="animate-pulse bg-slate-300 h-20 sm:h-30 md:h-40 p-3 sm:px-4 rounded-xl" />
                    <div className="animate-pulse bg-slate-300 h-20 sm:h-30 md:h-40 p-3 rounded-xl" />
                    <div className="animate-pulse bg-slate-300 h-20 sm:h-30 md:h-40 p-3 rounded-xl" />
                </div>
            :
                <div className="grid grid-cols-[3fr_2fr] sm:grid-cols-[4fr_2fr_2fr_2fr] gap-4">
                    <div className="flex flex-col bg-white p-3 sm:py-4 sm:px-6 rounded-xl">
                        <div className="text-xs sm:text-base font-semibold text-gray-600">Study Streak</div>
                        <div className="font-semibold sm:text-lg">{`${stats.study_streak} ${stats.study_streak !== 1 ? 'days': 'day'}`}</div>
                        <div className="flex gap-1">
                            {
                                stats.study_week_list.map((studied, index) => (
                                    <div key={index} className={`h-5 flex-1 rounded-sm ${studied ? 'bg-sky-800': 'bg-slate-200'} ${index === (new Date).getDay() ? 'outline-2 outline-sky-400 outline-offset-1' : ''}`}/>
                                ))
                            }
                        </div>
                    </div>
                    <div className="flex flex-col bg-white p-3 sm:px-4 rounded-xl">
                        <div className="text-xs sm:text-base font-semibold text-gray-600">Cards studied</div>
                        <div className="font-semibold sm:text-lg">{`${stats.week_cards_studied}`}</div>
                        <div className="text-xs sm:text-base font-semibold text-gray-600">this week</div>
                    </div>
                    <div className="flex flex-col bg-white p-3 rounded-xl">
                        <div className="text-xs sm:text-base font-semibold text-gray-600">My decks</div>
                        <div className="font-semibold sm:text-lg">{`${stats.num_decks}`}</div>
                        <div className="text-xs sm:text-base font-semibold text-gray-600">{`${stats.public_decks} public`}</div>
                    </div>
                    <div className="flex flex-col bg-white p-3 rounded-xl">
                        <div className="text-xs sm:text-base font-semibold text-gray-600">Rooms Played</div>
                        <div className="font-semibold sm:text-lg">{`${stats.rooms_played}`}</div>
                        <div className="text-xs sm:text-base font-semibold text-gray-600">{`${stats.rooms_won} won`}</div>
                    </div>
                </div>
            }
            <div className="flex flex-col gap-3">
                {/*Header*/}
                <div className="flex justify-between items-center">
                    <div className="text-sm md:text-base lg:text-lg font-semibold">Continue Studying</div>
                    <div className="text-xs md:text-sm lg:text-base text-blue-600">See all decks→</div>
                </div>
                {/* cards */}
                <div>
                    {/* REPLACE WITH API DATA */}
                    {   due_decks_loading ?
                            (
                                <div className="flex gap-2">
                                    <div className="animate-pulse bg-gray-200 rounded-xl h-32 w-3/4 sm:w-60 md:w-80 lg:w-90" />
                                    <div className="animate-pulse bg-gray-200 rounded-xl h-32 w-3/4 sm:w-60 md:w-80 lg:w-90" />
                                    <div className="animate-pulse bg-gray-200 rounded-xl h-32 w-3/4 sm:w-60 md:w-80 lg:w-90" />
                                </div>
                            )
                        :
                            (
                            due_decks?.length === 0 ?
                                <div className="flex flex-col items-center bg-white rounded-xl px-2 py-6">
                                    <div className="font-semibold">All caught up today!</div>
                                    <div className="text-slate-500 text-center">Begin a new study session or come back tomorrow for more</div>
                                </div>
                            :
                                <div className="flex gap-2 md:gap-5 overflow-x-auto hide-scrollbar">
                                    {
                                        due_decks?.map((deck) => (
                                            <ContStudCard key={deck.deck_id} card_name={deck.deck_name} rating={deck.avg_rating} num_cards={deck.total_cards} cards_due={deck.num_cards_due} handleClick={() => navigate(`/decks/${deck.deck_id}?mode=study`)} />
                                        ))
                                    }
                                </div>
                            )
                    }
                </div>
            </div>
            {/*sessions & rooms*/}
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                {/*sessions*/}
                <div className="flex flex-col gap-3 sm:w-1/2">
                    <div className="flex justify-between items-center">
                        <div className="text-sm md:text-base lg:text-lg font-semibold">Recent sessions</div>
                        <div className="text-xs md:text-sm lg:text-base text-blue-600">See all decks→</div>
                    </div>
                    {/* actual session table */}
                    <div className="rounded-xl bg-white px-3 py-4">
                        {studySessions?.length > 0 ?
                            <div className="flex flex-col gap-2">
                                {
                                    studySessions.map((session) => (
                                        <DashSession key={session.session_id} card_title={session.deck_name} session_date={session.started_at} num_cards_studied={session.cards_studies} />
                                    ))
                                }
                            </div>
                                :
                            <div className="flex flex-col items-center gap-3">
                                <div className="text-slate-500 text-sm">No study sessions yet? Start hitting the books!</div>
                                <button className="flex items-center gap-1 text-white text-sm md:text-base font-semibold bg-sky-700 p-3 rounded-xl">
                                    <Search />
                                    <div>Browse Decks To Study</div>
                                </button>
                            </div>
                        }
                    </div>
                </div>
                {/*rooms*/}
                <div className="flex flex-col gap-3 sm:w-1/2">
                    <div className="flex justify-between items-center">
                        <div className="text-sm md:text-base lg:text-lg font-semibold">Recent rooms</div>
                        <div className="text-xs md:text-sm lg:text-base text-blue-600">See all rooms→</div>
                    </div>
                    {/* actual room table */}
                    <div className="rounded-xl bg-white px-3 py-4">
                        {rooms?.length > 0 ?
                            <div className="flex flex-col gap-2">
                                {
                                    studySessions.map((room) => (
                                        <DashRoom key={room.room_code} room_code={room.deck_name} position={room.placement} room_status={room_status} />
                                    ))
                                }
                            </div>
                                :
                            <div className="flex flex-col items-center gap-3">
                                <div className="text-slate-500 text-sm">Collaborate with friends today and make studying fun!</div>
                                <button className="flex items-center gap-1 text-white text-sm md:text-base font-semibold bg-sky-700 p-3 rounded-xl">
                                    <Plus />
                                    <div>Create Room</div>
                                </button>
                            </div>
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}