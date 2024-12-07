import Schema = require('./schema');
import Client = require('./client');

const connect = Client.connect;
const ElastickBird = {
    connect
};

export default ElastickBird;
export { connect, Schema };