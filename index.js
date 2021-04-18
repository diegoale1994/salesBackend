const { ApolloServer } = require('apollo-server');
const resolvers = require('./db/resolvers');
const typeDefs = require('./db/schema');


const conectarDB = require('./config/db');
conectarDB();


//Server
const server = new ApolloServer({
    typeDefs,
    resolvers
});


//arrancar el server
server.listen().then(({ url }) => {
    console.log(`server ready in url => ${url}`);
})