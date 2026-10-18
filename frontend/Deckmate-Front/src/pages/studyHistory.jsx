import { ArrowDown, ArrowUp, BookOpen, CalendarDays, Clock, GraduationCap, Star } from "lucide-react"
import { CalendarDropdown } from "../components/CalendarDropdown"
import { useEffect, useState } from "react"
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { useAuth } from "../contexts/UserContext"
import toast from "react-hot-toast"
import { TimeHelper } from "../lib/timeHelper"
import { CardStackIcon } from "../components/CardStackIcon"
import { DayPicker, getDefaultClassNames } from 'react-day-picker'
import 'react-day-picker/style.css'
import { format, setMonth } from 'date-fns'
import { PageSpinner } from "../components/PageSpinner"
import { useNavigate } from "react-router-dom"

export const StudyHistory = () => {
    const { user, userLoading } = useAuth()
    const [selected, setSelected] = useState()
    const [month, setMonth] = useState(new Date())
    const [currentOption, setCurrentOption] = useState(7)
    const [intensityGroup, setIntensityGroup] = useState({
        'none': [],
        'light': [],
        'moderate': [],
        'high': [],
        'heavy': [],
        'highest': []
    })
    const navigate = useNavigate()

    const GetStats = async () => {
        const params = new URLSearchParams()
        params.append("interval", currentOption)
        const response = await fetch(`${import.meta.env.VITE_API_URL}/study/history/stats?${currentOption === null ? '' : params.toString()}`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 422){
                const message = error.detail.map(e => e.msg)
                throw new Error(message || "Error with input")
            }
            throw new Error (error.detail || "Error fetching session stats")
        }
        return response.json()
    }

    const GetHeatmap = async () => {
        const params = new URLSearchParams()
        params.append("day", month.toISOString().split('T')[0])
        const response = await fetch(`${import.meta.env.VITE_API_URL}/study/stats/heatmap?${params.toString()}`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 422){
                const message = error.detail.map(e => e.msg)
                throw new Error(message || "Error with input")
            }
            throw new Error (error.detail || "Error fetching heatmap")
        }
        return response.json()
    }

    const GetStudySessions = async (pageParam) => {
        const params = new URLSearchParams()
        params.append('limit', 5)
        if (pageParam) params.append('cursor', pageParam)
        const response = await fetch(`${import.meta.env.VITE_API_URL}/study/me?${params.toString()}`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 422){
                const message = error.detail.map(e => e.msg)
                throw new Error(message || "Error with input")
            }
            throw new Error (error.detail || "Error fetching study sessions")
        }
        return response.json()
    }

    const {
        data: sessionStats,
        isLoading: statLoading,
        error: sessionStatsError,
        isError: isSessionStatsError
    } = useQuery({
        queryKey: ["session_stats", user?.id, currentOption],
        queryFn: GetStats,
        staleTime: 1000 * 60 * 20,
        gcTime: 1000 * 60 * 20,
        placeholderData: keepPreviousData
    })

    const {
        data: heatmap,
        isLoading: heatmapLoading,
        error: heatmapError,
        isError: isHeatmapError
    } = useQuery({
        queryKey: ["heatmap", user?.id, month?.toISOString().split('T')[0]],
        queryFn: GetHeatmap,
        staleTime: 1000 * 60 * 20,
        gcTime: 1000 * 60 * 20,
        enabled: !!month,
        placeholderData: keepPreviousData
    })

    const {
        data: myStudySessions,
        isPending: myStudySessionsPending,
        isError: isMyStudySessionsError,
        error: myStudySessionsError,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ["my-study-sessions", user?.id],
        queryFn: ({ pageParam }) => GetStudySessions(pageParam),
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined
    })

    useEffect(() => {
        if (isSessionStatsError){
            toast.error(sessionStatsError.message || "Error fetching session stats")
        }
    }, [isSessionStatsError, sessionStatsError])

    useEffect(() => {
        if (isHeatmapError){
            toast.error(heatmapError.message || "Error fetching heatmap")
        }
    }, [isHeatmapError, heatmapError])

    useEffect(() => {
        if (isMyStudySessionsError){
            toast.error(myStudySessionsError.message || "Error fetching user's study sessions")
        }
    }, [isMyStudySessionsError, myStudySessionsError])

    useEffect(() => {
        console.log("month", month)
    }, [month])

    useEffect(() => {
        if (!heatmap) return
        const grouping = {
            'none': [],
            'light': [],
            'moderate': [],
            'high': [],
            'heavy': [],
            'highest': []
        }
        Object.entries(heatmap).forEach(([date, intensity]) => {
            const correctDate = new Date(date.replace(/-/g, '\/'))
            if (intensity === 0){
                grouping?.none?.push(correctDate)
            }else if (intensity < 5*60){
                grouping?.light?.push(correctDate)
            }else if (intensity < 10*60){
                grouping?.moderate?.push(correctDate)
            }else if (intensity < 15*60){
                grouping?.high?.push(correctDate)
            }else if (intensity < 20*60){
                grouping?.heavy?.push(correctDate)
            }else if (intensity > 20*60){
                grouping?.highest?.push(correctDate)
            }
        })
        setIntensityGroup(grouping)
    }, [heatmap])

    return (
        <div className="font-ibm w-full min-h-screen flex flex-col gap-6 md:gap-10 p-2 md:px-5 text-sky-800 bg-slate-50">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:justify-between">
                <div className="flex flex-col md:gap-2">
                    <div className="text-3xl md:text-5xl lg:text-6xl font-semibold">
                        Study History
                    </div>
                    <div className="text-sm md:text-base lg:text-xl">
                        Track your progress and stay consistent
                    </div>
                </div>
                <CalendarDropdown currentOption={currentOption} setCurrentOption={setCurrentOption} />
            </div>
                {
                    statLoading ? 
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-26">
                            <div className="animate-pulse bg-slate-300 h-20 p-3 rounded-xl" />
                            <div className="animate-pulse bg-slate-300 h-20 p-3 rounded-xl" />
                            <div className="animate-pulse bg-slate-300 h-20 p-3 rounded-xl" />
                            <div className="animate-pulse bg-slate-300 h-20 p-3 rounded-xl" />
                        </div>
                    :
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white flex shadow-md p-3 gap-2 rounded-lg">
                                <div className="flex justify-center items-center w-7 h-7 p-1 rounded-full bg-emerald-50 text-emerald-800">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm md:text-base font-semibold">
                                        Study Time
                                    </span>
                                    <span className="text-lg md:text-xl font-bold">
                                        {`${TimeHelper(sessionStats?.study_time?.toFixed(2))}`}
                                    </span>
                                    <div className={`font-semibold flex items-center ${sessionStats?.study_time_diff < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                        {!sessionStats?.study_time_diff ? '—' : (sessionStats?.study_time_diff < 0 ? <ArrowDown className="w-4 h-4"/> : <ArrowUp className="w-4 h-4"/>)}
                                        <span className="text-xs md:text-base">
                                            {`${sessionStats?.study_time_diff ? `${sessionStats?.study_time_diff?.toFixed(1)} %` : ''}`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white flex shadow-md p-3 gap-2 rounded-lg">
                                <div className="flex justify-center items-center w-7 h-7 p-1 rounded-full bg-emerald-50 text-emerald-800">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm md:text-base font-semibold">
                                        Sessions
                                    </span>
                                    <span className="text-lg md:text-xl font-bold">
                                        {`${sessionStats?.num_sessions}`}
                                    </span>
                                    <div className={`font-semibold flex items-center ${sessionStats?.study_time_diff < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                        {!sessionStats?.num_sessions_diff ? '—' : (sessionStats?.num_sessions_diff < 0 ? <ArrowDown className="w-4 h-4"/> : <ArrowUp className="w-4 h-4"/>)}
                                        <span className="text-xs md:text-base">
                                            {`${sessionStats?.num_sessions_diff ? `${sessionStats?.num_sessions_diff?.toFixed(1)} %` : ''}`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white flex shadow-md p-3 gap-2 rounded-lg">
                                <div className="flex justify-center items-center w-7 h-7 p-1 rounded-full bg-emerald-50 text-emerald-800">
                                    <CardStackIcon className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs md:text-base font-semibold">
                                        Cards Studied
                                    </span>
                                    <span className="text-lg md:text-xl font-bold">
                                        {`${sessionStats?.cards_studied}`}
                                    </span>
                                    <div className={`font-semibold flex items-center ${sessionStats?.cards_studied_diff < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                        {!sessionStats?.cards_studied_diff ? '—' : (sessionStats?.cards_studied_diff < 0 ? <ArrowDown className="w-4 h-4"/> : <ArrowUp className="w-4 h-4"/>)}
                                        <span className="text-xs md:text-base">
                                            {`${sessionStats?.cards_studied_diff ? `${sessionStats?.cards_studied_diff?.toFixed(1)} %` : ''}`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white flex shadow-md p-3 gap-2 rounded-lg">
                                <div className="flex justify-center items-center w-7 h-7 p-1 rounded-full bg-amber-50 text-amber-500">
                                    <Star className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm md:text-base font-semibold">
                                        Accuracy
                                    </span>
                                    <span className="text-lg md:text-xl font-bold">
                                        {`${sessionStats?.accuracy}`}
                                    </span>
                                    <div className={`font-semibold flex items-center ${sessionStats?.accuracy_diff < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                        {!sessionStats?.accuracy_diff ? '—' : (sessionStats?.accuracy_diff < 0 ? <ArrowDown className="w-4 h-4"/> : <ArrowUp className="w-4 h-4"/>)}
                                        <span className="text-xs md:text-base">
                                            {`${sessionStats?.accuracy_diff ? `${sessionStats?.accuracy_diff?.toFixed(1)} %` : ''}`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
            }
            <div className="w-full md:w-3/4 lg:w-1/2 flex flex-col items-center bg-white rounded-lg shadow-lg py-2 md:py-6 px-2 md:px-6">
                <span className="w-full text-left font-bold font-poppins text-2xl md:text-3xl text-black">
                    Study Calendar
                </span>
                <DayPicker 
                    mode="single"
                    captionLayout="Study heatmap"
                    selected={selected}  
                    month={month} 
                    onMonthChange={setMonth} 
                    onSelect={setSelected} 
                    animate
                    modifiers={{
                        none: intensityGroup?.none,
                        light: intensityGroup?.light,
                        moderate: intensityGroup?.moderate,
                        high: intensityGroup?.high,
                        heavy: intensityGroup?.heavy,
                        highest: intensityGroup?.highest
                    }}
                    modifiersClassNames={{
                        none: 'bg-none',
                        light: 'rounded-full bg-emerald-100',
                        moderate: 'rounded-full bg-emerald-200',
                        high: 'rounded-full bg-emerald-300',
                        heavy: 'rounded-full bg-emerald-400',
                        highest: 'rounded-full bg-emerald-500'
                    }}
                />
            </div>
            <div className="md:hidden bg-white w-full flex flex-col gap-2 rounded-lg">
                <span className="px-4 py-2 text-xl font-bold bg-amber-50 rounded-t-lg">
                    Recent Sessions
                </span>
                <div className="flex flex-col px-4 pb-6 gap-3 divide-y divide-slate-300">
                    {
                        myStudySessionsPending ?
                            <div>
                                <PageSpinner message="Loading study sessions" />
                            </div>
                        :
                        myStudySessions?.pages?.flatMap((page) => (
                            page?.study_sessions?.map((session) => (
                                <div key={session.session_id} onClick={() => navigate(`/study/summary/${session.deck_id}?session_id=${session.session_id}`)} className={`hover:cursor-pointer flex py-1`}>
                                    <div className="flex gap-2">
                                        <div className="p-2 w-10 h-10 flex justify-center items-center bg-emerald-100 rounded-lg">
                                            <GraduationCap fill="green" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold">
                                                {session.deck_name}
                                            </span>
                                            <div className="flex gap-4 text-xs">
                                                <span className="">
                                                    {new Date(session.started_at).toLocaleDateString()}
                                                </span>
                                                <div className="flex items-center">
                                                    <CardStackIcon className="w-3 h-3" />
                                                    <span>
                                                        {`${session.cards_studied} ${session.cards_studied === 1 ? 'card' : 'cards'} studied`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ))
                    }
                </div>
            </div>
            <div className="hidden bg-white md:flex md:flex-col md:rounded-xl md:gap-3 md:shadow-lg">
                <span className="rounded-t-lg md:py-3 md:px-6 font-semibold text-3xl">
                    Recent Sessions
                </span>
                <div className="md:px-6 grid grid-cols-[1fr_3fr_1fr_2fr] gap-2 font-bold text-lg">
                    <span>Date</span>
                    <span>Deck</span>
                    <span>Cards</span>
                    <span>Difficulty</span>
                </div>
                <div className="flex flex-col md:py-3 md:px-6 divide-y divide-slate-300">
                    {
                        myStudySessionsPending ? 
                            <div>
                                <PageSpinner message="Loading sessions" />
                            </div>
                        :
                        myStudySessions?.pages?.flatMap((page) => (
                            page?.study_sessions?.map((session) => (
                                <div key={session.session_id} onClick={() => navigate(`/study/summary/${session.deck_id}?session_id=${session.session_id}`)} className="hover:cursor-pointer hover:bg-slate-300 grid grid-cols-[1fr_3fr_1fr_2fr] gap-2 px-2 py-4">
                                    <span className="italic">
                                        {new Date(session.started_at).toLocaleDateString()}
                                    </span>
                                    <div className="line-clamp-1 font-semibold">
                                        {session.deck_name}
                                    </div>
                                    <span>
                                        {`${session.cards_studied}`}
                                    </span>
                                    <div className="flex justify-between">
                                        <span className="flex items-center justify-center bg-emerald-300 py-1 px-2 rounded-2xl text-emerald-700">
                                            {`${session.easy}E`}
                                        </span>
                                        <span className="flex items-center justify-center bg-amber-300 py-1 px-2 rounded-2xl text-amber-700">
                                            {`${session.medium}M`}
                                        </span>
                                        <span className="flex items-center justify-center bg-red-300 py-1 px-2 rounded-2xl text-red-700">
                                            {`${session.hard}H`}
                                        </span>
                                        <span className="flex items-center justify-center bg-slate-300 py-1 px-2 rounded-2xl text-slate-700">
                                            {`${session.forgot}F`}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ))
                    }
                </div>
            </div>
            <div className="flex justify-center">
                <button type="button" onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage} className={`flex justify-center items-center w-1/2 lg:w-1/3 p-2 md:p-3 text-white text-lg md:text-2xl font-semibold rounded-lg ${(!hasNextPage || isFetchingNextPage) ? 'hover:cursor-not-allowed bg-emerald-300' : 'hover:cursor-pointer bg-emerald-600'}`}>
                    {`${isFetchingNextPage ? 'Loading...' : (hasNextPage ? 'Load More' : 'No more sessions')}`}
                </button>
            </div>
        </div>
    )
}