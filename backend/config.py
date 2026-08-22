from os.path import join, dirname, abspath
from rdflib import Namespace

# PARAMS FOR KNOWLEDGE GRAPH GENERATION
N_DIMENSIONS = 5
N_LEVELS = 5
INITIAL_POPULATION = 5
GROWING_FACTOR = 1


# DIRECTORY CONFIGURATION
APP_DIR = dirname(abspath(__file__))

DS_DIR = join(APP_DIR, 'datasets', '')
MOUNT_DIR = join(DS_DIR, 'to_mount', '')
LOG_DIR = join(APP_DIR, 'log', 'log.txt')
USERS_PATH = join(APP_DIR, 'users', 'users.csv')
NLTK_DIR = join(APP_DIR, 'nltk_data')
MG_PATH = join(APP_DIR, 'mg', 'metadata.ttl')
KG_PATH = join(APP_DIR, 'kg', f'knowledge_graph_D{N_DIMENSIONS}_L{N_LEVELS}_{INITIAL_POPULATION}.ttl')

nltk_language = 'english'

MOUNT_DEFAULT_PARAMETERS = {
    "stringProcessing": True,
    "maxCategories": 4,
    "dateThreshold": 0.3,
    'frequentWords': 10,
    'remount': False
}

# NAMESPACES
ns_project = Namespace('http://kdmg.dii.univpm.it/test/')
ns_kpionto = Namespace('http://w3id.org/kpionto/')
ns_datalake = Namespace('http://kdmg.dii.univpm.it/datalake/')
ns_dcterms = Namespace('http://purl.org/dc/terms/')
ns_void = Namespace('http://rdfs.org/ns/void#')


# PARAMS FOR LSH ENSEMBLE
NUM_PERM = 256
NUM_PART = 32
THRESHOLD = 0.6


# PARAMS FOR DATASET GENERATION
NUM_ROWS = [5_000, 10_000, 50_000]
NUM_COLS = [10, 20]
PERC_NOISE = [10]
PERC_DIMENSIONS = 0.2
PERC_COLUMNS = {
    'level': 0.2,
    'integer': 0.3,
    'real': 0.2,
    'date': 0.1,
    'categorical': 0.1,
    'string': 0.1
}
TEXT = join(APP_DIR, 'generators', 'romeo_and_juliet.txt')
