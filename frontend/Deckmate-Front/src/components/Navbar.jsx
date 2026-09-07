import { Menu, Plus, SearchIcon } from "lucide-react"
import { useAuth } from "../contexts/UserContext"
import { Searchbar } from "./Searchbar"
import { Sidebar } from "./Sidebar"
import { useNavigate } from "react-router-dom"

export const Navbar = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    return (
        <nav>
            {/* Mobile + tablet (below lg) */}
            <div className="lg:hidden flex flex-col px-1 py-3 gap-2">
                <div className="w-full flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Sidebar />
                        <span className="text-xl font-bold text-sky-800 hover:cursor-pointer">DeckMate</span>
                    </div>
                    {
                        user ?
                                <div className="flex gap-5 shrink-0">
                                    <button><Plus /></button>
                                    <div className="flex justify-center items-center w-10 h-10 bg-sky-700 text-white rounded-full border-2 font-bold text-lg">{user.fname[0]?.toUpperCase()}</div>
                                </div>
                            :
                                <div className="flex gap-2 text-sm">
                                    <button className="px-3 py-2 text-slate-500 rounded-2xl hover:bg-slate-200 hover:cursor-pointer" onClick={() => navigate("/login")}>Log in</button>
                                    <button className="px-3 py-2 text-white rounded-3xl bg-sky-800 hover:cursor-pointer" onClick={() => navigate("/signup")}>Sign up</button>
                                </div>
                    }
                </div>
                <Searchbar className="w-full" />
            </div>

            {/* Desktop (lg and above) */}
            <div className="hidden lg:flex flex-row justify-between items-center px-3 py-3 gap-4">
                <div className="flex items-center gap-5 shrink-0">
                    <Sidebar />
                    <span className="text-xl font-bold text-sky-800 hover:cursor-pointer" onClick={() => navigate("/")}>DeckMate</span>
                </div>
                <Searchbar className="flex-1 mx-4" />
                {
                    user ?
                            <div className="flex gap-5 shrink-0">
                                <button><Plus /></button>
                                <div className="flex justify-center items-center w-10 h-10 bg-sky-700 text-white rounded-full border-2 font-bold text-lg">{user.fname[0]?.toUpperCase()}</div>
                            </div>
                        :
                            <div className="flex gap-5 text-sm shrink-0">
                                <button className="px-3 py-2.5 text-slate-500 rounded-2xl hover:bg-slate-200 hover:cursor-pointer" onClick={() => navigate("/login")}>Log in</button>
                                <button className="px-3 py.5 text-white rounded-3xl bg-sky-800 hover:cursor-pointer" onClick={() => navigate("/signup")}>Sign up</button>
                            </div>
                    }
            </div>
        </nav>
    )
}