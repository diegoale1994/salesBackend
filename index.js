const { ApolloServer } = require('apollo-server');
const resolvers = require('./db/resolvers');
const typeDefs = require('./db/schema');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'variables.env' });



const conectarDB = require('./config/db');
conectarDB();

//Server
const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
        const token = req.headers['authorization'] || '';
        if (token) {
            try {
                const usuario = jwt.verify(token.replace('Bearer ', ''), process.env.SECRET_KEY);
                return {
                    usuario
                }
            } catch (error) {
                console.log(error);
            }
        }
    }
});


//arrancar el server
server.listen().then(({ url }) => {
    console.log(`server ready in url => ${url}`);
})