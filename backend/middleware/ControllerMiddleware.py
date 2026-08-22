from models.User import User

from rdflib import URIRef
import re


class UserAlreadyLoggedException(Exception):
    pass


class UserNoLoggedException(Exception):
    pass


class UserAlreadyExistsException(Exception):
    pass


class UserNotExistsException(Exception):
    pass


class PasswordNotMatchesException(Exception):
    pass


class UnauthorizedException(Exception):
    pass


class ItemIsNotUrirefException(Exception):
    pass


class InvalidUsernameException(Exception):
    pass


def user_already_logged(user: User):
    if user.is_logged():
        raise UserAlreadyLoggedException('Another user is currently logged')


def user_not_logged(user: User):
    if not user.is_logged():
        raise UserNoLoggedException('Please login first')


def user_already_registered(username: str):
    if User.is_registered(username):
        raise UserAlreadyExistsException(f'User: {username} already exists')


def user_not_registered(username: str):
    if not User.is_registered(username):
        raise UserNotExistsException(f'User: {username} not found')


def username_is_valid(username: str):
    cleaned = re.sub(r"[^A-Za-z]+", '', username)
    if cleaned != username:
        raise InvalidUsernameException('Invalid username inserted')


def password_not_matches(password: str, confirm: str):
    if password != confirm:
        raise PasswordNotMatchesException('Passwords not match')


def user_not_admin(user: User):
    if not user.is_admin():
        raise UnauthorizedException(f'User: {user.get_username()} is not authorized to perform this action')


def item_is_not_uriref(name: str, parsed: str | URIRef):
    if not isinstance(parsed, URIRef):
        raise ItemIsNotUrirefException(f'The identifier: {name} does not match any item')
