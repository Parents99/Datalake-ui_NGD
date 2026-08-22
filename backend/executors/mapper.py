from datasketch import MinHashLSHEnsemble, MinHash
from config import NUM_PERM, NUM_PART, THRESHOLD


def initialize_lsh(kg):
    # Create an LSH Ensemble index with threshold and number of partition settings.
    lsh_ensemble = MinHashLSHEnsemble(threshold=THRESHOLD, num_perm=NUM_PERM, num_part=NUM_PART)

    # Initialize lsh_ensemble
    index = []
    dimensions = kg.get_dimensions()
    # Extract all levels and create MinHash for each
    for dim in dimensions:
        levels = kg.get_levels(dim)
        for lev in levels:
            members = kg.get_members_from_level(lev, fragment_level=True, fragment_output=True)

            # Create the MinHash for the i-th level
            m = MinHash(num_perm=NUM_PERM)
            m.update_batch([s.encode('utf8') for s in members])
            index.append(tuple((lev, m, len(members))))
    # Pack all together
    lsh_ensemble.index(index)
    return lsh_ensemble


def map_source_domain(values, lsh_ensemble):
    # Hashing the dataset column
    m = MinHash(NUM_PERM)
    values_set = set(values)
    m.update_batch([s.encode('utf8') for s in values_set])

    mappings = lsh_ensemble.query(m, len(values_set))
    return mappings
