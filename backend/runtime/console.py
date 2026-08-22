import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import MG_PATH, KG_PATH, LOG_DIR
from controller.Controller import Controller
from middleware import RequestMiddleware, ControllerMiddleware
from models.Log import Log

from cmd import Cmd

from profiling.mount import EmptyFileException

log = None
controller = None


class MyPrompt(Cmd):
    prompt = "dl> "
    intro = "Type 'list' to list commands, quit to exit the console."

    def do_list(self,command):
        print('Supported commands: login, logout, signin, help, clean, estimate, describe, mount, unmount, profile, sources.')
        
    def do_help(self, command):
        log.add_row('Trying to help..')
        try:
            log.add_row('Converting request parameters..')

            while command == '':
                command = input('Command: ').replace(' ', '')

            log.add_row(f'Requesting help for command: {command}')
            
            if command == 'all':
                message = ('Supported commands: login, logout, signin, help, clean, estimate,'
                           'describe, mount, unmount, profile, sources.')

            elif command == 'clean':
                message = {'description': 'Remove all sources from the Metadata layer',
                           'usage': '/clean confirm',
                           }
            elif command == 'estimate':
                message = {'description': 'Estimate the similarity between two sources',
                           'usage': 'estimate source0, source1',
                           }
            elif command == 'describe':
                message = {'description': 'Provides the description of the source schema and mappings',
                           'usage': 'describe source_name',
                           }
            elif command == 'mount':
                message = {'description': ' Mount or remount a source in the Data Lake.',
                           'usage': 'mount source_name, *remount, *date_threshold, *max_categories, *string_processing'
                                    ', *frequent_words'
                           }
            elif command == 'profile':
                message = {'description': 'Shows the profile of the entire source or the domain,'
                                          'with ''rollUp'' shows the aggregated profile.',
                           'usage': 'profile source_name, *domain_name, *rollUp',
                           }
            elif command == 'sources':
                message = {'description': 'List the sources loaded in the Data Lake.',
                           'usage': 'sources',
                           }
            elif command == 'unmount':
                message = {'description': 'Unmount the selected source',
                           'usage': 'unmount source_name',
                           }
            elif command == 'logout':
                message = {'description': 'Logout the current user',
                           'usage': 'logout',
                           }
            elif command == 'login':
                message = {'description': 'Login the user',
                           'usage': 'login username, password',
                           }
            elif command == 'signin':
                message = {'description': 'Signin a new user',
                           'usage': 'signin username, password, confirm_password'
                           }
            else:
                message = f'Unrecognized command: {command}'

        except RequestMiddleware.InvalidInputParameter as e:
            message = e.args[0]
        except Exception as e:
            message = e

        log.add_row(message)
        print(message)

    def do_login(self, inp):
        log.add_row('Trying to login..')
    
        try:
            log.add_row('Converting request parameters..')

            password = ''
            username = inp.split(',')[0].replace(' ', '')

            while username == '':
                username = input('Username: ').replace(' ', '')

            try:
                password = inp.split(',')[1].replace(' ', '')
            except (Exception,):
                while password == '':
                    password = input('Password: ').replace(' ', '')

            message, status = controller.login(username, password, log)
    
        except ControllerMiddleware.UserAlreadyLoggedException as e:
            message = e.args[0]
        except Exception as e:
            message = e

        log.add_row(message)
        print(message)

    def do_logout(self, inp):
        log.add_row('Trying to logout..')

        try:
            message, status = controller.logout(log)
    
        except ControllerMiddleware.UserNoLoggedException as e:
            message = e.args[0]
        except Exception as e:
            message = e

        log.add_row(message)
        print(message)

    def do_signin(self, inp):
        log.add_row('Trying to signin..')
    
        try:
            log.add_row('Converting request parameters..')

            password, confirm_pw = '', ''
            username = inp.split(',')[0].replace(' ', '')

            while username == '':
                username = input('Username: ').replace(' ', '')

            try:
                password = inp.split(',')[1].replace(' ', '')
            except (Exception,):
                while password == '':
                    password = input('Password: ').replace(' ', '')

            try:
                confirm_pw = inp.split(',')[2].replace(' ', '')
            except (Exception,):
                while confirm_pw == '':
                    confirm_pw = input('Confirm password: ').replace(' ', '')

            message, status = controller.sign_in(username, password, confirm_pw, log)
    
        except (ControllerMiddleware.UserAlreadyLoggedException,
                ControllerMiddleware.UserAlreadyExistsException,
                ControllerMiddleware.PasswordNotMatchesException) as e:
            message = e.args[0]
        except Exception as e:
            message = e

        log.add_row(message)
        print(message)

    def do_deleteUser(self, inp):
        log.add_row('Trying to delete user..')
    
        try:
            log.add_row('Converting request parameters..')

            username = None
            if controller.get_user().is_admin():
                try:
                    username = input('*Username: ').replace(' ', '')
                    username = None if username == '' else username
                except (Exception,):
                    pass
            message, status = controller.delete_user(username, log)
    
        except (ControllerMiddleware.UserNotExistsException,
                ControllerMiddleware.UnauthorizedException,
                ControllerMiddleware.UserNoLoggedException, Exception) as e:
            message = e.args[0]
        except Exception as e:
            message = e

        log.add_row(message)
        print(message)

    def do_sources(self, inp):
        log.add_row('Trying to sources..')

        try:
            log.add_row('Converting request parameters..')

            username = None
            if controller.get_user().is_admin():
                try:
                    username = input('*Username: ').replace(' ', '')
                    username = None if username == '' else username
                except (Exception,):
                    pass

            message, status = controller.get_sources(log, username=username)
    
        except (RequestMiddleware.InvalidInputParameter,
                ControllerMiddleware.UserNotExistsException,
                ControllerMiddleware.UnauthorizedException,
                ControllerMiddleware.UserNoLoggedException) as e:
            message = e.args[0]
        except Exception as e:
            message = e

        log.add_row(message)
        print(message)

    def do_mount(self, inp):
        log.add_row('Trying to mount..')

        try:
            log.add_row('Converting request parameters..')

            remount, username = None, None
            date_threshold, max_categories, n_frequent_words, string_processing = None, None, None, None

            source_name = inp.split(',')[0].replace(' ', '')
            while source_name == '':
                source_name = input('Source name: ').replace(' ', '')

            try:
                remount = inp.split(',')[1].replace(' ', '')
            except (Exception,):
                remount = RequestMiddleware.check_confirm('remount', remount)

            try:
                date_threshold = inp.split(',')[2].replace(' ', '')
            except (Exception, ):
                date_threshold = RequestMiddleware.check_mount_params('dateThreshold', date_threshold)

            try:
                max_categories = inp.split(',')[3].replace(' ', '')
            except (Exception, ):
                max_categories = RequestMiddleware.check_mount_params('maxCategories', max_categories)

            try:
                string_processing = inp.split(',')[4].replace(' ', '')
            except (Exception, ):
                string_processing = RequestMiddleware.check_confirm('stringProcessing', string_processing)

            try:
                n_frequent_words = inp.split(',')[5].replace(' ', '')
            except (Exception, ):
                n_frequent_words = RequestMiddleware.check_mount_params('frequentWords', n_frequent_words)

            username = None
            if controller.get_user().is_admin():
                try:
                    username = input('*Username: ').replace(' ', '')
                    username = None if username == '' else username
                except (Exception,):
                    pass

            if remount is False:
                message, status = controller.mount(source=source_name,
                                                   date_threshold=date_threshold,
                                                   n_frequent_words=n_frequent_words,
                                                   max_categories=max_categories,
                                                   string_processing=string_processing,
                                                   log=log,
                                                   username=username)

            else:
                message, status = controller.remount(source_name=source_name,
                                                     date_threshold=date_threshold,
                                                     n_frequent_words=n_frequent_words,
                                                     max_categories=max_categories,
                                                     string_processing=string_processing,
                                                     log=log,
                                                     username=username)

        except (RequestMiddleware.InvalidInputParameter,
                RequestMiddleware.InvalidConfirmParameter,
                ControllerMiddleware.UserNoLoggedException,
                ControllerMiddleware.UserNotExistsException,
                ControllerMiddleware.UnauthorizedException,
                EmptyFileException) as e:
            message = e.args[0]
        except Exception as e:
            message = e

        log.add_row(message)
        print(message)

    def do_unmount(self, inp):
        log.add_row('Trying to unmount..')

        try:
            log.add_row('Converting request parameters..')
            source_name = inp.split(',')[0].replace(' ', '')
            while source_name == '':
                source_name = input('Source name: ').replace(' ', '')

            username = None
            if controller.get_user().is_admin():
                try:
                    username = inp.split(',')[1].replace(' ', '')
                except (Exception,):
                    pass

            message, status = controller.unmount(source_name, log, username=username)

        except (RequestMiddleware.InvalidInputParameter,
                ControllerMiddleware.UserNoLoggedException,
                ControllerMiddleware.UnauthorizedException,
                ControllerMiddleware.UserNotExistsException,
                ControllerMiddleware.ItemIsNotUrirefException) as e:
            message = e.args[0]
        except Exception as e:
            message = e

        log.add_row(message)
        print(message)

    def do_estimate(self, inp):
        log.add_row('Trying to estimate..')
        sources, usernames = None, None
        try:
            log.add_row('Converting request parameters..')

            try:
                sources = inp.split(',')[0:2]
                while len(set(sources)) != 2:
                    sources = input('Sources: ')
                    sources = sources.split(',')
            except (Exception,):
                print('Wrong input size')

            if controller.get_user().is_admin():
                try:
                    usernames = input('*Usernames: ')
                    usernames = usernames.split(',')[0:2] if usernames != '' else None
                    usernames = [username.replace(' ', '') for username in usernames]

                except (Exception,):
                    pass

            sources = [source.replace(' ', '') for source in sources]
            message, status = controller.estimate(sources, log, usernames=usernames)

        except (RequestMiddleware.InvalidInputParameter,
                ControllerMiddleware.UserNoLoggedException,
                ControllerMiddleware.UserNotExistsException,
                ControllerMiddleware.UnauthorizedException,
                ControllerMiddleware.ItemIsNotUrirefException) as e:
            message = e.args[0]
        except Exception as e:
            message = e

        log.add_row(message)
        print(message)

    def do_describe(self, inp):
        log.add_row('Trying to describe..')

        try:
            log.add_row('Converting request parameters..')

            source_name = inp.split(',')[0].replace(' ', '')
            while source_name == '':
                source_name = input('Source name: ').replace(' ', '')

            username = None
            if controller.get_user().is_admin():
                try:
                    username = input('*Username: ').replace(' ', '')
                    username = None if username == '' else username
                except (Exception,):
                    pass

            message, status = controller.describe(source_name, log, username=username)

        except (RequestMiddleware.InvalidInputParameter,
                ControllerMiddleware.UserAlreadyLoggedException,
                ControllerMiddleware.UserNoLoggedException,
                ControllerMiddleware.UnauthorizedException,
                ControllerMiddleware.ItemIsNotUrirefException) as e:
            message = e.args[0]
        except Exception as e:
            message = e

        log.add_row(message)
        print(message)

    def do_clean(self, inp):
        log.add_row('Trying to clean..')

        try:
            log.add_row('Getting request parameters..')

            confirm = inp.split(',')[0]
            while not (confirm == 'y' or confirm == 'n'):
                confirm = input('Confirm?(y/n): ').replace(' ', '')

            confirm = True if confirm == 'y' else False

            username = None
            if controller.get_user().is_admin():
                try:
                    username = input('*Username: ').replace(' ', '')
                    username = None if username == '' else username
                except (Exception,):
                    pass

            message, status = controller.clean(confirm, log, username=username)

        except (RequestMiddleware.InvalidInputParameter,
                RequestMiddleware.InvalidConfirmParameter,
                ControllerMiddleware.UserNoLoggedException,
                ControllerMiddleware.UserNotExistsException,
                ControllerMiddleware.UnauthorizedException) as e:
            message = e.args[0]
        except Exception as e:
            message = e

        log.add_row(message)
        print(message)

    def do_profile(self, inp):
        log.add_row('Trying to profile..')

        try:
            log.add_row('Getting request parameters..')

            source = inp.split(',')[0].replace(' ', '')
            while source == '':
                source = input('Source: ')

            try:
                domain = inp.split(',')[1].replace(' ', '')
            except (Exception, ):
                domain = None

            try:
                roll_up = inp.split(',')[2].replace(' ', '')
                roll_up = RequestMiddleware.check_confirm('rollUp', roll_up)
            except (Exception, ):
                roll_up = False

            username = None
            if controller.get_user().is_admin():
                try:
                    username = input('*Username: ').replace(' ', '')
                    username = None if username == '' else username
                except (Exception,):
                    pass

            message, status = controller.profile(source, domain, roll_up, log, username=username)

        except (RequestMiddleware.InvalidInputParameter,
                RequestMiddleware.InvalidConfirmParameter,
                ControllerMiddleware.UserNoLoggedException,
                ControllerMiddleware.UnauthorizedException,
                ControllerMiddleware.ItemIsNotUrirefException) as e:
            message = e.args[0]
        except Exception as e:
            message = e

        log.add_row(message)
        print(message)

    def do_query(self, query):
        log.add_row('Trying to query..')

        try:
            log.add_row('Getting request parameters..')

            if not controller.get_user().is_admin():
                raise ControllerMiddleware.UnauthorizedException('Unauthorized.')

            while query == '':
                query = input('Query: ')

            filtered_text = RequestMiddleware.check_query_body(query)
            log.add_row('Filtering text..')
            message, status = controller.query(filtered_text, log)

        except (RequestMiddleware.InvalidInputParameter,
                ControllerMiddleware.UserNoLoggedException,
                ControllerMiddleware.UnauthorizedException) as e:
            message = e.args[0]
        except Exception as e:
            message = e

        log.add_row(message)
        print(message)

    def do_quit(self, inp):
        log.add_row('Trying to quit..')
        log.close()
        print("Bye")
        return True

    do_EOF = do_quit


def main():
    print("############################################")
    print("Semantic Data Lake management console v. 1.0")
    print("############################################")
    global log
    global controller
    log = Log(path=LOG_DIR)
    log.add_row('Starting SDL Framework..')
    log.add_row('Importing knowledge and metadata graphs..')
    controller = Controller(k_graph=KG_PATH, m_graph=MG_PATH)
    log.add_row('Ready')
    # Run the prompt
    MyPrompt().cmdloop()


main()


