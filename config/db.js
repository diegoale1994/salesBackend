const mongoose = require('mongoose');

require('dotenv').config({ path: 'variables.env' });

const conectarDB = async () => {
    try {
        await mongoose.connect(process.env.DB_MONGO, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
            useCreateIndex: true
        });
        console.log('DB CONECTED');
    } catch (error) {
        console.log(`Ha ocurrido un error conectando a la BD + ${error}`);
        process.exit(1);
    }
}

module.exports = conectarDB;