from pathlib import Path

from fastmcp import FastMCP


DEFAULT_WORD_COUNT = 30
MAX_WORD_COUNT = 100
SOURCE_PATH = Path(__file__).resolve().parent / "lorem-ipsum.md"

mcp = FastMCP("custom-lorem")


def load_words() -> list[str]:
    """Load the source text and split it using whitespace tokenization."""
    return SOURCE_PATH.read_text(encoding="utf-8").split()


def validate_word_count(word_count: int, available_words: int) -> int:
    """Validate the requested word count against the homework contract."""
    if word_count <= 0:
        raise ValueError("word_count must be greater than 0")
    if word_count > MAX_WORD_COUNT:
        raise ValueError(f"word_count must be less than or equal to {MAX_WORD_COUNT}")
    if word_count > available_words:
        raise ValueError(
            f"word_count must be less than or equal to the available word count ({available_words})"
        )
    return word_count


def get_excerpt(word_count: int = DEFAULT_WORD_COUNT) -> str:
    """Return exactly the requested number of words from the source file."""
    words = load_words()
    validated_count = validate_word_count(word_count, len(words))
    return " ".join(words[:validated_count])


@mcp.resource("lorem://content{?word_count}")
def lorem_content(word_count: int = DEFAULT_WORD_COUNT) -> str:
    """Read lorem ipsum content from the resource URI."""
    return get_excerpt(word_count)


@mcp.tool(annotations={"readOnlyHint": True})
def read(word_count: int = DEFAULT_WORD_COUNT) -> str:
    """Read lorem ipsum content with an exact word limit."""
    return get_excerpt(word_count)


if __name__ == "__main__":
    mcp.run()
