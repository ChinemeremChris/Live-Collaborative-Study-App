import { Circle, Diamond, LogOut, Square, Triangle, Users } from "lucide-react"
import { useRoomProvider } from "../contexts/RoomContext"
import FitText from "../components/FitGameQuestionText"
import { useEffect, useState } from "react"
import { ImageModal } from "../components/ImageModal"
import { RoundResults } from "../components/RoundResults"
import { useAuth } from "../contexts/UserContext"

export const GameScreen = () => {
    const { user } = useAuth()
    const { roomInfo, gamePhase, answeredCount, currentQuestionIdx, currentQuestion, currentChoice, currentAnswerID, currentScores, setCurrentChoice, SendMessage, closeWS, serverNow } = useRoomProvider()
    const bg = ["bg-sky-600", "bg-red-600", "bg-amber-400", "bg-emerald-600"]
    const [imageOpen, setImageOpen] = useState(false)
    const [selectedImage, setSelectedImage] = useState(null)
    const [timeLeftQuestion, setTimeLeftQuestion] = useState(null)

    useEffect(() => {
        if (!currentQuestion?.ends_at) return
        const tick = () => {
            const remaining = Math.max(0, currentQuestion?.ends_at - serverNow())
            setTimeLeftQuestion(Math.ceil(remaining/1000))
            if (remaining < 0){
                clearInterval(interval)
            }
        }
        tick()
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval)
    }, [currentQuestion?.ends_at])

    const HandleSubmitAnswer = (choice_id) => {
        setCurrentChoice(choice_id)
        SendMessage("submit_answer", {"answer_choice_id": choice_id, "question_index": currentQuestionIdx})
    }

    const HandleImageZoom = (e, image) => {
        e.stopPropagation()
        setImageOpen(true)
        setSelectedImage(image)
    }

    return (
        <>
            {
                gamePhase === 'question' ?
                    <div className="flex flex-col gap-8 md:gap-4 w-full min-h-screen bg-linear-to-r from-[#ff9966] to-[#ff5e62] overflow-y-auto hide-scrollbar">
                        {/* check gamePhase. if it is question then render */}
                        <div className="bg-orange-500 p-2 lg:p-4 text-white flex items-center justify-between">
                            <div className="hover:cursor-text font-semibold md:text-xl lg:text-3xl">
                                {`${roomInfo?.room_code}`}
                            </div>
                            <div className="flex gap-4 md:gap-8 text-sm md:text-lg lg:text-2xl">
                                <div className="flex items-center gap-0.5">
                                    <Users fill="white" />
                                    <span>
                                        {`${roomInfo?.participants?.length}`}
                                    </span>
                                </div>
                                {/* if host id === user_id */}
                                {
                                    roomInfo?.host_id === user?.id &&
                                        <button type="button" onClick={() => SendMessage("end_early")} className="hover:cursor-pointer bg-red-500 flex items-center font-semibold gap-0.5 p-1.5 lg:p-3 rounded-lg lg:rounded-xl">
                                            <LogOut />
                                            <span>End Room</span>
                                        </button>
                                }
                            </div>
                        </div>
                        <div className="flex flex-col px-3 md:px-10 gap-5">
                            {/* check if there is text then render */}
                            <FitText className="bg-white rounded-lg font-semibold p-7 h-50 md:h-40 lg:h-50 w-full overflow-hidden" startFontSize={20}>
                                {`${currentQuestion?.prompt}`}
                            </FitText>
                            {/* check if there is image then render */}
                            {
                                currentQuestion?.prompt_url &&
                                    <div className="flex justify-center h-50 md:h-60 lg:h-70 hover:cursor-pointer" onClick={(e) => HandleImageZoom(e, `${currentQuestion?.prompt_url}`)}>
                                        <img src={`${currentQuestion?.prompt_url}`} className="hover:cursor-zoom-in w-full md:w-1/2 lg:w-3/4 h-full object-cover" alt="image of card term" />
                                    </div>
                            }
                        </div>
                        <div className="flex flex-col gap-2 p-2 md:px-10">
                            <div className="flex justify-between items-center font-bold text-2xl lg:text-4xl text-white">
                                <div className="bg-orange-600 flex justify-center items-center rounded-full py-4 px-4 lg:px-7 lg:py-7">
                                    {`${timeLeftQuestion}`}
                                </div>
                                <div className="bg-orange-600 flex justify-center items-center rounded-full py-4 px-4 lg:px-7 lg:py-7">
                                    {`${answeredCount}`}
                                </div>
                            </div>
                            <div className="flex justify-end text-white lg:text-2xl font-semibold">
                                <span className="bg-orange-600 py-1 px-2 lg:px-3 lg:py-3 rounded-2xl">{`answers`}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-1 md:px-6 lg:px-10 pb-6">
                            {
                                currentQuestion?.choices?.map((choice, index) => (
                                    <button key={index} type="button" disabled={currentChoice} onClick={() => HandleSubmitAnswer(choice.choice_id)} className={`${bg[index % 4]} ${currentChoice && currentChoice === choice.choice_id ? 'opacity-100 ring-4 ring-white' : 'opacity-80'} transition-opacity duration-200 hover:cursor-pointer h-20 flex items-center gap-1 lg:gap-2 p-4 rounded-xl text-white`}>
                                        {/* replace icon with image url of choice if it exists */}
                                        {
                                            choice?.choice_url && 
                                                <div className="w-12 h-12">
                                                    <img src={choice?.choice_url} onClick={(e) => HandleImageZoom(e, choice?.choice_url)} className="hover:cursor-zoom-in w-full h-full object-cover" alt="image of option" />
                                                </div>
                                        }
                                        <FitText className="flex-1 min-w-0 flex items-center h-full font-semibold" startFontSize={20}>
                                            {`${choice?.choice}`}
                                        </FitText>
                                    </button>
                                ))
                            }
                        </div>
                        {
                            imageOpen && <ImageModal image={selectedImage} setImageOpen={setImageOpen} />
                        }
                    </div>
                :
                    (
                        gamePhase === 'round_results' &&
                            <RoundResults />
                    )
            }
        
        </>
    )
}