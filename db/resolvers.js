const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const bcryptjs = require('bcryptjs');
require('dotenv').config({ path: 'variables.env' });
const jwt = require('jsonwebtoken');

const crearToken = (usuario, palabraSecreta, expiracion) => {
    const { id, email, nombre, apellido } = usuario;
    return jwt.sign({ id }, palabraSecreta, { expiresIn: expiracion });
}
//Resolvers
const resolvers = {
    Query: {
        obtenerUsuario: async (_, { token }) => {
            const usuarioId = await jwt.verify(token, process.env.SECRET_KEY);
            return usuarioId;
        },
        obtenerProductos: async () => {
            try {
                const productos = await Producto.find({});
                return productos;
            } catch (error) {
                console.log(error);
            }
        }
    },
    Mutation: {
        nuevoUsuario: async (_, { input }) => {

            const { email, password } = input;

            //revisar si el usuario esta registrados
            const existeUsuario = await Usuario.findOne({ email });
            if (existeUsuario) {
                throw new Error('El usuario ya esta registrado');
            }

            //hashear el password para
            const salt = bcryptjs.genSaltSync(10);
            input.password = bcryptjs.hashSync(password, salt);

            //guardar en la base de datos
            try {
                const usuario = new Usuario(input);
                usuario.save();
                return usuario;
            } catch (error) {
                console.log(error);
            }

        },
        autenticarUsuario: async (_, { input }) => {
            //revisar si el usuario existe
            const { email, password } = input;
            const existeUsuario = await Usuario.findOne({ email });
            if (!existeUsuario) {
                throw new Error('El usuario no existe!')
            }

            //revisar si el password es correcto
            const passwordCorrecto = bcryptjs.compareSync(password, existeUsuario.password);
            if (!passwordCorrecto) {
                throw new Error('El password es Incorrecto')
            }

            //crear Token
            return {
                token: crearToken(existeUsuario, process.env.SECRET_KEY, '24h')
            }
        },
        nuevoProducto: async (_, { input }) => {
            try {
                const producto = new Producto(input);
                console.log(input)
                const resultado = await producto.save();
                return resultado;
            } catch (error) {
                console.log(error);
            }
        }

    }
}

module.exports = resolvers;