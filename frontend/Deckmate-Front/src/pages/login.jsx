import { useMutation, useQuery } from "@tanstack/react-query"
import { UserPlus } from "lucide-react"
import { useState } from "react"
import toast from "react-hot-toast"
import { useNavigate } from "react-router-dom"

export const Login = () =>{
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const navigate = useNavigate()

    const HandleLogin = async ({ email, password }) => {
        try{
            const api_url = import.meta.env.VITE_API_URL
            const response = await fetch(`${api_url}/auth/jwt/login`, {
                method: "POST",
                body: new URLSearchParams({
                    username: email,
                    password: password
                }),
                credentials: "include",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            })
            if (!response.ok){
                const error = await response.json()
                if (response.status === 400){
                    throw new Error("Wrong username or password")
                }
                if (response.status === 422){
                    const err = error.detail.map(e => e.msg).join(', ')
                    throw new Error(err)
                }
                throw new Error('Login failed')
            }
            if (response.status === 204){
                return null
            }
            return response.json()
        }catch(error){
            if (error instanceof TypeError){
                throw new Error ("Unable to connect to server")
            }
            throw error
        }
    }

    const HandleSubmit = async () => {
        if (!email.trim()){
            toast.error("Enter valid username")
            return
        }
        if (!(email.includes('@'))){
            toast.error("Enter valid email")
            return
        }
        if (!password.trim()){
            toast.error("Enter valid password")
            return
        }
        if (password.length < 8){
            toast.error("Password must be at least 8 characters")
            return
        }
        mutate({email, password})
    }

    const HandleGoogleSignUp = async () => {
        try{
            const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/google/authorize`, {
                method: "GET",
                credentials:"include"
            })
            if (!response.ok){
                const error = await response.json()
                toast.error(error.detail || "Error continuing with google")
                return
            }
            const result = await response.json()
            console.log(result.authorization_url)
            window.location.href = result.authorization_url
        }catch(error){
            if (error instanceof TypeError){
                toast.error("Unable to connect to server")
            }else{
                toast.error(error.message || "Error continuing with google")
            }
        }
    }

    const {
        mutate,
        isPending
    } = useMutation({
        mutationFn: HandleLogin,
        onSuccess: () => {
            console.log("success")
            navigate("/")
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })

    return (
        <div className="bg-five flex h-screen justify-center items-center bg-cover bg-center bg-no-repeat" >
            <div className="flex flex-row justify-center items-center h-screen w-full x112:h-10/12 x112:w-9/12 rounded-xl border-0 shadow-2xl">
                {/* left panel */}
                <div className="hidden x112:block x112:w-1/2 x112:h-full">
                    <img src={import.meta.env.VITE_LOGIN_IMAGE} alt="login-image" className="w-full h-full object-cover rounded-tl-xl rounded-bl-xl"/>
                </div>
                {/* right panel*/}
                <div className="flex flex-col justify-evenly items-center p-10 rounded-xl bg-white h-full w-full x112:w-1/2 x112:h-full x112:rounded-tl-none x112:rounded-bl-none">
                    {/* top */}
                    <div className="text-right text-lg text-slate-400 w-full">
                        <div>Do not have an account?</div>
                        <div className="flex flex-row gap-2 text-slate-800 text-lg font-bold justify-end hover:cursor-pointer" onClick={() => navigate("/signup")}>
                            <div><UserPlus /></div>
                            <div>CREATE ACCOUNT</div>
                        </div>
                    </div>
                    <div className="text-left text-3xl font-extrabold flex justify-start w-full">LOGIN</div>
                    <div className="flex flex-col gap-10 w-full">
                        <input type="email" className="text-xl py-2 pl-0 pr-2 border-b-2 font-bold focus:outline-none" value={email} placeholder="Username" onChange={(e) => setEmail(e.target.value)} />
                        <input type="password" className="text-xl py-2 pl-0 pr-2 border-b-2 font-bold focus:outline-none" value={password} placeholder="Enter password" onChange={(e) => setPassword(e.target.value)} />
                        <div className="flex flex-row justify-center">
                            <button className={`${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} font-poppins bg-blue-900 text-xl font-semibold text-white p-3 rounded-lg w-64 x12:w-3/4`} disabled={isPending} onClick={HandleSubmit}>{isPending ? 'LOGGING IN...' : 'LOGIN'}</button>
                        </div>
                    </div>
                    <div className="flex my-2 items-center w-64 x112:w-3/4">
                        <div className="h-px bg-slate-300 flex-1"></div>
                        <div className="mx-4 text-slate-500">or</div>
                        <div className="h-px bg-slate-300 flex-1"></div>
                    </div>
                    <button className="flex flex-row justify-center gap-1 border-stone-600 border p-3 rounded-lg cursor-pointer w-64 x12:w-3/4" onClick={HandleGoogleSignUp}>
                        <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" width="20" height="20"/>
                        <div>CONTINUE WITH GOOGLE</div>
                    </button>
                </div>
            </div>
        </div>
    )
}