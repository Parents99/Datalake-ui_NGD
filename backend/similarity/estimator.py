from scipy import spatial
from numpy import array, append


def calculate_similarity(embeddings=None):
    return 1 - spatial.distance.cosine(embeddings[0], embeddings[1])


def get_embedding(level_members=None, kg_members=None):
    embedding = array([])
    for kg_member in sorted(kg_members):
        check = False
        for level_member in level_members:
            if kg_member == level_member['item'].split('/')[-1]:
                check = True
                embedding = append(embedding, level_member['occurrences'])

        if check is False:
            embedding = append(embedding, 0)

    return embedding


def estimate(sources=None, usernames=None, k_graph=None, m_graph=None, log=None):
    log.add_row('Checking if sources have mapped domains..')

    # checking if sources have common levels
    levels = []
    for source_uri, username in zip(sources, usernames):
        mapped_domains = m_graph.get_mapped_domains_by_source_uri(source_uri, username=username)
        if len(mapped_domains) == 0:
            message = f'Source: {source_uri} has not mapped domains'
            log.add_row(message)
            return message, 200
        levels.append(mapped_domains.values())

    common_levels = list(set(levels[0]) & set(levels[1]))
    if len(common_levels) == 0:
        message = f'Sources have not common levels'
        log.add_row(message)
        return message, 200

    list_similarity = []
    for common_level in common_levels:
        # member extraction from level in kg
        level_members = k_graph.get_members_from_level(common_level, fragment_level=False, fragment_output=True)

        zipped = list(zip(sources, [common_level]*2, usernames))

        mapped_domains = [m_graph.get_mapped_domain_by_source_uri_and_level(source, level, username=username)
                          for source, level, username in zipped]

        zipped = list(zip(sources, mapped_domains, usernames))
        domains = [{"source": source, "domain": domain, "loadBy": username} for source, domain, username in zipped]

        members_domains = [m_graph.get_level_profile_filtered_by_source_and_domain_uris(source, domain, username=username)
                           for source, domain, username in zipped]

        # embedding
        embeddings = [get_embedding(members_domain, level_members) for members_domain in members_domains]

        # calculating similarity
        similarity = round((calculate_similarity(embeddings) * 100), 3)

        log.add_row(f'Level: {common_level}, sources: {sources}, domains: {mapped_domains}, similarity: {similarity}%')
        list_similarity.append({'level': common_level, 'similarity': similarity, 'comparison': domains})

    log.add_row('Done')
    return list_similarity, 200
