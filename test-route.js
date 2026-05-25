const Fastify = require('fastify');
const fastify = Fastify({logger: true});
fastify.get('/:id', (req, rep) => rep.send('id'));
fastify.get('/:id/members', (req, rep) => rep.send('members'));
fastify.listen({port: 3005}, () => console.log('Listening'));
