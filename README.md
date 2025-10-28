# Spotify Vinyl Recommendation API

API que analiza tu historial de escucha en Spotify y recomienda 20 vinilos para comprar basándose en tus artistas, canciones y álbumes más escuchados.

## Características

- Autenticación OAuth con Spotify
- Análisis de top tracks, artistas y álbumes
- Generación de 20 recomendaciones personalizadas de vinilos
- Resumen de tu perfil musical
- Sistema de puntuación para priorizar recomendaciones

## Requisitos Previos

- Node.js 16 o superior
- Cuenta de Spotify
- Credenciales de Spotify API (Client ID y Client Secret)

## Configuración de Spotify API

1. Ve a [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Crea una nueva aplicación
3. Obtén tu `Client ID` y `Client Secret`
4. Agrega `http://127.0.0.1:3000/callback` a las URIs de redirección en la configuración de tu app

## Instalación

1. Clona el repositorio o navega al directorio del proyecto

2. Instala las dependencias:
```bash
npm install
```

3. Crea un archivo `.env` basado en `.env.example`:
```bash
cp .env.example .env
```

4. Edita el archivo `.env` con tus credenciales de Spotify:
```env
SPOTIFY_CLIENT_ID=tu_client_id_aqui
SPOTIFY_CLIENT_SECRET=tu_client_secret_aqui
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback
DISCOGS_TOKEN=tu_token_de_discogs_aqui
PORT=3000
SESSION_SECRET=tu_secreto_aleatorio_aqui
```

## Configuración de Discogs API (Opcional - Para Precios)

Para obtener información de precios de vinilos en Chile:

1. Ve a [Discogs Developer Settings](https://www.discogs.com/settings/developers)
2. Crea una cuenta si no tienes una
3. Genera un nuevo token personal
4. Copia el token y agrégalo al archivo `.env` como `DISCOGS_TOKEN`

**Nota:** Sin el token de Discogs, la aplicación funcionará normalmente pero no mostrará información de precios.

## Uso

### Iniciar el servidor

```bash
npm start
```

O en modo desarrollo (con auto-reload):
```bash
npm run dev
```

### Flujo de autenticación

1. **Iniciar sesión con Spotify:**
```bash
curl http://localhost:3000/auth/login
```

Esto retornará un JSON con la URL de autorización. Copia esa URL y ábrela en tu navegador.

2. **Autorizar la aplicación:**
Después de autorizar en Spotify, serás redirigido a `/callback` y verás un mensaje de éxito.

3. **Obtener recomendaciones de vinilos:**
```bash
curl http://localhost:3000/api/vinyl-recommendations
```

## Endpoints

### Autenticación

#### `GET /auth/login`
Obtiene la URL de autorización de Spotify.

**Respuesta:**
```json
{
  "message": "Please authorize the application",
  "authUrl": "https://accounts.spotify.com/authorize?..."
}
```

#### `GET /auth/callback`
Callback de OAuth (Spotify redirige aquí después de la autorización).

**Query Params:**
- `code`: Código de autorización de Spotify

**Respuesta:**
```json
{
  "message": "Authentication successful!",
  "expiresIn": 3600
}
```

### Datos y Recomendaciones

#### `GET /api/analysis`
Obtiene el análisis completo de tu música.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "topTracks": [...],
    "topArtists": [...],
    "topAlbums": [...]
  }
}
```

#### `GET /api/vinyl-recommendations`
Obtiene 20 recomendaciones de vinilos personalizadas.

**Respuesta:**
```json
{
  "success": true,
  "summary": {
    "topGenres": [...],
    "topArtistNames": [...],
    "musicProfile": {...}
  },
  "vinylRecommendations": [
    {
      "rank": 1,
      "albumName": "Album Name",
      "artist": "Artist Name",
      "releaseDate": "2020-01-01",
      "reason": "Album featuring your top tracks",
      "priority": "high",
      "vinylSearchTip": "Search \"Artist Album\" on Discogs..."
    }
  ],
  "totalRecommendations": 20
}
```

## Estructura del Proyecto

```
spotify-vinyl-api/
├── src/
│   ├── config/
│   │   └── spotify.js          # Configuración de Spotify API
│   ├── controllers/
│   │   ├── authController.js   # Lógica de autenticación
│   │   └── recommendationController.js
│   ├── routes/
│   │   ├── authRoutes.js       # Rutas de autenticación
│   │   └── recommendationRoutes.js
│   ├── services/
│   │   ├── spotifyService.js   # Servicio para obtener datos de Spotify
│   │   └── vinylRecommendationService.js  # Lógica de recomendaciones
│   └── server.js               # Servidor principal
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Cómo Funciona el Sistema de Recomendaciones

1. **Análisis de Datos:** Obtiene tus top 50 tracks y top 50 artistas
2. **Extracción de Álbumes:** Identifica álbumes únicos de tus canciones favoritas
3. **Sistema de Puntuación:**
   - Artistas en tu top list reciben más puntos
   - Coincidencias de género aumentan el score
   - Albums con tracks populares tienen prioridad
4. **Generación de Recomendaciones:** Selecciona los 20 mejores vinilos basándose en el score

## Próximas Mejoras

- Integración con Discogs API para precios de vinilos
- Persistencia de datos en base de datos
- Filtros por género, época, precio
- Sistema de favoritos
- Exportar recomendaciones a PDF o CSV

## Notas de Desarrollo

- Los tokens de acceso se almacenan temporalmente en memoria
- Para producción, implementar almacenamiento persistente (Redis, PostgreSQL, etc.)
- Los tokens de Spotify expiran después de 1 hora
- Implementar refresh token automático para sesiones largas

## Licencia

MIT
