from models.KG import KG
from models.MG import MG
from config import ns_kpionto, ns_datalake

from rdflib import URIRef, RDF, RDFS, VOID, DCTERMS


class DLGraph:

    def __init__(self, k_graph=None, m_graph=None):
        self.k_graph = KG(k_graph)
        self.m_graph = MG(m_graph)
        self.graph = self.k_graph.graph + self.m_graph.graph
        self.graph_name = "global graph"
        self.graph.bind("kpi", ns_kpionto)
        self.graph.bind("dl", ns_datalake)
        self.graph.bind("void", VOID)
        self.graph.bind("dcterms", DCTERMS)
        self.graph.bind("rdf", RDF)
        self.graph.bind("rdfs", RDFS)

    def get_m_graph(self):
        return self.m_graph

    def get_k_graph(self):
        return self.k_graph

    def get_level_profile_up(self, source_uri: URIRef, domain_uri: URIRef, username: str) -> list:
        """Returns the upper level profile for a domain by aggregating the frequencies

        :param source_uri: the URIRef of a source
        :type source_uri: URIRef
        :param domain_uri: the URIRef of a domain
        :type domain_uri: URIRef
        :param username: the username of the current user
        :type username: str
        :returns: a dictionary including a URIRef representing a member and the corresponding frequency
        :rtype: URIRef
        """
        result = self.graph.query(
            f"""SELECT ?mroll (SUM(?f) as ?sum)
            WHERE{{
            <{source_uri}> <{RDF.type}> <{ns_datalake.Source}>;
            <{ns_datalake.loadBy}> ?u;
            <{ns_datalake.contains}> <{domain_uri}>.
            <{domain_uri}> <{RDF.type}> <{ns_datalake.Domain}>;
            <{ns_datalake.hasProfileElement}> ?b.
            ?b <{ns_datalake.toMember}> ?m.
            ?m <{ns_kpionto.mRollup}> ?mroll.
            ?b <{ns_datalake.frequency}> ?f.
            FILTER(?u = "{username}").
            }}
            GROUP BY ?mroll
            """)
        output = []
        for r in result:
            output.append({"item": r[0], "occurrences": r[1].value})
        return output

    def eval_completeness(self, source_uri: URIRef, domain_uri: URIRef, username: str) -> float:
        """Returns the completeness level of the domain, i.e. considering the cardinality of the level to which the
        domain is mapped to, the completeness is computed as the ratio of level's members that are included in the
        domain as values

        :param source_uri: the URIRef of a source
        :type source_uri: URIRef
        :param domain_uri: the URIRef of a domain
        :type domain_uri: URIRef
        :param username: the username of the current user
        :type username: str
        :returns: a float representing the completeness level
        :rtype: float
        """
        level = self.m_graph.get_level_by_source_and_domain_uris(source_uri, domain_uri, username)
        members = self.k_graph.get_members_from_level(level)
        filtered_profile = self.m_graph.get_level_profile_filtered_by_source_and_domain_uris(source_uri, domain_uri, username)
        return len(filtered_profile) / len(members)
