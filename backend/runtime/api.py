import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import MG_PATH, KG_PATH, LOG_DIR
from controller.Controller import Controller
from middleware import RequestMiddleware, ControllerMiddleware
from models.Log import Log

import json
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request

from profiling.mount import EmptyFileException

log = None
controller = None


def to_json(data):
    def to_serializable(value):
        """JSON serializer for objects not serializable by default"""
        if isinstance(value, np.int64):
            return int(value)
        elif isinstance(value, np.float64):
            return float(value)
        elif isinstance(value, pd.Timestamp):
            return value.strftime('%YYYY-%MM-%DD')

    """Converts Python object to JSON formatted data"""
    return json.loads(json.dumps(data, default=to_serializable))


def init_sdl():
    global log
    global controller
    log = Log(LOG_DIR)
    log.add_row('Starting SDL Framework..')
    log.add_row('Importing knowledge and metadata graphs..')
    controller = Controller(k_graph=KG_PATH, m_graph=MG_PATH)
    log.add_row('Ready')


class MyFlaskApp(Flask):
    def run(self, host=None, port=None, debug=None, load_dotenv=True, **options):
        init_sdl()
        super(MyFlaskApp, self).run(host=host, port=port, debug=debug, load_dotenv=load_dotenv, **options)


app = MyFlaskApp(__name__)


def upload_from_request(username: str | None = None):
    source_file = RequestMiddleware.check_empty_or_none_item('source', request.files.get('source'))
    return controller.upload(source=source_file, log=log, username=username)


def get_uploads(username: str | None = None):
    return controller.get_uploads(log=log, username=username)


def delete_upload(filename: str, username: str | None = None):
    filename = RequestMiddleware.check_empty_or_none_item('filename', filename)
    return controller.delete_upload(filename=filename, log=log, username=username)


def mount_from_request(username: str | None = None):
    remount = RequestMiddleware.check_confirm('remount', request.form.get('remount'))
    uploaded = RequestMiddleware.check_confirm('uploaded', request.form.get('uploaded'))

    if remount and uploaded:
        raise RequestMiddleware.InvalidInputParameter(
            'Parameters remount and uploaded cannot both be true'
        )

    if remount is False and uploaded is False:
        log.add_row('Trying to mount..')
        source_file = RequestMiddleware.check_empty_or_none_item('source', request.files.get('source'))
        source_name = ''
    else:
        source_file = ''
        if remount:
            log.add_row('Trying to remount..')
        else:
            log.add_row('Trying to mount an uploaded source..')
        source_name = RequestMiddleware.check_empty_or_none_item('source', request.form.get('source'))

    date_threshold = RequestMiddleware.check_mount_params('dateThreshold', request.form.get('dateThreshold'))
    max_categories = RequestMiddleware.check_mount_params('maxCategories', request.form.get('maxCategories'))
    string_processing = RequestMiddleware.check_confirm('stringProcessing', request.form.get('stringProcessing'))
    n_frequent_words = RequestMiddleware.check_mount_params('frequentWords', request.form.get('frequentWords'))

    if remount is False and uploaded is False:
        return controller.mount(source=source_file, date_threshold=date_threshold,
                                n_frequent_words=n_frequent_words, max_categories=max_categories,
                                string_processing=string_processing, log=log, username=username)

    if remount:
        return controller.remount(source_name=source_name, date_threshold=date_threshold,
                                  n_frequent_words=n_frequent_words, max_categories=max_categories,
                                  string_processing=string_processing, log=log, username=username)

    return controller.mount_uploaded(source_name=source_name, date_threshold=date_threshold,
                                     n_frequent_words=n_frequent_words, max_categories=max_categories,
                                     string_processing=string_processing, log=log, username=username)


@app.route('/login', methods=['POST'])
def do_login():
    log.add_row('Trying to login..')

    try:
        log.add_row('Converting request parameters..')
        username = RequestMiddleware.check_empty_or_none_item('username', request.form.get('username'))
        password = RequestMiddleware.check_empty_or_none_item('password', request.form.get('password'))

        message, status = controller.login(username, password, log)

    except (RequestMiddleware.InvalidInputParameter,
            ControllerMiddleware.UserAlreadyLoggedException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), status


@app.route('/logout', methods=['GET'])
def do_logout():
    log.add_row('Trying to logout..')

    try:
        message, status = controller.logout(log)

    except ControllerMiddleware.UserNoLoggedException as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), status


