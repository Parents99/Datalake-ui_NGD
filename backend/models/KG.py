from config import ns_project, ns_kpionto

from rdflib import Graph, RDF
from typing import List, Any


class KG:
    graph = None

    def __init__(self, graph_name=None):
        self.graph = Graph()
        self.graph.parse(graph_name, format="turtle")
        self.graph.bind("kpi", ns_kpionto)
        self.graph.bind("ex", ns_project)
        self.graph.bind("rdf", RDF)

    def get_dimensions(self) -> List[str]:
        """Returns the dimensions from the Knowledge Graph

        :returns: a list of dimensions names
        :rtype: list
        """
        result = self.graph.query(
            f"""SELECT ?x
            WHERE {{ ?x <{RDF.type}> <{ns_kpionto.Dimension}> }}""")
        output = []
        for r in result:
            index = r[0].rfind('/')
            output.append(r[0][index + 1:])
        return output

    def get_levels(self, dimension: str = None) -> List[Any]:
        """Returns the levels for a given dimension from the Knowledge Graph

        :returns: a boolean representing the correct execution of the operation
        :rtype: list
        """
        if dimension:
            result = self.graph.query(
                f"""SELECT ?x
                WHERE {{ ?x <{RDF.type}> <{ns_kpionto.Level}>.
                ?x <{ns_kpionto.inDimension}> <{ns_project[dimension]}> }}"""
            )
        else:
            result = self.graph.query(
                f"""SELECT ?x
                WHERE {{ ?x <{RDF.type}> <{ns_kpionto.Level}> }}"""
            )
        output = []
        for r in result:
            index = r[0].rfind('/')
            output.append(r[0][index + 1:])
        return output

    def get_members_from_level(self, level: Any, fragment_level: bool = False,
                               fragment_output: bool = False) -> List[Any]:
        """Returns the list of members of a given level

        :param level: a level in the Knowledge Graph
        :type level: URIRef
        :param fragment_level: a boolean expressing whether the level parameter is a URIRef (False) or a string (True)
        (default is False).
        :type fragment_level: bool
        :param fragment_output: a boolean expressing whether the output is a list of strings (True) or URIRefs (
        True) (default is False).
        :type fragment_output: bool :returns: a boolean representing the correct execution
        of the operation
        :rtype: list
        """
        if fragment_level:
            level = f"{ns_project}{level}"
        result = self.graph.query(
            f"""SELECT ?x
            WHERE {{ ?x <{ns_kpionto.inLevel}> <{level}> }}"""
        )

        output = []
        for r in result:
            if fragment_output:
                index = r[0].rfind('/')
                output.append(r[0][index + 1:])
            else:
                output.append(r[0])
        return output
