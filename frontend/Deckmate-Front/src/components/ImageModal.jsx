export const ImageModal = ({ image, setImageOpen }) => {
    return (
        <div className="fixed bg-black/40 inset-0 z-55 w-screen h-screen flex justify-center items-center" onClick={() => setImageOpen(false)}>
            <img src={image} className="w-[80vw] h-[80vh]" onClick={(e) => e.stopPropagation()}/>
        </div>
    )
}