@app.route('/signin', methods=['POST'])
def do_signin():
    log.add_row('Trying to signin..')

    try:
        log.add_row('Converting request parameters..')
        username = RequestMiddleware.check_empty_or_none_item('username', request.form.get('username'))
        password = RequestMiddleware.check_empty_or_none_item('password', request.form.get('password'))
        confirm_pw = RequestMiddleware.check_empty_or_none_item('confirmPassword', request.form.get('confirmPassword'))

        message, status = controller.sign_in(username, password, confirm_pw, log)

    except (RequestMiddleware.InvalidInputParameter,
            ControllerMiddleware.UserAlreadyLoggedException,
            ControllerMiddleware.UserAlreadyExistsException,
            ControllerMiddleware.PasswordNotMatchesException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), status


@app.route('/help', methods=['GET'])
def do_help():
    log.add_row('Trying to help..')
    try:
        log.add_row('Converting request parameters..')
        command = RequestMiddleware.check_empty_or_none_item('command', request.args.get('command'))
        if command == 'all':
            message = ('Supported commands: login, logout, help, clean, estimate,'
                       'describe, mount, unmount, profile, sources, upload, uploads, deleteUpload.')

        elif command == 'clean':
            message = {'description': 'Remove all sources from the Metadata layer',
                       'usage': '/clean?all=y|yes|true|t|1|n|no|false|f|0',
                       'method': 'GET'
                       }
        elif command == 'estimate':
            message = {'description': 'Estimate the similarity between two sources',
                       'usage': '/estimate?sources=[name]',
                       'method': 'GET'
                       }
        elif command == 'describe':
            message = {'description': 'Provides the description of the source schema and mappings',
                       'usage': '/describe?source=name',
                       'method': 'GET'
                       }
        elif command == 'mount':
            message = {'description': 'Mount a new source in the Data Lake.',
                       'usage': '/mount',
                       'form': 'source=file|name, remount=y|yes|true|t|1|n|no|false|f|0, '
                               'uploaded=y|yes|true|t|1|n|no|false|f|0, '
                               'string_processing=y|yes|true|t|1|n|no|false|f|0',
                       'method': 'POST'
                       }
        elif command == 'remount':
            message = {'description': 'Remount an existing source in the Data Lake.',
                       'usage': '/remount',
                       'form': 'source=name,'
                               'string_processing=y|yes|true|t|1|n|no|false|f|0',
                       'method': 'POST'
                       }
        elif command == 'profile':
            message = {
                'description': 'Shows the profile of the entire source or the domain,'
                               'with ''rollUp'' shows the aggregated profile.',
                'usage': '/profile?source=name&domain=name&rollUp=y|yes|true|t|1|n|no|false|f|0',
                'method': 'GET'
            }
        elif command == 'sources':
            message = {'description': 'List the sources loaded in the Data Lake.',
                       'usage': '/sources',
                       'method': 'GET'
                       }
        elif command == 'upload':
            message = {'description': 'Upload a CSV source without mounting it.',
                       'usage': '/upload',
                       'form': 'source=file',
                       'method': 'POST'
                       }
        elif command == 'uploads':
            message = {'description': 'List the uploaded sources not yet mounted.',
                       'usage': '/uploads',
                       'method': 'GET'
                       }
        elif command == 'deleteUpload':
            message = {'description': 'Delete an uploaded source not yet mounted.',
                       'usage': '/uploads/<filename>',
                       'method': 'DELETE'
                       }
        elif command == 'unmount':
            message = {'description': 'Unmount the selected source',
                       'usage': '/unmount',
                       'form': 'source: str ',
                       'method': 'POST'
                       }
        elif command == 'logout':
            message = {'description': 'Logout the current user',
                       'usage': '/logout',
                       'method': 'GET'
                       }
        elif command == 'login':
            message = {'description': 'Login the user',
                       'usage': '/login',
                       'form': 'username: str, password: str',
                       'method': 'POST'
                       }
        else:
            message = f'Unrecognized command: {command}'

    except RequestMiddleware.InvalidInputParameter as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), 200


@app.route('/sources', methods=['GET'])
def do_sources():
    log.add_row('Trying to sources..')

    try:
        log.add_row('Converting request parameters..')
        message, status = controller.get_sources(log)

    except (RequestMiddleware.InvalidInputParameter,
            ControllerMiddleware.UserNotExistsException,
            ControllerMiddleware.UnauthorizedException,
            ControllerMiddleware.UserNoLoggedException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), status


