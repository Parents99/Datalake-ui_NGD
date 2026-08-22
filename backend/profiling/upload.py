from os import listdir, makedirs, remove
from os.path import exists, isfile, join

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from config import MOUNT_DIR
from models.Log import Log


def get_safe_csv_filename(filename: str):
    safe_filename = secure_filename(filename)

    if safe_filename == '':
        return None, 'Empty file name'

    if '.' not in safe_filename or safe_filename.rsplit('.', 1)[1].lower() != 'csv':
        return None, 'Invalid input file format; supported ones are: csv'

    return safe_filename, None


def upload(source: FileStorage, username: str, log: Log):
    filename, error = get_safe_csv_filename(source.filename)
    if error is not None:
        log.add_row(error)
        return error, 400

    user_dir = join(MOUNT_DIR, username, '')
    log.add_row('Looking for user upload folder..')
    makedirs(user_dir, exist_ok=True)

    source_path = join(user_dir, filename)
    if exists(source_path):
        message = f'The source: {filename} has already been uploaded'
        log.add_row(message)
        return message, 409

    log.add_row(f'Uploading file "{filename}"..')
    source.save(dst=source_path)

    message = f'The source: {filename} has been uploaded'
    log.add_row(message)
    return message, 201


def get_uploads(username: str, log: Log):
    user_dir = join(MOUNT_DIR, username, '')
    log.add_row('Getting uploaded sources..')

    if not exists(user_dir):
        return [], 200

    sources = sorted(
        filename for filename in listdir(user_dir)
        if isfile(join(user_dir, filename)) and filename.lower().endswith('.csv')
    )
    log.add_row(f'Found {len(sources)} uploaded sources')
    return sources, 200


def delete_upload(filename: str, username: str, log: Log):
    safe_filename, error = get_safe_csv_filename(filename)
    if error is not None or safe_filename != filename:
        message = error if error is not None else f'Invalid file name: {filename}'
        log.add_row(message)
        return message, 400

    source_path = join(MOUNT_DIR, username, safe_filename)
    if not isfile(source_path):
        message = f'Uploaded source not found: {safe_filename}'
        log.add_row(message)
        return message, 404

    log.add_row(f'Deleting uploaded source "{safe_filename}"..')
    remove(source_path)

    message = f'The uploaded source: {safe_filename} has been deleted'
    log.add_row(message)
    return message, 200
