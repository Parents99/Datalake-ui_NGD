from os.path import isfile
from datetime import datetime


class Log:
    def __init__(self, path: str):
        self.log = open(path, 'a') if isfile(path) else open(path, 'w')

    def add_row(self, message):
        self.log.write(f'{datetime.now()}: {message}.\n')

    def close(self):
        self.log.close()
