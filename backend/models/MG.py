from config import ns_project, ns_kpionto, ns_datalake

from rdflib import Graph, URIRef, Literal, BNode, RDF, RDFS, XSD, DCTERMS, VOID
from datetime import date
from typing import List, Dict, Any
from path_utils import get_filename_from_location


class MG:

    def __init__(self, graph_name=None):
        self.graph = Graph()
        self.graph_name = graph_name
        self.graph.parse(graph_name, format="turtle")
        self.graph.bind("kpi", ns_kpionto)
        self.graph.bind("dl", ns_datalake)
        self.graph.bind("void", VOID)
        self.graph.bind("dcterms", DCTERMS)
        self.graph.bind("rdf", RDF)
        self.graph.bind("rdfs", RDFS)

    def get_sources_uri(self, username: str) -> List:
        """Returns the URIs for all the sources of the user 'username' in the Data Lake

        :param username: a string that represents the username of the user
        :type username: str
        :returns: a list of the URIs (as URIRef) representing the identifiers of the sources
        :rtype: list[URIRef]
        """
        result = self.graph.query(
            f"""SELECT ?uri
            WHERE{{
            ?uri <{RDF.type}> <{ns_datalake.Source}>;
            <{ns_datalake.loadBy}> ?user.
            FILTER(?user = "{username}").
            }}""")

        output = []
        for r in result:
            output.append(r[0])
        return output

    def get_sources_names(self) -> List:
        """Returns the filenames for all the sources in the Data Lake

        :returns: a list of the strings representing the filenames of the sources
        :rtype: list
        """
        result = self.graph.query(
            f"""SELECT ?uri
            WHERE{{
            ?uri <{RDF.type}> <{ns_datalake.Source}>.
            }}""")
        output = []
        for r in result:
            source_str = r[0].toPython()
            output.append(source_str.split(ns_project)[1])
        return output

    @staticmethod
    def get_uriref_from_filename(name: str) -> URIRef:
        """Returns a URI for the resource 'name'

        :param name: a string that represents the name of the resource to convert in URIRef
        :type name: str
        :returns: the URI (as URIRef) that represents the resource in the Data Lake
        :rtype: URIRef
        """
        return URIRef(ns_project[name])

    def get_source_path_by_name(self, source_name: str, username: str):
        """'

        """
        source_uri = self.get_uriref_from_filename(source_name)
        result = self.graph.query(
            f"""SELECT ?location
            WHERE{{
            <{source_uri}> <{RDF.type}> <{ns_datalake.Source}>;
            <{ns_datalake.location}> ?location;
            <{ns_datalake.loadBy}> ?user.
            FILTER(?user = "{username}").
            }}""")

        output = None
        for r in result:
            output = r[0].toPython()
        return output

    def get_sources_share_path(self, rel_source_path: str, username: str):
        """
        """
        result = self.graph.query(
            f"""SELECT ?uri
            WHERE{{
            ?uri <{RDF.type}> <{ns_datalake.Source}>;
            <{ns_datalake.location}> ?location;
            <{ns_datalake.loadBy}> ?user.
            FILTER(?user = ?target_user && ?location = ?target_location).
            }}""",
            initBindings={
                'target_user': Literal(username, datatype=XSD.string),
                'target_location': Literal(rel_source_path, datatype=XSD.string)
            })

        output = list()
        for r in result:
            output.append(r[0].toPython())
        return output

    def get_info_by_source_uri(self, source_uri: URIRef, username: str) -> Dict[str, Any]:
        """Returns all the metadata for the source 'source_uri' of user 'username'

        :param source_uri: the URI of the data source
        :type source_uri: URIRef
        :param username: the username of the user
        :type username: str
        :returns: a dictionary including uri, date, location, number of items, number of domains and user who loads
        the given source
        :rtype: dict
        """
        result = self.graph.query(
            f"""SELECT ?date ?location ?items ?domains ?user
            WHERE{{
            <{source_uri}> <{RDF.type}> <{ns_datalake.Source}>;
            <{DCTERMS.date}> ?date;
            <{ns_datalake.location}> ?location;
            <{ns_datalake.items}> ?items;
            <{ns_datalake.domains}> ?domains;
            <{ns_datalake.loadBy}> ?user.
            FILTER(?user = "{username}").
            }}""")

        output = dict()
        for r in result:
            output["uri"] = source_uri
            output["date"] = r[0].value
            output["location"] = r[1].value
            output["items"] = r[2].value
            output["domains"] = r[3].value
            output["user"] = r[4].value

        return output

    def get_path_by_source_uri(self, source_uri: URIRef, username: str) -> str:
        """Returns the path for the source 'source_uri' of the user 'username'

        :param source_uri: the URI of the data source
        :type source_uri: URIRef
        :param username: the username of the user
        :type username: str
        :returns: a string represents the path of the given source
        :rtype: str
        """
        result = self.graph.query(
            f"""SELECT ?location
            WHERE{{
            <{source_uri}> <{RDF.type}> <{ns_datalake.Source}>;
            <{ns_datalake.location}> ?location;
            <{ns_datalake.loadBy}> ?u.
            FILTER(?u = "{username}").
            }}""")

        path = None
        for r in result:
            path = get_filename_from_location(r[0].value)

        return path

    def get_mapped_domains_by_source_uri(self, source_uri: URIRef, username: str) -> Dict[str, str]:
        """Returns a dictionary including, for the given source, domains with the corresponding mapped level in the
        Knowledge Graph

        :param source_uri: the URI of the data source
        :type source_uri: URIRef
        :param username: the username of the user
        :type username: str
        :returns: a dictionary including the URIRef of
        a domain and the corresponding URIRef of the level in the Knowledge Graph
        :rtype: dict
        """
        result = self.graph.query(
            f"""SELECT ?x ?n
            WHERE{{
            <{source_uri}> <{RDF.type}> <{ns_datalake.Source}>;
            <{ns_datalake.loadBy}> ?u;
            <{ns_datalake.contains}> ?x.
            ?x <{RDF.type}> <{ns_datalake.Domain}>;
            <{ns_datalake.mapTo}> ?n;
            FILTER(?u = "{username}").
            }}""")

        output = dict()
        for r in result:
            output[r[0]] = r[1]
        return output

    def get_mapped_domain_by_source_uri_and_level(self, source_uri: URIRef, level: URIRef, username: str) -> URIRef:
        """Returns a dictionary including, for the given source, domains with the corresponding mapped level in the
        Knowledge Graph

        :param level:
        :param source_uri: the URI of the data source
        :type source_uri: URIRef
        :param username: the username of the user
        :type username: str
        :returns: a dictionary including the URIRef of
        a domain and the corresponding URIRef of the level in the Knowledge Graph
        :rtype: dict
        """
        result = self.graph.query(
            f"""SELECT ?x
            WHERE{{
            <{source_uri}> <{RDF.type}> <{ns_datalake.Source}>;
            <{ns_datalake.loadBy}> ?u;
            <{ns_datalake.contains}> ?x.
            ?x <{RDF.type}> <{ns_datalake.Domain}>;
            <{ns_datalake.mapTo}> ?n;
            FILTER(?u = "{username}" && ?n = <{level}>).
            }}""")

        output = None
        for r in result:
            output = r[0]
        return output

    def get_no_mapped_domains_by_source_uri(self, source_uri: str, username: str) -> Dict[str, str]:
        """Returns a dictionary including, for the given source, domains that are no-mapped to levels in the
        Knowledge Graph and corresponding type detected during profiling

        :param source_uri: the URI of the data source
        :type source_uri: URIRef
        :param username: the username of the user
        :type username: str
        :returns: a dictionary including the URIRef of
        a domain and the corresponding type detected in profiling source
        :rtype: dict
        """
        result = self.graph.query(
            f"""SELECT ?x ?n
            WHERE{{
            <{source_uri}> <{RDF.type}> <{ns_datalake.Source}>;
            <{ns_datalake.loadBy}> ?u;
            <{ns_datalake.contains}> ?x.
            ?x <{RDF.type}> <{ns_datalake.Domain}>;
            <{ns_datalake.type}> ?n.
            FILTER((?u = "{username}") && (?n = "integer" || ?n = "real" || ?n = "date" ||
            ?n = "categorical" || ?n = "string" || ?n = "unknown")).
            }}""")
        output = dict()
        for r in result:
            output[r[0]] = r[1]
        return output

    def get_domains_by_source_uri(self, source_uri: URIRef, username: str) -> dict:
        """Returns a dictionary including, for the given source, both domains that are no-mapped to levels and
        others that are mapped

        :param source_uri: the URI of the data source
        :type source_uri: URIRef
        :param username: the username of the user
        :type username: str
        :returns: a dictionary including the URIRef of
        a domain and the corresponding type detected in profiling source (if no-mapped),
        else level which is mapped to knowledge graph.
        :rtype: dict
        """
        return dict(self.get_no_mapped_domains_by_source_uri(source_uri, username).items() |
                    self.get_mapped_domains_by_source_uri(source_uri, username).items())

    def get_level_by_source_and_domain_uris(self, source_uri: URIRef, domain_uri: URIRef, username: str)\
            -> URIRef | None:
        """Returns the level in the Knowledge Graph that is mapped to the given domain provided by source and username

        :param source_uri: the URI of the source
        :type source_uri: URIRef
        :param domain_uri: the URI of the domain
        :type domain_uri: URIRef
        :param username: the username of the user
        :type username: str
        :returns: the URI of the corresponding mapped level
        :rtype: URIRef
        """
        result = self.graph.query(
            f"""SELECT ?x ?n 
            WHERE{{
            <{source_uri}> <{RDF.type}> <{ns_datalake.Source}>;
            <{ns_datalake.contains}> <{domain_uri}>;
            <{ns_datalake.loadBy}> ?u.
            <{domain_uri}> <{RDF.type}> <{ns_datalake.Domain}>;
            <{ns_datalake.mapTo}> ?x.
            FILTER(?u = "{username}").
            }}""")

        output = None
        for r in result:
            output = r[0]
        return output

    def get_level_profile_by_source_and_domain_uris(self, source_uri: URIRef, domain_uri: URIRef, username: str)\
            -> list[dict]:
        """Returns all the profile items for the level domain_uri

        :param source_uri: the URI of the source
        :type source_uri: URIRef
        :param domain_uri: the URI of the domain
        :type domain_uri: URIRef
        :param username: the username of the user
        :type username: str
        :returns: a list of dictionaries that contains level in the Knowledge Graph
        and the corresponding number of occurrences
        :rtype: list[dict]
        """
        output = []
        result = self.graph.query(
            f"""SELECT ?m ?f 
            WHERE{{
            <{source_uri}> <{ns_datalake.loadBy}> ?u;
            <{RDF.type}> <{ns_datalake.Source}>;
            <{ns_datalake.contains}> <{domain_uri}>.
            <{domain_uri}> <{RDF.type}> <{ns_datalake.Domain}>;
            <{ns_datalake.hasProfileElement}> ?b.
            ?b <{ns_datalake.toMember}> ?m;
            <{ns_datalake.frequency}> ?f.
            FILTER(?u = "{username}").
            }}""")
        for r in result:
            output.append({"item": r[0], "occurrences": r[1].value})
        return output

    def get_level_profile_filtered_by_source_and_domain_uris(self, source_uri: URIRef, domain_uri: URIRef, username: str)\
            -> list[dict]:
        """Returns all the profile items for the level domain_uri

        :param source_uri: the URI of the source
        :type source_uri: URIRef
        :param domain_uri: the URI of the domain
        :type domain_uri: URIRef
        :param username: the username of the user
        :type username: str
        :returns: a list of dictionaries that contains level in the Knowledge Graph
        and the corresponding number of occurrences
        :rtype: list[dict]
        """
        output = []
        result = self.graph.query(
            f"""SELECT ?m ?f 
            WHERE{{
            <{source_uri}> <{ns_datalake.loadBy}> ?u;
            <{RDF.type}> <{ns_datalake.Source}>;
            <{ns_datalake.contains}> <{domain_uri}>.
            <{domain_uri}> <{RDF.type}> <{ns_datalake.Domain}>;
            <{ns_datalake.hasProfileElement}> ?b.
            ?b <{ns_datalake.toMember}> ?m;
            <{ns_datalake.frequency}> ?f.
            FILTER(?u = "{username}").
            }}""")
        for r in result:
            if 'other' not in r[0].toPython():
                output.append({"item": r[0], "occurrences": r[1].value})
        return output

    def get_domain_type_by_source_and_domain_uris(self, source_uri: URIRef, domain_uri: URIRef, username: str) -> str:
        """Returns the type detected during profiling for the domain domain_uri

        :param source_uri: the URI of the source
        :type source_uri: URIRef
        :param domain_uri: the URI of the domain
        :type domain_uri: URIRef
        :param username: the username of the user
        :type username: str
        :returns: a string that represents the type of the domain
        :rtype: str
        """
        result = self.graph.query(
            f"""SELECT ?n
            WHERE{{
            <{source_uri}> <{ns_datalake.loadBy}> ?u;
            <{RDF.type}> <{ns_datalake.Source}>;
            <{ns_datalake.contains}> <{domain_uri}>.        
            <{domain_uri}> <{RDF.type}> <{ns_datalake.Domain}>;
            <{ns_datalake.type}> ?n.
            FILTER(?u = "{username}").
            }}""")

        type = None
        for r in result:
            type = r[0].value
        return type

    def get_column_profile_by_source_and_domain_uris(self, source_uri: URIRef, domain_uri: URIRef, username: str) -> dict:
        """Returns all the profile items for the domain domain_uri

        :param source_uri: the URI of the source
        :type source_uri: URIRef
        :param domain_uri: the URI of the domain
        :type domain_uri: URIRef
        :param username: the username of the user
        :type username: str
        :returns: a dictionaries that contains domain profile
        :rtype: dict
        """
        domain_type = self.get_domain_type_by_source_and_domain_uris(source_uri, domain_uri, username)
        profile = {}
        if domain_type == "integer" or domain_type == "real":
            if domain_type == "integer":
                distribution = []
                """
                # if pdf
                d = self.graph.query(
                    fSELECT ?value ?start ?stop
                    WHERE{{
                    <{domain_uri}> <{ns_datalake.hasProfileElement}> ?p.
                    ?p <{ns_datalake.histogram}> ?x.
                    ?x <{ns_datalake.occurrences}> ?value;
                    <{ns_datalake.startRange}> ?start;
                    <{ns_datalake.endRange}> ?stop.
                    }})
                for res in d:
                    distribution.append({"start": res.start.value, "stop": res.stop.value,
                                         "occurrences": res.value.value})
                profile["distribution"] = distribution
                """
                d = self.graph.query(
                    f"""SELECT ?value ?name
                    WHERE{{
                    <{domain_uri}> <{ns_datalake.hasProfileElement}> ?p.
                    ?p <{ns_datalake.histogram}> ?x.
                    ?x <{ns_datalake.occurrences}> ?value;
                    <{ns_datalake.item}> ?name;
                    }}""")
                for res in d:
                    distribution.append({"occurrences": res.value.value, "item": res.name.toPython()})
                profile["histogram"] = distribution

            features = ["null", "mean", "distinct", "sum", "median", "max", "min"]
            for feature in features:
                result = self.graph.query(
                    f"""SELECT ?f
                    WHERE{{
                    <{domain_uri}> <{ns_datalake.hasProfileElement}> ?b.
                    ?b <{ns_datalake[feature]}> ?f.
                    }}""")
                for r in result:
                    profile[feature] = r.f.value
            return profile

        elif domain_type == "categorical":
            categories = []
            c = self.graph.query(
                f"""SELECT ?cat ?value
                WHERE{{
                <{domain_uri}> <{ns_datalake.hasProfileElement}> ?p.
                ?p <{ns_datalake.categories}> ?x.
                ?x <{ns_datalake.occurrences}> ?value;
                <{ns_datalake.item}> ?cat.
                }}""")
            for res in c:
                categories.append({"item": res.cat.value, "occurrences": res.value.value})
            profile["categories"] = categories

            features = ["null"]
            for feature in features:
                result = self.graph.query(
                    f"""SELECT ?f
                    WHERE{{
                    <{domain_uri}> <{ns_datalake.hasProfileElement}> ?b.
                    ?b <{ns_datalake[feature]}> ?f.
                    }}""")
                for r in result:
                    profile[feature] = r.f.value
            return profile

        elif domain_type == "date":
            years = []
            d = self.graph.query(
                f"""SELECT ?value ?year
                WHERE{{
                <{domain_uri}> <{ns_datalake.hasProfileElement}> ?p.
                ?p <{ns_datalake.years}> ?x.
                ?x <{ns_datalake.occurrences}> ?value;
                <{ns_datalake.item}> ?year.
                }}""")
            for res in d:
                years.append({"occurrences": res.value.value, "item": res.year})
            profile["years"] = years

            features = ["null", "max", "min"]
            for feature in features:
                result = self.graph.query(
                    f"""SELECT ?f
                    WHERE{{
                    <{domain_uri}> <{ns_datalake.hasProfileElement}> ?b.
                    ?b <{ns_datalake[feature]}> ?f.
                    }}""")
                for r in result:
                    profile[feature] = r.f
            return profile

        elif domain_type == "string":
            mfw = []
            d = self.graph.query(
                f"""SELECT ?value ?word
                WHERE{{
                <{domain_uri}> <{ns_datalake.hasProfileElement}> ?p.
                ?p <{ns_datalake.frequentWords}> ?x.
                ?x <{ns_datalake.occurrences}> ?value;
                <{ns_datalake.item}> ?word.
                }}""")
            for res in d:
                mfw.append({"occurrences": res.value.value, "item": res.word.value})
            profile["frequentWords"] = mfw

            features = ["null", "words"]
            for feature in features:
                result = self.graph.query(
                    f"""SELECT ?f
                    WHERE{{
                    <{domain_uri}> <{ns_datalake.hasProfileElement}> ?b.
                    ?b <{ns_datalake[feature]}> ?f.
                     }}""")
                for r in result:
                    profile[feature] = r.f.value
            return profile

    def add_real_profile(self, domain_uri: URIRef, column_info: dict) -> None:
        """Adds the profile for the domain 'domain_uri'

        :param domain_uri: the URIRef of the column analyzed
        :type domain_uri: URIRef
        :param column_info: the dictionary that contains statistics
        :type column_info: dict
        :rtype: None

        """
        for stats_key, stats_value in column_info.items():
            profile_node = BNode()
            self.graph.add((domain_uri, ns_datalake.hasProfileElement, profile_node))

            # values
            datatype = XSD.int if stats_key == "null" or stats_key == "distinct" else XSD.float
            value = int(stats_value) if stats_key == "null" or stats_key == "distinct" else float(stats_value)

            self.graph.add((profile_node, ns_datalake[stats_key], Literal(value, datatype=datatype)))

    def add_integer_profile(self, domain_uri: URIRef, column_info: dict) -> None:
        """Adds the profile for the domain 'domain_uri'

        :param domain_uri: the URIRef of the column analyzed
        :type domain_uri: URIRef
        :param column_info: the dictionary that contains statistics
        :type column_info: dict
        :rtype: None
        """
        for stats_key, stats_value in column_info.items():
            profile_node = BNode()
            self.graph.add((domain_uri, ns_datalake.hasProfileElement, profile_node))

            # distribution form is {(inf0, sup0): count0, (inf1, sup1): count1,...}
            if isinstance(stats_value, dict):
                # iterating over dict items
                for interval, value in stats_value.items():
                    d_node = BNode()
                    self.graph.add((profile_node, ns_datalake[stats_key], d_node))

                    """
                    # if pdf adding lower, upper and count to node
                    interval_parsed = interval.replace('(', '').replace(')', '').split(',')

                    lower_range, upper_range = float(interval_parsed[0]), float(interval_parsed[1])
                    self.graph.add(
                        (d_node, ns_datalake.startRange, Literal(lower_range, datatype=XSD.float)))
                    self.graph.add(
                        (d_node, ns_datalake.occurrences, Literal(int(float(value)), datatype=XSD.int)))
                    self.graph.add(
                        (d_node, ns_datalake.endRange, Literal(upper_range, datatype=XSD.float)))
                    """
                    self.graph.add((d_node, ns_datalake.occurrences, Literal(value, datatype=XSD.int)))
                    self.graph.add((d_node, ns_datalake.item, Literal(interval, datatype=XSD.string)))

            else:
                # values
                datatype = XSD.float if stats_key == "mean" or stats_key == "median" else XSD.int
                value = float(stats_value) if stats_key == "mean" or stats_key == "median" else int(stats_value)

                self.graph.add((profile_node, ns_datalake[stats_key], Literal(value, datatype=datatype)))

    def add_string_profile(self, domain_uri: URIRef, column_info: dict) -> None:
        """Adds the profile for the domain 'domain_uri'

        :param domain_uri: the URIRef of the column analyzed
        :type domain_uri: URIRef
        :param column_info: the dictionary that contains statistics
        :type column_info: dict
        :rtype: None
        """
        for stats_key, stats_value in column_info.items():
            profile_node = BNode()
            self.graph.add((domain_uri, ns_datalake.hasProfileElement, profile_node))

            # mfw is a dict of type {"word1": occ1, "word2": occ2,...}
            if isinstance(stats_value, dict):
                # blank node for occurrences to add at profile

                for word, count in stats_value.items():
                    d_node = BNode()
                    self.graph.add((profile_node, ns_datalake[stats_key], d_node))
                    self.graph.add((d_node, ns_datalake.occurrences, Literal(count, datatype=XSD.int)))
                    self.graph.add((d_node, ns_datalake.item, Literal(word, datatype=XSD.string)))

            else:
                self.graph.add(
                    (profile_node, ns_datalake[stats_key], Literal(int(stats_value), datatype=XSD.int)))

    def add_date_profile(self, domain_uri: URIRef, column_info: dict) -> None:
        """Adds the profile for the domain 'domain_uri'

        :param domain_uri: the URIRef of the column analyzed
        :type domain_uri: URIRef
        :param column_info: the dictionary that contains statistics
        :type column_info: dict
        :rtype: None
        """
        for stats_key, stats_value in column_info.items():
            profile_node = BNode()
            self.graph.add((domain_uri, ns_datalake.hasProfileElement, profile_node))

            # distribution form is {year: count1, year: count2,...}
            if isinstance(stats_value, dict):
                # iterating over dict items
                for year, occurrences in stats_value.items():
                    d_node = BNode()
                    self.graph.add((profile_node, ns_datalake[stats_key], d_node))

                    datatype = XSD.string if year == "null" else XSD.int
                    self.graph.add((d_node, ns_datalake.item, Literal(year, datatype=XSD.year)))
                    self.graph.add((d_node, ns_datalake.occurrences, Literal(int(occurrences), datatype=datatype)))

            else:
                datatype = XSD.int if stats_key == "null" else XSD.dateTime
                self.graph.add((profile_node, ns_datalake[stats_key], Literal(stats_value, datatype=datatype)))

    def add_categorical_profile(self, domain_uri: URIRef, column_info: dict) -> None:
        """Adds the profile for the domain 'domain_uri'

        :param domain_uri: the URIRef of the column analyzed
        :type domain_uri: URIRef
        :param column_info: the dictionary that contains statistics
        :rtype None
        """
        for stats_key, stats_value in column_info.items():
            profile_node = BNode()
            self.graph.add((domain_uri, ns_datalake.hasProfileElement, profile_node))
            if isinstance(stats_value, dict):
                for category, occurrences in stats_value.items():
                    d_node = BNode()
                    self.graph.add((profile_node, ns_datalake[stats_key], d_node))

                    cat = Literal(category, datatype=XSD.string)
                    self.graph.add((d_node, ns_datalake.item, cat))

                    value = Literal(occurrences, datatype=XSD.int)
                    self.graph.add((d_node, ns_datalake.occurrences, value))
            else:
                datatype = XSD.int
                self.graph.add((profile_node, ns_datalake[stats_key], Literal(stats_value, datatype=datatype)))

    def add_level_profile(self, domain_uri: URIRef, column_info: dict) -> None:
        """Adds the profile for the domain 'domain_uri'

        :param domain_uri: the URIRef of the column analyzed
        :type domain_uri: URIRef
        :param column_info: the dictionary that contains statistics
        :type column_info: dict
        :rtype None
        """
        for key, value in column_info.items():
            profile_node = BNode()
            self.graph.add((domain_uri, ns_datalake.hasProfileElement, profile_node))

            # Store a profile item
            self.graph.add((profile_node, ns_datalake.toMember, URIRef(key)))
            self.graph.add((profile_node, ns_datalake.frequency, Literal(value, datatype=XSD.int)))

    def add_profile(self, filename: str, column_name: str, column_type: str, column_info: dict) -> None:
        """ Add profile of the domain 'column_name' to metadata graph

        :param filename: the name of the source without the extension
        :type filename: str
        :param column_name: the name of the column analyzed
        :type column_name: str
        :param column_type: a string that represents the type detected during profiling
        :type column_info: str
        :param column_info: the dictionary that contains statistics
        :type column_info: dict
        :rtype: None
        """
        column_uri = self.get_uriref_from_filename(f'{filename}_{column_name}')
        self.graph.add((column_uri, ns_datalake.type, Literal(column_type, datatype=XSD.string)))
        self.graph.add((column_uri, RDFS.label, Literal(column_name, datatype=XSD.string)))

        if column_type == "level":
            self.add_level_profile(column_uri, column_info)

        elif column_type == "integer":
            self.add_integer_profile(column_uri, column_info)

        elif column_type == "real":
            self.add_real_profile(column_uri, column_info)

        elif column_type == "categorical":
            self.add_categorical_profile(column_uri, column_info)

        elif column_type == "date":
            self.add_date_profile(column_uri, column_info)

        elif column_type == "string":
            self.add_string_profile(column_uri, column_info)
        else:
            return

    def add_source(self, source: str, num_items: int, domains: list, filepath: str, username: str) -> None:
        """Adds a source to the metadata graph

        :param source: the URI of the source
        :type source: URIRef
        :param num_items: the number of items in the source
        :type num_items: int
        :param domains: the number of domains in the source
        :type domains: int
        :param filepath: the filepath of the source
        :type filepath: str
        :param username: a string that represents the username of the user
        :type username: str
        :rtype None
        """
        source_uri = self.get_uriref_from_filename(source)
        self.graph.add((source_uri, RDF.type, ns_datalake.Source))
        self.graph.add((source_uri, RDF.type, VOID.Dataset))
        self.graph.add(
            (source_uri, ns_datalake.location, Literal(filepath, datatype=XSD.string)))
        self.graph.add(
            (source_uri, ns_datalake.loadBy, Literal(username, datatype=XSD.string)))
        self.graph.add(
            (source_uri, DCTERMS.date, Literal(date.today(), datatype=XSD.date)))
        self.graph.add(
            (source_uri, ns_datalake.items, Literal(num_items, datatype=XSD.int)))
        self.graph.add(
            (source_uri, ns_datalake.domains, Literal(len(domains), datatype=XSD.int)))

        for domain in domains:
            domain_uri = self.get_uriref_from_filename(f'{source}_{domain}')
            self.graph.add((domain_uri, RDF.type, ns_datalake.Domain))
            self.graph.add((source_uri, ns_datalake.contains, domain_uri))

    def get_source_uri_by_name(self, source_name: str, username: str) -> URIRef | str:
        """Return the source URIRef given the corresponding name as string, if found,
        else a string that indicates not found

        :param source_name: a string that represents the source name
        :type source_name: str
        :param username: a string that represents the username of the user
        :type username: str
        :rtype URIRef | str
        """
        sources_uri = self.get_sources_uri(username=username)
        if type(source_name) is str:
            source_uri = self.get_uriref_from_filename(source_name)
            if source_uri in sources_uri:
                data = source_uri
            else:
                return None
            return data

    def get_domain_uri_by_name(self, source_uri: URIRef, domain_name: str, username: str) -> URIRef | str:
        """Return the domain URIRef given the corresponding name as string, if found,
        else a string that indicates not found

        :param source_uri: the URIRef that represents the source
        :type source_uri: URIRef
        :param domain_name: a string that represents the source name
        :type domain_name: str
        :param username: a string that represents the username of the user
        :type username: str
        :rtype URIRef | str
        """
        source_name = source_uri.split('/')[-1]
        domain_uri = self.get_uriref_from_filename(f'{source_name}_{domain_name}')

        if domain_uri in self.get_domains_by_source_uri(source_uri, username=username):
            return domain_uri
        else:
            data = None
        return data

    def map(self, source_name: str, domain_name: str, level_name: str) -> None:
        """Adds the mapping between a domain in a source and a level in the Knowledge Graph

        :param source_name: the string that represents the source name
        :type source_name: str
        :param domain_name: the fragment for the URI of a domain
        :type domain_name: str
        :param level_name: the fragment of the URI of a level
        :type level_name: str
        :rtype None

        """
        domain_uri = self.get_uriref_from_filename(f'{source_name}_{domain_name}')
        level_uri = self.get_uriref_from_filename(level_name)
        self.graph.add((domain_uri, ns_datalake.mapTo, level_uri))

    def serialize(self) -> None:
        """Serializes the metadata graph in the storage.
        This operation needs to be done when some changes have been done on the metadata graph.

        :rtype: None
        """
        self.graph.serialize(destination=self.graph_name, format="turtle")

    def clear_source_by_uri(self, source_uri: URIRef, username: str) -> bool:
        """Remove the source from the metadata graph.

        :param source_uri: the URIRef that represents the source
        :type source_uri: URIRef
        :param username: a string that represents the username of the user
        :type username: str
        :returns: a boolean representing the correct execution of the operation
        :rtype: bool
        """
        try:
            result = self.graph.query(
                f"""SELECT ?x
                WHERE{{
                <{source_uri}> <{ns_datalake.loadBy}> ?u;
                <{RDF.type}> <{ns_datalake.Source}>;
                <{ns_datalake.contains}> ?x;
                FILTER(?u = "{username}").
                ?x <{RDF.type}> <{ns_datalake.Domain}>;
                }}""")
            domains_uri = [r[0] for r in result]
            for domain_uri in domains_uri:
                result = self.graph.query(
                    f"""SELECT ?x
                    WHERE{{
                    <{domain_uri}> <{ns_datalake.type}> ?x.
                    }}""")
                domain_type = [r[0].toPython() for r in result][0]

                p_nodes = self.graph.query(
                    f"""SELECT ?p
                    WHERE{{
                    <{domain_uri}> <{ns_datalake.hasProfileElement}> ?p.
                    }}""")
                if domain_type == "integer":
                    d_nodes = self.graph.query(
                        f"""SELECT ?x
                        WHERE{{
                        <{domain_uri}> <{ns_datalake.hasProfileElement}> ?p.
                        ?p <{ns_datalake.histogram}> ?x.
                        }}""")
                    for distribution in d_nodes:
                        self.graph.remove((distribution[0], None, None))

                elif domain_type == "categorical":
                    c_nodes = self.graph.query(
                        f"""SELECT ?x
                        WHERE{{
                        <{domain_uri}> <{ns_datalake.hasProfileElement}> ?p.
                        ?p <{ns_datalake.categories}> ?x.
                        }}""")
                    for category in c_nodes:
                        self.graph.remove((category[0], None, None))

                elif domain_type == "date":
                    y_nodes = self.graph.query(
                        f"""SELECT ?x
                        WHERE{{
                        <{domain_uri}> <{ns_datalake.hasProfileElement}> ?p.
                        ?p <{ns_datalake.years}> ?x.
                        }}""")
                    for year in y_nodes:
                        self.graph.remove((year[0], None, None))

                elif domain_type == "string":
                    mfw_nodes = self.graph.query(
                        f"""SELECT ?x
                        WHERE{{
                        <{domain_uri}> <{ns_datalake.hasProfileElement}> ?p.
                        ?p <{ns_datalake.frequentWords}> ?x.
                        }}""")
                    for mfw in mfw_nodes:
                        self.graph.remove((mfw[0], None, None))

                for profile in p_nodes:
                    self.graph.remove((profile[0], None, None))

                self.graph.remove((domain_uri, None, None))

            self.graph.remove((source_uri, None, None))
            self.serialize()
            return True
        except (Exception,):
            return False

    def clear_sources(self, username: str) -> bool:
        """Remove all sources of the user 'username' from the metadata graph.

        :param username: a string that represents the username of the user
        :type username: str
        :returns: a boolean representing the correct execution of the operation
        :rtype: bool
        """
        try:
            sources_uri = self.get_sources_uri(username=username)
            for source_uri in sources_uri:
                self.clear_source_by_uri(source_uri, username)
            self.serialize()
        except (Exception,):
            return False
        return True

    def raw_query(self, raw_text: str) -> list:
        """Execute an arbitrary query in the metadata graph.

        :param raw_text: a string that represents filtered text of query
        :type raw_text: str
        :returns: a list that contains results about query
        :rtype: list
        """
        output = []
        result = self.graph.query(raw_text)
        for r in result:
            output.append(r)
        return output
