import { Home, Layers, Menu, Search, X, RotateCcwIcon, Trophy, LogIn, UserPlus, Plus, Gamepad2, Settings } from "lucide-react"
import { useState } from "react"
import { useAuth } from "../contexts/UserContext"
import { useNavigate } from "react-router-dom"

export const Sidebar = () => {
    const { user, isLoading } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const navigate = useNavigate()
    const openOverlay = "pointer-events-auto opacity-10"
    const closeOverlay = "pointer-events-none opacity-0"
    return (
        <div>
            <button className="cursor-pointer" onClick={() => setIsOpen((prev) => !prev)}>
                {isOpen ? <X /> : <Menu />}
            </button>
            {/*overlay*/}
            <div className={`fixed top-0 left-0 w-screen h-screen bg-gray-400 z-999 transition-opacity duration-1000 ${isOpen ? openOverlay : closeOverlay}`} onClick={() => setIsOpen(false)} />
            {/*actual sidebar */}
            <div className={`${isOpen ? 'translate-x-0': '-translate-x-full'} transform transition-transform duration-300 flex flex-col p-4 fixed top-0 left-0 md:w-60 lg:w-75 h-screen bg-sky-700 z-999 text-white`}>
                <div className="flex justify-between items-center">
                    <div className="hover:cursor-pointer text-xl mr-10 sm:mr-0 sm:text-2xl font-bold" onClick={() => setIsOpen(false)}>DeckMate</div>
                    <button className="cursor-pointer" onClick={() => setIsOpen(false)}><X size={30} color="white"/></button>
                </div>
                {/*home and discover*/}
                <div className="flex flex-col gap-5.5 py-4 border-b border-slate-100">
                    <div className="flex items-center hover:cursor-pointer gap-3 lg:w-3/4" onClick={() => navigate(`/`)}>
                        <Home />
                        <div>Home</div>
                    </div>
                    <div className="flex items-center hover:cursor-pointer gap-3 lg:w-3/4">
                        <Search />
                        <div>Discover</div>
                    </div>
                </div>
                {/*create deck and room & hidden for non logged-in users*/}
                {
                    (!isLoading && user) && (
                        <div className="flex flex-col gap-5.5 py-4 border-b border-slate-100">
                            <div className="flex items-center hover:cursor-pointer gap-3 lg:w-3/4">
                                <Plus />
                                <div>Create Deck</div>
                            </div>
                            <div className="flex items-center hover:cursor-pointer gap-3 lg:w-3/4">
                                <Gamepad2 />
                                <div>Start Room</div>
                            </div>
                        </div>
                    )
                }
                {/*login and signup for non logged-in users & Your stuff for logged-in users*/}
                <div className="py-4 border-b border-slate-100">
                    {
                        (!isLoading && user) ? 
                            <div className="flex flex-col gap-5.5">
                                <div className="flex items-center hover:cursor-pointer gap-3 lg:w-3/4">
                                    <Layers />
                                    <div>My Decks</div>
                                </div>
                                <div className="flex items-center hover:cursor-pointer gap-3 lg:w-3/4">
                                    <RotateCcwIcon />
                                    <div>Study History</div>
                                </div>
                                <div className="flex items-center hover:cursor-pointer gap-3 lg:w-3/4">
                                    <Trophy />
                                    <div>My Rooms</div>
                                </div>
                            </div>
                        :
                            <div className="flex flex-col gap-5.5">
                                <div className="flex items-center hover:cursor-pointer gap-3 lg:w-3/4">
                                    <LogIn />
                                    <div>Log in</div>
                                </div>
                                <div className="flex items-center hover:cursor-pointer gap-3 lg:w-3/4">
                                    <UserPlus />
                                    <div>Sign up</div>
                                </div>
                            </div>
                    }

                </div>
                {/*settings*/}
                {
                    (!isLoading && user) && (
                        <div className="flex flex-col gap-5.5 py-4">
                            <div className="flex items-center hover:cursor-pointer gap-3 lg:w-3/4">
                                <Settings />
                                <div>Settings</div>
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    )
}