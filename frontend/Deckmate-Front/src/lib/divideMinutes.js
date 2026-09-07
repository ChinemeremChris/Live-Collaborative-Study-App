export const divideMinutes = (minutes, operand) => {
    const result = minutes / operand
    if (result < 1){
        return `${Math.floor(result * 60)}s`
    }else{
        return `${Math.floor(result)}m`
    }
}