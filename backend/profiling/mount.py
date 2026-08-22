from os.path import relpath, join, exists, isfile
from os import makedirs, remove
from shutil import copyfile
from executors.mapper import initialize_lsh, map_source_domain

from profiling.core import read_column, get_source_columns_and_n_rows
from profiling.core import calculate_level_profile, calculate_column_profile
from profiling.upload import get_safe_csv_filename
from path_utils import get_filename_from_location


from config import APP_DIR, DS_DIR, MOUNT_DIR
from models.MG import MG
from models.KG import KG
from models.Log import Log

from werkzeug.datastructures import FileStorage


class EmptyFileException(Exception):
    pass


def core(source_name: str, m_graph: MG, k_graph: KG, source_path: str, username: str, string_processing: bool,
         date_threshold: float, n_frequent_words: int, max_categories: int, log: Log):
    log.add_row('Reading source info..')

    # Reading source info
    columns, n_rows = get_source_columns_and_n_rows(source_path)
    if n_rows == 0:
        raise EmptyFileException(f'Empty file: {source_path}')

    # Adding metadata source in graph
    log.add_row(f'Adding source: {source_name} info to metadata graph..')
    relative_source_path = relpath(source_path, APP_DIR).replace('\\', '/')
    m_graph.add_source(source_name, n_rows, columns, f'./{relative_source_path}', username)
    log.add_row('Adding done')

    log.add_row('Initializing LSH Ensemble..')
    lsh_ensemble = initialize_lsh(k_graph)
    log.add_row('Initializing done')

    log.add_row('Reading columns..')

    # Process columns
    for column_name in sorted(columns):
        log.add_row(f'Processing column "{column_name}"')
        df = read_column(source_path, column_name)

        # Extract value list
        values = df[column_name].astype('str').tolist()
        list_mappings = list(map_source_domain(values, lsh_ensemble))
        # Column is mappable to some level in knowledge graph
        if list_mappings:
            level = list_mappings[0]
            m_graph.map(source_name, column_name, level)
            log.add_row(f'Domain "{column_name}" mapped to level "{level}"')

            # calculating profile for level
            members = k_graph.get_members_from_level(level, fragment_level=True, fragment_output=False)
            column_profile, column_type = calculate_level_profile(values, members)
        else:
            # calculating profile for column
            column_profile, column_type = calculate_column_profile(df[column_name], string_processing, date_threshold,
                                                                   n_frequent_words, max_categories)
            log.add_row(f'Domain "{column_name}" detected type: "{column_type}"')

        del df[column_name]
        # adding column profile in metadata graph
        log.add_row('Adding domain profile to metadata graph..')
        m_graph.add_profile(source_name, column_name, column_type, column_profile)
        log.add_row('Adding done')

    log.add_row('Serializing graph..')
    m_graph.serialize()
    log.add_row('Serializing done')


def mount_core(file_name: str, source_path: str, m_graph: MG, k_graph: KG, username: str,
               string_processing: bool, date_threshold: float, n_frequent_words: int,
               max_categories: int, log: Log):
    source_name = file_name.rsplit('.', 1)[0]
    # get source name in metadata_graph
    all_sources_names = m_graph.get_sources_names()
    counter = 0
    uri_to_save = f'{source_name}_{counter}'
    while uri_to_save in all_sources_names:
        counter += 1
        uri_to_save = f'{source_name}_{counter}'

    core(uri_to_save, m_graph, k_graph, source_path, username, string_processing, date_threshold, n_frequent_words,
         max_categories, log)
    message = f'The source: {source_name} has been mounted'
    log.add_row(message)
    return message, 200


def mount(source: any, m_graph: MG, k_graph: KG, username: str, string_processing: bool, date_threshold: float,
          n_frequent_words: int, max_categories: int, log: Log):

    # api version
    if isinstance(source, FileStorage):
        original_file_name = source.filename
    # console version
    else:
        # isinstance(source, str)
        original_file_name = source

    file_name, error = get_safe_csv_filename(original_file_name)
    if error is not None:
        log.add_row(error)
        return error, 400

    source_name = file_name.rsplit('.', 1)[0]
    log.add_row(f'Mounting file "{source_name}" ')

    user_dir = join(DS_DIR, username, '')
    log.add_row('Looking for user folder.. ')
    makedirs(user_dir, exist_ok=True)

    source_path = join(user_dir, file_name)
    if exists(source_path):
        message = f'The source file: {file_name} already exists'
        log.add_row(message)
        return message, 409

    log.add_row(f'Moving file {source_name} to user folder..')
    if isinstance(source, FileStorage):
        source.save(dst=source_path)
    else:
        copyfile(join(MOUNT_DIR, file_name), source_path)

    log.add_row('Moving done')

    try:
        return mount_core(file_name, source_path, m_graph, k_graph, username, string_processing, date_threshold,
                          n_frequent_words, max_categories, log)
    except Exception:
        if isfile(source_path):
            remove(source_path)
        raise


