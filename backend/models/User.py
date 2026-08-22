from config import USERS_PATH

from pandas import read_csv
from hashlib import sha256

global USERS
USERS = read_csv(USERS_PATH, index_col=['Unnamed: 0'])


class User:

    def __init__(self):
        self.username = None
        self.password = None
        self.user_is_admin = False

    def login(self, username: str, password: str):
        for _, user in USERS.iterrows():
            pw = sha256(password.encode('utf-8')).hexdigest()
            if user.username == username and user.password == pw:
                self.username = username
                self.password = pw
                self.user_is_admin = user.isAdmin
                return True
        return False

    def sign_up(self, username: str, password: str):
        global USERS
        pw = sha256(password.encode('utf-8')).hexdigest()
        if not self.is_registered(username):
            USERS = USERS.append({'username': username, 'password': pw, 'isAdmin': False}, ignore_index=True)
            USERS.to_csv(USERS_PATH, index=True)
            self.username = username
            self.password = pw
            self.user_is_admin = False
            return True
        else:
            return False

    @staticmethod
    def is_registered(username: str):
        for _, user in USERS.iterrows():
            if user.username == username:
                return True
        return False

    def delete(self, username: str):
        if not self.is_admin:
            return False
        else:
            for index, row in USERS.iterrows():
                if row.username == username:
                    USERS.drop(index=index, inplace=True)
                    USERS.to_csv(USERS_PATH, index=True)
                    return True
            return False

    def read_user_list(self):
        return USERS.loc[USERS["username"] != self.username,"username"].tolist()


    def logout(self):
        self.username = None
        self.password = None
        self.user_is_admin = False
        return True

    def get_username(self):
        return self.username

    def is_admin(self):
        return self.user_is_admin

    def is_user(self):
        return not self.user_is_admin

    def is_logged(self):
        if self.username is None and self.password is None:
            return False
        else:
            return True
