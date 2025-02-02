// Importando dependências
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

//Conectando ao banco de dados MongoDB
mongoose.connect(process.env.DATABASE)
    .then(() => console.log('Conectado ao banco de dados'))
    .catch((err) => console.error('Erro ao conectar no banco de dados: ', err));

//Definindo o modelo de usuario
const UserSchema = new mongoose.Schema({
    username: {type: String, unique: true},
    password: String,
    favorites: {type: [Number], default: []},
    requestCount: {type: Number, default: 0}
});

//Colocando o modelo userSchema acima, no banco de dados na coleção users
const User = mongoose.model('User', UserSchema);

// Middleware de autenticação
const authMiddleware = (req, res, next) => {
    //Constante para armazenar o token que o usuario enviar no campo Authorization
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer')) {
        return next();//Deixei o next para os usuarios nao autenticados poder utilizar a consulta de personagens
    }

    //const token pega o valor da constante authHeader e faz a separação depois do espaço " " pegando indice 1, no caso o token gerado pelo JWT
    const token = authHeader.split(' ')[1];
    //Verificando a autenticação do token
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch(err) {
        res.status(400).json({error:'Token inválido', err});
    }
};

//Constante para contagem de requisições de nao autenticados
const guestRequests = new Map();

//Middleware de controle de limite de consultas
const requestLimiter = async (req, res, next) => {
    let maxRequests = 3; //Aqui defini com let pois depois de autenticado muda para 10
    if(req.user) {
        maxRequests = 10; //Mudando para 10 quando o usuario estiver logado
        const user = await User.findById(req.user.id);
        if (user.requestCount >= maxRequests) {
            return res.status(429).json({message : 'Limite de consultas excedido'})
        }
        user.requestCount += 1;
        await user.save();
    } else {
        //Usuarios nao autenticados
        const ip = req.ip; //pega o ip do usuario
        if (!guestRequests.has(ip)) { //confere se o ip do usuario nao esta esta no guestRequest
            guestRequests.set(ip, 1); //se nao estiver adiciona e ja deixa com uma requisição
        } else {
            if (guestRequests.get(ip) >= maxRequests) {
                return res.status(429).json({message: 'limite de consultas excedido'})
            }
            guestRequests.set(ip, guestRequests.get(ip) + 1);
        }
    }
    next();
};

//Registro de usuario
app.post('/register', async (req, res) => {
    const {username, password} = req.body;
    if (!username || !password) {
        return res.status(400).json({message: 'Usuario e senha são obrigatorios'})
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await User.create({username, password: hashedPassword});
        res.status(201).json({username: user.username, message: 'Usuario cadastrado com sucesso'})
    } catch(err) {
        res.status(400).json({error: 'Erro ao criar o usuario, tente outro nome de usuario'})
    }
});

// Login de usuário
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
        return res.status(400).json({ error: 'Usuário não encontrado' });
    }
    const validPass = bcrypt.compare(password, user.password);
    if (!validPass) {
        return res.status(400).json({ error: 'Senha inválida' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' }); {
    res.json({ message: 'Login realizado com sucesso', token });
    }
});
  
// Consumo da API externa com controle de consultas
app.get('/characters', authMiddleware, requestLimiter, async (req, res) => {
    try {
        const response = await axios.get('https://rickandmortyapi.com/api/character');
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar personagens' });
    }
});
  
// Favoritar personagens
app.post('/favorites', authMiddleware, async (req, res) => {
    if (!req.user) return res.status(401).json({message: 'autenticação necessária'});
  
    const { characterId } = req.body;
    if (!characterId || typeof characterId !== 'number') {
        return res.status(400).json({ error: 'characterId é obrigatório e deve ser um número válido' });
    }
  
    const user = await User.findById(req.user.id);
    if (user.favorites.length >= 3) {
        return res.status(400).json({ error: 'Máximo de 3 favoritos atingido' });
    }
  
    if (!user.favorites.includes(characterId)) {
        user.favorites.push(characterId);
        await user.save();
    }
    const characterResponse = await axios.get(`https://rickandmortyapi.com/api/character/${characterId}`);
    res.json({ name: characterResponse.data.name, message: 'Adicionado aos favoritos' });
});
  
// Listar personagens favoritos
app.get('/favorites', authMiddleware, async (req, res) => {
    if(!req.user) return res.status(401).json({message: 'Autenticação necessaria'});
  
    const user = await User.findById(req.user.id);
    if (!user.favorites.length) {
        return res.json([]);
    }
  
    const favoriteDetails = await Promise.all(user.favorites.map(async (characterId) => {
        const characterResponse = await axios.get(`https://rickandmortyapi.com/api/character/${characterId}`);
        return {id: characterId, name: characterResponse.data.name}
    }));
  
    res.json(favoriteDetails);
});
  
// Remover favorito
app.delete('/favorites/:id', authMiddleware, async (req, res) => {
    if (!req.user) return res.status(401).json({message: 'autenticação necessária'});
  
    const user = await User.findById(req.user.id);
    const characterId = Number(req.params.id);
  
    if (!user.favorites.includes(characterId)) {
        return res.status(400).json({message:'Personagem nao encontrado na sua lista de favoritos'});
    }
  
    user.favorites = user.favorites.filter(fav => fav !== characterId);
    await user.save();
  
    const characterResponse = await axios.get(`https://rickandmortyapi.com/api/character/${characterId}`);
    res.json({ name: characterResponse.data.name, message: 'Removido dos favoritos' });
});
  
// Contar episódios únicos dos favoritos
app.get('/favorites/episodes/count', authMiddleware, requestLimiter, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({message: 'autenticação necessária'});
    }
    const user = await User.findById(req.user.id);
    if (!user.favorites.length) {
        return res.status(400).json({message: 'Nenhuma favorito encontrado'});
    }
    const episodesSet = new Set();
    
    const favoriteDetails = await Promise.all(user.favorites.map(async (characterId) => {
        const characterResponse = await axios.get(`https://rickandmortyapi.com/api/character/${characterId}`);
        characterResponse.data.episode.forEach(ep => episodesSet.add(ep));
        return { id: characterId, name: characterResponse.data.name, episodeCount: characterResponse.data.episode.length };
    }));
    
    res.json({ favorites: favoriteDetails, totalEpisodes: episodesSet.size });
});
  
// Iniciar servidor
const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
