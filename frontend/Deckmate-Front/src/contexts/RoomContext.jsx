import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "./UserContext";

const RoomContext = createContext(null)

export const RoomProvider = () => {
    const {room_id} = useParams()
    const {user, userLoading} = useAuth()
    const ws = useRef(null)
    const wsOpened = useRef(false)
    const isLeaving = useRef(false)
    const clockOffset = useRef(0)
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(null)
    const [currentQuestion, setCurrentQuestion] = useState({})
    const [currentChoice, setCurrentChoice] = useState(null)
    const [answeredCount, setAnsweredCount] = useState(0)
    const [currentScores, setCurrentScores] = useState([])
    const [gamePhase, setGamePhase] = useState('lobby') // lobby | question | round_results | end_game
    const [currentAnswerID, setcurrentAnswerID] = useState(null)


    const SendMessage = (type, message) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({...message, "type": type}))
        }
    }

    const closeWS = (val) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.close(val)
        }
    }

    const serverNow = () => Date.now() - clockOffset.current

    const GetRoomInfo = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/rooms/info/${room_id}`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        })
        if (!response.ok){
            const error = await response.json()
            if (response.status === 422){
                const message = error.detail.map(e => e.msg).join(', ')
                throw new Error(message || "Error with input")
            }
            throw new Error(error.detail || "Error fetching room info")
        }
        return response.json()
    }

    const {
        data: roomInfo,
        isFetching: roomInfoFetching,
        isError: isErrorRoomInfo,
        error: roomInfoError
    } = useQuery({
        queryKey: ["rooms", room_id],
        queryFn: GetRoomInfo,
        staleTime: 1000 * 60 * 10,
        gcTime: 1000 * 60 * 10
    })

    useEffect(() => {
        if(isErrorRoomInfo){
            toast.error(roomInfoError?.message)
        }
    }, [isErrorRoomInfo, roomInfoError])

    useEffect(() => {
        if ((!roomInfoFetching && !roomInfo) || roomInfo?.room_status === "Completed"){
            toast("Room is unavailable")
            navigate("/")
        }
    }, [roomInfo])

    useEffect(() => {
        if (!roomInfo?.room_code) return
        if (wsOpened.current) return
        ws.current = new WebSocket(`${import.meta.env.VITE_WS_URL}/rooms/${roomInfo?.room_code}/ws`)
        wsOpened.current = true

        ws.current.onopen = () => {
            const sentAt = Date.now()
            SendMessage("ping", {"client_time": sentAt})
        }

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data)
            switch(data.type){
                case 'pong':
                    const roundTrip = Date.now() - data?.client_time
                    const serverTime = data?.server_time + (roundTrip / 2)
                    clockOffset.current = Date.now() - serverTime
                    break
                case 'player_join':
                    queryClient.invalidateQueries({
                        queryKey: ["rooms", room_id]
                    })
                    toast.success(data.message)
                    break
                case 'player_leave':
                    queryClient.invalidateQueries({
                        queryKey: ["rooms", room_id]
                    })
                    toast(data.message)
                    break
                case 'end_room':
                    toast("Room has been closed by host")
                    navigate("/")
                    break
                case 'error':
                    toast.error(data.message)
                    break
                case 'start_game':
                    navigate(`/rooms/game/${room_id}`, { replace: true })
                    break
                case 'question':
                    console.log("question hit")
                    setGamePhase('question')
                    setCurrentChoice(null)
                    setCurrentQuestionIdx(data?.current_index)
                    setcurrentAnswerID(null)
                    setCurrentScores([])
                    setAnsweredCount(0)
                    setCurrentQuestion({
                        prompt: data?.prompt,
                        prompt_url: data?.prompt_url,
                        choices: data?.choices,
                        ends_at: data?.ends_at
                    })
                    if (location.pathname.includes('lobby')){
                        navigate(`/rooms/game/${room_id}`, { replace: true })
                    }
                    break
                case 'round_results':
                    setGamePhase('round_results')
                    setcurrentAnswerID(data.corrent_answer_id)
                    setCurrentScores(data.scores)
                    break
                case 'answer_received':
                    data?.user_answer_id !== currentChoice && setCurrentChoice(data?.user_answer_id)
                    break
                case 'answer_count':
                    setAnsweredCount(data?.num_answered)
                    break
                case 'answer_not_submitted':
                    setCurrentChoice(null)
                    break
                case 'end_game':
                    //maybe display a fancy loading state while results are
                    setGamePhase('end_game')
                    closeWS(1000)
                    navigate(`/rooms/results/${room_id}`, { replace: true })
                    break
                default:
                    toast(data.message)
                    break
            }
        }

        ws.current.onerror = (error) => {
            console.log("Websocker error: ", error)
        }

        ws.current.onclose = (event) => {
            if (!event.wasClean && !isLeaving.current){
                toast.error("Disconnected from room")
                navigate("/")
            }
            if (user?.id === roomInfo?.host_id){
                console.log("ended")
            }
        }

        return () => {
            closeWS(1000)
        }
    }, [roomInfo?.room_code])
    
    return (
        <RoomContext.Provider value={{ roomInfo, roomInfoFetching, isErrorRoomInfo, roomInfoError, isLeaving, gamePhase, answeredCount, currentQuestionIdx, currentQuestion, currentChoice, currentAnswerID, currentScores, setCurrentChoice, SendMessage, closeWS, serverNow }}>
            <Outlet />
        </RoomContext.Provider>
    )
}

export const useRoomProvider = () => useContext(RoomContext)