const CompactFormatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
})

export const CompartNumber = (num) => {
    return CompactFormatter.format(num).toLowerCase()
}