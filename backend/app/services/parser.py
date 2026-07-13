#get text
#split text into paragraphs called blocks (as in there is a whole line of empty space between each block)
#a block can have multiple lines
#for each block, you check if you parse through symbols, Q/A, One line term and the other definition
def ParseText(raw_text: str) -> dict:
    blocks = [b.strip() for b in raw_text.split("\n\n") if b.strip()] #split each paragraph
    parsers = [QAParse, SeparatorParse, TwoLineParse]
    parsed_cards = []
    unparsed_lines = []
    for block in blocks:
        result = None
        for parser in parsers:
            result = parser(block)
            if result:
                break
        if result:
            parsed_cards += result
        else:
            unparsed_lines.append(block)
    return {
        "parsed_cards": parsed_cards,
        "unparsed_lines": unparsed_lines,
        "unparsed_count": len(unparsed_lines)
    }

#assume Q: in one line and A: in another line with multiples Q/As
def QAParse(block: str):
    lines = block.split("\n")
    pairs = []
    if len(lines) < 2:
        return pairs 
    for i in range(0, len(lines)-1, 2):
        if not lines[i].startswith(("Q:", "Q.", "Question")):
            return pairs
        if not lines[i+1].startswith(("A:", "A.", "Answer")):
            return pairs
        pairs.append({"term": lines[i].split(":", 1)[1].strip(), "definition": lines[i+1].split(":", 1)[1].strip()})
    return pairs

def SeparatorParse(block: str):
    separators = [":", " - ", "—", "\t"]
    lines = block.split("\n")
    parsed = []
    for line in lines:
        # score = 0
        term, definition = None, None
        for separator in separators:
            if separator in line:
                parts = line.split(separator, 1)
                term, definition = parts[0].strip(), parts[1].strip()
                # score += 1
                break
        # if term and len(term) > 50:
        #     score -= 1
        # if definition and len(definition) < 10:
        #     score -= 1
        # if term and definition and 1 <= len(definition)/len(definition) <= 15:
        #     score += 1
        if term and definition:
            parsed.append({"term": term, "definition": definition})
    return parsed if parsed else None

def TwoLineParse(block: str):
    lines = block.split("\n", 1)
    if len(lines) < 2:
        return None
    term = lines[0].strip()
    definition = lines[1].strip()
    return [{"term": term, "definition": definition}]
