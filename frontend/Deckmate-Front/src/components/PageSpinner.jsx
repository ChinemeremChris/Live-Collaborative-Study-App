export const PageSpinner = ({ message }) => {
    return (
        <div className="flex flex-col items-center justify-center h-screen gap-1">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-800 border-t-transparent" />
            <div className="text-2xl">{message}</div>
        </div>
    )
}