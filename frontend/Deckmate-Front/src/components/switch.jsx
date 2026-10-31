export const Switch = ({ className, isOn, HandleToggle }) => {

    return (
        <div onClick={HandleToggle} className={`${className} ${isOn ? 'bg-green-600' : 'bg-gray-600'} hover:cursor-pointer flex rounded-full transition-all duration-200 z-20`}>
            <span className={`${isOn ? 'translate-x-full' : 'translate-x-0'} transform w-1/2 h-full bg-white rounded-full transition-all duration-200 `} />
        </div>
    )
}