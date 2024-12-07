import Client from "@elastic/elasticsearch"
export interface ElastickBird {
    connect: Function<Client>;
}