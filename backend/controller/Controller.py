from models.DLGraph import DLGraph
from models.MG import MG
from models.KG import KG
from models.Log import Log
from models.User import User
from profiling.mount import mount, mount_uploaded, remount
from profiling.upload import delete_upload, get_uploads, upload
from path_utils import get_filename_from_location
from similarity.estimator import estimate
from config import DS_DIR
from os.path import join
from os import remove

from middleware import ControllerMiddleware


def get_user_name(user: User, username: str):
    if username is None or username == '':
        return user.get_username()
    return username


class Controller:

    def __init__(self, m_graph: MG = None, k_graph: KG = None):
        self.dl_graph = DLGraph(k_graph=k_graph, m_graph=m_graph)
        self.user = User()

    def get_k_graph(self):
        return self.dl_graph.k_graph

    def get_m_graph(self):
        return self.dl_graph.m_graph

    def get_user(self):
        return self.user

    def login(self, username: str, password: str, log: Log):
        ControllerMiddleware.user_already_logged(self.get_user())

        if self.user.login(username, password):
            message = f'Logged ({username})'
            log.add_row(message)
            return message, 200
        else:
            message = 'Wrong credentials'
            log.add_row(message)
            return message, 200

    def logout(self, log: Log):
        ControllerMiddleware.user_not_logged(self.get_user())

        message = f'Bye: {self.user.get_username()}'
        if self.user.logout():
            log.add_row(message)
            return message, 200

    def sign_in(self, username: str, password: str, confirm_pw: str, log: Log):
        ControllerMiddleware.user_already_logged(self.get_user())
        ControllerMiddleware.username_is_valid(username)
        ControllerMiddleware.user_already_registered(username)

        ControllerMiddleware.password_not_matches(password, confirm_pw)

        if self.user.sign_up(username, password):
            message = f'Sign up done, logged: {username}'
            log.add_row(message)
            return message, 200
        else:
            message = f'Something went wrong while sign up: {username}'
            log.add_row(message)
            return message, 200


    def get_user_list(self, log : Log):
        ControllerMiddleware.user_not_logged(self.get_user())
        ControllerMiddleware.user_not_admin(self.get_user())

        data = self.user.read_user_list()

        log.add_row(f'read {len(data)} users')
        return data, 200


    def delete_user(self, username: str, log: Log):

        ControllerMiddleware.user_not_logged(self.get_user())

        ControllerMiddleware.user_not_admin(self.get_user())

        ControllerMiddleware.user_not_registered(username)

        if self.user.delete(username):
            if self.dl_graph.m_graph.clear_sources(username):
                message = f'Deleted user: {username}'
                log.add_row(message)
                return message, 200
        else:
            message = f'Something went wrong when deleting user: {username}'
            log.add_row(message)
            return message, 200

    def get_sources(self, log: Log, username: str | None = None):
        ControllerMiddleware.user_not_logged(self.get_user())

        username = get_user_name(self.get_user(), username)
        ControllerMiddleware.user_not_registered(username)
        log.add_row('Getting sources URI..')
        source_uris = self.dl_graph.m_graph.get_sources_uri(username)

        if len(source_uris) == 0:
            message = 'No source found'
            log.add_row(message)
            return message, 200
        else:
            data = []
            for source_uri in source_uris:
                log.add_row(f'Getting infos of source: {source_uri}')
                infos = self.dl_graph.m_graph.get_info_by_source_uri(source_uri, username)
                data.append({'name': source_uri, 'location': infos['location'], 'loadBy': infos['user']})
            return data, 200

    def upload(self, source: any, log: Log, username: str | None = None):
        ControllerMiddleware.user_not_logged(self.get_user())

        username = get_user_name(self.get_user(), username)
        ControllerMiddleware.user_not_registered(username)
        message, status = upload(source=source, username=username, log=log)
        return message, status

    def get_uploads(self, log: Log, username: str | None = None):
        ControllerMiddleware.user_not_logged(self.get_user())

        username = get_user_name(self.get_user(), username)
        ControllerMiddleware.user_not_registered(username)
        message, status = get_uploads(username=username, log=log)
        return message, status

    def delete_upload(self, filename: str, log: Log, username: str | None = None):
        ControllerMiddleware.user_not_logged(self.get_user())

        username = get_user_name(self.get_user(), username)
        ControllerMiddleware.user_not_registered(username)
        message, status = delete_upload(filename=filename, username=username, log=log)
        return message, status

    def mount(self, source: any, date_threshold: float | None, n_frequent_words: int | None,
              max_categories: int | None, string_processing: bool | None, log: Log, username: str | None = None):
        ControllerMiddleware.user_not_logged(self.get_user())

        username = get_user_name(self.get_user(), username)
        ControllerMiddleware.user_not_registered(username)
        message, status = mount(source=source, m_graph=self.get_m_graph(),
                                k_graph=self.get_k_graph(), username=username, string_processing=string_processing,
                                date_threshold=date_threshold, n_frequent_words=n_frequent_words,
                                max_categories=max_categories, log=log)
        return message, status

    def mount_uploaded(self, source_name: str, date_threshold: float | None, n_frequent_words: int | None,
                       max_categories: int | None, string_processing: bool | None, log: Log,
                       username: str | None = None):
        ControllerMiddleware.user_not_logged(self.get_user())

        username = get_user_name(self.get_user(), username)
        ControllerMiddleware.user_not_registered(username)
        message, status = mount_uploaded(file_name=source_name, m_graph=self.get_m_graph(),
                                         k_graph=self.get_k_graph(), username=username,
                                         string_processing=string_processing, date_threshold=date_threshold,
                                         n_frequent_words=n_frequent_words, max_categories=max_categories, log=log)
        return message, status

    def remount(self, source_name: str, date_threshold: float | None, n_frequent_words: int | None,
                max_categories: int | None, string_processing: bool | None, log: Log, username: str | None = None):
        ControllerMiddleware.user_not_logged(self.get_user())

        username = get_user_name(self.get_user(), username)
        ControllerMiddleware.user_not_registered(username)

        message, status = remount(source_name=source_name, m_graph=self.get_m_graph(),
                                  k_graph=self.get_k_graph(), username=username, string_processing=string_processing,
                                  date_threshold=date_threshold, n_frequent_words=n_frequent_words,
                                  max_categories=max_categories, log=log)
        return message, status

    def unmount(self, source_name: str, log: Log, username: str | None = None):
        ControllerMiddleware.user_not_logged(self.get_user())

        username = get_user_name(self.get_user(), username)

        log.add_row(f'Getting source: {source_name}..')
        source_uri = self.dl_graph.m_graph.get_source_uri_by_name(source_name, username)
        source_path = self.dl_graph.m_graph.get_source_path_by_name(source_name, username)
        ControllerMiddleware.item_is_not_uriref(source_name, source_uri)

        source_filename = get_filename_from_location(source_path)
        source_path_complete = join(DS_DIR, username, source_filename)
        sources_share_path = self.dl_graph.m_graph.get_sources_share_path(source_path, username)

        if len(sources_share_path) == 1:
            log.add_row(f'Removing source: {source_name} from user folder..')
            remove(source_path_complete)
            log.add_row(f'The source: {source_name} has been removed')

        else:
            log.add_row(f'Other sources share same path {sources_share_path}, file not removed')

        if not self.dl_graph.m_graph.clear_source_by_uri(source_uri, username):
            return f'Some error occurred while unmounting the source: {source_uri}', 500

        return f'The source: {source_name} has been unmounted', 200

    def describe(self, source_name: str, log: Log, username: str | None = None):
        ControllerMiddleware.user_not_logged(self.get_user())

        username = get_user_name(self.get_user(), username)

        log.add_row(f'Getting source: {source_name}..')
        source_uri = self.dl_graph.m_graph.get_source_uri_by_name(source_name, username)
        ControllerMiddleware.item_is_not_uriref(source_name, source_uri)

        log.add_row('Getting source info..')
        infos = self.dl_graph.m_graph.get_info_by_source_uri(source_uri, username)
        log.add_row(f'Getting mapped domains for source: {source_uri}..')
        mapped_domains = self.dl_graph.m_graph.get_mapped_domains_by_source_uri(source_uri, username)
        data = {
            'name': infos['uri'],
            'loadBy': infos['user'],
            'loadingDate': infos['date'],
            'numItems': infos['items'],
            'numDomains': infos['domains'],
            'numMappedDomains': len(mapped_domains)
        }

        completeness = []
        for domain_uri in mapped_domains:
            completeness_level = self.dl_graph.eval_completeness(source_uri, domain_uri, username)
            if completeness_level >= 0:
                value = f'{round(completeness_level * 100, 3)}%'
            else:
                value = 'Error in the computation of the completeness level'
            completeness.append({'domain': domain_uri, 'mapTo': mapped_domains[domain_uri], 'completeness': value})

        log.add_row(f'Getting no mapped domains for source: {source_uri}..')
        no_mapped_domains = self.dl_graph.m_graph.get_no_mapped_domains_by_source_uri(source_uri, username)
        for column, c_type in no_mapped_domains.items():
            completeness.append({'domain': column, 'type': c_type})

        data['description'] = completeness
        log.add_row('Done')
        return data, 200

    def clean(self, confirm: bool, log: Log, username: str | None = None):
        ControllerMiddleware.user_not_logged(self.get_user())

        username = get_user_name(self.get_user(), username)
        ControllerMiddleware.user_not_registered(username)

        if confirm:
            if self.dl_graph.m_graph.clear_sources(username):
                message = f'The metadata layer of user: {username} has been reset'
                log.add_row(message)
                return message, 200
            else:
                message = f'Some issue occurred while resetting metadata layer of user: {username}'
                log.add_row(message)
                return message, 500
        else:
            message = f'The metadata layer of user: {username} has not been reset'
            log.add_row(message)
            return message, 200

    def profile(self, source_name: str, domain_name: str | None, roll_up: bool, log: Log, username: str | None = None):
        ControllerMiddleware.user_not_logged(self.get_user())
        username = get_user_name(self.get_user(), username)

        log.add_row(f'Getting source: {source_name}..')
        source_uri = self.dl_graph.m_graph.get_source_uri_by_name(source_name, username)

        ControllerMiddleware.item_is_not_uriref(source_name, source_uri)

        if domain_name is not None:
            log.add_row(f'Getting domain: {domain_name}..')
            domain_uri = self.dl_graph.m_graph.get_domain_uri_by_name(source_uri, domain_name, username)
            ControllerMiddleware.item_is_not_uriref(domain_name, domain_uri)

        mapped_domains = self.dl_graph.m_graph.get_mapped_domains_by_source_uri(source_uri, username)

        # Profile all domains
        if domain_name is None:
            data = []
            log.add_row(f'Getting mapped domains for source: {source_uri}..')
            for domain_uri in mapped_domains:
                log.add_row(f'Getting profile of {domain_uri}..')
                p = {'domain': domain_uri,
                     'profile': self.dl_graph.m_graph.get_level_profile_by_source_and_domain_uris(source_uri,
                                                                                                  domain_uri,
                                                                                                  username)}
                if roll_up:
                    log.add_row('rollUp enabled')
                    p['rollUp'] = self.dl_graph.get_level_profile_up(source_uri, domain_uri, username)
                    data.append(p)

            log.add_row(f'Getting no mapped domains for source: {source_uri}..')
            no_mapped_domains = self.dl_graph.m_graph.get_no_mapped_domains_by_source_uri(source_uri, username)
            for domain_uri in no_mapped_domains.keys():
                log.add_row(f'Getting profile for domain: {domain_uri}..')
                data.append(
                    {'domain': domain_uri,
                     'profile': self.dl_graph.m_graph.get_column_profile_by_source_and_domain_uris(source_uri,
                                                                                              domain_uri, username)})

            return data, 200

        # Profile the selected domain
        else:
            log.add_row(f'Profiling domain: {domain_uri}')

            # unable to roll up because domain is not mapped to level
            not_roll_up_column = (domain_uri not in mapped_domains and roll_up)
            if not_roll_up_column:
                message = f'Cannot roll-up a no-level domain: {domain_uri}'
                log.add_row(message)
                return message, 400

            # column not mapped
            not_level = (domain_uri not in mapped_domains)
            if not_level:
                log.add_row(f'Domain: {domain_uri} is not a level')
                data = self.dl_graph.m_graph.get_column_profile_by_source_and_domain_uris(source_uri, domain_uri,
                                                                                          username)
                return data, 200

            # column mapped
            log.add_row(f'Domain: {domain_uri} is a level')
            data = self.dl_graph.m_graph.get_level_profile_by_source_and_domain_uris(source_uri,
                                                                                     domain_uri, username)
            # roll up
            if roll_up:
                log.add_row('rollUp enabled')
                data.append({'rollUp': self.dl_graph.get_level_profile_up(source_uri,
                                                                          domain_uri, username)})
            return data, 200

    def estimate(self, sources_names: list, log: Log, usernames: list | None = None):
        ControllerMiddleware.user_not_logged(self.get_user())

        usernames = [self.get_user().get_username()]*2 if usernames is None else usernames

        source_uris = []
        for source_name, username in zip(sources_names, usernames):

            ControllerMiddleware.user_not_registered(username)
            log.add_row(f'Searching if exist a source: {source_name} mounted by user: {username}')

            source_uri = self.dl_graph.m_graph.get_source_uri_by_name(source_name, username)
            ControllerMiddleware.item_is_not_uriref(source_name, source_uri)

            source_uris.append(source_uri)

        message, status = estimate(sources=source_uris, m_graph=self.get_m_graph(),
                                   k_graph=self.get_k_graph(), usernames=usernames, log=log)
        return message, status

    def query(self, text_query: str, log: Log):
        ControllerMiddleware.user_not_logged(self.get_user())

        ControllerMiddleware.user_not_admin(self.get_user())

        try:
            data = self.dl_graph.m_graph.raw_query(text_query)
            return data, 200
        except (Exception,):
            message = 'Something went wrong while processing query'
            log.add_row(message)
            return message, 500
