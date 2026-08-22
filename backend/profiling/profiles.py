from config import nltk_language, NLTK_DIR

import re
from numpy import array
from pandas import to_datetime, DataFrame
from collections import Counter
from os.path import exists
from os import mkdir

''' Stopwords '''
import nltk
from nltk.corpus import stopwords
nltk.data.path.append(NLTK_DIR)
if not exists(NLTK_DIR):
    mkdir(NLTK_DIR)
    nltk.download('stopwords', NLTK_DIR)

stopwords = stopwords.words(nltk_language)


''' Exceptions '''


class CategoriesReachedException(Exception):
    pass


class TresholdReachedException(Exception):
    pass


''' Real columns '''


# profile for real columns
def real_column(column: DataFrame):
    profile = {
        'sum': column.sum(),
        'max': column.max(),
        'min': column.min(),
        'mean': round(column.mean(), 3),
        'median': round(column.median(), 3),
        'distinct': column.nunique(),
        'null': column.isna().sum()
    }

    if profile['null'] == 0:
        column_type = 'real'
    else:
        column.dropna(inplace=True)
        column_type = 'integer' if (column % 1 == 0).all() else 'real'

    """
    # theorical auto probability density function
    if column_type == 'integer':
        distribution = {}
        count, limits = histogram(column, bins='auto')
        for index in range(len(limits)-1):
            distribution[f'({limits[index]},{limits[index+1]})'] = count[index]

        profile['distribution'] = distribution
    """
    # histogram
    if column_type == 'integer':
        counter = column.value_counts(dropna=True)
        profile['histogram'] = dict(counter)

    return profile, column_type


''' Integer columns '''


# profile for integer columns
def integer_column(column: DataFrame):
    column_type = 'integer'
    profile = {
        'sum': column.sum(),
        'max': column.max(),
        'min': column.min(),
        'mean': round(column.mean(), 3),
        'median': round(column.median(), 3),
        'distinct': column.nunique(),
        'null': column.isna().sum()
    }
    """
    # theorical auto probability density function
    if column_type == 'integer':
        distribution = {}
        count, limits = histogram(column, bins='auto')
        for index in range(len(limits)-1):
            distribution[f'({limits[index]},{limits[index+1]})'] = count[index]

        profile['distribution'] = distribution
    """
    # histogram
    counter = column.value_counts(dropna=True)
    profile['histogram'] = dict(counter)

    return profile, column_type


''' Categorical columns '''


# profile for categorical columns
def categorical_column(column: DataFrame, max_categories: int):
    counter = column.value_counts(dropna=True)
    if len(counter) > max_categories:
        raise CategoriesReachedException(f'Categories limit reached {max_categories}.')
    return {
            'null': column.isna().sum(),
            'categories': dict(counter)
    }


''' Date columns '''


def is_date(value: str):
    try:
        int(value.year)
        return True
    except (Exception,):
        return False


# profile for date columns
def date_column(column: DataFrame, date_threshold: float):
    date_threshold = int(date_threshold * len(column))

    nr_null = column.isna().sum()

    # all non-date items became null with errors = 'coerce'
    column = to_datetime(column, errors='coerce')

    # if number of failed conversion exceeds the threshold, then limit is reached
    if (column.isna().sum() - nr_null) > date_threshold:
        raise TresholdReachedException(f'Date limit reached {date_threshold}.')

    list_years = array(list(map(lambda item: str(item), column.apply(lambda row: row.year if is_date(row) else None)
                                .dropna())))

    dict_years = dict(Counter(list_years))
    profile = {
        'null': nr_null,
        'max': column.max(),
        'min': column.min(),
        'years': dict_years
    }

    return profile


''' String columns '''


def clean_text(text: str):

    # replacing everything with space except (a-z, A-Z)
    text = re.sub(r'[^a-zA-Z]+', ' ', text)

    # pipe of filter and map, first splitting string in list of words, then getting words not in stopwords,
    # finally converting them to lower case
    text = array(list(map(lambda word: word.lower(), filter(lambda word: word.lower() not in stopwords, text.split()))))

    return text


# profile for string columns

def string_column(column: DataFrame, n_frequent_words: int):
    profile = {
        'null': column.isna().sum()
    }

    counter = Counter()
    column.apply(lambda text: counter.update(clean_text(text)) if isinstance(text, str) else None)
    del column

    profile['words'] = len(counter.items())

    if n_frequent_words > profile['words']:
        profile['frequentWords'] = dict(counter.most_common())
    else:
        profile['frequentWords'] = dict(counter.most_common(n_frequent_words))

    del counter
    return profile