def mount_uploaded(file_name: str, m_graph: MG, k_graph: KG, username: str, string_processing: bool,
                   date_threshold: float, n_frequent_words: int, max_categories: int, log: Log):
    safe_file_name, error = get_safe_csv_filename(file_name)
    if error is not None or safe_file_name != file_name:
        message = error if error is not None else f'Invalid file name: {file_name}'
        log.add_row(message)
        return message, 400

    uploaded_path = join(MOUNT_DIR, username, safe_file_name)
    if not isfile(uploaded_path):
        message = f'Uploaded source not found: {safe_file_name}'
        log.add_row(message)
        return message, 404

    user_dir = join(DS_DIR, username, '')
    log.add_row('Looking for user folder.. ')
    makedirs(user_dir, exist_ok=True)

    source_path = join(user_dir, safe_file_name)
    if exists(source_path):
        message = f'The source file: {safe_file_name} already exists'
        log.add_row(message)
        return message, 409

    log.add_row(f'Copying uploaded file "{safe_file_name}" to user folder..')
    copyfile(uploaded_path, source_path)
    log.add_row('Copying done')

    try:
        message, status = mount_core(safe_file_name, source_path, m_graph, k_graph, username, string_processing,
                                     date_threshold, n_frequent_words, max_categories, log)
    except Exception:
        if isfile(source_path):
            remove(source_path)
        raise

    remove(uploaded_path)
    log.add_row(f'Removed uploaded source "{safe_file_name}" from upload folder')
    return message, status


def remount(source_name: str, m_graph: MG, k_graph: KG, username: str, string_processing: bool, date_threshold: float,
            n_frequent_words: int, max_categories: int, log: Log):
    log.add_row(f'Remounting file "{source_name}"..')

    all_sources_names = m_graph.get_sources_names()
    if source_name not in all_sources_names:
        message = 'Cannot remount a no-existing source'
        log.add_row(message)
        return message, 400

    log.add_row(f'Clearing source: {source_name} for remounting...')
    to_clear = m_graph.get_uriref_from_filename(source_name)
    source_location = m_graph.get_source_path_by_name(source_name, username=username)
    if m_graph.clear_source_by_uri(to_clear, username=username):
        log.add_row('Clearing done')

    else:
        message = f'Some error occurred while clearing the source: {to_clear}'
        log.add_row(message)
        return message, 400

    source_filename = get_filename_from_location(source_location)
    source_path = join(DS_DIR, username, source_filename)

    core(source_name, m_graph, k_graph, source_path, username, string_processing, date_threshold, n_frequent_words,
         max_categories, log)

    message = f'The source: {source_name} has been remounted'
    log.add_row(message)
    return message, 200


def unmount(source_name: str, m_graph: MG, username: str, log: Log):
    all_sources_names = m_graph.get_sources_names()
    if source_name not in all_sources_names:
        message = 'Cannot unmount a no-existing source'
        log.add_row(message)
        return message, 400

    log.add_row(f'Getting source: {source_name}..')
    source_path = m_graph.get_source_path_by_name(source_name, username)

    source_filename = get_filename_from_location(source_path)
    source_path_complete = join(DS_DIR, username, source_filename)
    sources_share_path = m_graph.get_sources_share_path(source_path, username)

    if len(sources_share_path) == 1:
        log.add_row(f'Removing source: {source_name} from user folder..')
        remove(source_path_complete)
        log.add_row(f'The source: {source_name} has been removed')

    else:
        log.add_row(f'Other sources share same path {sources_share_path}, file not removed')

    source_uri = m_graph.get_source_uri_by_name(source_name, username)
    if not m_graph.clear_source_by_uri(source_uri, username):
        return f'Some error occurred while unmounting the source: {source_name}', 500

    return f'The source: {source_name} has been unmounted', 200
