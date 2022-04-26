export default class StringUtilities {
    // Shamelessly copied from StackOverflow https://stackoverflow.com/a/64296576
    static split(input: string, separator: RegExp, limit?: number): string[] {
        separator = new RegExp(separator, "g")
        limit = limit ?? -1

        const output = []
        let finalIndex = 0
        while (limit--) {
            const lastIndex = separator.lastIndex
            const search = separator.exec(input)
            if (search === null) {
                break
            }
            finalIndex = separator.lastIndex
            output.push(input.slice(lastIndex, search.index))
        }

        output.push(input.slice(finalIndex))
        return output
    }
}