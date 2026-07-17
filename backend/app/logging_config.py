import logging
import sys
import io


def setup_logging(level: str = "INFO") -> None:
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Use UTF-8 wrapped stdout to handle unicode characters (e.g. → arrows)
    # on Windows terminals that default to cp1252
    try:
        utf8_stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    except AttributeError:
        utf8_stdout = sys.stdout  # Already wrapped or not a buffer stream

    handler = logging.StreamHandler(utf8_stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
