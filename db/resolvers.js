const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
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
        },
        obtenerProducto: async (_, { id }) => {
            const existeProducto = await Producto.findById(id);
            if (!existeProducto) {
                throw new Error('Producto no encontrado');
            }
            return existeProducto;
        },
        obtenerClientes: async () => {
            try {
                const clientes = await Cliente.find({});
                return clientes;
            } catch (error) {
                console.log(error);
            }
        },
        obtenerClientesVendedor: async (_, { input }, ctx) => {
            try {
                const clientes = await Cliente.find({ vendedor: ctx.usuario.id.toString() });
                return clientes;
            } catch (error) {
                console.log(error);
            }
        },
        obtenerCliente: async (_, { id }, ctx) => {
            //revisar si el cliente existe,
            const cliente = await Cliente.findById(id);

            if (!cliente) {
                throw new Error('El cliente no existe');
            }

            if (cliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tiene las credenciales para ver ese cliente');
            }

            return cliente;

            //quien lo creo puede verlo
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
        },
        actualizarProducto: async (_, { id, input }) => {
            let existeProducto = await Producto.findById(id);
            if (!existeProducto) {
                throw new Error('Producto no encontrado');
            }
            existeProducto = await Producto.findOneAndUpdate({ _id: id }, input, { new: true });
            return existeProducto;
        },
        eliminarProducto: async (_, { id }) => {
            let existeProducto = await Producto.findById(id);
            if (!existeProducto) {
                throw new Error('Producto no encontrado');
            }
            await Producto.findOneAndDelete({ _id: id });
            return "Producto Eliminado";
        },
        nuevoCliente: async (_, { input }, ctx) => {
            const { email } = input;

            //verificar Si el cliente ya esta registrado de
            const cliente = await Cliente.findOne({ email });
            if (cliente) {
                throw new Error("Cliente ya registrado");
            }
            //asignar el vendedor
            const nuevoCliente = new Cliente(input);

            nuevoCliente.vendedor = ctx.usuario.id;

            try {
                const resultado = await nuevoCliente.save();
                return resultado;
            } catch (error) {
                console.log(error);
            }


        },
        actualizarCliente: async (_, { id, input }, ctx) => {
            //verificar si existe o no exist
            let cliente = await Cliente.findById(id);
            if (!cliente) {
                throw new Error('Cliente no existe')
            }
            //verificar si el vendedor es quien edita
            if (cliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tiene permisos para editar ese cliente')
            }
            cliente = await Cliente.findOneAndUpdate({ _id: id }, input, { new: true })
            return cliente;
        },
        eliminarCliente: async (_, { id }, ctx) => {
            const cliente = await Cliente.findById(id);

            if (!cliente) {
                throw new Error('El cliente no existe');
            }

            if (cliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tiene las credenciales para eiminar ese cliente');
            }

            await Cliente.findOneAndDelete({_id: id});
            return "Cliente eliminado!";
        }
    }
}

module.exports = resolvers;