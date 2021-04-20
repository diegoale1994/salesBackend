const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const Pedido = require('../models/Pedido');
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

        },
        obtenerPedidos: async () => {
            try {
                const pedidos = await Pedido.find({});
                return pedidos;
            } catch (error) {
                console.log(error);
            }
        },
        obtenerPedidosVendedor: async (_, { }, ctx) => {
            try {
                const pedidos = await Pedido.find({ vendedor: ctx.usuario.id });
                return pedidos;
            } catch (error) {
                console.log(error);
            }
        },
        obtenerPedido: async (_, { id }, ctx) => {
            const existePedido = await Pedido.findById(id);
            if (!existePedido) {
                throw new Error('El pedido que intenta consultar No existe');
            }

            if (existePedido.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tiene permisos para ver ese pedido');
            }

            return existePedido;
        },
        obtenerPedidosEstado: async (_, { estado }, ctx) => {
            const pedidos = await Pedido.find({ vendedor: ctx.usuario.id, estado });
            return pedidos;
        },
        mejoresClientes: async () => {
            const clientes = await Pedido.aggregate([
                { $match: { estado: 'COMPLETADO' } },
                {
                    $group: {
                        _id: "$cliente",
                        total: { $sum: '$total' }
                    }
                },
                {
                    $lookup: {
                        from: 'clientes',
                        localField: '_id',
                        foreignField: '_id',
                        as: "cliente"
                    }
                },
                {
                    $limit: 3
                },
                {
                    $sort: { total: -1 }
                }
            ]);

            return clientes;
        },
        mejoresVendedores: async () => {
            const vendedores = await Pedido.aggregate([
                { $match: { estado: "COMPLETADO" } },
                {
                    $group: {
                        _id: "$vendedor",
                        total: {
                            $sum: '$total'
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'usuarios',
                        localField: '_id',
                        foreignField: '_id',
                        as: "vendedor"
                    }
                },
                {
                    $limit: 3
                },
                {
                    $sort: { total: -1 }
                }
            ])
            return vendedores;
        },
        buscarProducto: async (_, { text }) => {
            const productos = await Producto.find({
                $text: {
                    $search: text
                }
            }).limit(10);
            return productos;
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

            await Cliente.findOneAndDelete({ _id: id });
            return "Cliente eliminado!";
        },
        nuevoPedido: async (_, { input }, ctx) => {

            const { cliente, pedido } = input;

            //verificar si cliente existe,
            const existeCliente = await Cliente.findById(cliente);
            if (!existeCliente) {
                throw new Error('No existe el cliente');
            }

            //verificar si el cliente es del vendedor del
            if (existeCliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tiene permiso para crear pedidos al cliente');
            }

            //Revisar Stock
            //sumar Total
            let total = 0;
            for await (const producto of pedido) {
                const { id } = producto;
                const productoDB = await Producto.findById(id);
                if (producto.cantidad > productoDB.existencia) {
                    throw new Error(`El producto ${productoDB.nombre} excede la cantidad disponible`);
                } else {
                    productoDB.existencia = productoDB.existencia - producto.cantidad;
                    await productoDB.save();
                    total += producto.cantidad * productoDB.precio;
                }
            }

            //crear Un nuevo pedido
            const pedidoNuevo = new Pedido(input);
            //asignarle un vendedor
            pedidoNuevo.vendedor = ctx.usuario.id
            //asignar Total
            pedidoNuevo.total = total;
            //guardar el pedido
            const resultado = pedidoNuevo.save();
            return resultado;
        },
        actualizarPedido: async (_, { id, input }, ctx) => {
            const { cliente, pedido } = input;
            //pedido existe el
            const existePedido = await Pedido.findById(id);
            if (!existePedido) {
                throw new Error('No existe el pedido que intenta editar');
            }
            //cliente existe el
            const existeCliente = await Cliente.findById(cliente);
            if (!existeCliente) {
                throw new Error('No existe el cliente');
            }
            //cliente y pedido pertenece al vendedor el
            if (existeCliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tiene permiso para usar el cliente');
            }
            //revisar stockador
            if (pedido) {
                let total = 0;
                for await (const producto of pedido) {
                    const { id } = producto;
                    const productoDB = await Producto.findById(id);
                    if (producto.cantidad > productoDB.existencia) {
                        throw new Error(`El producto ${productoDB.nombre} excede la cantidad disponible`);
                    } else {
                        productoDB.existencia = productoDB.existencia - producto.cantidad;
                        await productoDB.save();
                        total += producto.cantidad * productoDB.precio;
                    }
                }

                input.total = total;
            }

            const resultado = await Pedido.findOneAndUpdate({ _id: id }, input, { new: true });
            return resultado;
        },
        eliminarPedido: async (_, { id }, ctx) => {
            const existePedido = await Pedido.findById(id);
            if (!existePedido) {
                throw new Error('El pedido que intenta eliminar no existe');
            }

            if (existePedido.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tiene permiso para elimianr este pedido');
            }

            await Pedido.findOneAndDelete({ _id: id });
            return "Pedido Eliminado";
        }
    }
}

module.exports = resolvers;