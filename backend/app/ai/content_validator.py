from app.ai.response_parser import response_parser, ResponseParser

content_validator = response_parser
ContentValidator = type(ResponseParser)
