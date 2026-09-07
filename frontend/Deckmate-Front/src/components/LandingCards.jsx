import { useNavigate } from "react-router-dom"

export const LandingCards = ({ card_title, image_url, color }) => {
    const navigate = useNavigate()
    return (
        <div className={`${color} transition-transform ease-in-out duration-200 hover:scale-105 hover:cursor-pointer flex flex-col shrink-0 justify-between w-60 h-70 sm:w-80 sm:h-100 rounded-2xl`} onClick={() => navigate("/signup")}>
            {/*title*/}
            <div className="text-lg sm:text-2xl text-center font-semibold p-4 h-1/4">
                {`${card_title}`}
            </div>
            {/*image container*/}
            <div className="flex items-center bg-white rounded-tl-2xl rounded-br-xl pl-2 pt-2 ml-auto w-5/6 h-3/4">
                <img src={`${image_url}`} alt="landing card" className="object-cover w-full" />
            </div>
        </div>
    )
}