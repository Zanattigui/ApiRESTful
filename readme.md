# API RESTful Rick e morty
![Rick and morty](https://cloud.estacaonerd.com/wp-content/uploads/2019/12/22080915/4avZU-7P4FaXUD6OE2esplNFwYttOa0E-_DCL2CxkdY.png)

## 👨‍💻Funcionalidades

- ✅Regristar-se
- ✅Autenticar-se
- ✅Buscar os personagens da API Rick and Morty
- ✅Favoritar personagens
- ✅Contar episodios em que cada personagem favoritos aparece
- ✅Total de quantos episodios todos os favoritos aparecem

## 👨‍💻Tecnologias utilizadas

- Node.js
- Express
- MongoDB(mongoose)
- JWT
- Axios
- Dotenv

# Como iniciar:

No terminal:

```bash
# Clonar o repositorio
git clone <URL_DO_REPOSITORIO>

#Acessar a pasta
cd <NOME_DO_REPOSITORIO>

#Executar o projeto
node index.js

#Sera iniciado na porta 3000
#http://localhost:3000
```

# Endpoints
### Registro de Usuário

#### 1️⃣ POST /register

```json
{
    "username": "Usuario",
    "password": "Senha"
}
```

### 2️⃣ Login

#### POST /login

```json
{
    "username": "Usuario",
    "password": "Senha"
}
```
Guardar o token gerado no login

Todos os endpoints autenticados precisam do token JWT no header. Exemplo:

```json
Authorization: Bearer <token>
```

### 3️⃣ Adicionar Favoritos (Apenas autenticados)

#### POST /favorites

```json
Authorization: Bearer <token>
```

```json
{
    "characterId": (Id do personagem)
}
```

### 4️⃣ Listar Favoritos (Apenas autenticados)
#### GET /favorites
```json
Authorization: Bearer <token>
```

### 5️⃣ Remover favorito (Apenas autenticados)
#### DELETE /favorites/(id do favorito)
```json
Authorization: Bearer <token>
```

### 6️⃣ Contar episodios dos favoritos (Apenas autenticados)
#### GET /favorites/episodes/count
```json
Authorization: Bearer <token>
```

### 7️⃣ Listar todos os personagens
#### GET /characters
Limite de 3 para não autenticados e 10 para autenticados