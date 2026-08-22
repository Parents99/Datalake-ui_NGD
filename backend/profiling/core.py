from config import ns_project
from profiling.profiles import integer_column, real_column, date_column, string_column, categorical_column, \
    CategoriesReachedException, TresholdReachedException

from pandas import Index, read_csv, DataFrame
from rdflib import URIRef

"""  Reading file """


# reading different source format
def read_column(file_path: str, column_name: str):
    extension = file_path.split('.')[-1]
    if extension == "csv":
        df = read_csv(file_path, sep=',', usecols=[column_name])
    else:
        raise ValueError(f"Unsupported format: '{file_path}'.")
    return df


def get_source_columns_and_n_rows(file_path: str):
    extension = file_path.split('.')[-1]
    if extension == "csv":
        columns = list(read_csv(file_path, sep=',', index_col=0, nrows=0).columns)
        n_rows = len(read_csv(file_path, sep=',', index_col=0, usecols=[columns[0]]).index)
    else:
        raise ValueError(f"Unsupported format: '{file_path}'.")
    return columns, n_rows


"""  Calculating level profile """


def calculate_level_profile(values=None, members=None):
    column_info, column_type = {}, "level"
    count = Index(values).value_counts()
    delta = 0
    for member in members:
        member_fragment = member[member.rfind('/') + 1:]
        if member_fragment in count:
            column_info[member] = count[member_fragment]
            delta += count[member_fragment]
    others = (len(values) - delta)
    if others > 0:
        column_info[URIRef(f'{ns_project}other')] = others
    return column_info, column_type


"""  Calculating column profile """


def calculate_column_profile(column: DataFrame, string_processing: bool, date_threshold: float, n_frequent_words: int,
                             max_categories: int):

    # Categorical column
    try:
        column_info = categorical_column(column, max_categories)
        column_type = "categorical"
        return column_info, column_type

    except CategoriesReachedException as e:
        pass

    # Integer column
    if column.dtype == int:
        column_info, column_type = integer_column(column)
        return column_info, column_type

    # Real column
    elif column.dtype == float:
        column_info, column_type = real_column(column)
        return column_info, column_type

    else:
        # Datetime column
        try:
            column_info = date_column(column, date_threshold)
            column_type = "date"
            return column_info, column_type

        except TresholdReachedException as e:
            pass

        if string_processing:
            # String column
            column_type = "string"
            column_info = string_column(column, n_frequent_words)
            return column_info, column_type
        # else:
        #    print(f"String processing disabled.\n")

    return {}, "unknown"
