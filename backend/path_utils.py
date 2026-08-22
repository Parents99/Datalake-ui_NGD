def get_filename_from_location(location: str):
    normalized_location = location.replace('\\', '/')
    return normalized_location.rsplit('/', 1)[-1]