@app.route('/upload', methods=['POST'])
def do_upload():
    log.add_row('Trying to upload..')

    try:
        log.add_row('Converting request parameters..')
        message, status = upload_from_request()

    except (RequestMiddleware.InvalidInputParameter,
            ControllerMiddleware.UserNoLoggedException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), status


@app.route('/uploads', methods=['GET'])
def do_uploads():
    log.add_row('Trying to get uploads..')

    try:
        message, status = get_uploads()

    except ControllerMiddleware.UserNoLoggedException as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), status


@app.route('/uploads/<filename>', methods=['DELETE'])
def do_delete_upload(filename):
    log.add_row('Trying to delete upload..')

    try:
        message, status = delete_upload(filename)

    except (RequestMiddleware.InvalidInputParameter,
            ControllerMiddleware.UserNoLoggedException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), status


@app.route('/mount', methods=['POST'])
def do_mount():
    log.add_row('Trying to mount..')

    try:
        log.add_row('Converting request parameters..')
        message, status = mount_from_request()

    except (RequestMiddleware.InvalidInputParameter,
            RequestMiddleware.InvalidConfirmParameter,
            ControllerMiddleware.UserNoLoggedException,
            ControllerMiddleware.UserNotExistsException,
            ControllerMiddleware.UnauthorizedException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), status


@app.route('/unmount', methods=['POST'])
def do_unmount():
    log.add_row('Trying to unmount..')

    try:
        log.add_row('Converting request parameters..')

        source = RequestMiddleware.check_empty_or_none_item('source', request.form.get('source'))
        message, status = controller.unmount(source, log)

    except (RequestMiddleware.InvalidInputParameter,
            ControllerMiddleware.UserNoLoggedException,
            ControllerMiddleware.UnauthorizedException,
            ControllerMiddleware.UserNotExistsException,
            ControllerMiddleware.ItemIsNotUrirefException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), status


@app.route('/estimate', methods=['GET'])
def do_estimate():
    log.add_row('Trying to estimate..')

    try:
        log.add_row('Converting request parameters..')
        sources = RequestMiddleware.check_empty_or_none_list('sources', request.args.getlist('sources'))
        sources = RequestMiddleware.check_list_has_two_items(sources)

        message, status = controller.estimate(sources, log)

    except (RequestMiddleware.InvalidInputParameter,
            ControllerMiddleware.UserNoLoggedException,
            ControllerMiddleware.UserNotExistsException,
            ControllerMiddleware.UnauthorizedException,
            ControllerMiddleware.ItemIsNotUrirefException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), status


@app.route('/describe', methods=['GET'])
def do_describe():
    log.add_row('Trying to describe..')

    try:
        log.add_row('Converting request parameters..')

        source = RequestMiddleware.check_empty_or_none_item('source', request.args.get('source'))

        message, status = controller.describe(source, log)

    except (RequestMiddleware.InvalidInputParameter,
            ControllerMiddleware.UserAlreadyLoggedException,
            ControllerMiddleware.UserNoLoggedException,
            ControllerMiddleware.UnauthorizedException,
            ControllerMiddleware.ItemIsNotUrirefException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), status


