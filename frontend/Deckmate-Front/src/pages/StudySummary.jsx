import { useEffect, useState } from "react"
import PieChartComponent from "../components/PieChartComponent"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useMutation, useQuery } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { ArrowLeftToLine, PartyPopper  } from "lucide-react"
import { PageSpinner } from "../components/PageSpinner"
import { CompartNumber } from "../lib/compact"
import { divideMinutes } from "../lib/divideMinutes"

export const StudySummary = () => {
    const navigate = useNavigate()
    const { deck_id } = useParams()
    const [searchParams] = useSearchParams()
    const session_id = searchParams.get("session_id")

    const GetSessionSummary = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/study/session/${session_id}`, {
            method: "GET",
            credentials: "include"
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 422) {
                const messages = error.detail.map(e => e.msg).join(', ')
                throw new Error(messages)
            }
            throw new Error(error.detail || "Error loading study cards")
        }
        return response.json()
    }
    
    const {
        data: studySession,
        isLoading: studySessionLoading
    } = useQuery({
        queryKey: ["session", session_id],
        queryFn: GetSessionSummary,
        staleTime: 1000 * 60 * 10,
        gcTime: 1000 * 60 * 10,
        enabled: !!session_id
    })

    const chartData = [
        { name: 'Easy', value: studySession?.easy || 0, color: '#22c55e' },
        { name: 'Medium', value: studySession?.medium || 0, color: '#f59e0b' },
        { name: 'Hard', value: studySession?.hard || 0, color: '#ef4444' },
        { name: 'Forgot', value: studySession?.forgot || 0, color: '#3b82f6' }
    ]

    useEffect(() => {
        console.log(studySession)
    }, [])

    return (
            !studySessionLoading ?
                (
                    studySession ? 
                        <div className="flex flex-col items-center w-full p-1 gap-5 lg:gap-7">
                            <div className="flex flex-col gap-1 items-center">
                                <div className="text-slate-400 text-lg md:text-3xl lg:text-4xl font-semibold">{studySession?.deck_name}</div>
                                <div className="flex justify-center items-center gap-0.5 flex-wrap">
                                    <span className="text-xl md:text-5xl lg:text-6xl font-semibold">Study Session Complete</span>
                                    <PartyPopper fill="red" className="w-5 h-5 md:w-13 md:h-13" />
                                </div>
                                <div className="text-center md:text-2xl lg:text-3xl font-medium text-slate-500">
                                    {`You completed ${studySession?.cards_studied} cards`}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 md:gap-20 lg:gap-40">
                                <div className="flex flex-col font-semibold">
                                    <div className="text-xs md:text-base lg:text-xl text-slate-500">Cards studied</div>
                                    <div className="text-base md:text-xl lg:text-4xl">{studySession?.cards_studied}</div>
                                    <div className="text-xs md:text-base lg:text-xl text-slate-500">{`of ${studySession?.cards_due} due`}</div>
                                </div>
                                <div className="flex flex-col font-semibold">
                                    <div className="text-xs md:text-base lg:text-xl text-slate-500">Session time</div>
                                    <div className="text-base md:text-xl lg:text-4xl">{CompartNumber(studySession?.session_time)} m</div>
                                    <div className="text-xs md:text-base lg:text-xl text-slate-500">{`~${divideMinutes(studySession?.session_time, studySession?.cards_studied)} per card`}</div>
                                </div>
                                <div className="flex flex-col font-semibold">
                                    <div className="text-xs md:text-base lg:text-xl text-slate-500">Easy + medium</div>
                                    <div className="text-base md:text-xl lg:text-4xl">{`${Math.floor(((studySession?.easy + studySession?.medium)/studySession?.cards_studied) * 100)}%`}</div>
                                    <div className="text-xs md:text-base lg:text-xl text-slate-500">{`${studySession?.easy + studySession?.medium} of ${studySession?.cards_studied}`}</div>
                                </div>
                            </div>
                            <div className="w-full text-center md:text-2xl lg:text-4xl md:mt-10 font-bold">
                                Rating Breakdown
                            </div>
                            <div className="w-full md:w-2/3 lg:w-4/5 h-50 md:h-60 lg:h-110 lg:text-2xl">
                                <PieChartComponent chartData={chartData} />
                            </div>
                            <button type="button" className="hover:cursor-pointer mb-9 flex text-lg md:text-2xl lg:text-3xl items-center gap-1 lg:gap-2 bg-sky-600 text-white font-semibold p-2 lg:p-4 rounded-md" onClick={() => navigate(`/decks/${deck_id}`, { replace: true })}>
                                <ArrowLeftToLine className="w-5 h-5 lg:w-7 lg:h-7" />
                                <div>Back to Deck</div>
                            </button>
                        </div>
                    :
                        <div className="flex flex-col text-3xl font-semibold justify-center items-center">
                            <div>No study info</div>
                            <button>Start studying so we can change that</button>
                        </div>
                )
            :
                <PageSpinner message="Loading study summary..." />
    )
}