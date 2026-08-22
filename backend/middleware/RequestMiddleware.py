import re
from config import MOUNT_DEFAULT_PARAMETERS
from models.User import User


class InvalidConfirmParameter(Exception):
    pass


class InvalidInputParameter(Exception):
    pass


class UnauthorizedAction(Exception):
    pass


def check_mount_params(key: str, value: str | None):
    if value is None:
        return MOUNT_DEFAULT_PARAMETERS[key]

    if key == 'maxCategories' or key == 'frequentWords':
        try:
            value = int(value)
            return value
        except ValueError:
            raise InvalidInputParameter(f'Invalid value: {value} for parameter: {key}')

    if key == 'dateThreshold':
        try:
            value = float(value)
        except ValueError:
            raise InvalidInputParameter(f'Invalid value: {value} for parameter: {key}')

        if not (0.0 <= value <= 1.0):
            raise InvalidInputParameter(f'Invalid value: {value} for parameter: {key}')

        return value




def check_confirm(key: str, value: str):
    allowed = ['true', 'yes', 'y', '1', 't']
    not_allowed = ['false', 'no', 'n', '0', 'f']
    if value is not None:
        confirm = value.lower()
    if value is None or confirm in not_allowed:
        return False
    elif confirm in allowed:
        return True
    else:
        raise InvalidConfirmParameter(f'Invalid value: {value} for parameter: {key}')


def check_empty_or_none_item(key: str, value: str, optional: bool = False):
    if optional:
        return value
    else:
        if value is None or value == '':
            raise InvalidInputParameter(f'Missing input for parameter: {key}')
        else:
            return value


def check_empty_or_none_list(key: str, value: list, optional: bool = False):
    if optional:
        return value
    else:
        if value is None:
            raise InvalidInputParameter(f'Missing input for parameter: {key}')
        elif len(value) == 0:
            raise InvalidInputParameter(f'Empty input for parameter: {key}')
        else:
            return value


def check_list_has_two_items(items: list):
    if len(set(items)) != 2:
        raise InvalidInputParameter('The size of input list must be two')
    else:
        return items


def check_query_body(text: str):
    filtered_text = re.sub('\s+', ' ', text)
    if isinstance(filtered_text, str) and filtered_text != '' and filtered_text.startswith('SELECT'):
        return filtered_text
    else:
        raise InvalidInputParameter('Invalid input query')


def check_privileges(user: User):
    if not user.is_admin():
        raise UnauthorizedAction(f'User: {user} is not authorized to perform this action')