@app.route('/profile', methods=['GET'])
def do_profile():
    log.add_row('Trying to profile..')

    try:
        log.add_row('Converting request parameters..')
        source = RequestMiddleware.check_empty_or_none_item('source', request.args.get('source'))
        domain = request.args.get('domain')
        roll_up = request.args.get('rollUp')
        roll_up = RequestMiddleware.check_confirm('rollUp', roll_up)

        message, status = controller.profile(source, domain, roll_up, log)

    except (RequestMiddleware.InvalidInputParameter,
            RequestMiddleware.InvalidConfirmParameter,
            ControllerMiddleware.UserNoLoggedException,
            ControllerMiddleware.UnauthorizedException,
            ControllerMiddleware.ItemIsNotUrirefException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': to_json(message)}), status


@app.route('/clean', methods=['GET'])
def do_clean():
    log.add_row('Trying to clean..')

    try:
        log.add_row('Converting request parameters..')
        value = request.args.get('all')
        confirm = RequestMiddleware.check_confirm('all', value)

        message, status = controller.clean(confirm, log)

    except (RequestMiddleware.InvalidInputParameter,
            RequestMiddleware.InvalidConfirmParameter,
            ControllerMiddleware.UserNoLoggedException,
            ControllerMiddleware.UserNotExistsException,
            ControllerMiddleware.UnauthorizedException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), status


""" Admin can perform all previous routes too """


@app.route('/admin/users' , methods=['GET'])
def do_admin_users():
    log.add_row('getting user list')

    try:
        ControllerMiddleware.user_not_admin(controller.get_user())

        message, status = controller.get_user_list(log)

        return jsonify({'SDL': message}), status

    except RequestMiddleware.InvalidInputParameter as e:
        return jsonify({"error": str(e)}), 400

    except ControllerMiddleware.UserNoLoggedException as e:
        return jsonify({"error": str(e)}), 401

    except ControllerMiddleware.UnauthorizedException as e:
        return jsonify({"error": str(e)}), 403

    except ControllerMiddleware.UserNotExistsException as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    



@app.route('/admin/deleteUser', methods=['GET'])
def do_admin_delete_user():
    log.add_row('Trying to deleteUser..')

    try:
        ControllerMiddleware.user_not_admin(controller.get_user())
        log.add_row('Converting request parameters..')
        username = RequestMiddleware.check_empty_or_none_item('username', request.args.get('username'))

        message, status = controller.delete_user(username, log)

    except (RequestMiddleware.InvalidInputParameter,
            ControllerMiddleware.UserNotExistsException,
            ControllerMiddleware.UnauthorizedException,
            ControllerMiddleware.UserNoLoggedException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), status


@app.route('/admin/sources', methods=['GET'])
def do_admin_sources():
    log.add_row('Trying to sources..')

    try:
        ControllerMiddleware.user_not_admin(controller.get_user())

        log.add_row('Converting request parameters..')
        value = request.args.get('username')
        username = controller.get_user().get_username() if value is None else value

        message, status = controller.get_sources(log, username=username)

    except (RequestMiddleware.InvalidInputParameter,
            ControllerMiddleware.UserNotExistsException,
            ControllerMiddleware.UnauthorizedException,
            ControllerMiddleware.UserNoLoggedException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), status


@app.route('/admin/upload', methods=['POST'])
def do_admin_upload():
    log.add_row('Trying to upload for a user..')

    try:
        ControllerMiddleware.user_not_admin(controller.get_user())

        log.add_row('Converting request parameters..')
        username = RequestMiddleware.check_empty_or_none_item('username', request.form.get('username'))
        message, status = upload_from_request(username=username)

    except (RequestMiddleware.InvalidInputParameter,
            ControllerMiddleware.UserNoLoggedException,
            ControllerMiddleware.UserNotExistsException,
            ControllerMiddleware.UnauthorizedException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), status


@app.route('/admin/uploads', methods=['GET'])
def do_admin_uploads():
    log.add_row('Trying to get uploads for a user..')

    try:
        ControllerMiddleware.user_not_admin(controller.get_user())

        log.add_row('Converting request parameters..')
        username = RequestMiddleware.check_empty_or_none_item('username', request.args.get('username'))
        message, status = get_uploads(username=username)

    except (RequestMiddleware.InvalidInputParameter,
            ControllerMiddleware.UserNoLoggedException,
            ControllerMiddleware.UserNotExistsException,
            ControllerMiddleware.UnauthorizedException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), status


@app.route('/admin/uploads/<filename>', methods=['DELETE'])
def do_admin_delete_upload(filename):
    log.add_row('Trying to delete an upload for a user..')

    try:
        ControllerMiddleware.user_not_admin(controller.get_user())

        log.add_row('Converting request parameters..')
        username = RequestMiddleware.check_empty_or_none_item('username', request.args.get('username'))
        message, status = delete_upload(filename, username=username)

    except (RequestMiddleware.InvalidInputParameter,
            ControllerMiddleware.UserNoLoggedException,
            ControllerMiddleware.UserNotExistsException,
            ControllerMiddleware.UnauthorizedException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), status


@app.route('/admin/clean', methods=['GET'])
def do_admin_clean():
    log.add_row('Trying to clean..')

    try:
        ControllerMiddleware.user_not_admin(controller.get_user())

        log.add_row('Converting request parameters..')
        value = request.args.get('all')
        confirm = RequestMiddleware.check_confirm('all', value)

        username = request.args.get('username')

        message, status = controller.clean(confirm, log, username=username)

    except (RequestMiddleware.InvalidInputParameter,
            RequestMiddleware.InvalidConfirmParameter,
            ControllerMiddleware.UserNoLoggedException,
            ControllerMiddleware.UserNotExistsException,
            ControllerMiddleware.UnauthorizedException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    return jsonify({'SDL': message}), status


@app.route('/admin/profile', methods=['GET'])
def do_admin_profile():
    log.add_row('Trying to profile..')

    try:
        ControllerMiddleware.user_not_admin(controller.get_user())

        log.add_row('Converting request parameters..')
        source = RequestMiddleware.check_empty_or_none_item('source', request.args.get('source'))
        domain = request.args.get('domain')
        roll_up = RequestMiddleware.check_confirm('rollUp', request.args.get('rollUp'))
        username = request.args.get('username')

        message, status = controller.profile(source, domain, roll_up, log, username=username)

    except (RequestMiddleware.InvalidInputParameter,
            RequestMiddleware.InvalidConfirmParameter,
            ControllerMiddleware.UserNoLoggedException,
            ControllerMiddleware.UnauthorizedException,
            ControllerMiddleware.ItemIsNotUrirefException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': to_json(message)}), status


@app.route('/admin/mount', methods=['POST'])
def do_admin_mount():
    log.add_row('Trying to mount..')

    try:
        ControllerMiddleware.user_not_admin(controller.get_user())

        log.add_row('Converting request parameters..')
        username = RequestMiddleware.check_empty_or_none_item('username', request.form.get('username'))
        message, status = mount_from_request(username=username)

    except (RequestMiddleware.InvalidInputParameter,
            RequestMiddleware.InvalidConfirmParameter,
            ControllerMiddleware.UserNoLoggedException,
            ControllerMiddleware.UserNotExistsException,
            ControllerMiddleware.UnauthorizedException,
            EmptyFileException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), status


@app.route('/admin/unmount', methods=['POST'])
def do_admin_unmount():
    log.add_row('Trying to unmount..')

    try:
        ControllerMiddleware.user_not_admin(controller.get_user())

        log.add_row('Converting request parameters..')
        source = RequestMiddleware.check_empty_or_none_item('source', request.form.get('source'))
        username = request.form.get('username')

        message, status = controller.unmount(source, log, username=username)

    except (RequestMiddleware.InvalidInputParameter,
            ControllerMiddleware.UserNoLoggedException,
            ControllerMiddleware.UnauthorizedException,
            ControllerMiddleware.UserNotExistsException,
            ControllerMiddleware.ItemIsNotUrirefException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), status


@app.route('/admin/describe', methods=['GET'])
def do_admin_describe():
    log.add_row('Trying to describe..')

    try:
        ControllerMiddleware.user_not_admin(controller.get_user())

        log.add_row('Converting request parameters..')
        source = RequestMiddleware.check_empty_or_none_item('source', request.args.get('source'))
        username = request.args.get('username')

        message, status = controller.describe(source, log, username=username)

    except (RequestMiddleware.InvalidInputParameter,
            ControllerMiddleware.UserAlreadyLoggedException,
            ControllerMiddleware.UserNoLoggedException,
            ControllerMiddleware.UnauthorizedException,
            ControllerMiddleware.ItemIsNotUrirefException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    return jsonify({'SDL': message}), status


@app.route('/admin/estimate', methods=['GET'])
def do_admin_estimate():
    log.add_row('Trying to estimate..')

    try:
        ControllerMiddleware.user_not_admin(controller.get_user())

        log.add_row('Converting request parameters..')
        sources = RequestMiddleware.check_empty_or_none_list('sources', request.args.getlist('sources'))
        sources = RequestMiddleware.check_list_has_two_items(sources)
        usernames = request.args.getlist('usernames')

        message, status = controller.estimate(sources, log, usernames=usernames)

    except (RequestMiddleware.InvalidInputParameter,
            ControllerMiddleware.UserNoLoggedException,
            ControllerMiddleware.UserNotExistsException,
            ControllerMiddleware.UnauthorizedException,
            ControllerMiddleware.ItemIsNotUrirefException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    return jsonify({'SDL': message}), status


@app.route('/admin/query', methods=['POST'])
def do_admin_query():
    log.add_row('Trying to query..')

    try:
        ControllerMiddleware.user_not_admin(controller.get_user())

        log.add_row('Converting request parameters..')
        text = request.get_data().decode()
        log.add_row('Filtering text..')
        filtered_text = RequestMiddleware.check_query_body(text)

        message, status = controller.query(filtered_text, log)

    except (RequestMiddleware.InvalidInputParameter,
            ControllerMiddleware.UserNoLoggedException,
            ControllerMiddleware.UnauthorizedException) as e:
        message = e.args[0]
        log.add_row(message)
        return jsonify({'SDL': message}), 400
    except Exception as e:
        message = str(e)
        log.add_row(message)
        return jsonify({'SDL': message}), 400

    return jsonify({'SDL': message}), status


app.run()
