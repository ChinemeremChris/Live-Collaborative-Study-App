import { useState } from "react"
import { LockOpen } from 'lucide-react'
import { useMutation } from "@tanstack/react-query"
import toast from 'react-hot-toast'
import { useNavigate } from "react-router-dom"


export const SignUp = () => {
    const [fname, setFname] = useState('')
    const [lname, setLname] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const navigate = useNavigate()

    const SubmitSignUp = async ({ fname, lname, email, password }) => {
        const api_url = import.meta.env.VITE_API_URL
        const response = await fetch(`${api_url}/auth/register`, {
            method: "POST",
            body: JSON.stringify({
                fname: fname,
                lname: lname,
                email: email,
                password: password
            }),
            headers: {
                "Content-Type": "application/json"
            }
        })

        if (!response.ok){
            if (!response.ok) {
                const error = await response.json()
                
                if (response.status === 400) {
                    if (error.detail?.code === 'REGISTER_INVALID_PASSWORD') {
                        throw new Error(error.detail.reason)
                    }
                    if (error.detail === 'REGISTER_USER_ALREADY_EXISTS') {
                        throw new Error('An account with this email already exists')
                    }
                    throw new Error('Registration failed')
                }
                if (response.status === 422) {
                    const messages = error.detail.map(e => e.msg).join(', ')
                    throw new Error(messages)
                }
                if (response.status === 500) {
                    throw new Error('Server error — please try again later')
                }
                
                throw new Error(error.detail || 'Something went wrong')
            }
            return response.json()
        }

        return response.json()
    }

    const {
            mutate, 
            isPending, 
        } = useMutation({ mutationFn: SubmitSignUp, 
            onError: (error) => {
                toast.error(error.message)
            }, 
            onSuccess: () => {
                navigate('/login')
            }
        })

    const HandleSubmit = async () => {
        if (!fname.trim()){
            toast.error('First name needed')
            return
        }
        if (!lname.trim()){
            toast.error('Last name needed')
            return
        }
        if (!email.trim()){
            toast.error('Email address required')
            return
        }
        if (!email.includes('@')){
            toast.error('Enter a valid email')
            return
        }
        if (password.length < 8){
            toast.error('Password needs at least 8 characters')
            return
        }

        mutate({fname, lname, email, password})
    }

    const HandleGoogleSignUp = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/google/authorize`, {
            "method": "GET",
            "credentials":"include"
        })
        if (!response.ok){
            const error = await response.json()
            toast.error(error.detail || "Error continuing with google")
            return
        }
        const result = await response.json()
        window.location.href = result.authorization_url
    }

    return (
        <div className="bg-five flex h-screen justify-center items-center bg-cover bg-center bg-no-repeat" >
            <div className="flex flex-row justify-center items-center h-screen w-full x112:h-10/12 x112:w-9/12 rounded-xl border-0 shadow-2xl">
                {/* left panel */}
                <div className="hidden x112:block x112:w-1/2 x112:h-full">
                    <img src={import.meta.env.VITE_SIGNUP_IMAGE} alt="signup-image" className="w-full h-full object-cover rounded-tl-xl rounded-bl-xl"/>
                </div>
                {/* right panel*/}
                <div className="flex flex-col justify-evenly items-center p-10 rounded-xl bg-white h-full w-full x112:w-1/2 x112:h-full x112:rounded-tl-none x112:rounded-bl-none">
                    {/* top */}
                    <div className="text-right text-lg text-slate-400 w-full">
                        <div>Already have an account?</div>
                        <div className="flex flex-row gap-2 text-slate-800 text-lg font-bold justify-end hover:cursor-pointer" onClick={() => navigate("/login")}>
                            <div><LockOpen /></div>
                            <div>LOGIN</div>
                        </div>
                    </div>
                    <div className="text-left text-3xl font-extrabold flex justify-start w-full">SIGN UP</div>
                    <div className="flex flex-col gap-4 w-full">
                        <input type="text" className="text-xl py-2 pl-0 pr-2 border-b-2 font-bold focus:outline-none" value={fname} placeholder="First Name" onChange={(e) => setFname(e.target.value)} />
                        <input type="text" className="text-xl py-2 pl-0 pr-2 border-b-2 font-bold focus:outline-none" value={lname} placeholder="Last Name" onChange={(e) => setLname(e.target.value)} />
                        <input type="email" className="text-xl py-2 pl-0 pr-2 border-b-2 font-bold focus:outline-none" value={email} placeholder="Email Address" onChange={(e) => setEmail(e.target.value)} />
                        <input type="password" className="text-xl py-2 pl-0 pr-2 border-b-2 font-bold focus:outline-none" value={password} placeholder="CHOOSE A PASSWORD" onChange={(e) => setPassword(e.target.value)} />
                        <div className="flex flex-row justify-center">
                            <button className={`${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} font-poppins bg-blue-900 text-xl font-semibold text-white p-3 rounded-lg w-64 x12:w-3/4`} disabled={isPending} onClick={HandleSubmit}>{isPending ? 'SIGNING UP...' : 'SIGN UP'}</button>
                        </div>
                    </div>
                    <div className="flex my-6 items-center w-64 x112:w-3/4">
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